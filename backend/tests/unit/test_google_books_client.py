from collections.abc import Callable
from typing import Any

import pytest

from colophon.google_books_client import (
    BookSearchResult,
    GoogleBooksClient,
    GoogleBooksUnavailable,
)


def make_volume(
    *,
    id: str = "vol-1",
    title: str | None = "The Title",
    authors: list[str] | None = None,
    thumbnail: str | None = "https://example.com/thumb.jpg",
    description: str | None = "A short description.",
) -> dict[str, Any]:
    volume_info: dict[str, Any] = {}
    if title is not None:
        volume_info["title"] = title
    if authors is not None:
        volume_info["authors"] = authors
    if thumbnail is not None:
        volume_info["imageLinks"] = {"thumbnail": thumbnail}
    if description is not None:
        volume_info["description"] = description
    return {"id": id, "volumeInfo": volume_info}


def make_response(items: list[dict[str, Any]] | None) -> dict[str, Any]:
    if items is None:
        return {}
    return {"items": items}


class FakeFetch:
    def __init__(self, payload: dict[str, Any] | Exception) -> None:
        self.payload = payload
        self.calls: list[str] = []

    async def __call__(self, query: str) -> dict[str, Any]:
        self.calls.append(query)
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


def make_client(fetch: Callable[[str], Any]) -> GoogleBooksClient:
    return GoogleBooksClient(fetch=fetch)


async def test_search_returns_normalized_results():
    fetch = FakeFetch(
        make_response(
            [
                make_volume(
                    id="abc",
                    title="The Title",
                    authors=["Alice"],
                    thumbnail="https://example.com/t.jpg",
                    description="A short description.",
                ),
            ]
        )
    )
    client = make_client(fetch)

    results = await client.search("alice")

    assert results == [
        BookSearchResult(
            google_books_id="abc",
            title="The Title",
            author="Alice",
            cover_url="https://example.com/t.jpg",
            description="A short description.",
        )
    ]
    assert fetch.calls == ["alice"]


async def test_search_joins_multiple_authors_with_comma():
    fetch = FakeFetch(make_response([make_volume(authors=["Alice", "Bob", "Carol"])]))
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].author == "Alice, Bob, Carol"


async def test_search_returns_none_for_missing_optional_fields():
    fetch = FakeFetch(
        make_response([make_volume(authors=None, thumbnail=None, description=None)])
    )
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].author is None
    assert results[0].cover_url is None
    assert results[0].description is None


async def test_search_returns_empty_list_when_response_has_no_items():
    fetch = FakeFetch(make_response(None))
    client = make_client(fetch)

    results = await client.search("nothing-matches")

    assert results == []


async def test_search_returns_empty_list_when_response_items_is_empty():
    fetch = FakeFetch(make_response([]))
    client = make_client(fetch)

    results = await client.search("nothing-matches")

    assert results == []


async def test_search_caps_results_at_twenty():
    items = [make_volume(id=f"vol-{i}") for i in range(50)]
    fetch = FakeFetch(make_response(items))
    client = make_client(fetch)

    results = await client.search("popular")

    assert len(results) == 20


async def test_search_skips_volumes_missing_required_fields():
    items = [
        make_volume(id="ok"),
        {"id": "no-volume-info"},
        {"volumeInfo": {"title": "no-id"}},
        make_volume(id="ok2", title=None),
    ]
    fetch = FakeFetch(make_response(items))
    client = make_client(fetch)

    results = await client.search("x")

    assert [r.google_books_id for r in results] == ["ok"]


async def test_search_returns_empty_list_for_blank_query_without_fetching():
    fetch = FakeFetch(make_response([make_volume()]))
    client = make_client(fetch)

    results = await client.search("   ")

    assert results == []
    assert fetch.calls == []


async def test_search_returns_empty_list_for_empty_query_without_fetching():
    fetch = FakeFetch(make_response([make_volume()]))
    client = make_client(fetch)

    results = await client.search("")

    assert results == []
    assert fetch.calls == []


async def test_search_raises_unavailable_when_fetch_raises():
    fetch = FakeFetch(RuntimeError("network down"))
    client = make_client(fetch)

    with pytest.raises(GoogleBooksUnavailable):
        await client.search("x")
