import { device } from 'detox';
import {
  handlePermissionDialog,
  resetAppCompletely,
  waitForElementByText,
} from './helpers';

describe('App Launch Tests', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 360000 : 120000,
  );

  it('should launch successfully and show onboarding screen', async () => {
    console.log('Running app launch and onboarding validation test');

    await device.disableSynchronization();
    await handlePermissionDialog();

    // Manual polling via helper — Detox sync is blocked by JS timers and
    // background requests, so waitFor() hangs. 90s budget = 30 × 3s.
    const visible = await waitForElementByText('Continue', {
      timeoutMs: 90000,
      intervalMs: 3000,
    });
    if (!visible) {
      throw new Error('Onboarding screen did not appear within 90s');
    }
    console.log('App launched successfully - onboarding visible');
  });
});
