import { device } from 'detox';
import { handlePermissionDialog, resetAppCompletely, delay } from './helpers';

describe('App Launch Tests', () => {
  beforeAll(async () => {
    await resetAppCompletely();
  });

  it('should launch successfully without crashing', async () => {
    console.log('Running basic launch test');

    // Wait for app to stabilize and handle any permission dialogs
    await delay(3000);
    await handlePermissionDialog();

    // If we get here without crashing, the test passes
    console.log('✅ Basic launch test completed successfully');
  });
});
