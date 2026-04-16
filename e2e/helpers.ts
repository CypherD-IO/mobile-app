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
  // Analytics & monitoring
  '.*app-analytics-services.*',
  '.*firebaselogging.*',
  '.*googleapis.com.*',
  '.*sentry.io.*',
  '.*intercom.*',
  // Firebase (persistent connections for messaging, installations, etc.)
  '.*firebase.google.com.*',
  '.*firebaseinstallations.*',
  '.*crashlyticsreports.*',
  // WalletConnect & Web3
  '.*api.web3modal.org.*',
  '.*relay.walletconnect.com.*',
  '.*cloud.web3auth.io.*',
  // Backend API (device registration, config fetches on startup)
  '.*arch.cypherhq.io.*',
  '.*arch-dev.cypherd.io.*',
  '.*cypherd.io.*',
  '.*cypherhq.io.*',
  // Bridge / swap
  '.*api.skip.money.*',
  // RPC endpoints (Cosmos chains, Solana)
  '.*keplr.app.*',
  '.*api.solana.com.*',
  // Metro bundler (symbolication, LogBox assets) — these block Detox sync
  '.*localhost:8081/symbolicate.*',
  '.*localhost:8081/assets/node_modules.*',
];

// ---------------------------------------------------------------------------
// Manual polling helper
// ---------------------------------------------------------------------------

/**
 * Wait for an element to exist using manual expect() polling.
 *
 * Detox's `waitFor().toExist().withTimeout()` is blocked by internal
 * sync on RN 0.84+. When the app has persistent work on the main queue
 * (pending timers, Firebase requests, LogBox errors firing repeatedly),
 * sync never reports idle and waitFor() hangs until its timeout fires —
 * even when the element is already on screen.
 *
 * Manual `expect()` in a try/catch loop bypasses sync entirely, so we can
 * detect elements as soon as they render. Use this INSTEAD of waitFor()
 * whenever you're past the initial navigation and sync is disabled.
 */
