import { device, element, by } from 'detox';
import {
  setupTestWithWallet,
  secureLog,
  dismissPromotionalModals,
  waitForElementById,
  waitForElementByText,
} from './helpers';

describe('Load Card Flow', () => {
  beforeAll(
    async () => {
      // Setup test with a fresh wallet import (independent of other tests)
      await setupTestWithWallet();
    },
    process.env.CI ? 360000 : 300000,
  );

  it('should complete the load card flow', async () => {
    secureLog('Starting load card flow test');

    // Disable sync — app has persistent network activity.
    // Use manual polling (waitForElementById / waitForElementByText) instead
    // of Detox's waitFor(). Detox sync is perpetually busy on CI due to
    // LogBox errors, pending timers, and network image loads; waitFor()
    // hangs until timeout even when the element is on screen.
    await device.disableSynchronization();

    // Step 1: Tap Card tab in bottom navigation
    secureLog('Step 1: Looking for Card tab');
    await waitForElementById('tab-card', { timeoutMs: 15000 });
    await element(by.id('tab-card')).tap();
    secureLog('Tapped Card tab');

    // Wait for Card screen to load, dismiss any promotional modals
    await new Promise(resolve => setTimeout(resolve, 3000));
    await dismissPromotionalModals();

    // Step 2: Tap "Load Card" button (near top of screen, may be clipped by notch)
    secureLog('Step 2: Tapping Load Card button');
    await waitForElementById('card-load-btn', { timeoutMs: 15000 });
    try {
      await element(by.id('card-load-btn')).tap();
    } catch {
      // Fallback: tap the text inside the button (different hit-test bounds)
      await element(by.text('Load Card')).tap();
    }
    secureLog('Tapped Load Card button');

    // Step 3: Select token if token selector appears.
    //
    // IMPORTANT: If we tap the selector and it opens the modal, we MUST
    // either pick a token OR dismiss the modal — otherwise the modal stays
    // open and covers the number pad below, causing step 4 to fail on CI.
    // Previously this step used waitFor() which was sync-blocked; the
    // USDC text never resolved and the modal was left open.
    secureLog('Step 3: Checking for token selector');
    const tokenSelectorPresent = await waitForElementByText('Choose Token', {
      timeoutMs: 5000,
    }).catch(() => false);
    if (tokenSelectorPresent) {
      await element(by.id('fundcard-token-selector')).tap();
      secureLog('Opened token selector modal');
      // Give modal time to slide up
      await new Promise(resolve => setTimeout(resolve, 1500));

      const usdcFound = await waitForElementByText('USDC', { timeoutMs: 10000 });
      if (usdcFound) {
        await element(by.text('USDC')).atIndex(0).tap();
        secureLog('Selected USDC token');
        // Give modal time to slide down
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // Modal is open but USDC row wasn't visible. Close the modal by
        // swiping down so the number pad below is reachable. Without this,
        // step 4 will fail because the modal overlays the number pad.
        secureLog('USDC not found in selector — swiping to close modal');
        try {
          await element(by.text('Select Token')).swipe('down', 'fast', 0.75);
        } catch {
          // Fallback: tap somewhere outside the modal (top area)
          await element(by.id('card-load-btn')).tap().catch(() => {});
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } else {
      secureLog('Token selector not shown, proceeding with default token');
    }

    // Step 4: Enter amount using the custom number pad (not a text input).
    // Wait for the number "1" to be visible before tapping — on CI, the
    // token selector modal can linger and cover the number pad.
    secureLog('Step 4: Entering amount via number pad');
    const numberPadReady = await waitForElementByText('1', { timeoutMs: 10000 });
    if (!numberPadReady) {
      throw new Error(
        'Number pad not visible — a modal may be covering it',
      );
    }
    await element(by.text('1')).atIndex(0).tap();
    await element(by.text('0')).atIndex(0).tap();
    secureLog('Entered amount: 10');

    // Step 5: Tap Quote button
    secureLog('Step 5: Tapping Quote button');
    await waitForElementById('fundcard-quote-btn', { timeoutMs: 10000 });
    await element(by.id('fundcard-quote-btn')).tap();
    secureLog('Tapped Quote button');

    // Step 6: Tap Load button on quote screen
    secureLog('Step 6: Tapping Load button');
    await waitForElementById('quote-load-btn', { timeoutMs: 15000 });
    await element(by.id('quote-load-btn')).tap();
    secureLog('Tapped Load button');

    // Step 7: Check for success indicator (best-effort — actual funding
    // may fail on a fresh wallet with no gas, but reaching this step
    // confirms the quote flow worked)
    secureLog('Step 7: Checking for success indicator');
    const fundingInProgress = await waitForElementByText('Funding in progress', {
      timeoutMs: 10000,
    });
    if (fundingInProgress) {
      secureLog('Success: Funding in progress indicator found');
    } else {
      const genericSuccess = await waitForElementByText('Success', {
        timeoutMs: 5000,
      });
      if (genericSuccess) {
        secureLog('Success: Generic success indicator found');
      } else {
        secureLog(
          'No explicit success UI found, but Load button was tapped successfully',
        );
      }
    }

    secureLog('Load card flow test completed');
  });
});
