from fastapi.testclient import TestClient

from colophon.app import app


def test_health_returns_ok():
    response = TestClient(app).get("/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
