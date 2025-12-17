# Cypherd Wallet

A multi-chain cryptocurrency wallet mobile app built with React Native, supporting Ethereum, Cosmos, Solana, and other blockchain networks.

> **Note**: The next step is to prototype the interaction between React Native app back to webview (response to JSON RPC calls). Interaction from WebView to React Native has already been implemented.

## Prerequisites

Before getting started, ensure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment).

### Required Configuration

1. **Sentry**: Configure in `sentry.properties` file
2. **Google Services**: Configure in the iOS plist file

## Getting Started

### Step 1: Install Dependencies

```sh
npm install
```

### Step 2: Install iOS Pods

For iOS, install CocoaPods dependencies:

```sh
# First time setup - install the Ruby bundler
bundle install

# Install pods (run this after every native dependency update)
bundle exec pod install
# OR
npm run pod-install
```

**M1/Apple Silicon specific:**

```sh
sudo arch -x86_64 gem install ffi
arch -x86_64 pod install
```

### Step 3: Run the App

**iOS:**

```sh
npm run ios
```

**Android:**

```sh
npm run android
```

**Both platforms simultaneously:**

```sh
npm start
```

## Available Scripts

| Command                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `npm run ios`           | Run on iOS Simulator (iPhone 16 Pro)            |
| `npm run android`       | Run on Android Emulator                         |
| `npm start`             | Run on both iOS and Android                     |
| `npm run pod-install`   | Install CocoaPods dependencies                  |
| `npm run clean-android` | Clean Android build with refreshed dependencies |
| `npm run lint`          | Run ESLint                                      |
| `npm run lint:fix`      | Run ESLint with auto-fix                        |
| `npm test`              | Run Jest tests                                  |

### E2E Testing (Detox)

| Command                     | Description                                 |
| --------------------------- | ------------------------------------------- |
| `npm run e2e:build:ios`     | Build for iOS E2E tests                     |
| `npm run e2e:test:ios`      | Run iOS E2E tests                           |
| `npm run e2e:build:android` | Build for Android E2E tests                 |
| `npm run e2e:test:android`  | Run Android E2E tests                       |
| `npm run e2e:full-workflow` | Prepare environment and run clean iOS tests |

## Troubleshooting

### Clear Cache

If you encounter module resolution issues, try the following steps:

1. Clear watchman watches:

   ```sh
   watchman watch-del-all
   ```

2. Delete `node_modules` and reinstall:

   ```sh
   rm -rf node_modules
   npm install
   ```

3. Reset Metro's cache:

   ```sh
   npm start -- --reset-cache
   ```

4. Remove Metro cache:
   ```sh
   rm -rf /tmp/metro-*
   ```

### Close App on Simulator

Press <kbd>Shift</kbd> + <kbd>Cmd</kbd> + <kbd>H</kbd> twice to open all apps, then swipe up to close.

## Technical Overview

### EIP-1193 Ethereum Provider

This app implements the [EIP-1193 Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193), which defines the standard for how dApps interact with the wallet through RPC calls using injected content-scripts by setting the `window.ethereum` object.

### WebView Communication

The app uses [react-native-webview](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#communicating-between-js-and-native) for bidirectional communication between the WebView and React Native.

### Node Polyfills

Due to React Native's environment, certain Node.js modules are polyfilled. The `postinstall` script automatically handles this using `rn-nodeify`:

```sh
./node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,fs' --hack
```

> **Note**: Each time you add a new npm package, the node modules will be automatically patched via the `postinstall` script.

## Analytics

![Repobeats analytics](https://repobeats.axiom.co/api/embed/6b56a18d1d04f0be2d12cef997469095a3e92039.svg 'Repobeats analytics image')
