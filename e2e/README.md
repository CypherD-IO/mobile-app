# End-to-End Testing for CypherD Mobile App

This directory contains end-to-end (E2E) tests for the CypherD mobile app using Detox.

## Setup Requirements

1. Xcode (for iOS testing)
2. Android Studio (for Android testing)
3. `applesimutils` installed via Homebrew:
   ```bash
   brew tap wix/brew
   brew install applesimutils
   ```

## Available Tests

- `firstTest.test.ts`: Basic app launch test to verify the app loads correctly
- `onboardingFlow.test.ts`: Test for the entire onboarding flow that creates a new wallet
- `importWalletFlow.test.ts`: Test for importing a wallet using a seed phrase
- `qrScannerFlow.test.ts`: Test for the QR scanner functionality

## Helper Functions

The `helpers.ts` file contains reusable functions for common test operations:

- Handling permission dialogs
- Navigating through onboarding screens
- Finding UI elements with fallbacks for different labeling approaches
- Resetting app state completely
- Waiting for UI transitions

## Running Tests

### Build First

Before running tests, you need to build the app with Detox:

```bash
npm run e2e:build:ios  # For iOS
npm run e2e:build:android  # For Android
```

### Running All Tests

To run all tests (after building):

```bash
npm run e2e:test:ios  # For iOS
npm run e2e:test:android  # For Android
```

### Running a Specific Test

To run a specific test file:

```bash
npm run e2e:test:ios:single "importWalletFlow.test.ts"
```

### Complete Clean Test Workflow

To fully reset the simulator and run tests with a clean state:

```bash
npm run e2e:clean-test:ios  # Run all tests with clean simulator
npm run e2e:clean-test:ios:single "importWalletFlow.test.ts"  # Run specific test with clean simulator
```

For the complete workflow (prepare environment, build, clean simulator, and run all tests):

```bash
npm run e2e:full-workflow
```

## Troubleshooting

### Permission Issues

Tests are configured to pre-grant permissions and handle remaining permission dialogs. If you're still encountering permission issues:

1. Make sure `applesimutils` is installed
2. Check the Detox configuration in `.detoxrc.js` to ensure permissions are included

### Simulator Issues

If tests are failing due to simulator issues:

1. Reset the simulator:

   ```bash
   npm run e2e:reset-sim
   ```

2. Check the iOS device ID in `scripts/prepare-test-environment.sh` matches your available simulator

### Flaky Tests

If tests are inconsistent:

- Increase timeouts in the wait statements
- Add more delay between actions
- Use the helper functions in `helpers.ts` which include fallback strategies

## Adding New Tests

1. Create a new test file in the e2e directory
2. Use the helper functions from `helpers.ts` for common operations
3. Include multiple fallback strategies for finding UI elements
4. Use proper async/await and timeouts
5. Add detailed logging with `console.log`
