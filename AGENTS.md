# AGENTS.md

## Cursor Cloud specific instructions

This is a **React Native** mobile wallet app (CypherD Wallet). On a Linux Cloud VM, native iOS/Android builds and simulators are unavailable; the main dev-loop surface is the **Metro bundler**, **ESLint**, and **Jest** unit tests.

### Key services

| Service | How to start | Notes |
|---|---|---|
| Metro bundler | `npx react-native start --reset-cache` | Listens on port 8081. Verify with `curl http://localhost:8081/status` |
| Lint | `npm run lint` | May crash on `src/proto-generated/cctp.ts`; add `--ignore-pattern 'src/proto-generated/**'` to work around |
| Unit tests | `npm test` | Without a root `jest.config.js`, Jest also picks up E2E (Detox) tests which always fail on Linux. Run unit tests only: `npx jest __tests__/` |

### Private package authentication

The `@cypherd-io/animated-charts` package is hosted on GitHub Packages and requires an `NPM_TOKEN` with `read:packages` scope. If `NPM_TOKEN` is unavailable, install the package from the public source repo instead:

```bash
NPM_TOKEN=dummy npm install github:CypherD-IO/react-native-animated-charts --legacy-peer-deps --no-package-lock
```

Then revert any `package.json` changes with `git checkout package.json`.

### Environment variables

A `.env` file is required at the project root for `react-native-config`. The CI script (`ios/ci_scripts/ci_post_clone.sh`) shows the expected variables. At minimum, populate: `SENTRY_DSN`, `ENVIRONMENT`, `INTERCOM_APP_KEY`, `INTERCOM_IOS_SDK_KEY`, `MOBILE_WALLETKIT_PROJECTID`, `MOBILE_APPKIT_PROJECTID`, `WEB3_AUTH_CLIENT_ID`, `HELIUS_API_KEY`. Set `IS_TESTING=true` for dev.

### Known limitations on Linux

- Full native builds (`react-native run-ios` / `run-android`) require macOS + Xcode or Android SDK.
- The offline JS bundle command (`npm run build:ios`) may fail with `net` module resolution from `@injectivelabs/sdk-ts` because Metro's `extraNodeModules` doesn't map `net`/`tls`. This is a pre-existing issue unrelated to environment setup.
- E2E tests (Detox) require an iOS Simulator or Android Emulator.
- The `__tests__/App-test.tsx` unit test fails with a CSS import parse error (`global.css`) because the project uses NativeWind and there is no Jest mock for `.css` imports at the project root.
