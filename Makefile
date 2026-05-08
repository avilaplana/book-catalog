.DEFAULT_GOAL := help

.PHONY: help \
	db-up db-down db-shell migrate \
	backend-install backend-run backend-test backend-lint backend-format \
	mobile-install mobile-web mobile-ios mobile-android mobile-test \
	test lint

help:  ## Show this help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-22s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# --- Postgres -----------------------------------------------------------------

db-up:  ## Start the local Postgres container and wait for it to be healthy.
	docker compose up -d --wait db

db-down:  ## Stop the local Postgres container.
	docker compose down

db-shell:  ## Open a psql shell inside the local Postgres container.
	docker compose exec db psql -U colophon -d colophon

migrate:  ## Apply Alembic migrations to the local DB.
	cd backend && uv run alembic upgrade head

# --- Backend ------------------------------------------------------------------

backend-install:  ## Install backend deps with uv.
	cd backend && uv sync

backend-run: db-up migrate  ## Start the backend (uvicorn with reload). Reads backend/.env.
	cd backend && uv run uvicorn colophon.app:app --reload

backend-test: db-up  ## Run backend tests against a live Postgres.
	cd backend && uv run pytest

backend-lint:  ## Lint and format-check backend.
	cd backend && uv run ruff check && uv run ruff format --check

backend-format:  ## Auto-format backend.
	cd backend && uv run ruff format

# --- Mobile -------------------------------------------------------------------

mobile-install:  ## Install mobile npm deps.
	cd mobile && npm install

mobile-web:  ## Run the mobile app in a browser.
	cd mobile && npm run web

mobile-ios:  ## Run the mobile app in iOS Simulator.
	cd mobile && npm run ios

mobile-android:  ## Run the mobile app in an Android emulator.
	cd mobile && npm run android

mobile-test:  ## Run mobile tests (jest).
	cd mobile && npm test

# --- Combined -----------------------------------------------------------------

test: backend-test mobile-test  ## Run all tests.

lint: backend-lint  ## Run all lint checks.
