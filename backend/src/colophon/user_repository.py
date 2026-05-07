from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from colophon.models import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert_by_google_sub(
        self,
        *,
        google_sub: str,
        email: str,
        display_name: str | None,
        avatar_url: str | None,
    ) -> User:
        stmt = (
            pg_insert(User)
            .values(
                google_sub=google_sub,
                email=email,
                display_name=display_name,
                avatar_url=avatar_url,
            )
            .on_conflict_do_update(
                index_elements=[User.google_sub],
                set_={
                    "email": email,
                    "display_name": display_name,
                    "avatar_url": avatar_url,
                },
            )
            .returning(User)
        )
        result = await self._session.execute(
            stmt, execution_options={"populate_existing": True}
        )
        await self._session.flush()
        return result.scalar_one()
