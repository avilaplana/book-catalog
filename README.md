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

## Quick start

```sh
# one-time setup
cp backend/.env.example backend/.env
# fill in GOOGLE_CLIENT_ID + JWT_SECRET in backend/.env

make backend-run     # docker up + alembic upgrade + uvicorn --reload
make mobile-web      # in another terminal
make help            # any time, to list everything
```

`make backend-run` chains `db-up` → `migrate` → `uvicorn`, so a fresh checkout starts cleanly with one command. `.env` is gitignored.

## Backend

The backend reads configuration from environment variables. For local dev, copy the template and fill in your values:

```sh
cp backend/.env.example backend/.env
# edit backend/.env
```

`.env` is gitignored and loaded at app startup via `python-dotenv`. Required keys:

- `GOOGLE_CLIENT_ID` — your Google OAuth 2.0 Client ID. **Not a secret** (it's the audience that signed Google ID tokens are checked against). Provision one in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials. Accepts a comma-separated list when you need to accept tokens minted for more than one client (e.g. a web client for the OAuth Playground curl flow plus an iOS client for the mobile app).
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

Bootstrapped with [Expo](https://docs.expo.dev/). The app shows Login → Library; signing in with Google exchanges the ID token at `/v1/auth/google` and lands on the empty-state Library screen.

```sh
make mobile-install       # npm install
make mobile-test          # jest
make mobile-web           # browser
make mobile-ios           # iOS Simulator (macOS only)
make mobile-android       # Android Emulator
```

### Mobile env config

Copy the template and fill in:

```sh
cp mobile/.env.example mobile/.env
# edit mobile/.env
```

Required keys:

- `EXPO_PUBLIC_API_BASE_URL` — backend base URL. `http://localhost:8000` from the iOS Simulator or web target. `http://10.0.2.2:8000` from the Android Emulator. Your machine's LAN IP for a physical device.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — same Google OAuth Web Client ID configured in the backend's `GOOGLE_CLIENT_ID`. Used as the audience of the ID token Google mints.

Anything prefixed `EXPO_PUBLIC_` is baked into the JS bundle at build time, so changes require restarting Metro (`make mobile-ios` / `mobile-web`).

## Manual end-to-end auth test

Until the mobile sign-in flow lands (Slice 1.1b, [#24](https://github.com/avilaplana/book-catalog/issues/24)), the only way to exercise `/v1/auth/google` end-to-end locally is by minting a Google ID token via the OAuth Playground and curling the backend.

### Prerequisites

- Backend running (`make backend-run`).
- A Google OAuth 2.0 Client ID configured in `backend/.env` (see [Backend](#backend)).
- `jq` installed (`brew install jq`) for the snippets below.

### 1. Mint a Google ID token

1. Open <https://developers.google.com/oauthplayground/>.
2. Top-right ⚙ → tick **"Use your own OAuth credentials"** → paste your Client ID + Client Secret. Close the panel.
3. **Step 1: Authorize APIs** — scroll to *Input your own scopes* and type:
   ```
   openid email profile
   ```
   Click **Authorize APIs** and sign in.
4. **Step 2** — click **Exchange authorization code for tokens**. Copy the `id_token` field. Valid for ~1 hour.

### 2. Run the auth flow

```sh
ID_TOKEN="<paste-id-token-here>"

# Sign in — backend verifies the Google token, upserts a User, returns our JWT pair.
RESPONSE=$(curl -s -X POST http://localhost:8000/v1/auth/google \
  -H 'Content-Type: application/json' \
  -d "{\"id_token\": \"$ID_TOKEN\"}")
echo "$RESPONSE" | jq
ACCESS=$(echo "$RESPONSE" | jq -r .access_token)
REFRESH=$(echo "$RESPONSE" | jq -r .refresh_token)

# Auth-gated route — should return 200 [] (empty Library).
curl -s -i http://localhost:8000/v1/library/books \
  -H "Authorization: Bearer $ACCESS"

# Refresh — returns a new pair; the input refresh becomes invalid.
curl -s -X POST http://localhost:8000/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\": \"$REFRESH\"}" | jq

# Replay the old refresh — should now 401 (single-use enforced).
curl -s -i -X POST http://localhost:8000/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\": \"$REFRESH\"}"
```

### 3. Verify DB persistence (optional)

```sh
make db-shell
# inside psql:
SELECT google_sub, email, display_name FROM users;
```

### Error paths to spot-check

```sh
# Garbage Google token → 401 application/problem+json
curl -s -i -X POST http://localhost:8000/v1/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"id_token": "garbage"}'

# No auth on a gated route → 401 application/problem+json
curl -s -i http://localhost:8000/v1/library/books
```
