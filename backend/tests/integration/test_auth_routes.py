from datetime import timedelta

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from colophon.app import app
from colophon.dependencies import get_jwt_service, get_session, get_verifier
from colophon.google_id_token_verifier import GoogleIdentity, InvalidGoogleIdToken
from colophon.jwt_token_service import JWTTokenService
from colophon.models import User


class FakeVerifier:
    def __init__(self, identity: GoogleIdentity) -> None:
        self._identity = identity

    def verify(self, id_token: str) -> GoogleIdentity:
        return self._identity


class RejectingVerifier:
    def verify(self, id_token: str) -> GoogleIdentity:
        raise InvalidGoogleIdToken


async def test_post_auth_google_returns_token_pair_and_persists_user(db_session):
    identity = GoogleIdentity(
        google_sub="google-sub-123",
        email="alice@example.com",
        display_name="Alice",
        avatar_url="https://example.com/alice.png",
    )

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_verifier] = lambda: FakeVerifier(identity)
    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_jwt_service] = lambda: JWTTokenService(
        secret="test-secret-at-least-thirty-two-bytes-long",
        access_ttl=timedelta(minutes=15),
        refresh_ttl=timedelta(days=30),
    )

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/v1/auth/google", json={"id_token": "fake-token"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("access_token"), str)
    assert isinstance(body.get("refresh_token"), str)

    result = await db_session.execute(
        select(User).where(User.google_sub == "google-sub-123")
    )
    user = result.scalar_one()
    assert user.email == "alice@example.com"
    assert user.display_name == "Alice"


async def test_post_auth_google_returns_401_problem_when_verifier_rejects(db_session):
    async def _override_session():
        yield db_session

    app.dependency_overrides[get_verifier] = lambda: RejectingVerifier()
    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_jwt_service] = lambda: JWTTokenService(
        secret="test-secret-at-least-thirty-two-bytes-long",
        access_ttl=timedelta(minutes=15),
        refresh_ttl=timedelta(days=30),
    )

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/v1/auth/google", json={"id_token": "invalid"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["status"] == 401
    assert body["title"] == "Invalid Google ID token"
