"""Authentication routes: register, login, refresh, OAuth, password reset."""

import logging
import secrets
import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from shared.database import get_db
from shared.models.user import (
    ForgotPasswordRequest,
    OAuthRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
)
from shared.oauth import verify_apple_token, verify_google_token
from shared.sms import send_sms

from ..config import RATE_LIMIT_AUTH_ENDPOINTS
from ..models import PasswordResetOTP, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory sliding window for auth endpoint rate limiting.
# NOTE: This is per-instance only. In a multi-instance Railway deployment,
# the Redis-based rate limiter in middleware handles cross-instance limiting.
_auth_attempts: dict[str, list[float]] = defaultdict(list)


async def _check_auth_rate_limit(request: Request) -> None:
    """Rate-limit auth endpoints by client IP."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - 60
    attempts = _auth_attempts[client_ip]
    _auth_attempts[client_ip] = [t for t in attempts if t > window_start]
    if len(_auth_attempts[client_ip]) >= RATE_LIMIT_AUTH_ENDPOINTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again later.",
        )
    _auth_attempts[client_ip].append(now)


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

    user = User(
        id=str(uuid.uuid4()),
        phone=data.phone,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with phone and password."""
    await _check_auth_rate_limit(request)
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


class _RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: _RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh an access token using a refresh token."""
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from None

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )


# --- OAuth ---


@router.post("/oauth", response_model=TokenResponse)
async def oauth_authenticate(request: Request, data: OAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate via Google or Apple OAuth. Creates account if needed."""
    await _check_auth_rate_limit(request)

    # Verify the ID token with the provider
    try:
        if data.provider == "google":
            info = verify_google_token(data.id_token)
        else:
            info = verify_apple_token(data.id_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from None

    oauth_sub = info["sub"]
    email = info.get("email")

    # 1. Look up by OAuth provider + ID (returning user)
    result = await db.execute(
        select(User).where(
            and_(User.oauth_provider == data.provider, User.oauth_id == oauth_sub)
        )
    )
    user = result.scalar_one_or_none()

    if user:
        return TokenResponse(
            access_token=create_access_token(user.id, user.role),
            refresh_token=create_refresh_token(user.id),
        )

    # 2. Look up by email to link accounts
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.oauth_provider = data.provider
            user.oauth_id = oauth_sub
            user.updated_at = datetime.now(UTC)
            await db.flush()
            return TokenResponse(
                access_token=create_access_token(user.id, user.role),
                refresh_token=create_refresh_token(user.id),
            )

    # 3. Create new user
    user = User(
        id=str(uuid.uuid4()),
        phone=None,
        email=email,
        password_hash=None,
        role=data.role,
        oauth_provider=data.provider,
        oauth_id=oauth_sub,
        is_verified=True,  # OAuth email is provider-verified
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=TokenResponse(
            access_token=create_access_token(user.id, user.role),
            refresh_token=create_refresh_token(user.id),
        ).model_dump(),
    )


# --- Password Reset ---

_OTP_EXPIRY_MINUTES = 10


@router.post("/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Request a password reset OTP via SMS."""
    await _check_auth_rate_limit(request)

    # Always return success to prevent user enumeration
    generic_response = {"message": "If this phone is registered, you will receive a reset code."}

    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()
    if not user:
        return generic_response

    # Generate a 6-digit OTP
    otp = f"{secrets.randbelow(900000) + 100000}"

    otp_record = PasswordResetOTP(
        phone=data.phone,
        otp_hash=hash_password(otp),
        expires_at=datetime.now(UTC) + timedelta(minutes=_OTP_EXPIRY_MINUTES),
        created_at=datetime.now(UTC),
    )
    db.add(otp_record)
    await db.flush()

    send_sms(
        to=data.phone,
        body=f"Your Jobsy password reset code is: {otp}. Expires in {_OTP_EXPIRY_MINUTES} minutes.",
    )

    return generic_response


@router.post("/reset-password", response_model=TokenResponse)
async def reset_password(request: Request, data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and set a new password."""
    await _check_auth_rate_limit(request)

    # Find the most recent unused OTP for this phone
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

    # Mark OTP as used
    otp_record.used = True

    # Update user password
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

    # Auto-login after successful reset
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
    )
