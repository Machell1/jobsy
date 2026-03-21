"""Authentication routes: register, login, refresh, OAuth, password reset, role management, email verification, GDPR."""

import asyncio
import logging
import re
import secrets
import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from shared.database import get_db
from shared.email_templates import email_verification as email_verification_template
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
from ..models import VALID_ROLES, LoginAudit, PasswordResetOTP, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory sliding window for auth endpoint rate limiting.
_auth_attempts: dict[str, list[float]] = defaultdict(list)

# Rate limiter for verification email resends (max 3 per hour per user)
_verification_resends: dict[str, list[float]] = defaultdict(list)

# Rate limiter for data export (max 1 per 24h per user)
_data_export_timestamps: dict[str, float] = {}


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


def validate_password(password: str) -> str | None:
    """Validate password complexity.

    Returns ``None`` when the password is acceptable, otherwise a
    human-readable error string listing all failing requirements.
    """
    issues: list[str] = []
    if len(password) < 8:
        issues.append("at least 8 characters")
    if not re.search(r"[A-Z]", password):
        issues.append("at least 1 uppercase letter")
    if not re.search(r"[a-z]", password):
        issues.append("at least 1 lowercase letter")
    if not re.search(r"\d", password):
        issues.append("at least 1 number")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", password):
        issues.append("at least 1 special character (!@#$%^&*...)")
    if issues:
        return "Password must contain: " + ", ".join(issues) + "."
    return None


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
    pwd_changed = user.password_changed_at.isoformat() if user.password_changed_at else None
    return TokenResponse(
        access_token=create_access_token(user.id, user.role, roles, active_role, password_changed_at=pwd_changed),
        refresh_token=create_refresh_token(user.id),
        active_role=active_role,
        roles=roles,
    )


def _generate_verification_code() -> str:
    """Generate a 6-digit email verification code."""
    return f"{secrets.randbelow(900000) + 100000}"


def _send_verification_email(to: str, user_name: str, code: str) -> bool:
    """Send an email verification code."""
    html = email_verification_template(user_name=user_name, code=code)
    text_body = f"Your Jobsy email verification code is: {code}. This code expires in 24 hours."
    return send_email(to=to, subject="Verify Your Jobsy Email", html_body=html, text_body=text_body)


def require_verified_email(user: User) -> None:
    """Raise 403 if the user has not verified their email.

    Call this guard on payment, bidding, and job-posting endpoints.
    """
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please verify your email before performing this action.",
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

    # Password complexity validation
    pw_error = validate_password(data.password)
    if pw_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_error)

    # Validate org_name is required for organization/school accounts
    if data.account_type in ("organization", "school") and not data.org_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization name is required for organization and school accounts",
        )

    now = datetime.now(UTC)
    roles = _build_roles_list(data.role, data.roles)

    # Generate email verification code if email provided
    verification_code = _generate_verification_code() if data.email else None

    user = User(
        id=str(uuid.uuid4()),
        phone=data.phone,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        roles=roles,
        active_role=data.role,
        account_type=data.account_type,
        org_name=data.org_name,
        org_registration_number=data.org_registration_number,
        org_type=data.org_type,
        org_representative_name=data.org_representative_name,
        org_representative_title=data.org_representative_title,
        email_verified=False,
        email_verification_code=verification_code,
        email_verification_sent_at=now if verification_code else None,
        consent_accepted_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    await db.flush()

    # Send verification email asynchronously (best-effort)
    if data.email and verification_code:
        display = data.display_name or data.phone
        sent = _send_verification_email(to=data.email, user_name=display, code=verification_code)
        if not sent:
            logger.warning("Could not send verification email for user %s", user.id)

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

    response = _token_response(user)

    # Login audit trail -- log asynchronously so we don't block the response
    async def _log_login() -> None:
        try:
            audit = LoginAudit(
                user_id=user.id,
                ip_address=request.client.host if request.client else None,
                user_agent=(request.headers.get("User-Agent") or "")[:500],
                created_at=datetime.now(UTC),
            )
            db.add(audit)
            await db.flush()
        except Exception:
            logger.warning("Failed to write login audit for user %s", user.id)

    asyncio.ensure_future(_log_login())

    return response


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

    # Invalidate tokens issued before the last password change
    if user.password_changed_at:
        token_iat = payload.get("iat")
        if token_iat and datetime.fromtimestamp(token_iat, tz=UTC) < user.password_changed_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalidated by password change. Please log in again.",
            )

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


