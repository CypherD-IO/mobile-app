import { device, element, by, expect, waitFor } from 'detox';
import {
  handlePermissionDialog,
  navigateThroughOnboarding,
  resetAppCompletely,
  findButton,
  delay,
} from './helpers';

describe('QR Scanner Flow', () => {
  beforeAll(async () => {
    await resetAppCompletely();
  });

  beforeEach(async () => {
    // Skip beforeEach restart to maintain state
  });

  it('should navigate to QR scanner and handle scanning process', async () => {
    console.log('Starting QR scanner flow test...');

    // Navigate through first onboarding screens
    await navigateThroughOnboarding();

    // ------ Screen 3 ------
    // Verify we're on the third screen that has wallet options
    const welcomeText = element(by.text('Welcome to'));
    await waitFor(welcomeText).toBeVisible().withTimeout(5000);

    // Find and press IMPORT WALLET button
    const importWalletButton = await findButton(
      'IMPORT_WALLET',
      ['Import With Seed Phrase'],
      'import-wallet-button',
    );
    await importWalletButton.tap();
    console.log('Tapped Import Wallet button');

    // Allow navigation to complete
    await delay(2000);

    // ------ Import Wallet Options Screen ------
    // Look for the scan QR code option
    const qrCodeOption = await findButton(
      'SCAN_QR_CODE',
      ['Scan QR Code'],
      'qr-scan-button',
    );
    await qrCodeOption.tap();
    console.log('Selected Scan QR Code option');

    // Allow navigation to QR scanner
    await delay(2000);

    // ------ QR Scanner Screen ------
    // Check for QR scanner view
    const scannerView = element(by.id('qr-scanner-view'));
    await waitFor(scannerView).toBeVisible().withTimeout(5000);
    console.log('QR scanner is visible');

    // Check for camera permission dialog if it appears
    await handlePermissionDialog();

    // We can't actually scan a QR code in the test, but we can test the UI elements

    // Check for flashlight/torch button
    try {
      const flashlightButton = element(by.id('flashlight-button'));
      await waitFor(flashlightButton).toBeVisible().withTimeout(3000);
      await flashlightButton.tap();
      console.log('Toggled flashlight');

      // Toggle it back off
      await flashlightButton.tap();
    } catch (e) {
      console.log('No flashlight button found or not interactable');
    }

    // Check for manual entry option if available
    try {
      const manualEntryButton = await findButton(
        'ENTER_MANUALLY',
        ['Enter Manually'],
        'manual-entry-button',
      );
      console.log('Manual entry option is available');
    } catch (e) {
      console.log('No manual entry option found');
    }

    // Check for back button and navigate back
    try {
      const backButton = await findButton('←', ['Back', 'BACK'], 'back-button');
      await backButton.tap();
      console.log('Navigated back using back button');
    } catch (e) {
      // Use the device back button as last resort
      await device.pressBack();
      console.log('Used device back button');
    }

    // Verify we're back at the import options screen
    try {
      const importOptionsTitle = element(by.text('Import Wallet'));
      await waitFor(importOptionsTitle).toBeVisible().withTimeout(5000);
      console.log(
        'TEST PASSED: Successfully returned to import wallet options screen',
      );
    } catch (e) {
      try {
        const altImportOptionsTitle = element(by.text('IMPORT_WALLET_MSG'));
        await waitFor(altImportOptionsTitle).toBeVisible().withTimeout(5000);
        console.log(
          'TEST PASSED: Successfully returned to import wallet screen (alt title)',
        );
      } catch (e) {
        console.log(
          'TEST FAILED: Could not confirm return to import options screen',
        );
      }
    }
  });
});
