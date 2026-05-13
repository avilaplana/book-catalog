import httpx

import colophon.dependencies as dependencies


async def test_build_google_books_client_includes_api_key_when_provided():
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(str(request.url))
        return httpx.Response(200, json={"items": []})

    client = dependencies._build_google_books_client(
        api_key="test-key",
        client_factory=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
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
        client_factory=lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )

    await client.search("alice")

    assert len(captured) == 1
    assert "key=" not in captured[0]


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
