from datetime import timedelta

from httpx import ASGITransport, AsyncClient

from colophon.app import app
from colophon.dependencies import get_jwt_service, get_session
from colophon.jwt_token_service import JWTTokenService
from colophon.models import User

SECRET = "test-secret-at-least-thirty-two-bytes-long"


async def test_get_library_books_returns_401_when_unauthenticated():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/library/books")

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_get_library_books_returns_empty_list_when_authenticated(db_session):
    user = User(
        google_sub="user-1",
        email="alice@example.com",
        display_name=None,
        avatar_url=None,
    )
    db_session.add(user)
    await db_session.flush()

    jwt_service = JWTTokenService(
        secret=SECRET,
        access_ttl=timedelta(minutes=15),
        refresh_ttl=timedelta(days=30),
    )
    pair = jwt_service.issue_pair(user.id)

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_jwt_service] = lambda: jwt_service

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/library/books",
                headers={"Authorization": f"Bearer {pair.access_token}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []
