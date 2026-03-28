import uuid
from app.models import Book, UserBook, Shelf, ShelfBook, ReadingStatus

def _make_user_book(db, user, title="Dune"):
    book = Book(id=uuid.uuid4(), title=title, authors=["Author"])
    db.add(book)
    db.commit()
    db.refresh(book)
    user_book = UserBook(id=uuid.uuid4(), user_id=user.id, book_id=book.id, status=ReadingStatus.read)
    db.add(user_book)
    db.commit()
    db.refresh(user_book)
    return user_book

def test_list_shelves_empty(auth_client):
    client, _ = auth_client
    response = client.get("/v1/catalog/shelves")
    assert response.status_code == 200
    assert response.json() == []

def test_create_shelf(auth_client):
    client, _ = auth_client
    response = client.post("/v1/catalog/shelves", json={"name": "Favorites"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Favorites"
    assert body["book_count"] == 0

def test_delete_shelf(auth_client, db):
    client, user = auth_client
    shelf = Shelf(id=uuid.uuid4(), user_id=user.id, name="To Delete")
    db.add(shelf)
    db.commit()
    assert client.delete(f"/v1/catalog/shelves/{shelf.id}").status_code == 204

def test_delete_shelf_keeps_books_in_catalog(auth_client, db):
    client, user = auth_client
    shelf = Shelf(id=uuid.uuid4(), user_id=user.id, name="My Shelf")
    db.add(shelf)
    db.commit()
    user_book = _make_user_book(db, user)
    db.add(ShelfBook(shelf_id=shelf.id, user_book_id=user_book.id))
    db.commit()
    client.delete(f"/v1/catalog/shelves/{shelf.id}")
    assert client.get(f"/v1/catalog/books/{user_book.id}").status_code == 200

def test_add_book_to_shelf(auth_client, db):
    client, user = auth_client
    shelf = Shelf(id=uuid.uuid4(), user_id=user.id, name="My Shelf")
    db.add(shelf)
    db.commit()
    user_book = _make_user_book(db, user)
    response = client.post(f"/v1/catalog/shelves/{shelf.id}/books", json={"user_book_id": str(user_book.id)})
    assert response.status_code == 201

def test_add_book_to_shelf_twice_returns_409(auth_client, db):
    client, user = auth_client
    shelf = Shelf(id=uuid.uuid4(), user_id=user.id, name="My Shelf")
    db.add(shelf)
    db.commit()
    user_book = _make_user_book(db, user)
    db.add(ShelfBook(shelf_id=shelf.id, user_book_id=user_book.id))
    db.commit()
    response = client.post(f"/v1/catalog/shelves/{shelf.id}/books", json={"user_book_id": str(user_book.id)})
    assert response.status_code == 409

def test_remove_book_from_shelf(auth_client, db):
    client, user = auth_client
    shelf = Shelf(id=uuid.uuid4(), user_id=user.id, name="My Shelf")
    db.add(shelf)
    db.commit()
    user_book = _make_user_book(db, user)
    db.add(ShelfBook(shelf_id=shelf.id, user_book_id=user_book.id))
    db.commit()
    assert client.delete(f"/v1/catalog/shelves/{shelf.id}/books/{user_book.id}").status_code == 204
    assert client.get(f"/v1/catalog/books/{user_book.id}").status_code == 200

def test_shelf_book_count_updates(auth_client, db):
    client, user = auth_client
    shelf = Shelf(id=uuid.uuid4(), user_id=user.id, name="My Shelf")
    db.add(shelf)
    db.commit()
    user_book = _make_user_book(db, user)
    client.post(f"/v1/catalog/shelves/{shelf.id}/books", json={"user_book_id": str(user_book.id)})
    response = client.get("/v1/catalog/shelves")
    assert response.json()[0]["book_count"] == 1
