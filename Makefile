.DEFAULT_GOAL := help

.PHONY: help \
	db-up db-down db-shell migrate \
	backend-install backend-run backend-test backend-lint backend-format \
	mobile-install mobile-web mobile-ios mobile-android mobile-test \
	mobile-build-ios mobile-install-ios mobile-run-ios-device \
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

backend-run: db-up migrate  ## Start the backend (uvicorn --reload, bound to 0.0.0.0 so phones on the LAN can reach it). Reads backend/.env.
	cd backend && uv run uvicorn colophon.app:app --reload --host 0.0.0.0

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

mobile-ios:  ## Start Metro for the iOS dev client (run mobile-build-ios + mobile-install-ios first time).
	cd mobile && npx expo start --dev-client

mobile-build-ios:  ## Cloud-build the iOS Simulator dev client via EAS (~10–15 min).
	cd mobile && eas build --profile development --platform ios

mobile-run-ios-device:  ## Local-build & install the dev client onto a plugged-in iPhone, then start Metro (needs Xcode signing).
	cd mobile && npx expo run:ios --device

mobile-install-ios:  ## Install the latest iOS dev build into the running Simulator.
	cd mobile && eas build:run --platform ios

mobile-android:  ## Run the mobile app in an Android emulator.
	cd mobile && npm run android

mobile-test:  ## Run mobile tests (jest).
	cd mobile && npm test

# --- Combined -----------------------------------------------------------------

test: backend-test mobile-test  ## Run all tests.

lint: backend-lint  ## Run all lint checks.
