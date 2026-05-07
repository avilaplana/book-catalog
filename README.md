# Colophon

Personal book-catalog mobile app. See [`CONTEXT.md`](./CONTEXT.md) for the domain glossary and [`docs/slices/`](./docs/slices/) for the active product slice.

## Layout

```
backend/   Python 3.12 + FastAPI + uv
mobile/    React Native + Expo (TypeScript)
docs/      slices, ADRs, agent skill config
```

A top-level `Makefile` wraps the most common commands. Run `make help` to list them.

## Prerequisites

### `uv` (backend dependency manager)

```sh
brew install uv                                # macOS, recommended
# or, cross-platform:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

`uv` brings its own managed Python — you do not need to install Python 3.12 separately.

### Node + `npm` (mobile)

```sh
brew install node                              # macOS, recommended
# or, with nvm:
nvm install --lts
```

Anything from Node 20 LTS onward works.

### Docker (local Postgres)

The backend talks to a local Postgres started via [`docker-compose.yml`](./docker-compose.yml). Any Docker runtime works (Docker Desktop, Colima, OrbStack).

## Backend

The backend reads configuration from environment variables. For local dev, copy the template and fill in your values:

```sh
cp backend/.env.example backend/.env
# edit backend/.env
```

`.env` is gitignored and loaded at app startup via `python-dotenv`. Required keys:

- `GOOGLE_CLIENT_ID` — your Google OAuth 2.0 Client ID. **Not a secret** (it's the audience that signed Google ID tokens are checked against). Provision one in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
- `JWT_SECRET` — symmetric secret for our own access/refresh JWTs. Pick something random and at least 32 bytes; e.g. `openssl rand -hex 32`.
- `DATABASE_URL` — defaults to the local Docker Postgres at `localhost:5433`.

### Day-to-day commands

```sh
make backend-install      # uv sync
make backend-run          # docker up + alembic upgrade + uvicorn --reload on http://localhost:8000
make backend-test         # docker up + pytest
make backend-lint         # ruff check + ruff format --check
make backend-format       # ruff format
make db-shell             # psql into the local Postgres
make db-down              # stop Postgres
```

`make backend-run` ensures Postgres is up and migrations are applied before launching uvicorn. Open <http://localhost:8000/v1/health> to confirm the server is up.

## Mobile

Bootstrapped with [Expo](https://docs.expo.dev/).

```sh
make mobile-install       # npm install
make mobile-web           # browser
make mobile-ios           # iOS Simulator (macOS only)
make mobile-android       # Android Emulator
```

The mobile app fetches `http://localhost:8000/v1/health` on launch and shows the result. Start the backend first (`make backend-run`).

**Network note:** `localhost` works from the iOS Simulator and the web target. From the Android Emulator, the host machine is reachable at `10.0.2.2` instead of `localhost` — edit `HEALTH_URL` in `mobile/App.tsx` if you target Android. From a physical device, use your machine's LAN IP.
