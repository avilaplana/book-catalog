from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone

import jwt


_GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]


class InvalidGoogleIdToken(Exception):
    pass


@dataclass(frozen=True)
class GoogleIdentity:
    google_sub: str
    email: str
    display_name: str | None
    avatar_url: str | None


def _system_clock() -> datetime:
    return datetime.now(timezone.utc)


class GoogleIdTokenVerifier:
    def __init__(
        self,
        *,
        client_ids: list[str],
        key_fetcher: Callable[[str], object],
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        if not client_ids:
            raise ValueError("client_ids must contain at least one entry")
        self._client_ids = client_ids
        self._key_fetcher = key_fetcher
        self._clock = clock or _system_clock

    def verify(self, id_token: str) -> GoogleIdentity:
        try:
            header = jwt.get_unverified_header(id_token)
            key = self._key_fetcher(header["kid"])
            payload = jwt.decode(
                id_token,
                key,
                algorithms=["RS256"],
                audience=self._client_ids,
                issuer=_GOOGLE_ISSUERS,
                options={"verify_exp": False},
            )
        except jwt.PyJWTError as exc:
            raise InvalidGoogleIdToken from exc
        if payload["exp"] < self._clock().timestamp():
            raise InvalidGoogleIdToken
        return GoogleIdentity(
            google_sub=payload["sub"],
            email=payload["email"],
            display_name=payload.get("name"),
            avatar_url=payload.get("picture"),
        )
