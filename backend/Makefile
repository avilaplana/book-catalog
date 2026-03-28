.PHONY: install db-start db-stop db-create migrate run test setup

VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
PYTEST := $(VENV)/bin/pytest
UVICORN := $(VENV)/bin/uvicorn
ALEMBIC := $(VENV)/bin/alembic

POSTGRES_CONTAINER := book-catalog-postgres
POSTGRES_IMAGE := postgres:14
POSTGRES_PASSWORD := postgres
POSTGRES_PORT := 5432

# Full setup: venv, deps, postgres, databases, migrations
setup: install db-start db-create migrate

# Create venv and install dependencies
install:
	python -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

# Start PostgreSQL container
db-start:
	docker run -d \
		--name $(POSTGRES_CONTAINER) \
		-e POSTGRES_PASSWORD=$(POSTGRES_PASSWORD) \
		-p $(POSTGRES_PORT):5432 \
		$(POSTGRES_IMAGE) || echo "Container already running"

# Stop and remove PostgreSQL container
db-stop:
	docker stop $(POSTGRES_CONTAINER) && docker rm $(POSTGRES_CONTAINER)

# Create application and test databases
db-create:
	docker exec $(POSTGRES_CONTAINER) createdb -U postgres book_catalog 2>/dev/null || echo "book_catalog already exists"
	docker exec $(POSTGRES_CONTAINER) createdb -U postgres book_catalog_test 2>/dev/null || echo "book_catalog_test already exists"

# Run Alembic migrations
migrate:
	$(ALEMBIC) upgrade head

# Start development server
run:
	$(UVICORN) app.main:app --reload

# Run test suite
test:
	$(PYTEST) tests/ -v
