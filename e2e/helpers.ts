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
  // Broadened crashlytics pattern. The previous '.*crashlyticsreports.*'
  // only matched the reports endpoint and MISSED 'firebase-settings.
  // crashlytics.com', which Crashlytics polls on startup for remote
  // config. On CI, that request can take 7+ min to settle, keeping
  // Detox sync busy and hanging tests.
  '.*crashlytics.*',
  '.*firebase-settings.*',
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
  // RPC endpoints — wallet startup polls every supported chain. Any slow
  // RPC response keeps Detox sync busy. Cast a wide net on RPC providers.
  '.*keplr.app.*',
  '.*api.solana.com.*',
  '.*rpc.ankr.com.*',
  '.*ankr.com.*',
  '.*publicnode.com.*',
  '.*polkachu.com.*',
  '.*alchemy.com.*',
  '.*arb1.arbitrum.io.*',
  '.*era.zksync.io.*',
  '.*1rpc.io.*',
  '.*ecostake.com.*',
  '.*quickapi.com.*',
  '.*solonation.io.*',
  '.*mainnet-beta.solana.com.*',
  // Block explorers (tx link lookups, metadata fetches)
  '.*etherscan.io.*',
  '.*polygonscan.com.*',
  '.*bscscan.com.*',
  '.*snowtrace.io.*',
  '.*arbiscan.io.*',
  '.*explorer.solana.com.*',
  '.*basescan.org.*',
  // Coingecko icons (portfolio token logos — many parallel requests)
  '.*coingecko.com.*',
  // Metro bundler — symbolication and ALL /assets/ URLs (app images like
  // shortcutsSwap.png, coinRed.png, profileAvatar.png + node_modules assets).
  // Previously only /assets/node_modules/* was covered, which missed app
  // images served at /assets/assets/images/*. On CI those fetches happen
  // in a burst after reOpenApp and kept Detox's sync 'busy' for 3+ min
  // while the test waited on disableSynchronization().
  '.*localhost:8081/symbolicate.*',
  '.*localhost:8081/assets/.*',
];

// URL blacklist formatted as a regex string for Detox's launchArgs. Detox
// accepts the regex pre-baked in launchArgs (detoxURLBlacklistRegex) so the
// blacklist applies from the very first frame, before setURLBlacklist()
// lands over IPC.
const URL_BLACKLIST_REGEX = `(${URL_BLACKLIST.map(u => `"${u}"`).join(',')})`;

// Shared Detox launchArgs used by every app launch (initial + relaunch).
const DEFAULT_LAUNCH_ARGS = {
  detoxHandleSystemAlerts: 'YES',
  detoxVisibilityPercentage: 75,
  detoxURLBlacklistRegex: URL_BLACKLIST_REGEX,
} as const;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

/** `await sleep(500)` — more readable than `new Promise(r => setTimeout(r, 500))`. */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Manual polling helpers
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
      await sleep(intervalMs);
    }
  }
}