class _PromoteToAdminRequest(BaseModel):
    user_id: str


class _BootstrapAdminRequest(BaseModel):
    user_id: str
    secret: str


@router.post("/admin/bootstrap")
async def bootstrap_admin(
    data: _BootstrapAdminRequest, db: AsyncSession = Depends(get_db)
):
    """Bootstrap the first admin user using an environment secret. One-time setup."""
    import os
    bootstrap_secret = os.getenv("ADMIN_BOOTSTRAP_SECRET", "jobsy-bootstrap-admin-2026")
    if data.secret != bootstrap_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid bootstrap secret",
        )

    result = await db.execute(select(User).where(User.id == data.user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    current_roles = set(target_user.roles or [target_user.role or "user"])
    if "admin" in current_roles:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already an admin")

    current_roles.add("admin")
    current_roles.add("user")
    target_user.roles = sorted(current_roles)
    target_user.updated_at = datetime.now(UTC)
    await db.flush()

    logger.info("Bootstrap: user %s promoted to admin", data.user_id)
    return {"message": f"User {data.user_id} has been promoted to admin", "roles": target_user.roles}


@router.post("/admin/promote")
async def promote_to_admin(
    data: _PromoteToAdminRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    """Promote a user to admin. Only existing admins can use this endpoint."""
    caller_role = request.headers.get("X-User-Role", "")
    if caller_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can promote users to admin",
        )
    caller_id = _get_user_id_from_header(request)

    result = await db.execute(select(User).where(User.id == data.user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    current_roles = set(target_user.roles or [target_user.role or "user"])
    if "admin" in current_roles:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already an admin")

    current_roles.add("admin")
    current_roles.add("user")
    target_user.roles = sorted(current_roles)
    target_user.updated_at = datetime.now(UTC)
    await db.flush()

    logger.info("Admin %s promoted user %s to admin", caller_id, data.user_id)
    return {"message": f"User {data.user_id} has been promoted to admin", "roles": target_user.roles}


@router.get("/me", response_model=UserResponse)
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current user info including roles."""
    user_id = _get_user_id_from_header(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# --- Change Password ---


class _ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    data: _ChangePasswordRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    """Change the current user's password. Requires valid current password."""
    user_id = _get_user_id_from_header(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change password for OAuth-only accounts",
        )

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Password complexity validation
    pw_error = validate_password(data.new_password)
    if pw_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_error)

    now = datetime.now(UTC)
    user.password_hash = hash_password(data.new_password)
    user.password_changed_at = now
    user.updated_at = now
    await db.flush()

    # Return new tokens so the user stays logged in; all previously
    # issued tokens are implicitly invalidated because they carry
    # an older (or missing) pwd_changed claim.
    return {
        "message": "Password changed successfully",
        **_token_response(user).model_dump(),
    }


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

    # OTP rate limiting: max 5 OTPs per phone per hour
    phone = user.phone or data.phone or ""
    if phone:
        one_hour_ago = datetime.now(UTC) - timedelta(hours=1)
        otp_count_result = await db.execute(
            select(func.count())
            .select_from(PasswordResetOTP)
            .where(
                and_(
                    PasswordResetOTP.phone == phone,
                    PasswordResetOTP.created_at > one_hour_ago,
                )
            )
        )
        otp_count = otp_count_result.scalar() or 0
        if otp_count >= 5:
            # Calculate minutes until the oldest OTP in the window expires
            oldest_result = await db.execute(
                select(PasswordResetOTP.created_at)
                .where(
                    and_(
                        PasswordResetOTP.phone == phone,
                        PasswordResetOTP.created_at > one_hour_ago,
                    )
                )
                .order_by(PasswordResetOTP.created_at.asc())
                .limit(1)
            )
            oldest_ts = oldest_result.scalar()
            if oldest_ts:
                wait_minutes = max(1, int((oldest_ts + timedelta(hours=1) - datetime.now(UTC)).total_seconds() / 60))
            else:
                wait_minutes = 60
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many OTP requests. Try again in {wait_minutes} minutes.",
            )

    otp = f"{secrets.randbelow(900000) + 100000}"

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

    # Password complexity validation
    pw_error = validate_password(data.new_password)
    if pw_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_error)

    now = datetime.now(UTC)
    user.password_hash = hash_password(data.new_password)
    user.password_changed_at = now
    user.updated_at = now
    await db.flush()

    return _token_response(user)


# --- Email Verification ---


class _VerifyEmailRequest(BaseModel):
    code: str = ""


@router.post("/verify-email")
async def verify_email(
    data: _VerifyEmailRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    """Verify a user's email using the 6-digit code sent during registration."""
    user_id = _get_user_id_from_header(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.email_verified:
        return {"message": "Email already verified"}

    if not user.email_verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code has been sent. Please request a new one.",
        )

    # Check code expiry (24 hours)
    if user.email_verification_sent_at:
        expiry = user.email_verification_sent_at + timedelta(hours=24)
        if datetime.now(UTC) > expiry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new one.",
            )

    if data.code != user.email_verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    user.email_verified = True
    user.email_verification_code = None
    user.updated_at = datetime.now(UTC)
    await db.flush()

    logger.info("Email verified for user %s", user_id)
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(request: Request, db: AsyncSession = Depends(get_db)):
    """Resend the email verification code. Rate limited to 3 per hour."""
    user_id = _get_user_id_from_header(request)

    # Rate limit: 3 resends per hour per user
    now = time.time()
    window_start = now - 3600
    attempts = _verification_resends[user_id]
    _verification_resends[user_id] = [t for t in attempts if t > window_start]
    if len(_verification_resends[user_id]) >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Verification email limit reached. Please try again later.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.email_verified:
        return {"message": "Email already verified"}

    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email address on file. Please add an email to your account first.",
        )

    code = _generate_verification_code()
    user.email_verification_code = code
    user.email_verification_sent_at = datetime.now(UTC)
    user.updated_at = datetime.now(UTC)
    await db.flush()

    display = user.phone or "there"
    sent = _send_verification_email(to=user.email, user_name=display, code=code)
    if not sent:
        logger.warning("Could not resend verification email for user %s", user_id)

    _verification_resends[user_id].append(now)

    return {"message": "Verification email sent"}


