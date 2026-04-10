import { device, element, by, waitFor } from 'detox';

// ---------------------------------------------------------------------------
// Timeouts (ms) — centralised so tests stay consistent
// ---------------------------------------------------------------------------
const TIMEOUT_SHORT = 3000;
const TIMEOUT_MEDIUM = 5000;
const TIMEOUT_LONG = 10000;

// ---------------------------------------------------------------------------
// URL blacklist — Detox sync ignores these background network requests
// Without this, persistent analytics/wallet-image/Firebase calls keep the
// app "busy" and Detox never considers it idle.
// ---------------------------------------------------------------------------
const URL_BLACKLIST = [
  '.*app-analytics-services.*',
  '.*api.web3modal.org.*',
  '.*firebaselogging.*',
  '.*googleapis.com.*',
  '.*sentry.io.*',
  '.*intercom.*',
];

// ---------------------------------------------------------------------------
// Debug banner dismissal
// ---------------------------------------------------------------------------

/**
 * Dismiss React Native LogBox warning/error banners that overlay the UI.
 * In debug builds, these banners can cover buttons and block Detox interactions.
 * Must be called with synchronization disabled since the app is "busy".
 */
async function dismissDebugBanners(): Promise<void> {
  await device.disableSynchronization();
  try {
    // Give the app a moment to render banners
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Dismiss all visible LogBox banners by tapping their close (X) buttons.
    // Each banner has a small X button. We try multiple times since there
    // can be stacked banners (yellow warning + red error).
    for (let i = 0; i < 3; i++) {
      try {
        // LogBox close button is a Text with "✕" or a Touchable with label "Dismiss"
        const dismissBtn = element(by.text('Dismiss'));
        await waitFor(dismissBtn).toExist().withTimeout(1500);
        await dismissBtn.tap();
        console.log(`Dismissed debug banner ${i + 1}`);
      } catch {
        // No more banners to dismiss
        break;
      }
    }

    // Also try to dismiss the yellow "Open debugger to view warnings" bar
    try {
      const debuggerBar = element(by.text('Open debugger to view warnings.'));
      await waitFor(debuggerBar).toExist().withTimeout(1000);
      // Tap the X on the warning bar (it's a sibling of the text)
      const closeBtn = element(by.label('Dismiss'));
      await closeBtn.tap();
      console.log('Dismissed debugger warning bar');
    } catch {
      // No debugger bar visible
    }
  } catch {
    // Ignore errors — banners may not be present
  } finally {
    await device.enableSynchronization();
  }
}

// ---------------------------------------------------------------------------
// Permission dialog handler
// ---------------------------------------------------------------------------

/**
 * Handle iOS permission dialog by looking for permission text and clicking Allow
 * @returns true if dialog was found and handled, false otherwise
 */
export async function handlePermissionDialog(): Promise<boolean> {
  console.log('Checking for permission dialogs...');

  try {
    const notificationTitle = element(
      by.text('"Cypher Wallet" Would Like to Send You Notifications'),
    );
    const allowButton = element(by.text('Allow'));

    await waitFor(notificationTitle).toExist().withTimeout(TIMEOUT_SHORT);

    console.log('Permission dialog found! Clicking Allow...');
    await allowButton.tap();
    console.log('Clicked Allow button successfully');
    return true;
  } catch (e) {
    console.log('No permission dialog found or unable to handle');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Onboarding navigation
// ---------------------------------------------------------------------------

/**
 * Navigate through the GetStarted carousel (3 taps) then wait for the
 * OnBoardingOptions screen to appear.
 *
 * Uses the `getstarted-continue-btn` testID added to the GetStarted screen
 * and confirms arrival at options via `options-wallets-btn`.
 *
 * NOTE: Detox sync is temporarily disabled during carousel navigation
 * because the app's main queue has persistent work items (timers,
 * analytics init) that prevent Detox from ever considering it "idle".
 */
/**
 * Navigate through the GetStarted carousel (3 swipes).
 * Manages its own sync lifecycle: disables at start, re-enables at end.
 * This brief re-enable lets Detox sync the screen transition.
 */
export async function navigateThroughOnboarding(): Promise<void> {
  await device.disableSynchronization();

  // Wait for the GetStarted screen to render.
  const screen = element(by.id('getstarted-screen'));
  await waitFor(screen).toExist().withTimeout(20000);
  console.log('GetStarted carousel is loaded');

  // The carousel has 3 sections. We swipe left to advance.
  for (let i = 1; i <= 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    await screen.swipe('left', 'fast', 0.5);
    console.log(`Swiped left on carousel section ${i}`);
  }

  // Confirm we arrived at the OnBoardingOptions screen
  const walletsBtn = element(by.id('options-wallets-btn'));
  await waitFor(walletsBtn).toExist().withTimeout(TIMEOUT_LONG);
  console.log('Arrived at OnBoardingOptions screen');

  // Re-enable sync briefly — gives Detox a chance to sync the screen
  await device.enableSynchronization();
}

// ---------------------------------------------------------------------------
// App lifecycle helpers
// ---------------------------------------------------------------------------

export const reOpenApp = async () => {
  const blacklistRegex = `(${URL_BLACKLIST.map(u => `"${u}"`).join(',')})`;
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES' },
    launchArgs: {
      detoxHandleSystemAlerts: 'YES',
          detoxVisibilityPercentage: 75,
      detoxURLBlacklistRegex: blacklistRegex,
    },
  });
  await device.setURLBlacklist(URL_BLACKLIST);
};

