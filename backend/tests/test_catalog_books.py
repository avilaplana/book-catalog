import uuid
from unittest.mock import patch
from app.models import Book, UserBook, ReadingStatus

def _make_book(db, google_books_id="gb_abc123", title="Dune"):
    book = Book(id=uuid.uuid4(), google_books_id=google_books_id, title=title, authors=["Frank Herbert"])
    db.add(book)
    db.commit()
    db.refresh(book)
    return book

MOCK_BOOK_DATA = {
    "google_books_id": "gb_abc123", "isbn": "9780441013593", "title": "Dune",
    "authors": ["Frank Herbert"], "description": None, "cover_url": None,
    "page_count": 412, "published_date": "1965", "publisher": "Chilton Books",
}

def test_list_catalog_books_empty(auth_client):
    client, _ = auth_client
    response = client.get("/v1/catalog/books")
    assert response.status_code == 200
    assert response.json() == []

def test_add_book_to_catalog(auth_client, db):
    client, _ = auth_client
    with patch("app.routers.catalog.get_book_by_id", return_value=MOCK_BOOK_DATA):
        response = client.post("/v1/catalog/books", json={"google_books_id": "gb_abc123", "status": "read"})
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Dune"
    assert body["status"] == "read"

def test_add_same_book_twice_returns_409(auth_client, db):
    client, user = auth_client
    book = _make_book(db)
    db.add(UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book.id, status=ReadingStatus.read))
    db.commit()
    with patch("app.routers.catalog.get_book_by_id", return_value=MOCK_BOOK_DATA):
        response = client.post("/v1/catalog/books", json={"google_books_id": "gb_abc123", "status": "read"})
    assert response.status_code == 409

def test_get_catalog_book_detail(auth_client, db):
    client, user = auth_client
    book = _make_book(db)
    user_book = UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book.id, status=ReadingStatus.currently_reading)
    db.add(user_book)
    db.commit()
    response = client.get(f"/v1/catalog/books/{user_book.id}")
    assert response.status_code == 200
    assert response.json()["status"] == "currently_reading"

def test_update_catalog_book_status_and_rating(auth_client, db):
    client, user = auth_client
    book = _make_book(db)
    user_book = UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book.id, status=ReadingStatus.currently_reading)
    db.add(user_book)
    db.commit()
    response = client.patch(f"/v1/catalog/books/{user_book.id}", json={"status": "read", "rating": 5})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "read"
    assert body["rating"] == 5

def test_delete_catalog_book(auth_client, db):
    client, user = auth_client
    book = _make_book(db)
    user_book = UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book.id, status=ReadingStatus.read)
    db.add(user_book)
    db.commit()
    assert client.delete(f"/v1/catalog/books/{user_book.id}").status_code == 204
    assert client.get(f"/v1/catalog/books/{user_book.id}").status_code == 404

def test_filter_books_by_status(auth_client, db):
    client, user = auth_client
    book1 = _make_book(db, google_books_id="gb1", title="Book 1")
    book2 = _make_book(db, google_books_id="gb2", title="Book 2")
    db.add_all([
        UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book1.id, status=ReadingStatus.read),
        UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book2.id, status=ReadingStatus.want_to_read),
    ])
    db.commit()
    response = client.get("/v1/catalog/books?status=read")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Book 1"

def test_add_book_manually(auth_client):
    client, _ = auth_client
    response = client.post("/v1/catalog/books", json={
        "status": "read",
        "title": "Rare Old Book",
        "authors": ["Unknown Author"],
        "publisher": "Old Press",
        "published_date": "1890",
    })
    assert response.status_code == 201
    assert response.json()["title"] == "Rare Old Book"
