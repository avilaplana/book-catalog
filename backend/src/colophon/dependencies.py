import asyncio
import os
from collections.abc import AsyncIterator, Callable
from datetime import timedelta
from typing import Any

import httpx
import jwt
import structlog
from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from colophon.google_books_client import GoogleBooksClient
from colophon.google_id_token_verifier import GoogleIdTokenVerifier
from colophon.jwt_token_service import InvalidToken, JWTTokenService
from colophon.models import User

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"

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


_verifier: GoogleIdTokenVerifier | None = None


def get_verifier() -> GoogleIdTokenVerifier:
    global _verifier
    if _verifier is None:
        client_ids = [s.strip() for s in os.environ["GOOGLE_CLIENT_ID"].split(",")]
        client_ids = [s for s in client_ids if s]
        jwks_client = jwt.PyJWKClient(GOOGLE_JWKS_URL)
        _verifier = GoogleIdTokenVerifier(
            client_ids=client_ids,
            key_fetcher=lambda kid: jwks_client.get_signing_key(kid).key,
        )
    return _verifier


_jwt_service: JWTTokenService | None = None


def get_jwt_service() -> JWTTokenService:
    global _jwt_service
    if _jwt_service is None:
        _jwt_service = JWTTokenService(
            secret=os.environ["JWT_SECRET"],
            access_ttl=timedelta(minutes=15),
            refresh_ttl=timedelta(days=30),
        )
    return _jwt_service


_google_books_client: GoogleBooksClient | None = None


_RETRYABLE_STATUSES = {502, 503, 504}
_retry_logger = structlog.get_logger()


def _build_google_books_client(
    api_key: str | None,
    *,
    client_factory: Callable[[], httpx.AsyncClient] = lambda: httpx.AsyncClient(
        timeout=10.0
    ),
    backoff_seconds: tuple[float, ...] = (0.2, 0.5),
) -> GoogleBooksClient:
    async def fetch(query: str) -> dict[str, Any]:
        params: dict[str, Any] = {"q": query, "maxResults": 20}
        if api_key:
            params["key"] = api_key
        attempts = len(backoff_seconds) + 1
        for attempt in range(attempts):
            try:
                async with client_factory() as http:
                    response = await http.get(GOOGLE_BOOKS_URL, params=params)
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in _RETRYABLE_STATUSES:
                    raise
                if attempt == attempts - 1:
                    raise
                _retry_logger.warning(
                    "google_books_retry",
                    attempt=attempt + 1,
                    status=exc.response.status_code,
                )
            except httpx.RequestError as exc:
                if attempt == attempts - 1:
                    raise
                _retry_logger.warning(
                    "google_books_retry",
                    attempt=attempt + 1,
                    error=type(exc).__name__,
                )
            await asyncio.sleep(backoff_seconds[attempt])
        raise RuntimeError("unreachable")

    return GoogleBooksClient(fetch=fetch)


def get_google_books_client() -> GoogleBooksClient:
    global _google_books_client
    if _google_books_client is None:
        _google_books_client = _build_google_books_client(
            os.environ.get("GOOGLE_BOOKS_API_KEY")
        )
    return _google_books_client


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
