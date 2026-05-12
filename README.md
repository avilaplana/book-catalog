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
cp mobile/.env.example mobile/.env
# fill in the values in both .env files (see Backend / Mobile sections)

make backend-run     # docker up + alembic upgrade + uvicorn --reload
make mobile-web      # in another terminal — boots the app in a browser
make help            # any time, to list everything
```

`make backend-run` chains `db-up` → `migrate` → `uvicorn`, so a fresh checkout starts cleanly with one command. `.env` files are gitignored.

The full Google sign-in flow needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not Expo Go or the web target — either the EAS iOS Simulator build ([iOS Simulator (real Google sign-in)](#ios-simulator-real-google-sign-in)) or a local build onto a plugged-in iPhone ([Physical iOS device](#physical-ios-device)).

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
make backend-run          # docker up + alembic upgrade + uvicorn --reload on http://0.0.0.0:8000 (localhost + LAN)
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
make mobile-web           # browser (no Google sign-in — see note below)
make mobile-android       # Android Emulator
```

### Mobile env config

Copy the template and fill in:

```sh
cp mobile/.env.example mobile/.env
# edit mobile/.env
```

Required keys:

- `EXPO_PUBLIC_API_BASE_URL` — backend base URL. `http://localhost:8000` from the iOS Simulator or web target. `http://10.0.2.2:8000` from the Android Emulator. **On a physical device, your Mac's LAN IP** (`ipconfig getifaddr en0`), e.g. `http://192.168.1.42:8000` — `localhost` there means the phone itself. `make backend-run` binds uvicorn to `0.0.0.0` so this works; both devices must be on the same network.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — Google OAuth Web Client ID. Audience for the web target.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — Google OAuth iOS Client ID provisioned with this app's bundle ID (`io.colophon.book`). Required for sign-in on the iOS Simulator and on a physical iPhone. Add the same value to the backend's `GOOGLE_CLIENT_ID` (CSV) so the backend accepts the resulting tokens. The reversed form of this ID (`com.googleusercontent.apps.<id>`) is registered as a URL scheme in `mobile/app.json` so Google's OAuth redirect can return into the app on iOS — if you ever change the client ID, update that scheme too.

`EXPO_PUBLIC_*` vars are inlined by Metro when it bundles the JS, not into the native binary — change `mobile/.env`, restart Metro (`Ctrl-C` then `make mobile-ios` / `npx expo start --dev-client`), and reload the app. A native rebuild is only needed when native code or `app.json` changes.

### iOS Simulator (real Google sign-in)

Sign-in only works in a [development build](https://docs.expo.dev/develop/development-builds/introduction/) — Expo Go is blocked by Google's OAuth policy on the shared `host.exp.Exponent` bundle ID. The dev build is a custom client with our own bundle ID.

**Prerequisites**

- Xcode + an installed iOS Simulator runtime (`xcodebuild -downloadPlatform iOS`).
- An [Expo account](https://expo.dev) and `eas-cli` (`npm i -g eas-cli`).
- `eas login` once. The project is already linked (`mobile/app.json` has the EAS `projectId`); no need to re-init.
- A Google OAuth iOS Client ID for bundle ID `io.colophon.book`, set as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `mobile/.env` and added to backend `GOOGLE_CLIENT_ID` CSV.

**Build, install, run**

```sh
make mobile-build-ios     # ~10–15 min cloud build via EAS
make mobile-install-ios   # downloads + installs into the running Simulator
make mobile-ios           # starts Metro bound to the dev client
```

Rebuild (`mobile-build-ios`) only when native deps or `app.json` change. Day-to-day, just `make mobile-ios`.

### Physical iOS device

A local development build onto a plugged-in iPhone — no EAS needed. The camera-based ISBN scanner can only be exercised this way (the Simulator has no camera).

**Prerequisites**

- Xcode + Command Line Tools.
- An Apple ID added in **Xcode → Settings → Apple Accounts** (a free account works for personal-device signing — Xcode generates an "Apple Development" certificate on first build).
- iPhone connected and unlocked; tap **Confiar / Trust** on the "Trust this computer?" prompt.
- Same Google iOS Client ID and `mobile/.env` setup as the Simulator section above, plus `EXPO_PUBLIC_API_BASE_URL` pointed at your Mac's LAN IP (see [Mobile env config](#mobile-env-config)).
- Backend running and reachable: `make backend-run` (binds `0.0.0.0`).

**Build, install, run**

```sh
make mobile-run-ios-device   # = expo run:ios --device — prebuild + pod install + native build + install + Metro
```

First time only:

- Pick your iPhone when prompted; accept the keychain prompt for the signing key (**Always Allow**).
- After the build installs, iOS may refuse to open the app ("Untrusted Developer") — on the phone, **Settings → General → VPN & Device Management** → tap your developer profile → **Trust**.
- iOS may also prompt to enable **Developer Mode** (**Settings → Privacy & Security → Developer Mode**) — turn it on, let the phone reboot, confirm.

Then open Colophon on the phone; it connects to Metro over the LAN. Day-to-day, `make mobile-ios` (just Metro) is enough; re-run `make mobile-run-ios-device` only when native code or `app.json` changes.

### Web target

`make mobile-web` boots the app in a browser. Useful for screen layout work but Google sign-in does not complete here — `expo-auth-session/providers/google` on web returns access tokens only, not the ID tokens our backend verifies.
