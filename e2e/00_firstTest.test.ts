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

    // First, verify Metro bundler is accessible
    try {
      console.log('Verifying Metro bundler connection...');
      const response = await fetch('http://localhost:8081/status');
      if (response.ok) {
        console.log('✅ Metro bundler is accessible');
      } else {
        console.log(
          '⚠️ Metro bundler returned non-200 status:',
          response.status,
        );
      }
    } catch (error) {
      console.log('❌ Metro bundler connection failed:', error);
      // Don't fail the test here, but log the issue
    }

    // Wait longer for app to stabilize after reset (especially important in CI)
    console.log('Waiting for app to stabilize after launch...');
    await delay(8000); // Increased from 5000 to give more time for Metro connection

    // Handle any permission dialogs first
    await handlePermissionDialog();

    // Additional wait after permission handling to ensure app is fully loaded
    await delay(3000); // Increased from 2000

    // Test specifically for the onboarding screen text
    console.log(
      'Checking for onboarding screen with "Non Custodial Crypto Wallet" text...',
    );

    try {
      // Try the exact text with newline first (most likely format)
      const onboardingTextWithNewline = element(
        by.text('Non Custodial \nCrypto Wallet'),
      );
      await waitFor(onboardingTextWithNewline).toExist().withTimeout(20000); // Increased timeout to 20s
      console.log('✅ Found onboarding screen with newline text');

      // If we get here, the test passes
      console.log(
        '✅ App launched successfully and onboarding screen is displayed correctly',
      );
    } catch (e) {
      // Enhanced debugging for Metro/bundle issues
      console.log(
        '❌ Test failed, checking for potential Metro/bundle issues...',
      );

      // Check if we see any Metro-related error screens
      try {
        const noBundleError = element(by.text('No bundle URL present'));
        await waitFor(noBundleError).toExist().withTimeout(2000);
        console.log(
          '❌ DETECTED: "No bundle URL present" error - Metro bundler connection issue',
        );

        // Try to take a screenshot for debugging
        try {
          await device.takeScreenshot('metro-bundle-error');
          console.log('📸 Screenshot taken for Metro bundle error');
        } catch (screenshotError) {
          console.log('Could not take screenshot:', screenshotError);
        }

        throw new Error(
          'Metro bundler connection failed - "No bundle URL present" error detected',
        );
      } catch (noBundleCheckError) {
        // No bundle error not found, continue with other debugging
      }

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
        'Onboarding screen with "Non Custodial Crypto Wallet" text not found - app may not have launched correctly or Metro bundler connection failed',
      );
    }
  });
});
