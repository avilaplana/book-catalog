import uuid
from app.models import Book, UserBook, Shelf, ReadingStatus

def test_get_profile_empty_catalog(auth_client):
    client, user = auth_client
    response = client.get("/v1/profile")
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "test@example.com"
    assert body["total_books"] == 0
    assert body["status_counts"] == {"want_to_read": 0, "currently_reading": 0, "read": 0}
    assert body["shelf_count"] == 0

def test_get_profile_with_books_and_shelves(auth_client, db):
    client, user = auth_client
    book1 = Book(id=uuid.uuid4(), title="Book 1", authors=["Author"])
    book2 = Book(id=uuid.uuid4(), title="Book 2", authors=["Author"])
    db.add_all([book1, book2])
    db.commit()
    db.add_all([
        UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book1.id, status=ReadingStatus.read),
        UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book2.id, status=ReadingStatus.currently_reading),
        Shelf(id=uuid.uuid4(), user_id=user.id, name="Favorites"),
    ])
    db.commit()
    response = client.get("/v1/profile")
    assert response.status_code == 200
    body = response.json()
    assert body["total_books"] == 2
    assert body["status_counts"]["read"] == 1
    assert body["status_counts"]["currently_reading"] == 1
    assert body["status_counts"]["want_to_read"] == 0
    assert body["shelf_count"] == 1
