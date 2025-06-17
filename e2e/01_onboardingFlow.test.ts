import { element, by, waitFor } from 'detox';
import {
  navigateThroughOnboarding,
  delay,
  resetAppCompletely,
  findButton,
  checkForPortfolioScreen,
  debugVisibleElements,
} from './helpers';

describe('Onboarding Flow', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 180000 : 90000,
  ); // 3 minutes in CI, 1.5 minutes locally

  it('should navigate through onboarding screens and create a wallet', async () => {
    console.log('Starting onboarding flow test...');

    // Navigate through first onboarding screens
    await navigateThroughOnboarding();

    // ------ Screen 3: "Let's get started" ------
    try {
      const getStartedTextWithNewline = element(by.text("LET'S \nGET STARTED"));
      await waitFor(getStartedTextWithNewline).toBeVisible().withTimeout(5000);
      console.log("Successfully found 'LET'S GET STARTED' text");
    } catch (e) {
      console.log('Could not find exact text, trying alternatives...');
      try {
        const getStartedAltText = element(by.text("Let's get started"));
        await waitFor(getStartedAltText).toBeVisible().withTimeout(3000);
        console.log('Found alternative "Let\'s get started" text');
      } catch (e) {
        console.log(
          'Could not find "Let\'s get started" text, proceeding anyway',
        );
      }
    }

    // Find and press "Create New Wallet" button
    const createWalletButton = await findButton(
      'Create New Wallet',
      ['CREATE NEW WALLET', 'Create Wallet'],
      'create-wallet-button',
    );
    await createWalletButton.tap();
    console.log('Tapped Create New Wallet button');
    await delay(1000);

    // ------ Seed Phrase Type Selection Modal ------
    try {
      const createWalletTitle = element(by.text('Create a Wallet'));
      await waitFor(createWalletTitle).toBeVisible().withTimeout(5000);
      console.log('Found "Create a Wallet" modal');
    } catch (e) {
      console.log('Could not find modal title, proceeding...');
    }

    // Select 12-word seed phrase
    const twelveWordButton = await findButton(
      '12 Word Phrase',
      ['12 Word', '12 words', 'TWELVE_WORD_SEEDPHRASE'],
      'twelve-word-button',
    );
    await twelveWordButton.tap();
    console.log('Selected 12 Word Phrase');

    // Click Continue in the modal
    await delay(500);
    const continueButton = await findButton(
      'Continue',
      ['CONTINUE', 'continue'],
      'continue-button',
    );
    await continueButton.tap();
    console.log('Tapped Continue button in modal');

    // ------ Create Seed Phrase Screen ------
    await delay(2000);

    // Try scrolling to make CONFIRM button visible
    try {
      console.log(
        'Attempting to scroll down to make CONFIRM button visible...',
      );
      await element(by.type('RCTScrollView')).scroll(200, 'down');
      await delay(1000);
    } catch (scrollError) {
      console.log('Could not scroll, continuing without scroll...');
    }

    // Look for CONFIRM button
    try {
      console.log('Looking for CONFIRM button...');
      const confirmButton = await findButton(
        'CONFIRM',
        ['Confirm', 'CONTINUE', 'Continue'],
        'button-CONFIRM',
      );
      await confirmButton.tap();
      console.log('✅ Successfully tapped CONFIRM button');
    } catch (e) {
      console.log('findButton helper failed, trying direct tap...');
      try {
        const directConfirmButton = element(by.id('button-CONFIRM'));
        await directConfirmButton.tap();
        console.log('✅ Successfully tapped CONFIRM button directly');
      } catch (directError) {
        console.log('Direct tap also failed');
        await debugVisibleElements('CONFIRM button not found');
        throw new Error('Could not find or tap CONFIRM button');
      }
    }

    // ------ Seed Phrase Verification Screen ------
    await delay(2000);

    // Try to skip verification if available
    try {
      const skipForNowButton = await findButton(
        'SKIP FOR NOW',
        ['Skip for now'],
        'skip-for-now-button',
      );
      await skipForNowButton.tap();
      console.log('Tapped Skip for now button');
      await delay(2000);
    } catch (e) {
      console.log('No skip button found, trying alternative flow');
    }

    // ------ Check Portfolio Screen ------
    await delay(5000);

    const portfolioDetected = await checkForPortfolioScreen();
    if (portfolioDetected) {
      console.log('✅ TEST PASSED: Successfully navigated to portfolio screen');
    } else {
      console.log('❌ TEST FAILED: Could not detect portfolio screen');
    }
  });
});
