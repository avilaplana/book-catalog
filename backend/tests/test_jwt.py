import pytest
from jose import JWTError
from app.services.jwt import create_access_token, verify_access_token

def test_create_and_verify_token():
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    token = create_access_token(user_id)
    assert isinstance(token, str)
    assert verify_access_token(token) == user_id

def test_verify_invalid_token():
    with pytest.raises(JWTError):
        verify_access_token("not-a-valid-token")

def test_verify_tampered_token():
    token = create_access_token("some-user-id")
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        verify_access_token(tampered)
