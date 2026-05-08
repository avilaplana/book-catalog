import os
from collections.abc import AsyncIterator
from datetime import timedelta
from typing import Any

import httpx
import jwt
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


def get_google_books_client() -> GoogleBooksClient:
    global _google_books_client
    if _google_books_client is None:

        async def fetch(query: str) -> dict[str, Any]:
            async with httpx.AsyncClient(timeout=10.0) as http:
                response = await http.get(
                    GOOGLE_BOOKS_URL,
                    params={"q": query, "maxResults": 20},
                )
                response.raise_for_status()
                return response.json()

        _google_books_client = GoogleBooksClient(fetch=fetch)
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
