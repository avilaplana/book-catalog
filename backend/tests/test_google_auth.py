import pytest
from unittest.mock import patch
from app.services.google_auth import verify_google_token

def test_verify_valid_token():
    mock_idinfo = {
        "sub": "google_user_123",
        "email": "user@example.com",
        "name": "Test User",
        "picture": "https://example.com/photo.jpg",
    }
    with patch("app.services.google_auth.id_token.verify_oauth2_token", return_value=mock_idinfo):
        result = verify_google_token("fake-id-token")
    assert result == {
        "google_id": "google_user_123",
        "email": "user@example.com",
        "display_name": "Test User",
        "avatar_url": "https://example.com/photo.jpg",
    }

def test_verify_invalid_token_raises():
    with patch("app.services.google_auth.id_token.verify_oauth2_token", side_effect=ValueError("bad token")):
        with pytest.raises(ValueError):
            verify_google_token("invalid-token")
