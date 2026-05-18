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
    subtitle: str | None = None,
    authors: list[str] | None = None,
    thumbnail: str | None = "https://example.com/thumb.jpg",
    description: str | None = "A short description.",
    publisher: str | None = None,
    published_date: str | None = None,
    page_count: int | None = None,
    categories: list[str] | None = None,
    language: str | None = None,
    industry_identifiers: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    volume_info: dict[str, Any] = {}
    if title is not None:
        volume_info["title"] = title
    if subtitle is not None:
        volume_info["subtitle"] = subtitle
    if authors is not None:
        volume_info["authors"] = authors
    if thumbnail is not None:
        volume_info["imageLinks"] = {"thumbnail": thumbnail}
    if description is not None:
        volume_info["description"] = description
    if publisher is not None:
        volume_info["publisher"] = publisher
    if published_date is not None:
        volume_info["publishedDate"] = published_date
    if page_count is not None:
        volume_info["pageCount"] = page_count
    if categories is not None:
        volume_info["categories"] = categories
    if language is not None:
        volume_info["language"] = language
    if industry_identifiers is not None:
        volume_info["industryIdentifiers"] = industry_identifiers
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


async def test_search_upgrades_http_thumbnail_to_https():
    fetch = FakeFetch(
        make_response(
            [
                make_volume(
                    thumbnail="http://books.google.com/books/content?id=abc&zoom=1",
                )
            ]
        )
    )
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].cover_url == (
        "https://books.google.com/books/content?id=abc&zoom=1"
    )


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


async def test_search_extracts_subtitle_when_present():
    fetch = FakeFetch(make_response([make_volume(subtitle="A Modern Tale")]))
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].subtitle == "A Modern Tale"


async def test_search_returns_none_for_subtitle_when_absent():
    fetch = FakeFetch(make_response([make_volume()]))
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].subtitle is None


async def test_search_extracts_publisher_published_date_and_language():
    fetch = FakeFetch(
        make_response(
            [
                make_volume(
                    publisher="Penguin Classics",
                    published_date="1922-02-02",
                    language="en",
                )
            ]
        )
    )
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].publisher == "Penguin Classics"
    assert results[0].published_date == "1922-02-02"
    assert results[0].language == "en"


async def test_search_returns_none_for_publisher_published_date_and_language_when_absent():
    fetch = FakeFetch(make_response([make_volume()]))
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].publisher is None
    assert results[0].published_date is None
    assert results[0].language is None


async def test_search_extracts_page_count_as_integer():
    fetch = FakeFetch(make_response([make_volume(page_count=384)]))
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].page_count == 384


async def test_search_returns_none_for_page_count_when_absent():
    fetch = FakeFetch(make_response([make_volume()]))
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].page_count is None


async def test_search_joins_categories_with_comma():
    fetch = FakeFetch(
        make_response([make_volume(categories=["Fiction", "Literary", "Classics"])])
    )
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].categories == "Fiction, Literary, Classics"


async def test_search_returns_none_for_categories_when_absent_or_empty():
    fetch_absent = FakeFetch(make_response([make_volume()]))
    fetch_empty = FakeFetch(make_response([make_volume(categories=[])]))

    absent = await make_client(fetch_absent).search("a")
    empty = await make_client(fetch_empty).search("a")

    assert absent[0].categories is None
    assert empty[0].categories is None


async def test_search_extracts_isbn_13_and_isbn_10_from_industry_identifiers():
    fetch = FakeFetch(
        make_response(
            [
                make_volume(
                    industry_identifiers=[
                        {"type": "ISBN_10", "identifier": "0261103571"},
                        {"type": "ISBN_13", "identifier": "9780261103573"},
                    ]
                )
            ]
        )
    )
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].isbn_13 == "9780261103573"
    assert results[0].isbn_10 == "0261103571"


async def test_search_returns_none_for_isbn_when_industry_identifiers_absent():
    fetch = FakeFetch(make_response([make_volume()]))
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].isbn_13 is None
    assert results[0].isbn_10 is None


async def test_search_extracts_isbn_13_when_only_isbn_13_present():
    fetch = FakeFetch(
        make_response(
            [
                make_volume(
                    industry_identifiers=[
                        {"type": "ISBN_13", "identifier": "9780261103573"},
                    ]
                )
            ]
        )
    )
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].isbn_13 == "9780261103573"
    assert results[0].isbn_10 is None


async def test_search_ignores_industry_identifiers_that_are_not_isbn():
    fetch = FakeFetch(
        make_response(
            [
                make_volume(
                    industry_identifiers=[
                        {"type": "OTHER", "identifier": "weird-internal-id"},
                    ]
                )
            ]
        )
    )
    client = make_client(fetch)

    results = await client.search("anything")

    assert results[0].isbn_13 is None
    assert results[0].isbn_10 is None


async def test_search_raises_unavailable_when_fetch_raises():
    fetch = FakeFetch(RuntimeError("network down"))
    client = make_client(fetch)

    with pytest.raises(GoogleBooksUnavailable):
        await client.search("x")
