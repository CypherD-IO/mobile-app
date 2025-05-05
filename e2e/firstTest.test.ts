import { device, element, by, expect, waitFor } from 'detox';

// Improved helper function for permission dialogs that uses both approaches
async function handlePermissionDialog() {
  console.log('Checking for permission dialogs...');

  try {
    // Add multiple ways to identify the notification dialog
    const notificationTitle = element(
      by.text('"Cypher Wallet" Would Like to Send You Notifications'),
    );
    const allowButton = element(by.text('Allow'));

    // Wait for permission dialog with a timeout
    await waitFor(notificationTitle).toBeVisible().withTimeout(3000);

    console.log('Permission dialog found! Clicking Allow...');
    await allowButton.tap();
    console.log('Clicked Allow button successfully');
    return true;
  } catch (e) {
    console.log('No permission dialog found or unable to handle');
    return false;
  }
}

describe('App Launch Tests', () => {
  beforeAll(async () => {
    // Completely reset device state for clean testing
    console.log('Resetting app state completely');
    await device.uninstallApp();
    await device.installApp();

    // Launch with both setting permissions and handling alerts
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES' },
      launchArgs: {
        detoxHandleSystemAlerts: 'YES',
      },
    });

    // Try to handle permission dialog if it still appears
    await new Promise(resolve => setTimeout(resolve, 2000));
    await handlePermissionDialog();
  });

  // Force a clean app start before each test
  beforeEach(async () => {
    // Completely terminate and restart the app for each test
    console.log('Restarting app with clean state');
    await device.terminateApp();
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES' },
      launchArgs: { detoxHandleSystemAlerts: 'YES' },
    });

    // Wait for app to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to handle any permission dialog
    await handlePermissionDialog();
  });

  it('should launch successfully without crashing', async () => {
    // Just verify the app is running
    console.log('Running basic launch test');

    // Simply wait to see if anything crashes
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for permission dialog one more time
    await handlePermissionDialog();

    // If we get here without crashing, the test passes
    console.log('Basic launch test complete');
  });
});
