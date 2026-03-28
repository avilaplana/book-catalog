.PHONY: setup install test run ios android

# Full setup: install Node via nvm + install dependencies + copy .env
setup: install
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example — fill in your API URL and Google client ID"; fi

# Install Node version from .nvmrc and npm dependencies
install:
	@echo "Loading nvm..."
	@. "$${NVM_DIR:-$$HOME/.nvm}/nvm.sh" && nvm install && nvm use && npm install

# Run tests (no device or backend needed)
test:
	npm test

# Start Expo dev server
run:
	npm start

# Open on iOS simulator
ios:
	npm run ios

# Open on Android emulator
android:
	npm run android
