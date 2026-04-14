import { device, element, by, waitFor } from 'detox';
import {
  handlePermissionDialog,
  resetAppCompletely,
  debugVisibleElements,
} from './helpers';

describe('App Launch Tests', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 180000 : 90000,
  );

  it('should launch successfully and show onboarding screen', async () => {
    console.log('Running app launch and onboarding validation test');

    // Handle any permission dialogs (sync is already disabled from launch)
    await device.disableSynchronization();
    await handlePermissionDialog();

    // Wait for the first onboarding screen — CI runners (3 cores, 7GB)
    // need more time for the app's JS thread to finish initialization.
    try {
      await waitFor(element(by.id('getstarted-screen')))
        .toExist()
        .withTimeout(60000);

      console.log('App launched successfully - onboarding screen visible');
    } catch (error) {
      // Diagnostic: capture what the app IS showing so we can debug
      console.log('getstarted-screen NOT found — capturing diagnostics...');
      try {
        await device.takeScreenshot('getstarted-screen-not-found');
      } catch {
        console.log('Screenshot failed');
      }
      await debugVisibleElements('After 60s wait for getstarted-screen');

      // Check if the app is stuck on a Loading screen
      try {
        const loadingText = element(by.text('Loading'));
        await waitFor(loadingText).toExist().withTimeout(2000);
        console.log('DIAGNOSTIC: App appears stuck on Loading screen');
      } catch {
        console.log('DIAGNOSTIC: No Loading text found');
      }

      throw error; // Re-throw to fail the test
    }
  });
});
