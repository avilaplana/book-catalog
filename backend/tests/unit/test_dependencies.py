import colophon.dependencies as dependencies


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
