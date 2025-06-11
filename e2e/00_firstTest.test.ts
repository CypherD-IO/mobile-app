import { device, element, by, waitFor } from 'detox';
import { handlePermissionDialog, resetAppCompletely, delay } from './helpers';

describe('App Launch Tests', () => {
  beforeAll(async () => {
    await resetAppCompletely();
  });

  it('should launch successfully and show onboarding screen', async () => {
    console.log('Running app launch and onboarding validation test');

    // Wait for app to stabilize and handle any permission dialogs
    await delay(3000);
    await handlePermissionDialog();

    // Test specifically for the onboarding screen text
    console.log(
      'Checking for onboarding screen with "Non Custodial Crypto Wallet" text...',
    );

    try {
      // Try the exact text with newline first (most likely format)
      const onboardingTextWithNewline = element(
        by.text('Non Custodial \nCrypto Wallet'),
      );
      await waitFor(onboardingTextWithNewline).toExist().withTimeout(10000);
      console.log('✅ Found onboarding screen with newline text');

      // If we get here, the test passes
      console.log(
        '✅ App launched successfully and onboarding screen is displayed correctly',
      );
    } catch (e) {
      // Take a screenshot for debugging
      try {
        await device.takeScreenshot('onboarding-text-not-found');
        console.log('📸 Screenshot taken for debugging');
      } catch (screenshotError) {
        console.log('Could not take screenshot:', screenshotError);
      }

      throw new Error(
        'Onboarding screen with "Non Custodial Crypto Wallet" text not found - app may not have launched correctly',
      );
    }
  });
});
