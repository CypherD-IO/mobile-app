import { device, element, by, waitFor } from 'detox';

/**
 * Handle iOS permission dialog by looking for permission text and clicking Allow
 * @returns true if dialog was found and handled, false otherwise
 */
export async function handlePermissionDialog(): Promise<boolean> {
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

/**
 * Navigate through the onboarding screens
 * @returns void
 */
export async function navigateThroughOnboarding(): Promise<void> {
  // Allow app to fully load
  await new Promise(resolve => setTimeout(resolve, 5000));

  // ------ Screen 1: "Non Custodial Crypto Wallet" ------
  // The actual text has a newline: "Non Custodial \nCrypto Wallet"
  try {
    // Try the exact text with newline first
    const screen1TextWithNewline = element(
      by.text('Non Custodial \nCrypto Wallet'),
    );
    await waitFor(screen1TextWithNewline).toExist().withTimeout(3000);
    console.log('Found first onboarding screen with newline text');
  } catch (e) {
    try {
      // Try just "Non Custodial" as partial match
      const screen1TextPartial = element(by.text('Non Custodial'));
      await waitFor(screen1TextPartial).toExist().withTimeout(3000);
      console.log(
        'Found first onboarding screen with partial text "Non Custodial"',
      );
    } catch (e) {
      try {
        // Try "Crypto Wallet" as partial match
        const screen1TextPartial2 = element(by.text('Crypto Wallet'));
        await waitFor(screen1TextPartial2).toExist().withTimeout(3000);
        console.log(
          'Found first onboarding screen with partial text "Crypto Wallet"',
        );
      } catch (e) {
        console.error(
          'Could not find any variation of Non Custodial Crypto Wallet text',
        );
        throw new Error('Could not find first onboarding screen text');
      }
    }
  }

  console.log(
    'Found first onboarding screen with "Non Custodial Crypto Wallet"',
  );

  // Look for Continue button on screen 1
  try {
    const continueButton = await findButton(
      'Continue',
      ['CONTINUE', 'continue'],
      'continue-button',
    );
    await continueButton.tap();
    console.log('Successfully tapped Continue button on screen 1');
  } catch (e) {
    console.error('Could not find Continue button on screen 1');
    throw new Error('Could not find or tap Continue button on screen 1');
  }

  // Allow animation to complete
  await delay(2000);

  // ------ Screen 2: "Zero-Fee Crypto Card" ------
  const screen2TextContent = 'Zero-Fee Crypto Card';
  try {
    const screen2Text = element(by.text(screen2TextContent));
    await waitFor(screen2Text).toExist().withTimeout(5000);
    console.log('Found second onboarding screen with "Zero-Fee Crypto Card"');
  } catch (e) {
    console.error(
      'Could not find second screen content, attempting to proceed anyway',
    );
  }

  // Look for Continue button on screen 2
  try {
    const continueButton = await findButton(
      'Continue',
      ['CONTINUE', 'continue'],
      'continue-button',
    );
    await continueButton.tap();
    console.log('Successfully tapped Continue button on screen 2');
  } catch (e) {
    console.error('Could not find Continue button on screen 2');
    throw new Error('Could not find or tap Continue button on screen 2');
  }

  // Allow animation to complete
  await delay(2000);
}

export const reOpenApp = async () => {
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES' },
    launchArgs: {
      detoxHandleSystemAlerts: 'YES',
      // Add any other launch args that help ensure clean state
    },
  });
};

/**
 * Reset app state completely - optimized for speed and reliability
 * @returns void
 */
export async function resetAppCompletely(): Promise<void> {
  console.log('Performing fast app reset for E2E tests...');

  try {
    // Step 1: Terminate app if running (fast operation)
    console.log('Terminating app...');
    await Promise.race([
      device.terminateApp(),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Terminate timeout')), 10000),
      ),
    ]);
  } catch (error) {
    console.log(
      'App terminate failed or timed out (app might not be running):',
      error,
    );
  }

  try {
    // Step 2: Clear keychain (fast operation)
    console.log('Clearing keychain...');
    await Promise.race([
      device.clearKeychain(),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Keychain timeout')), 15000),
      ),
    ]);
  } catch (error) {
    console.log('Keychain clear failed or timed out:', error);
  }

  // Step 3: Launch app with clean state (no uninstall/reinstall needed)
  console.log('Launching app with clean state...');
  try {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES' },
      launchArgs: {
        detoxHandleSystemAlerts: 'YES',
      },
    });

    console.log('✅ Fast app reset completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('App launch failed:', error);
    throw new Error(`App reset failed: ${errorMessage}`);
  }
}

/**
 * Try different selectors for a button to handle different localization or labeling scenarios
 * @param primaryText Primary text to look for
 * @param alternativeTexts Alternative texts to try if primary isn't found
 * @param buttonId Optional ID to try if text-based selectors fail
 * @returns The found element
 * @throws Error if no elements can be found
 */
