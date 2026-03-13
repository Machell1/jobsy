"""Authentication routes: register, login, refresh, OAuth, password reset, role management."""

import logging
import secrets
import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import and_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from shared.database import get_db
from shared.email_utils import send_email
from shared.events import publish_event
from shared.models.user import (
    AddRoleRequest,
    ForgotPasswordRequest,
    OAuthRequest,
    ResetPasswordRequest,
    SwitchRoleRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from shared.oauth import verify_apple_token, verify_google_token
from shared.sms import send_sms

from ..config import RATE_LIMIT_AUTH_ENDPOINTS
from ..models import VALID_ROLES, PasswordResetOTP, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory sliding window for auth endpoint rate limiting.
_auth_attempts: dict[str, list[float]] = defaultdict(list)


async def _check_auth_rate_limit(request: Request) -> None:
    """Rate-limit auth endpoints by client IP."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - 60
    attempts = _auth_attempts[client_ip]
    _auth_attempts[client_ip] = [t for t in attempts if t > window_start]
    if not _auth_attempts[client_ip]:
        del _auth_attempts[client_ip]
        if len(_auth_attempts) > 100:
            stale = [ip for ip, ts in _auth_attempts.items() if not ts or ts[-1] < window_start]
            for ip in stale:
                del _auth_attempts[ip]
        _auth_attempts[client_ip] = []
    if len(_auth_attempts[client_ip]) >= RATE_LIMIT_AUTH_ENDPOINTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again later.",
        )
    _auth_attempts[client_ip].append(now)


def _build_roles_list(primary_role: str, extra_roles: list[str] | None = None) -> list[str]:
    """Build a deduplicated roles list ensuring 'user' is always included."""
    roles = {"user", primary_role}
    if extra_roles:
        for r in extra_roles:
            if r in VALID_ROLES:
                roles.add(r)
    return sorted(roles)


def _token_response(user: User) -> TokenResponse:
    """Build a token response including role information."""
    roles = user.roles or [user.role or "user"]
    active_role = user.active_role or user.role or "user"
    return TokenResponse(
        access_token=create_access_token(user.id, user.role, roles, active_role),
        refresh_token=create_refresh_token(user.id),
        active_role=active_role,
        roles=roles,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user with phone number and password."""
    await _check_auth_rate_limit(request)
    result = await db.execute(select(User).where(User.phone == data.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already registered")

    if data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    now = datetime.now(UTC)
    roles = _build_roles_list(data.role, data.roles)
    user = User(
        id=str(uuid.uuid4()),
        phone=data.phone,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        roles=roles,
        active_role=data.role,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    await db.flush()

    # Auto-create profile if profile fields were provided (e.g. provider signup).
    # Uses raw SQL to avoid importing the Profile model from the profiles service,
    # since each service runs in its own container on Railway.
    if data.display_name:
        profile_id = str(uuid.uuid4())
        await db.execute(
            text(
                "INSERT INTO profiles "
                "(id, user_id, display_name, parish, service_category, bio, "
                "is_provider, is_active, is_verified, created_at, updated_at) "
                "VALUES (:id, :user_id, :display_name, :parish, :service_category, "
                ":bio, :is_provider, true, false, :created_at, :updated_at)"
            ),
            {
                "id": profile_id,
                "user_id": user.id,
                "display_name": data.display_name,
                "parish": data.parish,
                "service_category": data.service_category,
                "bio": data.bio,
                "is_provider": data.is_provider or (data.role == "provider"),
                "created_at": now,
                "updated_at": now,
            },
        )

        await publish_event(
            "profile.updated",
            {
                "id": profile_id,
                "user_id": user.id,
                "display_name": data.display_name,
                "bio": data.bio,
                "parish": data.parish,
                "service_category": data.service_category,
            },
        )

    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with phone and password."""
    await _check_auth_rate_limit(request)
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Ensure legacy users have roles populated
    if not user.roles:
        user.roles = _build_roles_list(user.role or "user")
        user.active_role = user.active_role or user.role or "user"
        user.updated_at = datetime.now(UTC)
        await db.flush()

    return _token_response(user)


class _RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: _RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh an access token using a refresh token."""
    try:
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from None

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return _token_response(user)


# --- Role Management ---


def _get_user_id_from_header(request: Request) -> str:
    """Extract user ID from gateway-forwarded header."""
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user context")
    return user_id


@router.post("/roles/add", response_model=UserResponse)
async def add_role(data: AddRoleRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Add an additional role to the current user's account."""
    user_id = _get_user_id_from_header(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    current_roles = set(user.roles or [user.role or "user"])
    if data.role in current_roles:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Already have role: {data.role}")

    current_roles.add(data.role)
    current_roles.add("user")  # always keep base user role
    user.roles = sorted(current_roles)
    user.updated_at = datetime.now(UTC)
    await db.flush()

    return user


@router.post("/roles/switch", response_model=TokenResponse)
async def switch_role(data: SwitchRoleRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Switch the active role for the current user. Returns new tokens."""
    user_id = _get_user_id_from_header(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    current_roles = set(user.roles or [user.role or "user"])
    if data.role not in current_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have the '{data.role}' role. Add it first.",
        )

    user.active_role = data.role
    user.updated_at = datetime.now(UTC)
    await db.flush()

    return _token_response(user)


@router.get("/me", response_model=UserResponse)
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current user info including roles."""
    user_id = _get_user_id_from_header(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# --- OAuth ---


@router.post("/oauth", response_model=TokenResponse)
async def oauth_authenticate(request: Request, data: OAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate via Google or Apple OAuth. Creates account if needed."""
    await _check_auth_rate_limit(request)

    try:
        info = verify_google_token(data.id_token) if data.provider == "google" else verify_apple_token(data.id_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from None

    oauth_sub = info["sub"]
    email = info.get("email")

    # 1. Look up by OAuth provider + ID (returning user)
    result = await db.execute(
        select(User).where(and_(User.oauth_provider == data.provider, User.oauth_id == oauth_sub))
    )
    user = result.scalar_one_or_none()

    if user:
        if not user.roles:
            user.roles = _build_roles_list(user.role or "user")
            user.active_role = user.active_role or user.role or "user"
            user.updated_at = datetime.now(UTC)
            await db.flush()
        return _token_response(user)

    # 2. Look up by email to link accounts
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.oauth_provider = data.provider
            user.oauth_id = oauth_sub
            if not user.roles:
                user.roles = _build_roles_list(user.role or "user")
            user.active_role = user.active_role or user.role or "user"
            user.updated_at = datetime.now(UTC)
            await db.flush()
            return _token_response(user)

    # 3. Create new user
    roles = _build_roles_list(data.role, data.roles)
    user = User(
        id=str(uuid.uuid4()),
        phone=None,
        email=email,
        password_hash=None,
        role=data.role,
        roles=roles,
        active_role=data.role,
        oauth_provider=data.provider,
        oauth_id=oauth_sub,
        is_verified=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=_token_response(user).model_dump(),
    )


# --- Password Reset ---

_OTP_EXPIRY_MINUTES = 10


_OTP_EMAIL_HTML = (
    '<div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">'
    '<h2 style="color: #0D9488;">Jobsy Password Reset</h2>'
    "<p>Your verification code is:</p>"
    '<div style="font-size: 32px; font-weight: bold; color: #0D9488; letter-spacing: 4px; padding: 20px 0;">'
    "{otp}</div>"
    "<p>This code expires in {minutes} minutes.</p>"
    '<p style="color: #666; font-size: 12px;">If you didn\'t request this, please ignore this email.</p>'
    "</div>"
)


def _send_otp_email(to: str, otp: str) -> bool:
    """Send an OTP code via email."""
    html = _OTP_EMAIL_HTML.format(otp=otp, minutes=_OTP_EXPIRY_MINUTES)
    text = f"Your Jobsy password reset code is: {otp}. Expires in {_OTP_EXPIRY_MINUTES} minutes."
    return send_email(to=to, subject="Jobsy Password Reset Code", html_body=html, text_body=text)


@router.post("/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Request a password reset OTP via SMS or email."""
    await _check_auth_rate_limit(request)

    if not data.phone and not data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of phone or email must be provided.",
        )

    generic_response = {"message": "If this account is registered, you will receive a reset code."}

    user = None
    if data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()
    elif data.phone:
        result = await db.execute(select(User).where(User.phone == data.phone))
        user = result.scalar_one_or_none()

    if not user:
        return generic_response

    otp = f"{secrets.randbelow(900000) + 100000}"
    phone = user.phone or data.phone or ""

    otp_record = PasswordResetOTP(
        phone=phone,
        otp_hash=hash_password(otp),
        expires_at=datetime.now(UTC) + timedelta(minutes=_OTP_EXPIRY_MINUTES),
        created_at=datetime.now(UTC),
    )
    db.add(otp_record)
    await db.flush()

    sent = False
    if data.email:
        # Email-first flow: send OTP via email
        sent = _send_otp_email(to=data.email, otp=otp)
    elif data.phone:
        # SMS-first flow: try SMS, fall back to email
        sent = send_sms(
            to=data.phone,
            body=f"Your Jobsy password reset code is: {otp}. Expires in {_OTP_EXPIRY_MINUTES} minutes.",
        )
        if not sent and user.email:
            logger.info("SMS failed for %s, falling back to email %s", data.phone, user.email)
            sent = _send_otp_email(to=user.email, otp=otp)

    if not sent:
        logger.warning("Could not deliver OTP for user %s via any channel", user.id)

    return generic_response


@router.post("/reset-password", response_model=TokenResponse)
async def reset_password(request: Request, data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and set a new password."""
    await _check_auth_rate_limit(request)

    result = await db.execute(
        select(PasswordResetOTP)
        .where(
            and_(
                PasswordResetOTP.phone == data.phone,
                PasswordResetOTP.used == False,  # noqa: E712
                PasswordResetOTP.expires_at > datetime.now(UTC),
            )
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .limit(1)
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record or not verify_password(data.otp, otp_record.otp_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    otp_record.used = True

    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    user.password_hash = hash_password(data.new_password)
    user.updated_at = datetime.now(UTC)
    await db.flush()

    return _token_response(user)
