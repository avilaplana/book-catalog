from sqlalchemy import select

from colophon.models import User
from colophon.user_repository import UserRepository


async def test_upsert_persists_a_new_user(db_session):
    repo = UserRepository(db_session)

    await repo.upsert_by_google_sub(
        google_sub="abc123",
        email="alice@example.com",
        display_name="Alice",
        avatar_url="https://example.com/alice.png",
    )

    result = await db_session.execute(select(User).where(User.google_sub == "abc123"))
    user = result.scalar_one()
    assert user.email == "alice@example.com"
    assert user.display_name == "Alice"
    assert user.avatar_url == "https://example.com/alice.png"


async def test_upsert_with_existing_google_sub_updates_the_row(db_session):
    repo = UserRepository(db_session)

    first = await repo.upsert_by_google_sub(
        google_sub="abc123",
        email="alice@example.com",
        display_name="Alice",
        avatar_url=None,
    )
    second = await repo.upsert_by_google_sub(
        google_sub="abc123",
        email="alice@new.example.com",
        display_name="Alice New",
        avatar_url="https://new.example.com/avatar.png",
    )

    assert first.id == second.id
    assert second.email == "alice@new.example.com"
    assert second.display_name == "Alice New"
    assert second.avatar_url == "https://new.example.com/avatar.png"

    result = await db_session.execute(select(User).where(User.google_sub == "abc123"))
    assert len(result.scalars().all()) == 1
