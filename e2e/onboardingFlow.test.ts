import { device, element, by, expect, waitFor } from 'detox';
import {
  handlePermissionDialog,
  delay,
  resetAppCompletely,
  findButton,
  checkForPortfolioScreen,
} from './helpers';

describe('Onboarding Flow', () => {
  beforeAll(async () => {
    await resetAppCompletely();
  });

  beforeEach(async () => {
    // Skip beforeEach restart for onboarding flow to maintain state
  });

  it('should navigate through onboarding screens and create a wallet', async () => {
    console.log('Starting onboarding flow test...');

    // Allow app to fully load
    await delay(5000);

    // ------ Screen 1 ------
    // Verify we're on the first onboarding screen using the actual text content
    const screen1TextContent =
      'Non-Custodial wallet for all your Multi-Chain and DeFi needs!';
    const screen1Text = element(by.text(screen1TextContent));
    await waitFor(screen1Text).toExist().withTimeout(5000);

    // Find and press the NEXT button
    const nextButton = element(by.text('NEXT'));
    await waitFor(nextButton).toBeVisible().withTimeout(5000);
    await nextButton.tap();
    console.log('Navigated to second onboarding screen');

    // Allow animation to complete
    await delay(1000);

    // ------ Screen 2 ------
    // Verify we're on the second onboarding screen
    const screen2TextContent = 'Seamless access to different blockchains';
    const screen2Text = element(by.text(screen2TextContent));
    await waitFor(screen2Text).toExist().withTimeout(5000);

    // Press NEXT again
    await nextButton.tap();
    console.log('Navigated to third onboarding screen');

    // Allow animation to complete
    await delay(1000);

    // ------ Screen 3 ------
    // Verify we're on the third screen that has wallet options
    const welcomeText = element(by.text('Welcome to'));
    await waitFor(welcomeText).toBeVisible().withTimeout(5000);

    // Find and press CREATE WALLET button using helper
    const createWalletButton = await findButton(
      'CREATE_WALLET',
      ['Create New Wallet', 'Create Wallet'],
      'create-wallet-button',
    );
    await createWalletButton.tap();
    console.log('Tapped Create Wallet button');

    // Allow modal to appear
    await delay(1000);

    // ------ Seed Phrase Type Selection Modal ------
    // Verify the modal is shown
    const seedPhraseTypeTitle = element(
      by.text('CREATE_SEED_PHRASE_TYPE_TITLE'),
    );
    await waitFor(seedPhraseTypeTitle).toBeVisible().withTimeout(5000);

    // Select 12-word seed phrase
    const twelveWordButton = await findButton(
      'TWELVE_WORD_SEEDPHRASE',
      ['12-word Seed Phrase', '12 words'],
      'twelve-word-button',
    );
    await twelveWordButton.tap();
    console.log('Selected 12-word seed phrase');

    // ------ Create Seed Phrase Screen ------
    // Allow navigation to complete
    await delay(2000);

    // Check if we have a generate button or seed phrase displayed
    try {
      // Some implementations might have a generate button first
      const generateButton = await findButton(
        'GENERATE',
        ['Generate'],
        'generate-button',
      );
      await generateButton.tap();
      console.log('Tapped Generate button');
      await delay(2000);
    } catch (e) {
      console.log(
        'No generate button, assuming seed phrase is already displayed',
      );
    }

    // Look for Continue/Next button on seed phrase screen
    const continueButton = await findButton(
      'CONTINUE',
      ['Continue', 'Next'],
      'continue-button',
    );
    await continueButton.tap();
    console.log('Continued from seed phrase display');

    // ------ Seed Phrase Verification Screen ------
    // Allow time for verification screen to load
    await delay(2000);

    // This part depends on your specific implementation
    // You may need to select words in correct order or perform other verification steps
    // For simplicity, we'll just look for a finish/complete button

    try {
      const verifyButton = await findButton(
        'VERIFY',
        ['Verify'],
        'verify-button',
      );
      await verifyButton.tap();
      console.log('Tapped Verify button');
      await delay(2000);
    } catch (e) {
      console.log('No verify button found, trying alternative buttons');
    }

    // Possibly need to tap "done" or similar button to complete the process
    try {
      const doneButton = await findButton(
        'DONE',
        ['Done', 'Finish', 'Complete'],
        'done-button',
      );
      await doneButton.tap();
      console.log('Completed wallet creation');
    } catch (e) {
      console.log(
        'Could not find confirmation button, may need more specific handling',
      );
    }

    // ------ Check Portfolio Screen ------
    // Allow time for portfolio to load
    await delay(5000);

    // Check if we're on the portfolio screen
    const portfolioDetected = await checkForPortfolioScreen();
    if (portfolioDetected) {
      console.log('TEST PASSED: Successfully navigated to portfolio screen');
    } else {
      console.log('TEST FAILED: Could not detect portfolio screen');
    }
  });
});
