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

    description = volume_info.get("description")

    return BookSearchResult(
        google_books_id=google_books_id,
        title=title,
        author=author,
        cover_url=cover_url,
        description=description,
    )
