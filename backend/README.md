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

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/book_catalog
JWT_SECRET=change-me-to-a-long-random-string
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Run full setup

```bash
cd backend
make setup
```

This creates the virtual environment, installs dependencies, starts PostgreSQL via Docker, creates the databases, and runs migrations.

---

## Common Commands

| Command | Description |
|---------|-------------|
| `make setup` | Full setup (venv, deps, postgres, databases, migrations) |
| `make install` | Create venv and install dependencies |
| `make db-start` | Start PostgreSQL Docker container |
| `make db-stop` | Stop and remove PostgreSQL Docker container |
| `make db-create` | Create `book_catalog` and `book_catalog_test` databases |
| `make migrate` | Run Alembic migrations |
| `make run` | Start the development server |
| `make test` | Run the test suite |

---

## Development

Start the server:
```bash
make run
```

API docs available at http://127.0.0.1:8000/docs

## Testing

```bash
make test
```

Expected output: 37 tests passing. Requires PostgreSQL running (`make db-start`).
