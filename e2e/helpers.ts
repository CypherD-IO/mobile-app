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

  // ------ Screen 1 ------
  // Verify we're on the first onboarding screen using the actual text content
  const screen1TextContent =
    'Non-Custodial wallet for all your Multi-Chain and DeFi needs!';
  const screen1Text = element(by.text(screen1TextContent));
  await waitFor(screen1Text).toExist().withTimeout(5000);

  console.log(
    'Found first onboarding screen, attempting to tap NEXT button...',
  );

  // Try tapping the NEXT button using a combination of different methods
  try {
    // Approach 1: Try directly by testID with different variations
    console.log('Attempt 1: Looking for next-button by testID');
    await element(by.id('next-button')).tap();
    console.log('Successfully tapped NEXT button by testID');
  } catch (e) {
    console.log('Could not tap by testID, trying next approach');

    try {
      // Approach 2: Try by direct text match
      console.log('Attempt 2: Looking for button with text "NEXT"');
      await element(by.text('NEXT')).tap();
      console.log('Successfully tapped NEXT button by text');
    } catch (e) {
      console.log('Could not tap by text, trying next approach');

      try {
        // Approach 3: Try by accessibility label
        console.log(
          'Attempt 3: Looking for button with accessibility label "NEXT"',
        );
        await element(by.label('NEXT')).tap();
        console.log('Successfully tapped NEXT button by accessibility label');
      } catch (e) {
        console.log(
          'Could not tap by accessibility label, trying next approach',
        );

        try {
          // Approach 4: Try using multiple matchers or ancestor/descendant relationships
          console.log('Attempt 4: Looking for button as descendant of view');
          const skipButton = await element(by.text('SKIP'));
          await skipButton.tapAtPoint({ x: 200, y: 0 }); // Tap to the right of SKIP button
          console.log('Tapped in the area where NEXT button should be');
        } catch (e) {
          console.error('All attempts to find NEXT button failed');
          throw new Error('Could not find or tap NEXT button');
        }
      }
    }
  }

  // Allow animation to complete
  await delay(2000);

  // ------ Screen 2 ------
  // Using the actual text content
  const screen2TextContent = 'Seamless access to different blockchains';
  try {
    const screen2Text = element(by.text(screen2TextContent));
    await waitFor(screen2Text).toExist().withTimeout(5000);
    console.log('Found second onboarding screen');
  } catch (e) {
    console.error(
      'Could not find second screen content, attempting to proceed anyway',
    );
  }

  // Try tapping NEXT again using the same approaches
  try {
    console.log('Attempt 1: Looking for next-button by testID on screen 2');
    await element(by.id('next-button')).tap();
    console.log('Successfully tapped NEXT button for screen 2 by testID');
  } catch (e) {
    console.log('Could not tap by testID on screen 2, trying next approach');

    try {
      console.log('Attempt 2: Looking for button with text "NEXT" on screen 2');
      await element(by.text('NEXT')).tap();
      console.log('Successfully tapped NEXT button for screen 2 by text');
    } catch (e) {
      console.log('Could not tap by text on screen 2, trying next approach');

      try {
        console.log(
          'Attempt 3: Looking for button with accessibility label "NEXT" on screen 2',
        );
        await element(by.label('NEXT')).tap();
        console.log(
          'Successfully tapped NEXT button for screen 2 by accessibility label',
        );
      } catch (e) {
        console.log(
          'Could not tap by accessibility label on screen 2, trying next approach',
        );

        try {
          console.log(
            'Attempt 4: Looking for button as descendant of view on screen 2',
          );
          const skipButton = await element(by.text('SKIP'));
          await skipButton.tapAtPoint({ x: 200, y: 0 }); // Tap to the right of SKIP button
          console.log(
            'Tapped in the area where NEXT button should be on screen 2',
          );
        } catch (e) {
          console.error('All attempts to find NEXT button on screen 2 failed');
          throw new Error('Could not find or tap NEXT button on screen 2');
        }
      }
    }
  }

  // Allow animation to complete
  await delay(2000);
}

/**
 * Reset app state completely - uninstall, reinstall, and clean launch
 * @returns void
 */
export async function resetAppCompletely(): Promise<void> {
  console.log('Performing complete app reset...');
  await device.uninstallApp();
  await device.installApp();

  // Launch with permissions pre-granted
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES' },
    launchArgs: { detoxHandleSystemAlerts: 'YES' },
  });
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
    await waitFor(primaryButton).toBeVisible().withTimeout(5000);
    return primaryButton;
  } catch (e) {
    console.log(
      `Primary button text "${primaryText}" not found, trying alternatives...`,
    );

    // Try alternative text options
    for (const altText of alternativeTexts) {
      try {
        const altButton = element(by.text(altText));
        await waitFor(altButton).toBeVisible().withTimeout(3000);
        return altButton;
      } catch (altError) {
        console.log(`Alternative button text "${altText}" not found`);
      }
    }

    // Try by ID if provided
    if (buttonId) {
      try {
        const idButton = element(by.id(buttonId));
        await waitFor(idButton).toBeVisible().withTimeout(3000);
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
