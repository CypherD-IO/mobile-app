import { device, element, by, waitFor } from 'detox';
import {
  navigateThroughOnboarding,
  resetAppCompletely,
  checkForPortfolioScreen,
  getSecureTestSeedPhrase,
  secureLog,
  performSecureOperation,
  waitForElementById,
} from './helpers';

// Get seed phrase securely from environment or fallback
const TEST_RECOVERY_PHRASE = getSecureTestSeedPhrase();

describe('Import Wallet Flow', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 240000 : 120000,
  );

  it('should navigate through onboarding screens and import a wallet', async () => {
    secureLog('Starting import wallet flow test...');

    // Navigate through the 3-screen carousel (manages its own sync)
    await navigateThroughOnboarding();

    // Disable sync for the rest of the import flow.
    // IMPORTANT: Use waitForElementById (manual polling) instead of
    // waitFor().toExist().withTimeout() — Detox sync is blocked by
    // background Firebase/RPC calls on CI even with sync disabled
    // at the device level, so waitFor() hangs until timeout.
    await device.disableSynchronization();

    // Tap "Continue with Wallets"
    await waitForElementById('options-wallets-btn', { timeoutMs: 15000 });
    await element(by.id('options-wallets-btn')).tap();
    secureLog('Tapped "Continue with Wallets"');

    // Tap "Import Existing Wallet"
    await waitForElementById('options-import-wallet-btn', { timeoutMs: 10000 });
    await element(by.id('options-import-wallet-btn')).tap();
    secureLog('Tapped "Import Existing Wallet"');

    // Wait for modal slide-in animation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Tap "Import Seed Phrase"
    await waitForElementById('options-import-seed-option', { timeoutMs: 10000 });
    await element(by.id('options-import-seed-option')).tap();
    secureLog('Selected Import Seed Phrase');

    // Wait for EnterKey screen to appear after modal navigation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Enter seed phrase — use replaceText WITHOUT tap() to avoid triggering
    // the keyboard, which covers the Continue button at the bottom.
    // NOTE: Keeping waitFor() here because by.type('UITextView') has no
    // testID to poll on — manual polling by type is not well-supported.
    await performSecureOperation(async () => {
      const seedInput = element(by.type('UITextView')).atIndex(0);
      await waitFor(seedInput).toExist().withTimeout(10000);
      // replaceText sets native text but may not fire onChangeText in Fabric.
      // Type+backspace to ensure onChange fires with the correct 12 words.
      await seedInput.replaceText(TEST_RECOVERY_PHRASE + 'x');
      await seedInput.tapBackspaceKey();
      secureLog(
        'Successfully entered recovery phrase',
        TEST_RECOVERY_PHRASE,
      );
    }, 'Seed Phrase Entry');

    // Tap the Return/Enter key on the keyboard to dismiss it
    await element(by.type('UITextView')).atIndex(0).tapReturnKey();

    // Now Continue button should be visible
    await waitForElementById('enterkey-continue-btn', { timeoutMs: 10000 });
    await element(by.id('enterkey-continue-btn')).tap();
    secureLog('Tapped Continue on import screen');

    // Handle ChooseWalletIndex screen — wait for navigation, then tap Submit
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      await waitForElementById('choose-wallet-submit-btn', { timeoutMs: 10000 });
      await element(by.id('choose-wallet-submit-btn')).tap();
    } catch {
      // Fallback: testID may not propagate on Button in Fabric
      await waitFor(element(by.text('Submit')))
        .toExist()
        .withTimeout(5000);
      await element(by.text('Submit')).tap();
    }
    secureLog('Tapped Submit on wallet index screen');

    // Wait for wallet setup to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Dismiss post-import interstitials if they appear (promo + card welcome).
    // Both are optional — skip silently if not present.
    try {
      await waitForElementById('exclusive-offer-got-it-btn', { timeoutMs: 10000 });
      await element(by.id('exclusive-offer-got-it-btn')).tap();
      secureLog('Dismissed promo interstitial');
    } catch {
      secureLog('No promo screen, continuing');
    }

    try {
      await waitForElementById('card-welcome-skip-btn', { timeoutMs: 10000 });
      await element(by.id('card-welcome-skip-btn')).tap();
      secureLog('Skipped card application screen');
    } catch {
      secureLog('No card application screen, continuing');
    }

    // Navigate to Portfolio tab
    try {
      await element(by.id('tab-portfolio')).tap();
      secureLog('Tapped Portfolio tab');
    } catch {
      secureLog('Portfolio tab tap failed, may already be on portfolio');
    }

    // Verify we reached the portfolio screen
    const portfolioDetected = await checkForPortfolioScreen();
    if (!portfolioDetected) {
      throw new Error(
        'Wallet import failed - could not reach portfolio screen',
      );
    }
    secureLog('Import wallet flow completed successfully');
  });
});