# --- GDPR / Data Protection ---


@router.delete("/me")
async def delete_account(request: Request, db: AsyncSession = Depends(get_db)):
    """GDPR account deletion: anonymize user data and soft-delete.

    Keeps transaction records for legal compliance but anonymizes
    personal identifiers. Revokes all tokens by clearing credentials.
    """
    user_id = _get_user_id_from_header(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already deleted")

    now = datetime.now(UTC)
    anonymized_phone = f"+0000000{secrets.randbelow(9000000) + 1000000}"

    # 1. Anonymize user record
    user.email = None
    user.phone = anonymized_phone
    user.password_hash = None
    user.oauth_provider = None
    user.oauth_id = None
    user.email_verified = False
    user.email_verification_code = None
    user.org_name = None
    user.org_registration_number = None
    user.org_representative_name = None
    user.org_representative_title = None
    user.is_deleted = True
    user.deleted_at = now
    user.updated_at = now
    await db.flush()

    # 2. Anonymize profile data (cross-service via raw SQL)
    try:
        await db.execute(
            text(
                "UPDATE profiles SET display_name = 'Deleted User', bio = '', "
                "avatar_url = NULL, updated_at = :now WHERE user_id = :uid"
            ),
            {"uid": user_id, "now": now},
        )
    except Exception:
        logger.warning("Could not anonymize profile for user %s (table may not exist)", user_id)

    # 3. Anonymize transaction payer/payee names (keep amounts for legal compliance)
    try:
        await db.execute(
            text(
                "UPDATE transactions SET payer_name = 'Deleted User', payee_name = 'Deleted User', "
                "updated_at = :now WHERE payer_id = :uid OR payee_id = :uid"
            ),
            {"uid": user_id, "now": now},
        )
    except Exception:
        logger.warning("Could not anonymize transactions for user %s (table may not exist)", user_id)

    logger.info("GDPR account deletion completed for user %s", user_id)
    return {"message": "Your account has been deleted and your data has been anonymized."}


@router.get("/me/export")
async def export_my_data(request: Request, db: AsyncSession = Depends(get_db)):
    """GDPR data export: return all user data as JSON.

    Rate limited to 1 request per 24 hours per user.
    """
    user_id = _get_user_id_from_header(request)

    # Rate limit: 1 export per 24 hours
    now = time.time()
    last_export = _data_export_timestamps.get(user_id, 0)
    if now - last_export < 86400:
        hours_left = int((86400 - (now - last_export)) / 3600)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Data export is limited to once per 24 hours. Try again in ~{hours_left} hours.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    export: dict = {
        "export_date": datetime.now(UTC).isoformat(),
        "user": {
            "id": user.id,
            "phone": user.phone,
            "email": user.email,
            "role": user.role,
            "roles": user.roles,
            "active_role": user.active_role,
            "account_type": user.account_type,
            "org_name": user.org_name,
            "email_verified": user.email_verified,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "consent_accepted_at": user.consent_accepted_at.isoformat() if user.consent_accepted_at else None,
        },
    }

    # Collect related data across services (best-effort, tables may not exist)
    data_queries = {
        "profile": "SELECT * FROM profiles WHERE user_id = :uid",
        "bookings": "SELECT * FROM bookings WHERE user_id = :uid ORDER BY created_at DESC",
        "transactions": "SELECT * FROM transactions WHERE payer_id = :uid OR payee_id = :uid ORDER BY created_at DESC",
        "reviews_given": "SELECT * FROM reviews WHERE reviewer_id = :uid ORDER BY created_at DESC",
        "reviews_received": "SELECT * FROM reviews WHERE reviewee_id = :uid ORDER BY created_at DESC",
        "messages": "SELECT id, thread_id, content, created_at FROM messages WHERE sender_id = :uid ORDER BY created_at DESC LIMIT 500",
        "contracts": "SELECT * FROM contracts WHERE client_id = :uid OR provider_id = :uid ORDER BY created_at DESC",
        "bids": "SELECT * FROM bids WHERE user_id = :uid ORDER BY created_at DESC",
        "jobs": "SELECT * FROM jobs WHERE user_id = :uid ORDER BY created_at DESC",
    }

    for key, query in data_queries.items():
        try:
            rows = await db.execute(text(query), {"uid": user_id})
            records = []
            for row in rows.mappings():
                record = {}
                for col, val in row.items():
                    if isinstance(val, datetime):
                        record[col] = val.isoformat()
                    else:
                        record[col] = val
                records.append(record)
            export[key] = records
        except Exception:
            export[key] = []

    _data_export_timestamps[user_id] = now

    logger.info("GDPR data export completed for user %s", user_id)
    return JSONResponse(
        content=export,
        headers={
            "Content-Disposition": f'attachment; filename="jobsy-data-export-{user_id[:8]}.json"',
        },
    )
