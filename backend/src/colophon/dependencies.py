import os
from collections.abc import AsyncIterator
from datetime import timedelta

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from colophon.google_id_token_verifier import GoogleIdTokenVerifier
from colophon.jwt_token_service import InvalidToken, JWTTokenService
from colophon.models import User

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _session_factory_singleton() -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory
    if _session_factory is None:
        url = os.environ.get(
            "DATABASE_URL",
            "postgresql+asyncpg://colophon:colophon@localhost:5433/colophon",
        )
        _engine = create_async_engine(url)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    factory = _session_factory_singleton()
    async with factory() as session:
        yield session


def get_verifier() -> GoogleIdTokenVerifier:
    raise NotImplementedError(
        "Real Google JWKS-based verifier is wired up during the Fly deploy step of #23."
    )


def get_jwt_service() -> JWTTokenService:
    return JWTTokenService(
        secret=os.environ["JWT_SECRET"],
        access_ttl=timedelta(minutes=15),
        refresh_ttl=timedelta(days=30),
    )


async def get_current_user(
    authorization: str | None = Header(default=None),
    jwt_service: JWTTokenService = Depends(get_jwt_service),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise InvalidToken
    token = authorization.removeprefix("Bearer ")
    user_id = jwt_service.verify_access(token)
    user = await session.get(User, user_id)
    if user is None:
        raise InvalidToken
    return user
