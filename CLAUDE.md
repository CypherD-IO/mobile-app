# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CypherD Wallet (`cypherd-wallet`) — a React Native mobile crypto wallet app supporting iOS and Android. Built with React Native 0.83, React 19, TypeScript, and Hermes engine. Supports multiple blockchain networks (Ethereum, Polygon, Solana, Cosmos, Arbitrum, Optimism, BSC, Base, etc.) with WalletConnect integration, debit card functionality, and a built-in dApp browser.

## Build & Run Commands

```bash
# Install dependencies (runs postinstall rn-nodeify + patch-package automatically)
npm install
npx pod-install              # iOS CocoaPods (run from root)

# Run the app
npx react-native run-ios --simulator='iPhone 16 Pro'
npx react-native run-android
npx react-native start --reset-cache   # Metro bundler with cache reset

# Lint
npm run lint                 # ESLint across .js,.jsx,.ts,.tsx
npm run lint:fix

# Tests
npm test                     # Jest unit tests

# E2E tests (Detox)
npm run e2e:build:ios        # Build for iOS simulator
npm run e2e:test:ios         # Run all iOS e2e tests
npm run e2e:test:ios:single  # Run single e2e test (append test file)
npm run e2e:reset-sim        # Reset iOS simulator state
npm run e2e:clean-test:ios   # Reset sim + run tests
npm run e2e:full-workflow    # Prepare env + reset sim + run tests

# Build readiness
npm run check-build-readiness  # Verify Node, Xcode, CocoaPods, Detox, simulators

# Clean Android build
npm run clean-android
```

## Architecture

### App Entry & Context Providers
`App.tsx` is the root. It initializes Sentry, sets up deep linking (`cypherwallet://`, `ethereum:`, `solana:`, `https://app.cypherhq.io`), and nests multiple context providers:
- `ThemeProvider` — light/dark/system theme
- `GlobalContext` — app-wide global state
- `HdWalletContext` — HD wallet state (multi-chain addresses, balances)
- `ActivityContext` — transaction activity
- `WalletConnectContext` — WalletConnect v2 sessions
- `ModalContext` — modal management
- `BridgeContext` — cross-chain bridge state

All contexts use `useReducer` pattern with reducers in `src/reducers/`.

### Navigation
`src/routes/tabStack.tsx` — bottom tab navigator (Portfolio, Debit Card, Rewards, Options). Each tab has its own stack defined in `src/routes/auth.tsx`.

### Key Directories
- `src/containers/` — feature screens (Portfolio, DebitCard, Bridge, Browser, SendTo, DeFi, NFT, etc.)
- `src/components/` — shared UI components; `v2/` subdirectory has newer components
- `src/core/` — business logic: wallet operations (`HdWallet.tsx`), HTTP client (`Http.tsx`), async storage, analytics, swap, portfolio calculations
- `src/constants/` — enums (`enum.ts`), chain configs (`server.tsx`), screen titles (`index.tsx`)
- `src/reducers/` — context reducers for state management
- `src/styles/tailwindComponents.tsx` — NativeWind-wrapped RN components (CyDView, CyDText, etc.)
- `src/hooks/` — custom React hooks
- `src/models/` — TypeScript interfaces

### Styling Convention
Uses **NativeWind** (Tailwind CSS for React Native). All standard RN components are wrapped with NativeWind in `src/styles/tailwindComponents.tsx` and exported with `CyD` prefix:
- `CyDView`, `CyDText`, `CyDTextInput`, `CyDTouchOpacity`, `CyDImage`, `CyDFastImage`, etc.
- Use these `CyD*` components instead of raw RN components — the ESLint rule `react-native/no-raw-text` enforces `CyDText` for text content.
- Configure colors/fonts in `tailwind.config.js`.

### HTTP Client
`src/core/Http.tsx` exports a configured axios instance with retry logic (5 retries on 403/5xx). Sets `client` header with platform and version.

### Environment Variables
- Defined in `.env` at root
- Types declared in `src/types/env.d.ts`
- Import as `import { VARIABLE } from '@env'` (react-native-config)
- Use `process.env.APP_ENV` for environment checks

### Chain Configuration
`src/constants/server.tsx` defines supported chains via `ChainBackendNames` enum and `Chain` interface. `src/constants/enum.ts` has `AllChainsEnum` covering ETH, Polygon, Solana, Cosmos ecosystem, Tron, etc.

### Metro Resolver
`metro.config.js` has extensive custom resolution rules — forces CJS builds for valtio/zustand (Hermes doesn't support `import.meta`), redirects `libsodium-*-sumo` to non-WASM variants, and maps codegen spec files to source entrypoints for RN 0.83 compatibility.

## Code Conventions

- **Node >= 20** required
- Prettier: single quotes, trailing commas, 80 char width, `arrowParens: "avoid"`, `bracketSameLine: true`
- ESLint enforces: no inline styles, no unused styles, no raw text outside `CyDText`, split platform components
- `react-hooks/exhaustive-deps` is turned **off**
- After adding any npm package, `postinstall` runs `rn-nodeify` to polyfill Node builtins + `patch-package`
- GitHub Packages auth required (`NPM_TOKEN` env var) for `@cypherd-io` scoped packages
