from unittest.mock import patch, MagicMock
from app.services.google_books import search_books, lookup_isbn, get_book_by_id

MOCK_VOLUME = {
    "id": "gb_abc123",
    "volumeInfo": {
        "title": "Dune",
        "authors": ["Frank Herbert"],
        "description": "A sci-fi epic",
        "imageLinks": {"thumbnail": "https://books.google.com/cover.jpg"},
        "pageCount": 412,
        "publishedDate": "1965",
        "publisher": "Chilton Books",
        "industryIdentifiers": [
            {"type": "ISBN_13", "identifier": "9780441013593"},
            {"type": "ISBN_10", "identifier": "0441013597"},
        ],
    },
}

def _mock_http(json_data):
    mock_response = MagicMock()
    mock_response.json.return_value = json_data
    mock_response.raise_for_status = MagicMock()
    return mock_response

def test_search_books_returns_results():
    with patch("app.services.google_books.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.return_value = _mock_http({"items": [MOCK_VOLUME]})
        results = search_books("Dune")
    assert len(results) == 1
    assert results[0]["google_books_id"] == "gb_abc123"
    assert results[0]["title"] == "Dune"
    assert results[0]["authors"] == ["Frank Herbert"]
    assert results[0]["isbn"] == "9780441013593"
    assert results[0]["publisher"] == "Chilton Books"

def test_search_books_returns_empty_list_when_no_results():
    with patch("app.services.google_books.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.return_value = _mock_http({})
        results = search_books("xyznonexistent")
    assert results == []

def test_lookup_isbn_returns_book():
    with patch("app.services.google_books.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.return_value = _mock_http({"items": [MOCK_VOLUME]})
        result = lookup_isbn("9780441013593")
    assert result is not None
    assert result["google_books_id"] == "gb_abc123"

def test_lookup_isbn_returns_none_when_not_found():
    with patch("app.services.google_books.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.return_value = _mock_http({})
        result = lookup_isbn("0000000000000")
    assert result is None

def test_get_book_by_id_returns_book():
    with patch("app.services.google_books.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.return_value = _mock_http(MOCK_VOLUME)
        result = get_book_by_id("gb_abc123")
    assert result["google_books_id"] == "gb_abc123"
    assert result["title"] == "Dune"

def test_get_book_by_id_returns_none_on_404():
    import httpx
    with patch("app.services.google_books.httpx.Client") as mock_client:
        mock_client.return_value.__enter__.return_value.get.side_effect = httpx.HTTPStatusError(
            "404", request=MagicMock(), response=MagicMock(status_code=404)
        )
        result = get_book_by_id("nonexistent")
    assert result is None
