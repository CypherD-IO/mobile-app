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

The tests are numbered to run in sequence:

- `00_firstTest.test.ts`: Basic app launch test to verify the app loads correctly
- `01_onboardingFlow.test.ts`: Test for the entire onboarding flow that creates a new wallet
- `02_importWalletFlow.test.ts`: Test for importing a wallet using a seed phrase
- `03_loadCardFlow.test.ts`: Test for the complete load card flow

## Test Execution Order

Tests are configured to run in alphabetical order using a custom Jest sequencer. This ensures:

1. Basic app functionality is verified first
2. Onboarding is tested before wallet operations
3. Complex flows are tested after basic setup

## Helper Functions

The `helpers.ts` file contains reusable functions for common test operations:

- **App Management**: `resetAppCompletely()`, `handlePermissionDialog()`
- **Navigation**: `navigateThroughOnboarding()`, `findButton()`
- **Verification**: `checkForPortfolioScreen()`
- **Utilities**: `delay()`, `debugVisibleElements()`, `debugAllVisibleElements()`
- **Security**: `getSecureTestSeedPhrase()`, `secureLog()`, `performSecureOperation()`

## Environment Variables Setup

### For Local Development

1. **Create a test environment file** (this file is already created):

   ```bash
   # e2e/.env.test
   TEST_SEED_PHRASE=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
   ```

2. **The environment variables are automatically loaded** via:
   - `e2e/jest.setup.js`: Loads `.env.test` file using dotenv
   - `helpers.ts`: Has fallback dotenv loading for robustness

### For CI/CD (GitHub Actions)

Set environment variables in your CI/CD pipeline:

```bash
export TEST_SEED_PHRASE="your secure test seed phrase"
```

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
npm run e2e:test:ios:single "03_loadCardFlow.test.ts"
```

## Configuration

- **Jest Configuration**: `jest.config.js` - Main test runner configuration
- **Jest Setup**: `jest.setup.js` - Loads environment variables from `.env.test`
- **Test Sequencer**: `testSequencer.js` - Ensures alphabetical test execution
- **Detox Configuration**: `../.detoxrc.js` - Main Detox configuration
- **TypeScript**: `tsconfig.json` - TypeScript configuration for tests
- **Environment**: `.env.test` - Test environment variables

## Security Features

- **Secure Seed Phrase Handling**: Uses environment variables for test seed phrases
- **Log Sanitization**: Automatically redacts sensitive information from logs
- **Secure Operations**: Wraps sensitive operations to prevent data exposure
- **Multiple Environment Variable Support**: Tries multiple env var names for flexibility
- **Fallback Safety**: Uses safe test mnemonic if no secure phrase is provided

## Troubleshooting

### Permission Issues

Tests are configured to pre-grant permissions and handle remaining permission dialogs. If you're still encountering permission issues:

1. Make sure `applesimutils` is installed
2. Check the Detox configuration in `.detoxrc.js` to ensure permissions are included

### Environment Variable Issues

If environment variables are not loading:

1. **Check the `.env.test` file exists** in the `e2e/` directory
2. **Verify dotenv is installed**: `npm list dotenv`
3. **Check Jest setup**: Ensure `jest.setup.js` is configured in `jest.config.js`
4. **Manual verification**: The `getSecureTestSeedPhrase()` function will log which env var it's using

### Simulator Issues

If tests are failing due to simulator issues:

1. The tests automatically reset the simulator state
2. Check the iOS device ID in `.detoxrc.js` matches your available simulator

### Flaky Tests

If tests are inconsistent:

- Tests include multiple fallback strategies for finding UI elements
- Increase timeouts in the wait statements if needed
- Use the helper functions which include retry logic

## Adding New Tests

1. Create a new test file with the appropriate number prefix (e.g., `05_newFeature.test.ts`)
2. Use the helper functions from `helpers.ts` for common operations
3. Include multiple fallback strategies for finding UI elements
4. Use proper async/await and timeouts
5. Add detailed logging with `console.log` or `secureLog` for sensitive operations

## Environment Variables

- `TEST_SEED_PHRASE`: Secure seed phrase for wallet import tests (loaded from `.env.test` or system environment)
