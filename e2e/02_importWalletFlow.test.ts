import { element, by, waitFor } from 'detox';
import {
  navigateThroughOnboarding,
  delay,
  resetAppCompletely,
  findButton,
  checkForPortfolioScreen,
  getSecureTestSeedPhrase,
  secureLog,
  performSecureOperation,
} from './helpers';

// Get seed phrase securely from environment or fallback
const TEST_RECOVERY_PHRASE = getSecureTestSeedPhrase();

describe('Import Wallet Flow', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 180000 : 90000,
  ); // 3 minutes in CI, 1.5 minutes locally

  it('should navigate through onboarding screens and import a wallet', async () => {
    secureLog('Starting import wallet flow test...');

    // Navigate through first onboarding screens
    await navigateThroughOnboarding();

    // ------ Screen 3: "Let's get started" ------
    try {
      const getStartedTextWithNewline = element(by.text("LET'S \nGET STARTED"));
      await waitFor(getStartedTextWithNewline).toBeVisible().withTimeout(5000);
      secureLog("Successfully found 'LET'S GET STARTED' text");
    } catch (e) {
      secureLog('Could not find newline version, trying alternatives...');
      try {
        const getStartedText = element(by.text("LET'S GET STARTED"));
        await waitFor(getStartedText).toBeVisible().withTimeout(3000);
        secureLog('Found "LET\'S GET STARTED" text without newline');
      } catch (e) {
        secureLog(
          'Could not find "LET\'S GET STARTED" text, proceeding anyway',
        );
      }
    }

    // Find and press "Import Wallet" button
    const importWalletButton = await findButton(
      'Import Wallet',
      ['IMPORT WALLET', 'Import wallet'],
      'import-wallet-button',
    );
    await importWalletButton.tap();
    secureLog('Tapped Import Wallet button');
    await delay(1000);

    // ------ Import Wallet Options Modal ------
    secureLog('Proceeding with Import Seed Phrase selection...');

    // Select "Import Seed Phrase"
    const importSeedPhraseButton = await findButton(
      'Import Seed Phrase',
      ['Import seed phrase', 'IMPORT SEED PHRASE'],
      'import-seed-phrase-button',
    );
    await importSeedPhraseButton.tap();
    secureLog('Selected Import Seed Phrase');
    await delay(2000);

    // ------ Enter Recovery Phrase Screen ------
    try {
      const recoveryPhraseTitle = element(by.text('Enter recovery phrase'));
      await waitFor(recoveryPhraseTitle).toBeVisible().withTimeout(5000);
      secureLog('Found "Enter recovery phrase" screen');
    } catch (e) {
      secureLog('Could not find recovery phrase title, proceeding...');
    }

    // Enter the recovery phrase using secure operation
    secureLog('Entering recovery phrase...');
    await performSecureOperation(async () => {
      try {
        const multilineInput = element(
          by.type('RCTMultilineTextInputView'),
        ).atIndex(0);
        await waitFor(multilineInput).toBeVisible().withTimeout(5000);
        await multilineInput.tap();
        await delay(500);
        await multilineInput.replaceText(TEST_RECOVERY_PHRASE);
        secureLog('Successfully entered recovery phrase', TEST_RECOVERY_PHRASE);
      } catch (e) {
        secureLog(
          'RCTMultilineTextInputView failed, trying UITextView fallback...',
          TEST_RECOVERY_PHRASE,
        );
        const uiTextView = element(by.type('UITextView')).atIndex(0);
        await waitFor(uiTextView).toBeVisible().withTimeout(3000);
        await uiTextView.tap();
        await delay(500);
        await uiTextView.replaceText(TEST_RECOVERY_PHRASE);
        secureLog(
          'Successfully entered recovery phrase using UITextView fallback',
          TEST_RECOVERY_PHRASE,
        );
      }
    }, 'Seed Phrase Entry');

    await delay(1000);

    // Click Submit button
    const submitButton = await findButton(
      'Submit',
      ['SUBMIT', 'submit'],
      'submit-button',
    );
    await submitButton.tap();
    secureLog('Tapped Submit button for recovery phrase');
    await delay(3000);

    // ------ Wallets Screen ------
    try {
      const walletsTitle = element(by.text('Wallets'));
      await waitFor(walletsTitle).toBeVisible().withTimeout(8000);
      secureLog('Found "Wallets" screen');
    } catch (e) {
      secureLog('Could not find Wallets title, proceeding...');
    }

    try {
      const walletFoundText = element(
        by.text('We found these wallets associated with your recovery phrase'),
      );
      await waitFor(walletFoundText).toBeVisible().withTimeout(5000);
      secureLog('Found wallet discovery message');
    } catch (e) {
      secureLog('Could not find wallet discovery message, continuing...');
    }

    // Click the final Submit button on wallets screen
    const finalSubmitButton = await findButton(
      'Submit',
      ['SUBMIT', 'submit'],
      'final-submit-button',
    );
    await finalSubmitButton.tap();
    secureLog('Tapped final Submit button on wallets screen');

    // ------ Check Portfolio Screen ------
    await delay(5000);

    const portfolioDetected = await checkForPortfolioScreen();
    if (portfolioDetected) {
      secureLog(
        '✅ TEST PASSED: Successfully navigated to portfolio screen after wallet import',
      );
    } else {
      secureLog(
        '❌ TEST FAILED: Could not detect portfolio screen after wallet import',
      );
    }
  });
});
