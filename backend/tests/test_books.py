from unittest.mock import patch

MOCK_BOOK = {
    "google_books_id": "gb_abc123", "isbn": "9780441013593", "title": "Dune",
    "authors": ["Frank Herbert"], "description": None, "cover_url": None,
    "page_count": 412, "published_date": "1965", "publisher": "Chilton Books",
}

def test_search_books_returns_results(auth_client):
    client, _ = auth_client
    with patch("app.routers.books.search_books", return_value=[MOCK_BOOK]):
        response = client.get("/v1/books/search?q=dune")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Dune"

def test_search_books_requires_query_param(auth_client):
    client, _ = auth_client
    response = client.get("/v1/books/search")
    assert response.status_code == 422

def test_lookup_isbn_found(auth_client):
    client, _ = auth_client
    with patch("app.routers.books.lookup_isbn", return_value=MOCK_BOOK):
        response = client.get("/v1/books/isbn/9780441013593")
    assert response.status_code == 200
    assert response.json()["title"] == "Dune"

def test_lookup_isbn_not_found_returns_404(auth_client):
    client, _ = auth_client
    with patch("app.routers.books.lookup_isbn", return_value=None):
        response = client.get("/v1/books/isbn/0000000000000")
    assert response.status_code == 404
