from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

MAX_RESULTS = 20


class GoogleBooksUnavailable(Exception):
    pass


@dataclass(frozen=True)
class BookSearchResult:
    google_books_id: str
    title: str
    author: str | None
    cover_url: str | None
    description: str | None
    subtitle: str | None = None
    publisher: str | None = None
    published_date: str | None = None
    language: str | None = None
    page_count: int | None = None
    categories: str | None = None
    isbn_13: str | None = None
    isbn_10: str | None = None


class GoogleBooksClient:
    def __init__(
        self,
        *,
        fetch: Callable[[str], Awaitable[dict[str, Any]]],
    ) -> None:
        self._fetch = fetch

    async def search(self, query: str) -> list[BookSearchResult]:
        if not query.strip():
            return []
        try:
            payload = await self._fetch(query)
        except Exception as exc:
            raise GoogleBooksUnavailable from exc

        items = payload.get("items") or []
        results: list[BookSearchResult] = []
        for item in items[:MAX_RESULTS]:
            normalized = _normalize(item)
            if normalized is not None:
                results.append(normalized)
        return results


def _normalize(item: dict[str, Any]) -> BookSearchResult | None:
    google_books_id = item.get("id")
    volume_info = item.get("volumeInfo")
    if not google_books_id or not isinstance(volume_info, dict):
        return None
    title = volume_info.get("title")
    if not title:
        return None

    authors = volume_info.get("authors")
    author: str | None = None
    if isinstance(authors, list) and authors:
        author = ", ".join(authors)

    image_links = volume_info.get("imageLinks") or {}
    cover_url = image_links.get("thumbnail") if isinstance(image_links, dict) else None
    if cover_url and cover_url.startswith("http://"):
        cover_url = "https://" + cover_url.removeprefix("http://")

    description = volume_info.get("description")
    subtitle = volume_info.get("subtitle")
    publisher = volume_info.get("publisher")
    published_date = volume_info.get("publishedDate")
    language = volume_info.get("language")
    page_count_raw = volume_info.get("pageCount")
    page_count = page_count_raw if isinstance(page_count_raw, int) else None
    categories_raw = volume_info.get("categories")
    categories: str | None = None
    if isinstance(categories_raw, list) and categories_raw:
        categories = ", ".join(categories_raw)
    isbn_13, isbn_10 = _extract_isbns(volume_info.get("industryIdentifiers"))

    return BookSearchResult(
        google_books_id=google_books_id,
        title=title,
        author=author,
        cover_url=cover_url,
        description=description,
        subtitle=subtitle,
        publisher=publisher,
        published_date=published_date,
        language=language,
        page_count=page_count,
        categories=categories,
        isbn_13=isbn_13,
        isbn_10=isbn_10,
    )


def _extract_isbns(
    industry_identifiers: Any,
) -> tuple[str | None, str | None]:
    if not isinstance(industry_identifiers, list):
        return None, None
    isbn_13: str | None = None
    isbn_10: str | None = None
    for entry in industry_identifiers:
        if not isinstance(entry, dict):
            continue
        kind = entry.get("type")
        identifier = entry.get("identifier")
        if not isinstance(identifier, str):
            continue
        if kind == "ISBN_13" and isbn_13 is None:
            isbn_13 = identifier
        elif kind == "ISBN_10" and isbn_10 is None:
            isbn_10 = identifier
    return isbn_13, isbn_10
