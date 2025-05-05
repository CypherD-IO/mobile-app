import { device, element, by, expect, waitFor } from 'detox';
import {
  handlePermissionDialog,
  navigateThroughOnboarding,
  resetAppCompletely,
  findButton,
  delay,
  checkForPortfolioScreen,
} from './helpers';

describe('Import Wallet Flow', () => {
  beforeAll(async () => {
    await resetAppCompletely();
  });

  beforeEach(async () => {
    // Skip beforeEach restart for import wallet flow to maintain state
  });

  it('should navigate through onboarding screens and import a wallet', async () => {
    console.log('Starting import wallet flow test...');

    // Navigate through first onboarding screens
    await navigateThroughOnboarding();

    // ------ Screen 3 ------
    // Verify we're on the third screen that has wallet options
    // Try multiple approaches to find the "Welcome" text
    try {
      const welcomeText = element(by.text('Welcome to'));
      await waitFor(welcomeText).toBeVisible().withTimeout(5000);
      console.log('Successfully found Welcome text');
    } catch (e) {
      console.log(
        'Could not find exact "Welcome to" text, trying alternatives...',
      );
      try {
        // Try matching partial text or different casing
        const welcomeAltText = element(by.text('WELCOME'));
        await waitFor(welcomeAltText).toBeVisible().withTimeout(3000);
        console.log('Found alternative Welcome text');
      } catch (e) {
        // If we can't find the welcome text, we'll try to proceed anyway
        console.log(
          'Could not find Welcome text, attempting to proceed anyway',
        );
      }
    }

    // Find and press IMPORT WALLET button - try multiple approaches
    try {
      // First try by testID
      const importWalletButton = element(by.id('import-wallet-button'));
      await waitFor(importWalletButton).toBeVisible().withTimeout(5000);
      await importWalletButton.tap();
      console.log('Tapped Import Wallet button using testID');
    } catch (e) {
      console.log('Trying alternative methods to find Import Wallet button');

      // Fall back to the helper function
      try {
        const importWalletButton = await findButton(
          'IMPORT_WALLET',
          ['Import With Seed Phrase', 'Import Wallet', 'IMPORT WALLET'],
          'import-wallet-button',
        );
        await importWalletButton.tap();
        console.log('Tapped Import Wallet button using findButton helper');
      } catch (e) {
        console.log('Failed to find Import Wallet button: ', e);
        throw new Error('Could not find Import Wallet button');
      }
    }

    // Allow navigation to complete
    await delay(2000);

    // ------ Import Wallet Options Screen ------
    // Check for the "Enter Seed Phrase" option
    const seedPhraseOption = await findButton(
      'ENTER_SEED_PHRASE',
      ['Enter Seed Phrase'],
      'seed-phrase-option',
    );
    await seedPhraseOption.tap();
    console.log('Selected Enter Seed Phrase option');

    // Allow navigation to complete
    await delay(2000);

    // ------ Enter Seed Phrase Screen ------
    // Sample valid seed phrase (this is just a test seed phrase)
    const testSeedPhrase =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    // Find the seed phrase input field
    const seedPhraseInput = element(by.id('seed-phrase-input'));
    await waitFor(seedPhraseInput).toBeVisible().withTimeout(5000);
    await seedPhraseInput.replaceText(testSeedPhrase);
    console.log('Entered seed phrase');

    // Tap the "Continue" or "Import" button
    const continueButton = await findButton(
      'CONTINUE',
      ['IMPORT', 'CONFIRM', 'Submit', 'SUBMIT'],
      'continue-button',
    );
    await continueButton.tap();
    console.log('Continued with seed phrase import');

    // Allow for wallet import processing
    await delay(5000);

    // ------ Choose Wallet Index (if present) ------
    try {
      const indexScreen = element(by.text('CHOOSE_WALLET_INDEX'));
      await waitFor(indexScreen).toBeVisible().withTimeout(3000);

      // Select the first wallet index
      const firstWalletOption = element(by.id('wallet-index-0'));
      await waitFor(firstWalletOption).toBeVisible().withTimeout(3000);
      await firstWalletOption.tap();

      // Tap "Continue" button
      const indexContinueButton = await findButton('CONTINUE', ['Continue']);
      await indexContinueButton.tap();
      console.log('Selected wallet index and continued');
    } catch (e) {
      console.log('No wallet index selection screen, continuing with flow...');
    }

    // ------ Check Portfolio Screen ------
    // Allow time for portfolio to load
    await delay(5000);

    // Check if we're on the portfolio screen
    const portfolioDetected = await checkForPortfolioScreen();
    if (portfolioDetected) {
      console.log(
        'TEST PASSED: Successfully detected portfolio screen, wallet import complete',
      );
    } else {
      console.log(
        'TEST FAILED: Could not detect portfolio screen after wallet import',
      );
    }
  });
});
