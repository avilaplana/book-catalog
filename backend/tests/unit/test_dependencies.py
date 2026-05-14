import httpx
import pytest

import colophon.dependencies as dependencies
from colophon.google_books_client import GoogleBooksUnavailable


async def test_build_google_books_client_includes_api_key_when_provided():
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(str(request.url))
        return httpx.Response(200, json={"items": []})

    client = dependencies._build_google_books_client(
        api_key="test-key",
        client_factory=lambda: httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ),
    )

    await client.search("alice")

    assert len(captured) == 1
    assert "key=test-key" in captured[0]
    assert "q=alice" in captured[0]


async def test_build_google_books_client_omits_api_key_when_absent():
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(str(request.url))
        return httpx.Response(200, json={"items": []})

    client = dependencies._build_google_books_client(
        api_key=None,
        client_factory=lambda: httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ),
    )

    await client.search("alice")

    assert len(captured) == 1
    assert "key=" not in captured[0]


async def test_build_google_books_client_retries_transient_503_then_succeeds():
    statuses = iter([503, 200])
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(next(statuses), json={"items": []})

    client = dependencies._build_google_books_client(
        api_key=None,
        client_factory=lambda: httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ),
        backoff_seconds=(0.0,),
    )

    results = await client.search("alice")

    assert results == []
    assert calls == 2


async def test_build_google_books_client_raises_unavailable_after_retries_exhausted():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(503, json={})

    client = dependencies._build_google_books_client(
        api_key=None,
        client_factory=lambda: httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ),
        backoff_seconds=(0.0, 0.0),
    )

    with pytest.raises(GoogleBooksUnavailable):
        await client.search("alice")

    assert calls == 3


async def test_build_google_books_client_does_not_retry_4xx():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(404, json={})

    client = dependencies._build_google_books_client(
        api_key=None,
        client_factory=lambda: httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ),
        backoff_seconds=(0.0, 0.0),
    )

    with pytest.raises(GoogleBooksUnavailable):
        await client.search("alice")

    assert calls == 1


def test_get_verifier_accepts_single_client_id(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "web-id.apps.googleusercontent.com")
    dependencies._verifier = None
    try:
        verifier = dependencies.get_verifier()
        assert verifier._client_ids == ["web-id.apps.googleusercontent.com"]
    finally:
        dependencies._verifier = None


def test_get_verifier_parses_csv_client_ids(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "web-id,ios-id, android-id")
    dependencies._verifier = None
    try:
        verifier = dependencies.get_verifier()
        assert verifier._client_ids == ["web-id", "ios-id", "android-id"]
    finally:
        dependencies._verifier = None
