from datetime import timedelta

from httpx import ASGITransport, AsyncClient

from colophon.app import app
from colophon.dependencies import get_jwt_service, get_session
from colophon.jwt_token_service import JWTTokenService
from colophon.models import User

SECRET = "test-secret-at-least-thirty-two-bytes-long"

ULYSSES_BODY = {
    "google_books_id": "g-ulysses",
    "title": "Ulysses",
    "author": "James Joyce",
    "cover_url": "https://example.com/u.jpg",
}


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


def _override_deps(db_session, jwt_service: JWTTokenService) -> None:
    async def _override_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_jwt_service] = lambda: jwt_service


def _client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def test_get_library_books_returns_401_when_unauthenticated():
    async with _client() as client:
        response = await client.get("/v1/library/books")

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_get_library_books_returns_empty_list_when_authenticated(db_session):
    jwt_service, access = await _seed_user_and_token(db_session)
    _override_deps(db_session, jwt_service)

    try:
        async with _client() as client:
            response = await client.get(
                "/v1/library/books",
                headers={"Authorization": f"Bearer {access}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == []


async def test_get_library_books_returns_added_books_newest_first(db_session):
    jwt_service, access = await _seed_user_and_token(db_session)
    _override_deps(db_session, jwt_service)
    headers = {"Authorization": f"Bearer {access}"}
    dubliners = {
        "google_books_id": "g-dubliners",
        "title": "Dubliners",
        "author": "James Joyce",
        "cover_url": None,
    }

    try:
        async with _client() as client:
            await client.post("/v1/library/books", json=ULYSSES_BODY, headers=headers)
            await client.post("/v1/library/books", json=dubliners, headers=headers)
            response = await client.get("/v1/library/books", headers=headers)
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert [b["title"] for b in body] == ["Dubliners", "Ulysses"]
    assert body[0]["google_books_id"] == "g-dubliners"
    assert body[0]["author"] == "James Joyce"
    assert body[0]["cover_url"] is None
    assert "added_at" in body[0]


async def test_post_library_books_returns_401_when_unauthenticated():
    async with _client() as client:
        response = await client.post("/v1/library/books", json=ULYSSES_BODY)

    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_post_library_books_adds_a_book_and_returns_201(db_session):
    jwt_service, access = await _seed_user_and_token(db_session)
    _override_deps(db_session, jwt_service)

    try:
        async with _client() as client:
            response = await client.post(
                "/v1/library/books",
                json=ULYSSES_BODY,
                headers={"Authorization": f"Bearer {access}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    body = response.json()
    assert body["google_books_id"] == "g-ulysses"
    assert body["title"] == "Ulysses"
    assert body["author"] == "James Joyce"
    assert body["cover_url"] == "https://example.com/u.jpg"
    assert "added_at" in body


async def test_post_library_books_accepts_and_persists_rich_fields(db_session):
    from sqlalchemy import select

    from colophon.models import Book

    jwt_service, access = await _seed_user_and_token(db_session)
    _override_deps(db_session, jwt_service)
    body = {
        "google_books_id": "g-lotr",
        "title": "The Lord of the Rings",
        "author": "J.R.R. Tolkien",
        "cover_url": "https://example.com/lotr.jpg",
        "subtitle": "One Volume Edition",
        "publisher": "HarperCollins",
        "published_date": "2005-10-25",
        "description": "An epic high-fantasy novel.",
        "language": "en",
        "page_count": 1216,
        "categories": "Fiction, Fantasy",
        "isbn_13": "9780261103573",
        "isbn_10": "0261103571",
    }

    try:
        async with _client() as client:
            response = await client.post(
                "/v1/library/books",
                json=body,
                headers={"Authorization": f"Bearer {access}"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201

    db_session.expire_all()
    row = (
        await db_session.execute(select(Book).where(Book.google_books_id == "g-lotr"))
    ).scalar_one()
    assert row.subtitle == "One Volume Edition"
    assert row.publisher == "HarperCollins"
    assert row.published_date == "2005-10-25"
    assert row.description == "An epic high-fantasy novel."
    assert row.language == "en"
    assert row.page_count == 1216
    assert row.categories == "Fiction, Fantasy"
    assert row.isbn_13 == "9780261103573"
    assert row.isbn_10 == "0261103571"


async def test_post_library_books_returns_409_when_already_in_library(db_session):
    jwt_service, access = await _seed_user_and_token(db_session)
    _override_deps(db_session, jwt_service)
    headers = {"Authorization": f"Bearer {access}"}

    try:
        async with _client() as client:
            first = await client.post(
                "/v1/library/books", json=ULYSSES_BODY, headers=headers
            )
            second = await client.post(
                "/v1/library/books", json=ULYSSES_BODY, headers=headers
            )
    finally:
        app.dependency_overrides.clear()

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.headers["content-type"].startswith("application/problem+json")
    assert second.json()["status"] == 409
