import { device, element, by, waitFor } from 'detox';
import { handlePermissionDialog, resetAppCompletely } from './helpers';

describe('App Launch Tests', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 180000 : 90000,
  );

  it('should launch successfully and show onboarding screen', async () => {
    console.log('Running app launch and onboarding validation test');

    // Verify Metro bundler is accessible
    try {
      console.log('Verifying Metro bundler connection...');
      const response = await fetch('http://localhost:8081/status');
      if (response.ok) {
        console.log('Metro bundler is accessible');
      } else {
        console.log(
          'Metro bundler returned non-200 status:',
          response.status,
        );
      }
    } catch (error) {
      console.log('Metro bundler connection failed:', error);
    }

    // Handle any permission dialogs
    await handlePermissionDialog();

    // Disable sync — the app is perpetually "busy" during onboarding.
    await device.disableSynchronization();

    // Wait for the first onboarding screen
    await waitFor(element(by.id('getstarted-screen')))
      .toExist()
      .withTimeout(20000);

    console.log('App launched successfully - onboarding screen visible');
    await device.enableSynchronization();
  });
});
