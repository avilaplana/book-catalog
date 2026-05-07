from colophon.models import User


async def test_user_persists_and_can_be_retrieved(db_session):
    new_user = User(
        google_sub="abc123",
        email="alice@example.com",
        display_name="Alice",
        avatar_url="https://example.com/a.png",
    )
    db_session.add(new_user)
    await db_session.flush()

    fetched = await db_session.get(User, new_user.id)

    assert fetched is not None
    assert fetched.google_sub == "abc123"
    assert fetched.email == "alice@example.com"