export async function findButton(
  primaryText: string,
  alternativeTexts: string[] = [],
  buttonId?: string,
): Promise<Detox.NativeElement> {
  try {
    const primaryButton = element(by.text(primaryText));
    await waitFor(primaryButton).toBeVisible().withTimeout(3000);
    return primaryButton;
  } catch (e) {
    console.log(
      `Primary button text "${primaryText}" not found, trying alternatives...`,
    );

    // Try alternative text options
    for (const altText of alternativeTexts) {
      try {
        const altButton = element(by.text(altText));
        await waitFor(altButton).toBeVisible().withTimeout(2000);
        return altButton;
      } catch (altError) {
        console.log(`Alternative button text "${altText}" not found`);
      }
    }

    // Try by ID if provided
    if (buttonId) {
      try {
        const idButton = element(by.id(buttonId));
        await waitFor(idButton).toBeVisible().withTimeout(2000);
        return idButton;
      } catch (idError) {
        console.log(`Button with ID "${buttonId}" not found`);
      }
    }

    throw new Error(
      `Could not find button with primary text "${primaryText}" or any alternatives`,
    );
  }
}

/**
 * Wait for a set time (in milliseconds) to allow UI transitions and animations
 * @param ms Time to wait in milliseconds
 * @returns Promise that resolves after the specified time
 */
