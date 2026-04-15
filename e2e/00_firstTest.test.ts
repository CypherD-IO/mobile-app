import { device, element, by, expect as detoxExpect } from 'detox';
import { handlePermissionDialog, resetAppCompletely } from './helpers';

describe('App Launch Tests', () => {
  beforeAll(
    async () => {
      await resetAppCompletely();
    },
    process.env.CI ? 240000 : 120000,
  );

  it('should launch successfully and show onboarding screen', async () => {
    console.log('Running app launch and onboarding validation test');

    await device.disableSynchronization();
    await handlePermissionDialog();

    // Manual polling — Detox's waitFor() is blocked by internal sync
    // (main queue busy with JS timers) even after disableSynchronization().
    for (let i = 0; i < 30; i++) {
      try {
        await detoxExpect(element(by.text('Continue'))).toExist();
        console.log(`App launched successfully - onboarding visible (attempt ${i + 1})`);
        return; // PASS
      } catch {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    throw new Error('Onboarding screen did not appear within 90s');
  });
});
