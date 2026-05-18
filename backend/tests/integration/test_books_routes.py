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
            "subtitle": None,
            "publisher": None,
            "published_date": None,
            "language": None,
            "page_count": None,
            "categories": None,
            "isbn_13": None,
            "isbn_10": None,
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


async def test_get_books_search_returns_rich_fields_when_present(db_session):
    jwt_service, access = await _seed_user_and_token(db_session)
    fake_client = FakeGoogleBooksClient(
        [
            BookSearchResult(
                google_books_id="vol-1",
                title="The Lord of the Rings",
                author="J.R.R. Tolkien",
                cover_url="https://example.com/lotr.jpg",
                description="An epic high-fantasy novel.",
                subtitle="One Volume Edition",
                publisher="HarperCollins",
                published_date="2005-10-25",
                language="en",
                page_count=1216,
                categories="Fiction, Fantasy",
                isbn_13="9780261103573",
                isbn_10="0261103571",
            ),
        ]
    )
    _override_deps(db_session, jwt_service, fake_client)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/books/search?q=lotr",
                headers={"Authorization": f"Bearer {access}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body == [
        {
            "google_books_id": "vol-1",
            "title": "The Lord of the Rings",
            "author": "J.R.R. Tolkien",
            "cover_url": "https://example.com/lotr.jpg",
            "description": "An epic high-fantasy novel.",
            "subtitle": "One Volume Edition",
            "publisher": "HarperCollins",
            "published_date": "2005-10-25",
            "language": "en",
            "page_count": 1216,
            "categories": "Fiction, Fantasy",
            "isbn_13": "9780261103573",
            "isbn_10": "0261103571",
        }
    ]


async def test_responses_above_one_kilobyte_are_gzip_encoded_when_client_accepts(
    db_session,
):
    """GZip middleware compresses responses when the client advertises
    Accept-Encoding: gzip and the body is over the configured threshold."""
    jwt_service, access = await _seed_user_and_token(db_session)
    long_description = "Plot summary follows. " * 200  # ~4KB, well over 1KB
    fake_client = FakeGoogleBooksClient(
        [
            BookSearchResult(
                google_books_id=f"vol-{i}",
                title=f"Volume {i}",
                author="Author",
                cover_url=None,
                description=long_description,
            )
            for i in range(5)
        ]
    )
    _override_deps(db_session, jwt_service, fake_client)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/v1/books/search?q=anything",
                headers={
                    "Authorization": f"Bearer {access}",
                    "Accept-Encoding": "gzip",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"


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
