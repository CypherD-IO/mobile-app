# CypherD Mobile Wallet

Multi-chain crypto wallet app built with React Native 0.83 + TypeScript for iOS and Android.

## Quick Commands

```bash
npm start                    # Start Metro bundler
npm run android              # Build & run Android
npm run ios                  # Build & run iOS (iPhone 16 Pro simulator)
npm test                     # Run Jest unit tests
npm run lint                 # ESLint
npm run lint:fix             # ESLint auto-fix
npm run clean-android        # Clean Android build
npm run pod-install          # Install CocoaPods
```

## Project Structure

- `src/components/` — Reusable UI components (`v2/` for modern ones)
- `src/containers/` — Screen/page containers organized by feature (Auth, Portfolio, SendTo, Bridge, DeFi, NFT, DebitCard, etc.)
- `src/core/` — Core business logic (HdWallet, Http, globalContext, analytics)
- `src/hooks/` — Custom React hooks (useWeb3, useEthSigner, useCosmosSigner, usePortfolio, useTransactionManager, etc.)
- `src/reducers/` — State reducers (hdwallet, activity, theme, bridge, wallet_connect, modal)
- `src/routes/` — Navigation stack definitions
- `src/styles/` — Styling utilities and custom `Cyd*` component wrappers
- `src/constants/` — Enums, types, and config
- `src/models/` — TypeScript interfaces
- `src/utils/` — Utility functions
- `src/i18n/` — Internationalization
- `e2e/` — Detox E2E tests

## Coding Conventions

### Components
- Functional components only (hooks-based)
- Use custom `Cyd*` wrappers from `src/styles/tailwindComponents.tsx`:
  - `CyDView`, `CyDText`, `CyDTouchView`, `CyDImage`, `CyDFastImage`, `CyDScrollView`, `CyDFlatList`, `CyDSafeAreaView`
- Named exports for reusable components, default exports for screens

### Styling
- **NativeWind + Tailwind CSS classes** via `className` prop
- CSS variables for theme colors: `var(--color-n0)` to `var(--color-n900)`, `var(--color-p0)` to `var(--color-p400)`, etc.
- No inline styles (ESLint enforced)
- No raw text outside `CyDText` (ESLint enforced)

### State Management
- Context API + useReducer for app-wide state (HdWalletContext, GlobalContext, ActivityContext, etc.)
- Valtio and Zustand for some features
- `@tanstack/react-query` for data fetching

### Naming
- PascalCase for components and interfaces
- camelCase for functions, variables, hooks
- UPPER_SNAKE_CASE for constants and enums
- Hooks prefixed with `use`

### Imports
1. React / React Native
2. Third-party libraries
3. Local imports

### Formatting
- Prettier: 80 char width, 2-space indent, trailing commas, single quotes
- All user-facing strings via i18next: `const { t } = useTranslation();`

## Tech Stack

- **React Native 0.83** / React 19 / TypeScript 5.8
- **Navigation:** @react-navigation v6 (native-stack, bottom-tabs)
- **Animations:** react-native-reanimated, Lottie
- **Web3:** ethers 6, @solana/web3.js, @cosmjs, WalletConnect v2, Web3Auth
- **Storage:** react-native-keychain, react-native-encrypted-storage
- **Monitoring:** @sentry/react-native, Firebase Analytics
- **Testing:** Jest + Detox (E2E)

## React Native Best Practices

For React Native performance and best practices guidelines, reference:
`.agents/skills/vercel-react-native-skills/AGENTS.md`

Key rules to follow from that guide:
- Use virtualized lists (FlashList) for large lists
- Animate only transform/opacity (GPU-accelerated properties)
- Use native stack navigators over JS-based ones
- Use Pressable over TouchableOpacity
- Avoid falsy `&&` in JSX conditional rendering
- Wrap all text in Text components
- Minimize state, derive values where possible
