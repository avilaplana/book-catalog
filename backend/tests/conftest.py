import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db
from app.models import Base, User
from app.services.jwt import create_access_token

TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/book_catalog_test"
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def auth_client(client, db):
    user = User(id=uuid.uuid4(), google_id="google_test_123", email="test@example.com", display_name="Test User")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id))
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client, user