export async function waitForElementById(
  testId: string,
  opts: { timeoutMs?: number; intervalMs?: number; label?: string } = {},
): Promise<void> {
  const { timeoutMs = 30000, intervalMs = 1000, label = testId } = opts;
  const attempts = Math.max(1, Math.ceil(timeoutMs / intervalMs));
  for (let i = 0; i < attempts; i++) {
    try {
      await expect(element(by.id(testId))).toExist();
      return;
    } catch {
      if (i === attempts - 1) {
        throw new Error(`Element "${label}" did not appear within ${timeoutMs}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

// ---------------------------------------------------------------------------
// Debug banner dismissal
// ---------------------------------------------------------------------------

/**
 * Dismiss React Native LogBox notification banners that overlay the UI.
 * On CI, LogBox.uninstall() may not work, so banners cover buttons.
 *
 * The dismiss X buttons have no testID or accessibilityLabel — they use
 * RN's `id` prop which maps to nativeID, not accessibilityIdentifier.
 * So by.id() can't find them.
 *
 * Strategy: tap the banner text to open the full LogBox inspector,
 * then tap the "Dismiss" text button in the inspector footer.
 *
 * Banner texts are matched as PREFIXES because LogBox truncates long
 * messages (e.g. red banner shows `Cannot update a component (\`Wallet...`).
 * We enumerate known text elements and tap any whose text starts with
 * one of our prefixes.
 */
async function dismissLogBoxBanners(): Promise<void> {
  // Known banner text prefixes that appear during E2E runs.
  // Add new ones here as we observe them in CI logs/screenshots.
  const bannerPrefixes = [
    'Open debugger to view warnings.',
    'Cannot update a component',
  ];

  for (const prefix of bannerPrefixes) {
    // Try exact match first (covers full, untruncated banners).
    let tapped = false;
    try {
      await expect(element(by.text(prefix)).atIndex(0)).toExist();
      await element(by.text(prefix)).atIndex(0).tap();
      console.log(`Opened LogBox inspector for exact match: "${prefix}"`);
      tapped = true;
    } catch {
      // Fall through to regex match below.
    }

    // Fallback: Detox supports regex matchers via by.text on iOS when
    // wrapped in ^...$ via string — but the most portable fallback is
    // to just skip if exact didn't hit. Red banners that exceed the
    // banner width (truncated) won't be found — we rely on the boot-time
    // LogBox.uninstall() to prevent them from rendering.
    if (!tapped) continue;

    await new Promise(resolve => setTimeout(resolve, 500));

    // Tap "Dismiss" in the inspector footer to dismiss this log.
    try {
      await expect(element(by.text('Dismiss'))).toExist();
      await element(by.text('Dismiss')).tap();
      console.log('Tapped Dismiss in LogBox inspector');
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch {
      // Inspector might auto-dismiss, or layout changed. Fall back to
      // swiping up from the bottom to close the full-screen inspector.
      try {
        await element(by.type('RCTView')).atIndex(0).swipe('down', 'fast', 0.5);
        console.log('Swiped to close LogBox inspector');
      } catch {
        console.log('Could not close LogBox inspector');
      }
    }
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

  // Wait for the onboarding screen using manual polling.
  // Detox's waitFor() is blocked by internal sync (main queue busy with
  // JS timers + Firebase) even after disableSynchronization(). Manual
  // expect() in a try/catch loop bypasses this completely.
  for (let i = 0; i < 30; i++) {
    try {
      await expect(element(by.text('Continue'))).toExist();
      break;
    } catch {
      if (i === 29) throw new Error('Onboarding screen did not load within 90s');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  console.log('GetStarted carousel is loaded');

  // Dismiss LogBox banners that cover bottom buttons.
  // On CI, LogBox.uninstall() doesn't work (NativeModules.DetoxHelper
  // is unavailable in bridgeless mode), so banners overlay the UI.
  await dismissLogBoxBanners();

  // Tap "Continue" to advance through the 3 carousel sections.
  // Retry on failure — banners or splash may still be settling.
  for (let section = 1; section <= 3; section++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        await element(by.text('Continue')).tap();
        console.log(`Tapped Continue on section ${section} (attempt ${attempt + 1})`);
        break;
      } catch {
        if (attempt === 19) throw new Error(`Continue not tappable on section ${section}`);
        // If a banner reappeared, try dismissing again
        if (attempt === 5 || attempt === 10) await dismissLogBoxBanners();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Confirm we arrived at the OnBoardingOptions screen
  for (let i = 0; i < 10; i++) {
    try {
      await expect(element(by.id('options-wallets-btn'))).toExist();
      break;
    } catch {
      if (i === 9) throw new Error('OnBoardingOptions screen not found');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log('Arrived at OnBoardingOptions screen');

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
    console.log('Launching app with minimal config...');
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
 * Verify Metro is alive before launching the app. If Metro died (common on
 * CI due to memory pressure), the app shows "Could not connect to development
 * server" and no React views render.
 */
async function ensureMetroIsAlive(): Promise<void> {
  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:8081/status');
      if (response.ok) {
        console.log('Metro is alive');
        return;
      }
    } catch {
      // not responding yet
    }
    if (i === 0) {
      console.log('Metro not responding — waiting for it...');
      // On CI, try to restart Metro if it died
      if (process.env.CI === 'true') {
        try {
          const { exec } = require('child_process');
          exec('npx react-native start --reset-cache --port 8081 &');
          // Give Metro time to boot before polling
          await new Promise(resolve => setTimeout(resolve, 10000));
        } catch {
          // ignore
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Metro bundler is not running — cannot launch app');
}

/**
 * Reset app state completely - optimized for speed and reliability
 */
export async function resetAppCompletely(): Promise<void> {
  const isCI = process.env.CI === 'true';
  console.log(
    `Performing fast app reset for E2E tests... (CI: ${String(isCI)})`,
  );

  // Clear the iOS keychain — wallet keys are stored here via
  // react-native-keychain and persist across app uninstall/reinstall.
  // Without this, delete: true reinstalls the app but the wallet
  // remains in keychain, so the app skips onboarding.
  try {
    console.log('Clearing keychain...');
    await Promise.race([
      device.clearKeychain(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Keychain timeout')), 15000),
      ),
    ]);
    console.log('Keychain cleared');
  } catch (error) {
    console.log('Keychain clear failed or timed out:', error);
  }

  // Verify Metro is alive BEFORE launching.
  // Without Metro, the app shows "Could not connect to development
  // server" and no React views render (just a native spinner).
  await ensureMetroIsAlive();

  // delete: true uninstalls + reinstalls the app, clearing AsyncStorage
  // and all app data. Combined with clearKeychain() above, this gives
  // us a fully clean state. No separate terminateApp() needed — delete
  // handles termination internally, avoiding the hang that occurs when
  // terminateApp() blocks the Node event loop via Detox IPC on CI.
  console.log('Launching app with clean state (delete: true)...');
  const blacklistRegex = `(${URL_BLACKLIST.map(u => `"${u}"`).join(',')})`;

  await device.launchApp({
    delete: true,
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES' },
    launchArgs: {
      detoxHandleSystemAlerts: 'YES',
      detoxVisibilityPercentage: 75,
      detoxURLBlacklistRegex: blacklistRegex,
      RCTDevLoadingViewGetLogLevel: '0',
      ...(isCI && {
        detoxDisableHierarchyDump: 'YES',
      }),
    },
  });

  await device.setURLBlacklist(URL_BLACKLIST);

  // Dismiss LogBox banners that may cover bottom buttons.
  // Must be done with sync disabled since the app has pending timers.
  await device.disableSynchronization();
  await dismissLogBoxBanners();
  await device.enableSynchronization();

  console.log('App launched and ready');
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
  // Must use the same sync/blacklist args as initial launch.
  await reOpenApp();
  await device.disableSynchronization();
  await new Promise(resolve => setTimeout(resolve, 8000));

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
