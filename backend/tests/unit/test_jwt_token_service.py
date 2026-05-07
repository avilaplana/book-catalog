from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from colophon.jwt_token_service import InvalidToken, JWTTokenService

SECRET = "test-secret-at-least-thirty-two-bytes-long"


class FrozenClock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


def make_service(clock: FrozenClock | None = None) -> JWTTokenService:
    return JWTTokenService(
        secret=SECRET,
        access_ttl=timedelta(minutes=15),
        refresh_ttl=timedelta(days=30),
        clock=clock,
    )


def test_issue_pair_produces_access_token_that_verify_access_accepts():
    service = make_service()
    user_id = uuid4()

    pair = service.issue_pair(user_id)

    assert service.verify_access(pair.access_token) == user_id


def test_verify_access_rejects_tampered_token():
    service = make_service()
    pair = service.issue_pair(uuid4())
    token = pair.access_token
    mid = len(token) // 2
    tampered = token[:mid] + ("A" if token[mid] != "A" else "B") + token[mid + 1 :]

    with pytest.raises(InvalidToken):
        service.verify_access(tampered)


def test_verify_access_rejects_expired_token():
    clock = FrozenClock(datetime(2026, 1, 1, tzinfo=timezone.utc))
    service = make_service(clock=clock)
    pair = service.issue_pair(uuid4())

    clock.now += timedelta(minutes=16)

    with pytest.raises(InvalidToken):
        service.verify_access(pair.access_token)


def test_rotate_refresh_returns_new_pair_and_invalidates_old_refresh():
    service = make_service()
    pair = service.issue_pair(uuid4())

    new_pair = service.rotate_refresh(pair.refresh_token)

    assert new_pair.refresh_token != pair.refresh_token

    with pytest.raises(InvalidToken):
        service.rotate_refresh(pair.refresh_token)
