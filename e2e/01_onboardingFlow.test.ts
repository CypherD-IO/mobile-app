import { device, element, by } from 'detox';
import {
  navigateThroughOnboarding,
  resetAppCompletely,
  reOpenApp,
  checkForPortfolioScreen,
  dismissPromotionalModals,
  waitForElementById,
} from './helpers';

describe('Onboarding Flow', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 360000 : 120000,
  );

  it('should navigate through onboarding and create a wallet', async () => {
    console.log('Starting onboarding flow test...');

    // Navigate through the 3-screen carousel (manages its own sync)
    await navigateThroughOnboarding();

    // Disable sync for the rest of the onboarding flow.
    // IMPORTANT: Use waitForElementById() (manual polling) instead of
    // waitFor().toExist().withTimeout() — Detox sync is perpetually
    // busy on CI (LogBox errors, pending timers) and waitFor() hangs
    // until timeout even when the element is on screen.
    await device.disableSynchronization();

    // Tap "Continue with Wallets"
    await waitForElementById('options-wallets-btn', { timeoutMs: 15000 });
    await element(by.id('options-wallets-btn')).tap();
    console.log('Tapped "Continue with Wallets"');

    // Tap "Create New Wallet"
    await waitForElementById('options-create-wallet-btn', { timeoutMs: 15000 });
    await element(by.id('options-create-wallet-btn')).tap();
    console.log('Tapped "Create New Wallet"');

    // Wait for modal slide-in animation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wait for the seed phrase count modal to appear
    await waitForElementById('options-12word-option', { timeoutMs: 15000 });
    await element(by.id('options-12word-option')).tap();
    console.log('Selected 12 Word Phrase');

    // Tap Continue in seed phrase count modal
    await waitForElementById('options-seedcount-continue-btn', { timeoutMs: 15000 });
    await element(by.id('options-seedcount-continue-btn')).tap();
    console.log('Tapped Continue in modal');

    // On seed phrase screen, tap Continue
    await waitForElementById('seedphrase-continue-btn', { timeoutMs: 20000 });
    await element(by.id('seedphrase-continue-btn')).tap();
    console.log('Tapped Continue on seed phrase screen');

    // Promo popup should appear after wallet creation.
    // Give wallet creation up to 30s on CI — this is where sync is most
    // blocked because Hermes + Firebase + WalletConnect all fire at once.
    await waitForElementById('exclusive-offer-got-it-btn', {
      timeoutMs: 30000,
      label: 'exclusive offer Got it button',
    });
    console.log('Verified: promo popup appeared after wallet creation');
    try {
      await element(by.id('exclusive-offer-got-it-btn')).tap();
      console.log('Dismissed Cypher Card promo screen');
    } catch {
      // Tap failed due to visibility — wait for auto-dismiss or swipe
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Card application welcome should appear
    try {
      await waitForElementById('card-welcome-skip-btn', { timeoutMs: 15000 });
      console.log('Verified: card application welcome appeared');
      await element(by.id('card-welcome-skip-btn')).tap();
      console.log('Skipped card application screen');
    } catch {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Dismiss any promotional modals on the Card screen
    await new Promise(resolve => setTimeout(resolve, 2000));
    await dismissPromotionalModals();

    // Verify card tab exists (confirms initial landing on Card page)
    await waitForElementById('tab-card', { timeoutMs: 15000 });
    console.log('Confirmed: Card tab exists after wallet creation');

    // Relaunch app to land on Portfolio (tab taps fail due to Detox
    // window-bounds hit-test). The wallet persists in keychain and
    // firstLaunchAfterWalletCreation is cleared, so the app defaults to
    // the Portfolio tab on relaunch. Must use reOpenApp() which includes
    // sync disable and URL blacklist args — bare launchApp hangs.
    await reOpenApp();
    await device.disableSynchronization();
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Verify portfolio screen
    const detected = await checkForPortfolioScreen();
    if (!detected) {
      throw new Error('Failed to reach portfolio screen after wallet creation');
    }
    console.log('Wallet creation flow completed successfully');
  });
});