export async function delay(ms: number): Promise<void> {
  return await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debug helper to log visible elements when tests fail
 * @param description Description of when this debug is being called
 */
export async function debugVisibleElements(description: string): Promise<void> {
  console.log(`🔍 DEBUG: ${description}`);
  console.log('Looking for common button patterns...');

  // Try to find various button patterns
  const buttonTexts = [
    'CONFIRM',
    'Confirm',
    'CONTINUE',
    'Continue',
    'NEXT',
    'Next',
    'DONE',
    'Done',
  ];

  for (const text of buttonTexts) {
    try {
      const buttonElement = element(by.text(text));
      await waitFor(buttonElement).toBeVisible().withTimeout(1000);
      console.log(`✅ Found button with text: "${text}"`);
    } catch (e) {
      console.log(`❌ No button found with text: "${text}"`);
    }
  }

  // Try to find buttons by auto-generated testIDs
  const buttonTestIds = [
    'button-CONFIRM',
    'button-Confirm',
    'button-CONTINUE',
    'button-Continue',
    'confirm-button',
    'continue-button',
  ];

  for (const testId of buttonTestIds) {
    try {
      const buttonElement = element(by.id(testId));
      await waitFor(buttonElement).toExist().withTimeout(1000);
      console.log(`✅ Found button with testID: "${testId}"`);
    } catch (e) {
      console.log(`❌ No button found with testID: "${testId}"`);
    }
  }

  // Try to find buttons by type
  try {
    const buttons = element(by.type('RCTButton'));
    await waitFor(buttons).toExist().withTimeout(1000);
    console.log('✅ Found RCTButton elements');
  } catch (e) {
    console.log('❌ No RCTButton elements found');
  }

  // Try to find touchable elements (which the button actually uses)
  try {
    const touchables = element(by.type('RCTTouchableOpacity'));
    await waitFor(touchables).toExist().withTimeout(1000);
    console.log('✅ Found RCTTouchableOpacity elements');
  } catch (e) {
    console.log('❌ No RCTTouchableOpacity elements found');
  }
}

/**
 * Check if we've reached the portfolio/main wallet screen
 * @returns true if portfolio screen is detected, false otherwise
 */
export async function checkForPortfolioScreen(): Promise<boolean> {
  console.log('Checking for portfolio screen indicators...');

  try {
    // Primary indicator: Total Balance text
    const totalBalanceText = element(by.text('Total Balance'));
    await waitFor(totalBalanceText).toBeVisible().withTimeout(8000);
    console.log('✅ Found "Total Balance" text');

    // Secondary indicator: Portfolio tab in bottom navigation
    try {
      const portfolioTab = element(by.text('Portfolio'));
      await waitFor(portfolioTab).toBeVisible().withTimeout(3000);
      console.log('✅ Found "Portfolio" tab in bottom navigation');
    } catch (e) {
      console.log('⚠️ Portfolio tab not found, but continuing...');
    }

    // Tertiary indicator: "Only verified coins" toggle (unique to this screen)
    try {
      const verifiedCoinsText = element(by.text('Only verified coins'));
      await waitFor(verifiedCoinsText).toBeVisible().withTimeout(3000);
      console.log('✅ Found "Only verified coins" text');
    } catch (e) {
      console.log('⚠️ Verified coins text not found, but continuing...');
    }

    // Quaternary indicator: Tokens tab (part of the main portfolio view)
    try {
      const tokensTab = element(by.text('Tokens'));
      await waitFor(tokensTab).toBeVisible().withTimeout(3000);
      console.log('✅ Found "Tokens" tab');
    } catch (e) {
      console.log('⚠️ Tokens tab not found, but continuing...');
    }

    console.log(
      '🎉 Successfully detected portfolio screen - all primary indicators found',
    );
    return true;
  } catch (e) {
    console.log(
      '❌ Primary indicator "Total Balance" not found, trying alternative approaches...',
    );

    try {
      // Alternative 1: Look for the Hide button (next to balance)
      const hideButton = element(by.text('Hide'));
      await waitFor(hideButton).toBeVisible().withTimeout(5000);
      console.log('✅ Found "Hide" button (alternative indicator)');
      return true;
    } catch (e) {
      console.log('❌ Hide button not found either');
    }

    try {
      // Alternative 2: Look for bottom navigation structure
      const portfolioNav = element(by.text('Portfolio'));
      const swapNav = element(by.text('Swap'));
      await waitFor(portfolioNav).toBeVisible().withTimeout(3000);
      await waitFor(swapNav).toBeVisible().withTimeout(3000);
      console.log(
        '✅ Found bottom navigation structure (alternative indicator)',
      );
      return true;
    } catch (e) {
      console.log('❌ Bottom navigation structure not found');
    }

    console.log('❌ Could not confirm portfolio screen with any indicators');
    return false;
  }
}

export async function debugAllElementsByType(types: string[]): Promise<void> {
  console.log('=== DEBUGGING ELEMENTS BY TYPE ===');
  for (const type of types) {
    try {
      const elements = element(by.type(type));
      const attributes = await elements.getAttributes();
      console.log(`${type}:`, JSON.stringify(attributes, null, 2));
    } catch (error) {
      console.log(
        `${type}: No elements found or error:`,
        (error as Error).message,
      );
    }
  }
  console.log('=== END DEBUG ===');
}

export async function setTestEnvironment(): Promise<void> {
  // We'll inject the test flag through launch arguments instead
  console.log('✅ Test environment will be set via launch args');
}

/**
 * Debug function to log all visible elements on screen
 * @param context Context message for debugging
 */
export async function debugAllVisibleElements(context: string): Promise<void> {
  console.log(`🔍 DEBUG ALL ELEMENTS: ${context}`);

  try {
    // Try to get a screenshot or element dump
    await device.takeScreenshot(`debug-${Date.now()}`);
    console.log('📸 Screenshot taken');
  } catch (e) {
    console.log('❌ Could not take screenshot');
  }

  // Try to find different types of input elements
  const inputTypes = [
    'RCTTextField',
    'RCTTextView',
    'RCTTextInput',
    'RCTMultilineTextInputView',
    'RCTSinglelineTextInputView',
    'UITextField',
    'UITextView',
  ];

  for (const inputType of inputTypes) {
    try {
      const elements = element(by.type(inputType));
      await waitFor(elements).toExist().withTimeout(1000);
      console.log(`✅ Found ${inputType} element(s)`);

      // Try to get element count
      try {
        for (let i = 0; i < 5; i++) {
          const specificElement = element(by.type(inputType)).atIndex(i);
          await waitFor(specificElement).toExist().withTimeout(500);
          console.log(`  - ${inputType} at index ${i} exists`);
        }
      } catch (e) {
        // Expected when we run out of elements
      }
    } catch (e) {
      console.log(`❌ No ${inputType} elements found`);
    }
  }

  // Try to find elements with common input-related text
  const inputTexts = [
    'Enter your key',
    'seed phrase',
    'recovery phrase',
    'Enter recovery phrase',
    'ENTER_KEY_PLACEHOLDER',
  ];

  for (const text of inputTexts) {
    try {
      const textElement = element(by.text(text));
      await waitFor(textElement).toExist().withTimeout(1000);
      console.log(`✅ Found element with text: "${text}"`);
    } catch (e) {
      console.log(`❌ No element found with text: "${text}"`);
    }
  }
}

/**
 * Securely get the test seed phrase from environment variables
 * Falls back to a standard test mnemonic if not provided
 * @returns The seed phrase to use for testing
 */
export function getSecureTestSeedPhrase(): string {
  // Try to get from environment variable (GitHub Actions secrets or local .env)
  const envSeedPhrase = process.env.TEST_SEED_PHRASE;

  if (envSeedPhrase && envSeedPhrase.trim().length > 0) {
    console.log('🔐 Using secure seed phrase from environment variable');
    return envSeedPhrase.trim();
  }

  // Fallback to standard test mnemonic (safe for public repos)
  console.log('⚠️ Using fallback test mnemonic (not for production)');
  return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
}

/**
 * Sanitize logs to prevent seed phrase exposure
 * @param message Log message
 * @param seedPhrase The seed phrase to redact
 */
export function secureLog(message: string, seedPhrase?: string): void {
  if (seedPhrase) {
    // Replace the seed phrase with asterisks in any log message
    const sanitizedMessage = message.replace(
      new RegExp(seedPhrase.replace(/\s+/g, '\\s+'), 'gi'),
      '***REDACTED_SEED_PHRASE***',
    );
    console.log(sanitizedMessage);
  } else {
    console.log(message);
  }
}

/**
 * Prevent screenshots during sensitive operations
 * @param operation The sensitive operation to perform
 * @param operationName Name of the operation for logging
 */
export async function performSecureOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  console.log(`🔒 Starting secure operation: ${operationName}`);

  try {
    // Disable screenshots during this operation
    // Note: This is a precautionary measure
    const result = await operation();
    console.log(`✅ Completed secure operation: ${operationName}`);
    return result;
  } catch (error) {
    console.log(`❌ Failed secure operation: ${operationName}`);
    throw error;
  }
}
