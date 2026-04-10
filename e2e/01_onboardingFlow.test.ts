import { device, element, by, waitFor } from 'detox';
import {
  navigateThroughOnboarding,
  resetAppCompletely,
  checkForPortfolioScreen,
  dismissPromotionalModals,
} from './helpers';

describe('Onboarding Flow', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 180000 : 90000,
  );

  it('should navigate through onboarding and create a wallet', async () => {
    console.log('Starting onboarding flow test...');

    // Navigate through the 3-screen carousel (manages its own sync)
    await navigateThroughOnboarding();

    // Disable sync for the rest of the onboarding flow
    await device.disableSynchronization();

    // Tap "Continue with Wallets"
    await waitFor(element(by.id('options-wallets-btn')))
      .toExist()
      .withTimeout(10000);
    await element(by.id('options-wallets-btn')).tap();
    console.log('Tapped "Continue with Wallets"');

    // Tap "Create New Wallet"
    await waitFor(element(by.id('options-create-wallet-btn')))
      .toExist()
      .withTimeout(10000);
    await element(by.id('options-create-wallet-btn')).tap();
    console.log('Tapped "Create New Wallet"');

    // Wait for modal slide-in animation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wait for the seed phrase count modal to appear
    await waitFor(element(by.id('options-12word-option')))
      .toExist()
      .withTimeout(10000);
    await element(by.id('options-12word-option')).tap();
    console.log('Selected 12 Word Phrase');

    // Tap Continue in seed phrase count modal
    await waitFor(element(by.id('options-seedcount-continue-btn')))
      .toExist()
      .withTimeout(10000);
    await element(by.id('options-seedcount-continue-btn')).tap();
    console.log('Tapped Continue in modal');

    // On seed phrase screen, tap Continue
    await waitFor(element(by.id('seedphrase-continue-btn')))
      .toExist()
      .withTimeout(15000);
    await element(by.id('seedphrase-continue-btn')).tap();
    console.log('Tapped Continue on seed phrase screen');

    // Promo popup should appear after wallet creation
    // Assert it EXISTS (verifies flow), then tap (may fail on some devices
    // due to Detox window-bounds hit-test on bottom-positioned modals).
    await waitFor(element(by.id('exclusive-offer-got-it-btn')))
      .toExist()
      .withTimeout(10000);
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
      await waitFor(element(by.id('card-welcome-skip-btn')))
        .toExist()
        .withTimeout(10000);
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
    await waitFor(element(by.id('tab-card')))
      .toExist()
      .withTimeout(10000);
    console.log('Confirmed: Card tab exists after wallet creation');

    // Relaunch app to land on Portfolio (tab taps fail due to Detox
    // window-bounds hit-test on iPhone 17 Pro). The wallet persists in
    // keychain and firstLaunchAfterWalletCreation is cleared, so the app
    // defaults to the Portfolio tab on relaunch.
    await device.terminateApp();
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify portfolio screen
    const detected = await checkForPortfolioScreen();
    if (!detected) {
      throw new Error('Failed to reach portfolio screen after wallet creation');
    }
    console.log('Wallet creation flow completed successfully');
  });
});