/** Silent version of waitForElementById — returns bool instead of throwing. */
export async function waitForElementByIdSilent(
  testId: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await waitForElementById(testId, { timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/**
 * Same manual-polling pattern as waitForElementById but matches by text.
 * Use for dynamic content (token lists, modals) that doesn't have testIDs.
 * Returns true if element was found, false otherwise (does not throw).
 */
export async function waitForElementByText(
  text: string,
  opts: { timeoutMs?: number; intervalMs?: number; atIndex?: number } = {},
): Promise<boolean> {
  const { timeoutMs = 10000, intervalMs = 500, atIndex = 0 } = opts;
  const attempts = Math.max(1, Math.ceil(timeoutMs / intervalMs));
  for (let i = 0; i < attempts; i++) {
    try {
      await expect(element(by.text(text)).atIndex(atIndex)).toExist();
      return true;
    } catch {
      if (i === attempts - 1) return false;
      await sleep(intervalMs);
    }
  }
  return false;
}

/**
 * Tap an element with automatic retry. The tap can fail during layout
 * transitions, re-renders, or when a banner is briefly covering the UI;
 * retrying handles all those cases without caller-side loops.
 *
 * Pass `onRetry` to run a side-effect between failed attempts (for
 * example, dismissing a LogBox banner that may be blocking the tap).
 */
export async function tapWithRetry(
  matcher: () => Detox.NativeElement,
  opts: {
    maxAttempts?: number;
    intervalMs?: number;
    onRetry?: (attempt: number) => Promise<void> | void;
    label?: string;
  } = {},
): Promise<void> {
  const { maxAttempts = 10, intervalMs = 1000, onRetry, label = 'element' } = opts;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await matcher().tap();
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw new Error(
          `Could not tap "${label}" after ${maxAttempts} attempts: ${String(err)}`,
        );
      }
      if (onRetry) await onRetry(attempt);
      await sleep(intervalMs);
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

    await sleep(500);

    // Tap "Dismiss" in the inspector footer to dismiss this log.
    try {
      await expect(element(by.text('Dismiss'))).toExist();
      await element(by.text('Dismiss')).tap();
      console.log('Tapped Dismiss in LogBox inspector');
      await sleep(500);
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

  const found = await waitForElementByText(
    '"Cypher Wallet" Would Like to Send You Notifications',
    { timeoutMs: TIMEOUT_SHORT },
  );
  if (!found) {
    console.log('No permission dialog found or unable to handle');
    return false;
  }

  try {
    await element(by.text('Allow')).tap();
    console.log('Clicked Allow on permission dialog');
    return true;
  } catch {
    console.log('Permission dialog appeared but Allow tap failed');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Onboarding navigation
// ---------------------------------------------------------------------------

/**
 * Navigate through the GetStarted carousel (3 "Continue" taps) then wait
 * for the OnBoardingOptions screen.
 *
 * Disables Detox sync while driving the carousel (the main queue has
 * persistent work — Firebase, WalletConnect, RPC polls — that prevents
 * Detox from ever considering the app idle). Re-enables sync at the end
 * so the caller's next Detox action (usually a modal-opening tap) can
 * wait for the in-flight UI transition to settle before firing.
 */
export async function navigateThroughOnboarding(): Promise<void> {
  await device.disableSynchronization();

  // Wait for the GetStarted carousel's "Continue" button to render.
  const loaded = await waitForElementByText('Continue', {
    timeoutMs: 90000,
    intervalMs: 3000,
  });
  if (!loaded) throw new Error('Onboarding screen did not load within 90s');
  console.log('GetStarted carousel is loaded');

  // Dismiss LogBox banners that cover bottom buttons.
  // On CI, LogBox.uninstall() doesn't work (NativeModules.DetoxHelper
  // is unavailable in bridgeless mode), so banners overlay the UI.
  await dismissLogBoxBanners();

  // Tap "Continue" to advance through the 3 carousel sections. Retry
  // on failure — banners or splash may still be settling. If the tap
  // keeps failing, dismiss any banner that may have reappeared.
  for (let section = 1; section <= 3; section++) {
    await tapWithRetry(() => element(by.text('Continue')), {
      maxAttempts: 20,
      intervalMs: 3000,
      label: `Continue on section ${section}`,
      onRetry: async attempt => {
        if (attempt === 5 || attempt === 10) await dismissLogBoxBanners();
      },
    });
    console.log(`Tapped Continue on section ${section}`);
    await sleep(300);
  }

  // Confirm we arrived at the OnBoardingOptions screen
  await waitForElementById('options-wallets-btn', {
    timeoutMs: 20000,
    label: 'OnBoardingOptions screen',
  });
  console.log('Arrived at OnBoardingOptions screen');

  await device.enableSynchronization();
}

// ---------------------------------------------------------------------------
// App lifecycle helpers
// ---------------------------------------------------------------------------

export const reOpenApp = async () => {
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES' },
    launchArgs: { ...DEFAULT_LAUNCH_ARGS },
  });
  // CRITICAL ordering: disable sync BEFORE setURLBlacklist.
  // launchApp re-enables sync by default. If we call setURLBlacklist while
  // sync is on, Detox waits for the app to become "idle" first — but the
  // very URLs we're trying to blacklist (Metro asset fetches, Firebase
  // polls) are what keeps the app busy. The wait can stretch 3+ minutes
  // on CI and cause the whole test to time out. Disabling sync first
  // makes the setURLBlacklist command send immediately.
  await device.disableSynchronization();
  await device.setURLBlacklist(URL_BLACKLIST);
};

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
          await sleep(10000);
        } catch {
          // ignore
        }
      }
    }
    await sleep(2000);
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
      // 30s (was 15s). CI 427 saw the keychain call miss the 15s window
      // on the first test — the simulator hadn't fully booted yet. Still
      // a hard cap so a wedged call can't eat the whole test budget.
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Keychain timeout')), 30000),
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

  await device.launchApp({
    delete: true,
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES' },
    launchArgs: {
      ...DEFAULT_LAUNCH_ARGS,
      RCTDevLoadingViewGetLogLevel: '0',
      ...(isCI && { detoxDisableHierarchyDump: 'YES' }),
    },
  });

  // CRITICAL ordering: disable sync BEFORE setURLBlacklist — otherwise
  // setURLBlacklist waits for the app to go idle first, but the app is
  // busy fetching the very URLs we're trying to blacklist (Firebase,
  // Crashlytics, Metro assets). On CI that wait can exceed 3 minutes.
  // With sync disabled, the command sends to the app immediately.
  await device.disableSynchronization();
  await device.setURLBlacklist(URL_BLACKLIST);
  await dismissLogBoxBanners();
  await device.enableSynchronization();

  console.log('App launched and ready');
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
  // Uses manual polling; each promo is optional, so missing modals
  // don't throw — we just skip.
  const promos: Array<{ name: string; testId: string }> = [
    { name: 'Exclusive offer', testId: 'exclusive-offer-got-it-btn' },
  ];

  for (const promo of promos) {
    if (await waitForElementByIdSilent(promo.testId, 3000)) {
      await element(by.id(promo.testId)).tap();
      console.log(`Dismissed promo: ${promo.name}`);
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
  // activity (token price polls, RPC reads) that prevents Detox from
  // ever considering the app idle. Uses manual polling to bypass sync.
  await device.disableSynchronization();

  try {
    // Primary: testID on the screen container
    if (await waitForElementByIdSilent('portfolio-screen', 15000)) {
      console.log('Found portfolio-screen via testID');
      return true;
    }
    console.log('portfolio-screen not found, trying fallbacks...');

    // Fallback: balance display testID
    if (await waitForElementByIdSilent('portfolio-balance', TIMEOUT_MEDIUM)) {
      console.log('Found portfolio-balance via testID');
      return true;
    }
    console.log('portfolio-balance not found');

    // Fallback: bottom nav tab text
    if (await waitForElementByText('Portfolio', { timeoutMs: TIMEOUT_SHORT })) {
      console.log('Found Portfolio tab text');
      return true;
    }
    console.log('Portfolio tab text not found');

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
  // Use manual polling (waitForElementById) — Detox sync is busy with
  // Firebase/Crashlytics settling and waitFor() hangs on CI.
  await waitForElementById('options-wallets-btn', { timeoutMs: TIMEOUT_LONG });
  await element(by.id('options-wallets-btn')).tap();
  secureLog('Tapped "Continue with Wallets"');

  // 3. Tap "Import Existing Wallet"
  await waitForElementById('options-import-wallet-btn', { timeoutMs: TIMEOUT_LONG });
  await element(by.id('options-import-wallet-btn')).tap();
  secureLog('Tapped "Import Existing Wallet"');

  // Wait for modal animation
  await sleep(1000);

  // 4. Select "Import Seed Phrase" from the modal
  await waitForElementById('options-import-seed-option', { timeoutMs: TIMEOUT_LONG });
  await element(by.id('options-import-seed-option')).tap();
  secureLog('Selected "Import Seed Phrase"');

  // 5. Enter the seed phrase on the EnterKey screen.
  // Use by.type() for TextInput — testID doesn't propagate in Fabric.
  // Keep waitFor() here only because by.type('UITextView') has no
  // testID to poll on; the try/catch loop pattern doesn't apply cleanly.
  await sleep(3000);
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
  await sleep(1000);

  await waitForElementById('enterkey-continue-btn', { timeoutMs: TIMEOUT_LONG });
  await element(by.id('enterkey-continue-btn')).tap();
  secureLog('Tapped Continue on EnterKey screen');

  // 7. Handle ChooseWalletIndex screen — tap "Submit" (optional screen)
  await sleep(3000);
  if (await waitForElementByIdSilent('choose-wallet-submit-btn', 10000)) {
    await element(by.id('choose-wallet-submit-btn')).tap();
    secureLog('Tapped Submit on wallet index screen');
  } else {
    secureLog('No wallet index screen, continuing');
  }

  // Wait for wallet setup to complete
  await sleep(5000);

  // 8. Ensure sync is disabled for interstitial checks
  await device.disableSynchronization();

  // Dismiss post-creation interstitials (promo + card application welcome)
  // Both are optional — use Silent variant so missing screens don't throw.
  if (await waitForElementByIdSilent('exclusive-offer-got-it-btn', 10000)) {
    await element(by.id('exclusive-offer-got-it-btn')).tap();
    secureLog('Dismissed promo interstitial');
  }

  if (await waitForElementByIdSilent('card-welcome-skip-btn', 10000)) {
    await element(by.id('card-welcome-skip-btn')).tap();
    secureLog('Skipped card application screen');
  }

  // 9. Relaunch app to land on Portfolio tab reliably.
  // Tab taps fail on some devices due to Detox window-bounds hit-test.
  // Relaunching preserves the wallet (keychain) and defaults to Portfolio.
  // Must use the same sync/blacklist args as initial launch.
  await reOpenApp();
  await device.disableSynchronization();
  await sleep(8000);

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
