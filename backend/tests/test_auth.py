from unittest.mock import patch

def test_google_auth_creates_new_user(client):
    mock_data = {"google_id": "g123", "email": "new@example.com", "display_name": "New User", "avatar_url": None}
    with patch("app.routers.auth.verify_google_token", return_value=mock_data):
        response = client.post("/v1/auth/google", json={"id_token": "fake-token"})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"

def test_google_auth_returns_token_for_existing_user(client, db):
    import uuid
    from app.models import User
    user = User(id=uuid.uuid4(), google_id="g123", email="existing@example.com", display_name="Existing")
    db.add(user)
    db.commit()
    mock_data = {"google_id": "g123", "email": "existing@example.com", "display_name": "Existing", "avatar_url": None}
    with patch("app.routers.auth.verify_google_token", return_value=mock_data):
        response = client.post("/v1/auth/google", json={"id_token": "fake-token"})
    assert response.status_code == 200

def test_google_auth_rejects_invalid_google_token(client):
    with patch("app.routers.auth.verify_google_token", side_effect=ValueError("bad token")):
        response = client.post("/v1/auth/google", json={"id_token": "bad-token"})
    assert response.status_code == 401

def test_protected_route_requires_auth(client):
    response = client.get("/v1/profile")
    assert response.status_code == 401
