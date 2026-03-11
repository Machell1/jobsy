"""FastAPI dependencies for the gateway."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from shared.auth import decode_token

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

_ANONYMOUS = {"user_id": "anonymous", "role": "anonymous"}


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Extract and validate the current user from JWT token."""
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return {"user_id": payload["sub"], "role": payload.get("role", "user")}
    except JWTError as err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from err


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
) -> dict:
    """Extract user from JWT if present, otherwise return anonymous context."""
    if not credentials:
        return _ANONYMOUS
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return _ANONYMOUS
        return {"user_id": payload["sub"], "role": payload.get("role", "user")}
    except JWTError:
        return _ANONYMOUS
