from collections.abc import Callable
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

import pytest

from colophon.google_id_token_verifier import (
    GoogleIdentity,
    GoogleIdTokenVerifier,
    InvalidGoogleIdToken,
)

CLIENT_ID = "test-client-id.apps.googleusercontent.com"
KID = "test-kid"


class FrozenClock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_private_pem = _private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
_public_key = _private_key.public_key()


def make_token(
    *,
    sub: str = "1234567890",
    email: str = "user@example.com",
    name: str | None = "Test User",
    picture: str | None = "https://example.com/avatar.png",
    aud: str = CLIENT_ID,
    iss: str = "https://accounts.google.com",
    exp: datetime | None = None,
    kid: str = KID,
) -> str:
    payload: dict = {
        "sub": sub,
        "email": email,
        "aud": aud,
        "iss": iss,
        "exp": exp or datetime.now(timezone.utc) + timedelta(hours=1),
    }
    if name is not None:
        payload["name"] = name
    if picture is not None:
        payload["picture"] = picture
    return jwt.encode(payload, _private_pem, algorithm="RS256", headers={"kid": kid})


def make_verifier(
    *,
    client_ids: list[str] | None = None,
    clock: Callable[[], datetime] | None = None,
) -> GoogleIdTokenVerifier:
    return GoogleIdTokenVerifier(
        client_ids=client_ids or [CLIENT_ID],
        key_fetcher=lambda _kid: _public_key,
        clock=clock,
    )


def test_verify_returns_identity_for_valid_token():
    verifier = make_verifier()
    token = make_token(
        sub="100",
        email="alice@example.com",
        name="Alice",
        picture="https://example.com/alice.png",
    )

    identity = verifier.verify(token)

    assert identity == GoogleIdentity(
        google_sub="100",
        email="alice@example.com",
        display_name="Alice",
        avatar_url="https://example.com/alice.png",
    )


def test_verify_rejects_tampered_token():
    verifier = make_verifier()
    token = make_token()
    mid = len(token) // 2
    tampered = token[:mid] + ("A" if token[mid] != "A" else "B") + token[mid + 1 :]

    with pytest.raises(InvalidGoogleIdToken):
        verifier.verify(tampered)


def test_verify_rejects_expired_token():
    expiry = datetime(2099, 1, 1, tzinfo=timezone.utc)
    clock = FrozenClock(expiry + timedelta(minutes=1))
    verifier = make_verifier(clock=clock)
    token = make_token(exp=expiry)

    with pytest.raises(InvalidGoogleIdToken):
        verifier.verify(token)


def test_verify_rejects_token_with_wrong_audience():
    verifier = make_verifier()
    token = make_token(aud="other-client.apps.googleusercontent.com")

    with pytest.raises(InvalidGoogleIdToken):
        verifier.verify(token)


def test_verify_accepts_token_when_aud_matches_any_configured_client_id():
    ios_client = "ios-client.apps.googleusercontent.com"
    verifier = make_verifier(client_ids=[CLIENT_ID, ios_client])
    token = make_token(aud=ios_client)

    identity = verifier.verify(token)

    assert identity.google_sub == "1234567890"


def test_verify_rejects_token_with_wrong_issuer():
    verifier = make_verifier()
    token = make_token(iss="https://evil.example.com")

    with pytest.raises(InvalidGoogleIdToken):
        verifier.verify(token)
