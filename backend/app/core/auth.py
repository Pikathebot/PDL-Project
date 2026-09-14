"""
JWT authentication for dispatcher-side endpoints.

Citizens stay anonymous (report + track by ID); anything that lists reporter
phone numbers, changes an incident's state, or moves a responder requires a
signed-in dispatcher or admin.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.db import get_db
from backend.app.models.user import User, UserRole

ALGORITHM = "HS256"
DISPATCH_ROLES = (UserRole.DISPATCHER, UserRole.ADMIN)

# auto_error=False so a missing header yields a clean 401 from us rather than
# FastAPI's default 403.
_bearer = HTTPBearer(auto_error=False)


def verify_password(plain: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(user: User, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user.id), "email": user.email, "role": user.role.value, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Return the payload for a valid, unexpired token; None otherwise."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user or not user.is_active or not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise unauthorized
    user = (await db.execute(select(User).where(User.id == int(payload["sub"])))).scalar_one_or_none()
    if not user or not user.is_active:
        raise unauthorized
    return user


async def require_dispatcher(user: User = Depends(get_current_user)) -> User:
    if user.role not in DISPATCH_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dispatcher or admin role required")
    return user
