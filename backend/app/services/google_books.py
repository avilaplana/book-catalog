import httpx

GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1"

def _parse_volume(volume: dict) -> dict:
    info = volume.get("volumeInfo", {})
    identifiers = {i["type"]: i["identifier"] for i in info.get("industryIdentifiers", [])}
    return {
        "google_books_id": volume["id"],
        "isbn": identifiers.get("ISBN_13") or identifiers.get("ISBN_10"),
        "title": info.get("title", ""),
        "authors": info.get("authors"),
        "description": info.get("description"),
        "cover_url": info.get("imageLinks", {}).get("thumbnail"),
        "page_count": info.get("pageCount"),
        "published_date": info.get("publishedDate"),
        "publisher": info.get("publisher"),
    }

def search_books(query: str) -> list[dict]:
    with httpx.Client() as client:
        response = client.get(f"{GOOGLE_BOOKS_BASE_URL}/volumes", params={"q": query, "maxResults": 10})
        response.raise_for_status()
        return [_parse_volume(v) for v in response.json().get("items", [])]

def lookup_isbn(isbn: str) -> dict | None:
    with httpx.Client() as client:
        response = client.get(f"{GOOGLE_BOOKS_BASE_URL}/volumes", params={"q": f"isbn:{isbn}"})
        response.raise_for_status()
        items = response.json().get("items", [])
        return _parse_volume(items[0]) if items else None

def get_book_by_id(google_books_id: str) -> dict | None:
    try:
        with httpx.Client() as client:
            response = client.get(f"{GOOGLE_BOOKS_BASE_URL}/volumes/{google_books_id}")
            response.raise_for_status()
            return _parse_volume(response.json())
    except httpx.HTTPStatusError:
        return None
