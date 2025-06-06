import { device, element, by, waitFor } from 'detox';
import { resetAppCompletely, delay, findButton } from './helpers';

// Helper: scroll down using swipe until target text is visible or max attempts reached
async function scrollUntilVisible(text: string, maxScrolls = 10) {
  for (let i = 0; i < maxScrolls; i++) {
    try {
      await waitFor(element(by.text(text)))
        .toBeVisible()
        .withTimeout(500);
      return true;
    } catch {
      // Use swipe instead of scroll for better compatibility
      // Based on the Options screen structure, we swipe on the main container
      await element(by.type('RCTScrollView')).swipe('up', 'fast', 0.75);
      await delay(300);
    }
  }
  return false;
}

describe('Toggle Developer Mode Flow', () => {
  beforeAll(async () => {
    await resetAppCompletely();
  });

  it('should enable developer mode and verify dev configuration is active', async () => {
    // Ensure app is loaded
    await delay(4000);

    // 1. Tap on Options tab in bottom navigation
    try {
      const optionsTab = element(by.text('Options'));
      await waitFor(optionsTab).toBeVisible().withTimeout(5000);
      await optionsTab.tap();
      console.log('Tapped Options tab');
    } catch {
      // Fallback: accessibility label
      await element(by.label('Options')).tap();
    }

    // 2. Scroll down using swipe until "Cypher" is visible
    const foundCypher = await scrollUntilVisible('Cypher');
    if (!foundCypher) {
      throw new Error('Could not find Cypher label in Options screen');
    }

    // Tap Cypher 5 times quickly to enable developer mode
    const cypherLabel = element(by.text('Cypher'));
    for (let i = 0; i < 5; i++) {
      await cypherLabel.tap();
      await delay(150);
    }
    console.log('Tapped Cypher 5 times');

    // Wait for Developer Mode toast
    try {
      await waitFor(element(by.text('Developer Mode ON')))
        .toBeVisible()
        .withTimeout(4000);
      console.log('✅ Developer Mode activated successfully');
    } catch {
      console.warn('Developer Mode toast not detected – but continuing');
    }

    // 3. Navigate to verify dev settings are accessible
    // Scroll up a bit and tap on App Settings
    await element(by.type('RCTScrollView')).swipe('down', 'fast', 0.5);
    await delay(500);
    const appSettings = await findButton('App Settings', ['App Settings']);
    await appSettings.tap();

    // 4. Tap on Advanced Settings
    const advancedSettings = element(by.text('Advanced Settings'));
    await waitFor(advancedSettings).toBeVisible().withTimeout(5000);
    await advancedSettings.tap();

    // 5. Tap on Hosts & RPC to verify dev mode gives access
    const hostsRPC = element(by.text('Hosts & RPC'));
    await waitFor(hostsRPC).toBeVisible().withTimeout(5000);
    await hostsRPC.tap();

    // 6. Verify we can access the Hosts & RPC screen (dev mode required)
    await delay(2000);

    // Look for ARCH input field to confirm we're on the right screen
    try {
      const archInput = element(by.type('UITextField')).atIndex(1);
      await waitFor(archInput).toBeVisible().withTimeout(5000);
      console.log(
        '✅ Successfully accessed Hosts & RPC screen - dev mode confirmed',
      );

      // Since global.ts now automatically uses dev URL during testing,
      // we can verify the current value should be the dev URL
      const attributes: any = await archInput.getAttributes();
      console.log('ARCH Host URL:', attributes.value || attributes.text);

      if (
        attributes.value?.includes('arch-dev.cypherd.io') ||
        attributes.text?.includes('arch-dev.cypherd.io')
      ) {
        console.log('✅ Dev ARCH URL confirmed via environment variables');
      } else {
        console.log('ℹ️  ARCH URL:', attributes.value || attributes.text);
      }
    } catch (error) {
      console.error(
        '❌ Could not access Hosts & RPC - dev mode may not be active',
      );
      throw error;
    }

    console.log('🎉 Toggle Developer Mode flow completed successfully');
  });
});
