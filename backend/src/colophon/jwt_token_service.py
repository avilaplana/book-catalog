from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt


class InvalidToken(Exception):
    pass


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str


def _system_clock() -> datetime:
    return datetime.now(timezone.utc)


class JWTTokenService:
    def __init__(
        self,
        *,
        secret: str,
        access_ttl: timedelta,
        refresh_ttl: timedelta,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._secret = secret
        self._access_ttl = access_ttl
        self._refresh_ttl = refresh_ttl
        self._clock = clock or _system_clock
        self._used_refresh_jtis: set[str] = set()

    def issue_pair(self, user_id: UUID) -> TokenPair:
        now = self._clock()
        access = jwt.encode(
            {"sub": str(user_id), "exp": now + self._access_ttl},
            self._secret,
            algorithm="HS256",
        )
        refresh = jwt.encode(
            {
                "sub": str(user_id),
                "exp": now + self._refresh_ttl,
                "jti": str(uuid4()),
            },
            self._secret,
            algorithm="HS256",
        )
        return TokenPair(access_token=access, refresh_token=refresh)

    def verify_access(self, token: str) -> UUID:
        payload = self._decode(token)
        return UUID(payload["sub"])

    def rotate_refresh(self, token: str) -> TokenPair:
        payload = self._decode(token)
        jti = payload["jti"]
        if jti in self._used_refresh_jtis:
            raise InvalidToken
        self._used_refresh_jtis.add(jti)
        return self.issue_pair(UUID(payload["sub"]))

    def _decode(self, token: str) -> dict:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=["HS256"],
                options={"verify_exp": False},
            )
        except jwt.PyJWTError as exc:
            raise InvalidToken from exc
        if payload["exp"] < self._clock().timestamp():
            raise InvalidToken
        return payload
