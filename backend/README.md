# Book Catalog — Backend

FastAPI + PostgreSQL backend for the book catalog app.

## Requirements

- [pyenv](https://github.com/pyenv/pyenv)
- [Docker](https://www.docker.com/) (for running PostgreSQL)

## Setup

### 1. Install Python 3.12 via pyenv

```bash
pyenv install 3.12.3
pyenv local 3.12.3
```

Verify:
```bash
python --version  # Python 3.12.3
```

### 2. Create a virtual environment and install dependencies

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/book_catalog
JWT_SECRET=change-me-to-a-long-random-string
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 4. Start PostgreSQL with Docker

```bash
docker run -d \
  --name book-catalog-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:14
```

Create the application database:
```bash
docker exec -it book-catalog-postgres createdb -U postgres book_catalog
```

### 5. Run database migrations

```bash
cd backend
alembic upgrade head
```

### 6. Start the server

```bash
uvicorn app.main:app --reload
```

API docs available at http://127.0.0.1:8000/docs

---

## Running Tests

### 1. Create the test database

```bash
docker exec -it book-catalog-postgres createdb -U postgres book_catalog_test
```

### 2. Run the test suite

```bash
cd backend
pytest tests/ -v
```

Expected output: 37 tests passing.

### Stopping PostgreSQL

```bash
docker stop book-catalog-postgres
docker rm book-catalog-postgres
```