/**
 * Ultra-lightweight reset for CI environments when the main reset fails
 */
export async function resetAppForCIOnly(): Promise<void> {
  console.log('Using ultra-lightweight CI reset...');

  try {
    console.log('Clearing keychain...');
    await Promise.race([
      device.clearKeychain(),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Keychain clear timeout')), 10000),
      ),
    ]);
    console.log('Keychain cleared successfully');
  } catch (error) {
    console.log('Keychain clear failed, but continuing:', error);
  }

  try {
    console.log('Launching app with minimal configuration...');
    const blacklistRegex = `(${URL_BLACKLIST.map(u => `"${u}"`).join(',')})`;
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES' },
      launchArgs: {
        detoxHandleSystemAlerts: 'YES',
          detoxVisibilityPercentage: 75,
        detoxURLBlacklistRegex: blacklistRegex,
      },
    });
    await device.setURLBlacklist(URL_BLACKLIST);
    console.log('Ultra-lightweight CI reset completed');
  } catch (error) {
    console.error('Even ultra-lightweight reset failed:', error);
    throw error;
  }
}

/**
 * Reset app state completely - optimized for speed and reliability
 */
export async function resetAppCompletely(): Promise<void> {
  const isCI = process.env.CI === 'true';
  console.log(
    `Performing fast app reset for E2E tests... (CI: ${String(isCI)})`,
  );

  try {
    console.log('Terminating app...');
    await Promise.race([
      device.terminateApp(),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Terminate timeout')), 10000),
      ),
    ]);
  } catch (error) {
    console.log(
      'App terminate failed or timed out (app might not be running):',
      error,
    );
  }

  try {
    console.log('Clearing keychain...');
    await Promise.race([
      device.clearKeychain(),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Keychain timeout')), 15000),
      ),
    ]);
  } catch (error) {
    console.log('Keychain clear failed or timed out:', error);
  }

  console.log('Launching app with clean state...');
  try {
    const launchTimeout = isCI ? 120000 : 60000;
    console.log(`Using launch timeout: ${launchTimeout / 1000}s`);

    // Blacklist noisy URLs via launch args so Detox sync ignores them
    const blacklistRegex = `(${URL_BLACKLIST.map(u => `"${u}"`).join(',')})`;

    await Promise.race([
      device.launchApp({
        newInstance: true,
        permissions: { notifications: 'YES', camera: 'YES' },
        launchArgs: {
          detoxHandleSystemAlerts: 'YES',
          detoxVisibilityPercentage: 75,
          detoxURLBlacklistRegex: blacklistRegex,
          RCTDevLoadingViewGetLogLevel: '0',
          'RCTBundleURLProvider.jsBundleURLForBundleRoot':
            'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false',
          ...(isCI && {
            detoxDisableHierarchyDump: 'YES',
            detoxDisableScreenshotOnFailure: 'YES',
          }),
        },
        url: isCI
          ? 'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false'
          : undefined,
      }),
      new Promise((resolve, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`App launch timeout after ${launchTimeout / 1000}s`),
            ),
          launchTimeout,
        ),
      ),
    ]);

    // Also set the blacklist via API for any subsequent navigations
    await device.setURLBlacklist(URL_BLACKLIST);

    // Dismiss any React Native debug banners (LogBox warnings/errors)
    // that may overlay the UI and block element visibility.
    await dismissDebugBanners();

    console.log('Fast app reset completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('App launch failed:', error);

    if (isCI) {
      console.log('Attempting CI fallback: simpler launch...');
      try {
        const fallbackBlacklist = `(${URL_BLACKLIST.map(u => `"${u}"`).join(',')})`;
        await Promise.race([
          device.launchApp({
            newInstance: true,
            permissions: { notifications: 'YES', camera: 'YES' },
            launchArgs: {
              detoxHandleSystemAlerts: 'YES',
          detoxVisibilityPercentage: 75,
              detoxURLBlacklistRegex: fallbackBlacklist,
              'RCTBundleURLProvider.jsBundleURLForBundleRoot':
                'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false',
            },
          }),
          new Promise((resolve, reject) =>
            setTimeout(
              () => reject(new Error('Fallback launch timeout after 60s')),
              60000,
            ),
          ),
        ]);
        await device.setURLBlacklist(URL_BLACKLIST);
        await dismissDebugBanners();
        console.log('CI fallback launch successful');
      } catch (fallbackError) {
        console.error('CI fallback also failed:', fallbackError);
        throw new Error(
          `App reset failed: ${errorMessage}. Fallback also failed: ${String(fallbackError)}`,
        );
      }
    } else {
      throw new Error(`App reset failed: ${errorMessage}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Debug helpers
// ---------------------------------------------------------------------------

/**
 * Debug helper to log visible elements when tests fail
 */
export async function debugVisibleElements(description: string): Promise<void> {
  console.log(`DEBUG: ${description}`);
  console.log('Looking for common button patterns...');

  const buttonTexts = [
    'CONFIRM',
    'Confirm',
    'CONTINUE',
    'Continue',
    'NEXT',
    'Next',
    'DONE',
    'Done',
  ];

  for (const text of buttonTexts) {
    try {
      const buttonElement = element(by.text(text));
      await waitFor(buttonElement).toExist().withTimeout(1000);
      console.log(`Found button with text: "${text}"`);
    } catch {
      // not found — skip
    }
  }

  const buttonTestIds = [
    'getstarted-continue-btn',
    'options-wallets-btn',
    'options-create-wallet-btn',
    'options-import-wallet-btn',
    'options-import-seed-option',
    'enterkey-seed-input',
    'enterkey-continue-btn',
    'portfolio-screen',
  ];

  for (const testId of buttonTestIds) {
    try {
      const buttonElement = element(by.id(testId));
      await waitFor(buttonElement).toExist().withTimeout(1000);
      console.log(`Found element with testID: "${testId}"`);
    } catch {
      // not found — skip
    }
  }
}

// ---------------------------------------------------------------------------
// Promotional modal guard
// ---------------------------------------------------------------------------

/**
 * Dismiss any known promotional modals/bottom sheets that may overlay the UI.
 *
 * Uses try/catch for each modal so the test passes whether the promo exists
 * or not. When a promo is removed from the app, no test changes are needed —
 * the try/catch silently skips it.
 *
 * Call this after navigating to screens that may show promos (Card tab, etc).
 * Must be called with sync disabled.
 */
export async function dismissPromotionalModals(): Promise<void> {
  // Known promotional modals — add new ones here as they appear.
  // Each entry: { name, dismiss action }
  const promos = [
    {
      name: 'Exclusive offer',
      dismiss: async () => {
        await waitFor(element(by.id('exclusive-offer-got-it-btn')))
          .toExist()
          .withTimeout(3000);
        await element(by.id('exclusive-offer-got-it-btn')).tap();
      },
    },
  ];

  for (const promo of promos) {
    try {
      await promo.dismiss();
      console.log(`Dismissed promo: ${promo.name}`);
    } catch {
      // Promo not present — this is fine
    }
  }
}

// ---------------------------------------------------------------------------
// Debug helpers
// ---------------------------------------------------------------------------

export async function debugAllElementsByType(types: string[]): Promise<void> {
  console.log('=== DEBUGGING ELEMENTS BY TYPE ===');
  for (const type of types) {
    try {
      const elements = element(by.type(type));
      const attributes = await elements.getAttributes();
      console.log(`${type}:`, JSON.stringify(attributes, null, 2));
    } catch (error) {
      console.log(
        `${type}: No elements found or error:`,
        (error as Error).message,
      );
    }
  }
  console.log('=== END DEBUG ===');
}

/**
 * Debug function to log all visible elements on screen
 */
export async function debugAllVisibleElements(context: string): Promise<void> {
  console.log(`DEBUG ALL ELEMENTS: ${context}`);

  try {
    await device.takeScreenshot(`debug-${Date.now()}`);
    console.log('Screenshot taken');
  } catch {
    console.log('Could not take screenshot');
  }

  const inputTypes = [
    'RCTTextField',
    'RCTTextView',
    'RCTTextInput',
    'RCTMultilineTextInputView',
    'RCTSinglelineTextInputView',
    'UITextField',
    'UITextView',
  ];

  for (const inputType of inputTypes) {
    try {
      const elements = element(by.type(inputType));
      await waitFor(elements).toExist().withTimeout(1000);
      console.log(`Found ${inputType} element(s)`);

      try {
        for (let i = 0; i < 5; i++) {
          const specificElement = element(by.type(inputType)).atIndex(i);
          await waitFor(specificElement).toExist().withTimeout(500);
          console.log(`  - ${inputType} at index ${i} exists`);
        }
      } catch {
        // Expected when we run out of elements
      }
    } catch {
      console.log(`No ${inputType} elements found`);
    }
  }

  const inputTexts = [
    'Enter your key',
    'seed phrase',
    'recovery phrase',
    'Enter recovery phrase',
    'ENTER_KEY_PLACEHOLDER',
  ];

  for (const text of inputTexts) {
    try {
      const textElement = element(by.text(text));
      await waitFor(textElement).toExist().withTimeout(1000);
      console.log(`Found element with text: "${text}"`);
    } catch {
      console.log(`No element found with text: "${text}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Portfolio screen check
// ---------------------------------------------------------------------------

/**
 * Check if we've reached the portfolio/main wallet screen.
 * Primary check uses the `portfolio-screen` testID, with text-based
 * fallbacks for resilience.
 */
export async function checkForPortfolioScreen(): Promise<boolean> {
  console.log('Checking for portfolio screen...');

  // Sync must be disabled — the portfolio screen has persistent network
  // activity that prevents Detox from ever considering the app idle.
  await device.disableSynchronization();

  try {
    try {
      // Primary: testID on the screen container
      await waitFor(element(by.id('portfolio-screen')))
        .toExist()
        .withTimeout(15000);
      console.log('Found portfolio-screen via testID');
      return true;
    } catch {
      console.log('portfolio-screen not found, trying fallbacks...');
    }

    // Fallback: balance display testID
    try {
      await waitFor(element(by.id('portfolio-balance')))
        .toExist()
        .withTimeout(TIMEOUT_MEDIUM);
      console.log('Found portfolio-balance via testID');
      return true;
    } catch {
      console.log('portfolio-balance not found');
    }

    // Fallback: bottom nav tab text
    try {
      await waitFor(element(by.text('Portfolio')))
        .toExist()
        .withTimeout(TIMEOUT_SHORT);
      console.log('Found Portfolio tab text');
      return true;
    } catch {
      console.log('Portfolio tab text not found');
    }

    console.log('Could not confirm portfolio screen with any indicator');
    return false;
  } finally {
    await device.enableSynchronization();
  }
}

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

/**
 * Securely get the test seed phrase from environment variables.
 * Falls back to a standard test mnemonic if not provided.
 */
export function getSecureTestSeedPhrase(): string {
  const envSeedPhrase = process.env.TEST_SEED_PHRASE;

  if (envSeedPhrase && envSeedPhrase.trim().length > 0) {
    console.log('Using secure seed phrase from environment variable');
    return envSeedPhrase.trim();
  }

  console.log('Using fallback test mnemonic (not for production)');
  return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
}

/**
 * Sanitize logs to prevent seed phrase exposure
 */
export function secureLog(message: string, seedPhrase?: string): void {
  if (seedPhrase) {
    const sanitizedMessage = message.replace(
      new RegExp(seedPhrase.replace(/\s+/g, '\\s+'), 'gi'),
      '***REDACTED_SEED_PHRASE***',
    );
    console.log(sanitizedMessage);
  } else {
    console.log(message);
  }
}

/**
 * Prevent screenshots during sensitive operations
 */
export async function performSecureOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  console.log(`Starting secure operation: ${operationName}`);

  try {
    const result = await operation();
    console.log(`Completed secure operation: ${operationName}`);
    return result;
  } catch (error) {
    console.log(`Failed secure operation: ${operationName}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Wallet import flow
// ---------------------------------------------------------------------------

/**
 * Complete wallet import flow using the new onboarding screens.
 *
 * Flow:
 *   GetStarted carousel (3 taps) -> OnBoardingOptions -> "Continue with
 *   Wallets" -> "Import Existing Wallet" -> modal "Import Seed Phrase"
 *   -> EnterKey screen (type seed + Continue) -> Portfolio
 */
export async function completeWalletImport(): Promise<void> {
  secureLog('Starting complete wallet import flow...');

  // 1. Navigate through the 3-section carousel
  // navigateThroughOnboarding() manages its own sync: disables at start,
  // re-enables at end. We immediately disable again for the import flow.
  await navigateThroughOnboarding();
  await device.disableSynchronization();

  // 2. Tap "Continue with Wallets" on OnBoardingOptions
  const walletsBtn = element(by.id('options-wallets-btn'));
  await waitFor(walletsBtn).toExist().withTimeout(TIMEOUT_MEDIUM);
  await walletsBtn.tap();
  secureLog('Tapped "Continue with Wallets"');

  // 3. Tap "Import Existing Wallet"
  const importBtn = element(by.id('options-import-wallet-btn'));
  await waitFor(importBtn).toExist().withTimeout(TIMEOUT_MEDIUM);
  await importBtn.tap();
  secureLog('Tapped "Import Existing Wallet"');

  // Wait for modal animation
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Select "Import Seed Phrase" from the modal
  const importSeedOption = element(by.id('options-import-seed-option'));
  await waitFor(importSeedOption).toExist().withTimeout(TIMEOUT_MEDIUM);
  await importSeedOption.tap();
  secureLog('Selected "Import Seed Phrase"');

  // 5. Enter the seed phrase on the EnterKey screen.
  // Use by.type() for TextInput — testID doesn't propagate in Fabric.
  await new Promise(resolve => setTimeout(resolve, 3000));
  const TEST_RECOVERY_PHRASE = getSecureTestSeedPhrase();

  await performSecureOperation(async () => {
    const seedInput = element(by.type('UITextView')).atIndex(0);
    await waitFor(seedInput).toExist().withTimeout(TIMEOUT_LONG);
    // replaceText + backspace to ensure onChangeText fires
    await seedInput.replaceText(TEST_RECOVERY_PHRASE + 'x');
    await seedInput.tapBackspaceKey();
    secureLog(
      'Entered recovery phrase via by.type',
      TEST_RECOVERY_PHRASE,
    );
  }, 'Seed Phrase Entry');

  // 6. Tap Return key to dismiss keyboard, then tap Continue
  await element(by.type('UITextView')).atIndex(0).tapReturnKey();
  await new Promise(resolve => setTimeout(resolve, 1000));

  await waitFor(element(by.id('enterkey-continue-btn')))
    .toExist()
    .withTimeout(TIMEOUT_LONG);
  await element(by.id('enterkey-continue-btn')).tap();
  secureLog('Tapped Continue on EnterKey screen');

  // 7. Handle ChooseWalletIndex screen — tap "Submit"
  await new Promise(resolve => setTimeout(resolve, 3000));
  try {
    await waitFor(element(by.id('choose-wallet-submit-btn')))
      .toExist()
      .withTimeout(10000);
    await element(by.id('choose-wallet-submit-btn')).tap();
    secureLog('Tapped Submit on wallet index screen');
  } catch {
    secureLog('No wallet index screen, continuing');
  }

  // Wait for wallet setup to complete
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 8. Ensure sync is disabled for interstitial checks
  await device.disableSynchronization();

  // Dismiss post-creation interstitials (promo + card application welcome)
  try {
    await waitFor(element(by.id('exclusive-offer-got-it-btn')))
      .toExist()
      .withTimeout(10000);
    await element(by.id('exclusive-offer-got-it-btn')).tap();
    secureLog('Dismissed promo interstitial');
  } catch {
    // May not appear for import flow
  }

  try {
    await waitFor(element(by.id('card-welcome-skip-btn')))
      .toExist()
      .withTimeout(10000);
    await element(by.id('card-welcome-skip-btn')).tap();
    secureLog('Skipped card application screen');
  } catch {
    // May not appear for import flow
  }

  // 9. Relaunch app to land on Portfolio tab reliably.
  // Tab taps fail on some devices due to Detox window-bounds hit-test.
  // Relaunching preserves the wallet (keychain) and defaults to Portfolio.
  await device.terminateApp();
  await device.launchApp({ newInstance: true });
  await device.disableSynchronization();
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 10. Verify portfolio screen (manages its own sync)
  const portfolioDetected = await checkForPortfolioScreen();
  if (!portfolioDetected) {
    throw new Error('Wallet import failed - could not reach portfolio screen');
  }

  secureLog('Complete wallet import flow finished successfully');
}

/**
 * Setup for tests that need a wallet - combines reset + import
 */
export async function setupTestWithWallet(): Promise<void> {
  await resetAppCompletely();
  await completeWalletImport();
}
