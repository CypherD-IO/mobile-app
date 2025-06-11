import { device, element, by, waitFor } from 'detox';
import {
  handlePermissionDialog,
  resetAppCompletely,
  delay,
  debugVisibleElements,
} from './helpers';

describe('App Launch Tests', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 180000 : 90000,
  ); // 3 minutes in CI, 1.5 minutes locally

  it('should launch successfully and show onboarding screen', async () => {
    console.log('Running app launch and onboarding validation test');

    // Wait longer for app to stabilize after reset (especially important in CI)
    console.log('Waiting for app to stabilize...');
    await delay(5000); // Increased from 3000

    // Handle any permission dialogs
    await handlePermissionDialog();

    // Additional wait after permission handling
    await delay(2000);

    // Test specifically for the onboarding screen text
    console.log(
      'Checking for onboarding screen with "Non Custodial Crypto Wallet" text...',
    );

    try {
      // Try the exact text with newline first (most likely format)
      const onboardingTextWithNewline = element(
        by.text('Non Custodial \nCrypto Wallet'),
      );
      await waitFor(onboardingTextWithNewline).toExist().withTimeout(15000); // Increased timeout
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

      // Log additional debugging info
      console.log('❌ Test failed, attempting to log visible elements...');
      await debugVisibleElements('onboarding screen detection failed');

      throw new Error(
        'Onboarding screen with "Non Custodial Crypto Wallet" text not found - app may not have launched correctly',
      );
    }
  });
});
