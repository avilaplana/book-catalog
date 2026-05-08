from datetime import timedelta

from httpx import ASGITransport, AsyncClient

from colophon.app import app
from colophon.dependencies import (
    get_google_books_client,
    get_jwt_service,
    get_session,
)
from colophon.google_books_client import (
    BookSearchResult,
    GoogleBooksUnavailable,
)
from colophon.jwt_token_service import JWTTokenService
from colophon.models import User

SECRET = "test-secret-at-least-thirty-two-bytes-long"


class FakeGoogleBooksClient:
    def __init__(
        self, results: list[BookSearchResult] | Exception | None = None
    ) -> None:
        self._results = results if results is not None else []
        self.calls: list[str] = []

    async def search(self, query: str) -> list[BookSearchResult]:
        self.calls.append(query)
        if isinstance(self._results, Exception):
            raise self._results
        return self._results


async def _seed_user_and_token(db_session) -> tuple[JWTTokenService, str]:
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
    return jwt_service, pair.access_token


def _override_deps(
    db_session,
    jwt_service: JWTTokenService,
    client: FakeGoogleBooksClient,
) -> None:
    async def _override_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_jwt_service] = lambda: jwt_service
    app.dependency_overrides[get_google_books_client] = lambda: client


async def test_get_books_search_returns_401_when_unauthenticated():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/books/search?q=ulysses")

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_get_books_search_returns_normalized_results_when_authenticated(
    db_session,
):
    jwt_service, access = await _seed_user_and_token(db_session)
    fake_client = FakeGoogleBooksClient(
        [
            BookSearchResult(
                google_books_id="vol-1",
                title="The Title",
                author="Alice, Bob",
                cover_url="https://example.com/cover.jpg",
                description="A description.",
            ),
        ]
    )
    _override_deps(db_session, jwt_service, fake_client)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/books/search?q=ulysses",
                headers={"Authorization": f"Bearer {access}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [
        {
            "google_books_id": "vol-1",
            "title": "The Title",
            "author": "Alice, Bob",
            "cover_url": "https://example.com/cover.jpg",
            "description": "A description.",
        }
    ]
    assert fake_client.calls == ["ulysses"]


async def test_get_books_search_returns_empty_list_for_empty_query(db_session):
    jwt_service, access = await _seed_user_and_token(db_session)
    fake_client = FakeGoogleBooksClient([])
    _override_deps(db_session, jwt_service, fake_client)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/books/search?q=",
                headers={"Authorization": f"Bearer {access}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []


async def test_get_books_search_returns_503_problem_details_when_unavailable(
    db_session,
):
    jwt_service, access = await _seed_user_and_token(db_session)
    fake_client = FakeGoogleBooksClient(GoogleBooksUnavailable())
    _override_deps(db_session, jwt_service, fake_client)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/books/search?q=ulysses",
                headers={"Authorization": f"Bearer {access}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["status"] == 503
    assert body["title"] == "Google Books unavailable"
