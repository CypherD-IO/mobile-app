import {
  CioConfig,
  CioLogLevel,
  CioRegion,
  CustomerIO,
} from 'customerio-reactnative';
import { NativeModules, Platform } from 'react-native';
import { Config } from 'react-native-config';
import * as Sentry from '@sentry/react-native';

const { CioPushBridge } = NativeModules;

let initPromise: Promise<boolean> | null = null;

/**
 * Initializes the Customer.io SDK with the CDP API key and Site ID
 * from environment configuration. Safe to call multiple times;
 * subsequent calls return the same promise.
 */
export const initializeCustomerIO = async (): Promise<boolean> => {
  if (initPromise) {
    return await initPromise;
  }

  initPromise = (async (): Promise<boolean> => {
    const cdpApiKey = Config.CUSTOMERIO_CDP_API_KEY;
    const siteId = Config.CUSTOMERIO_SITE_ID;

    if (!cdpApiKey) {
      console.warn(
        '[CustomerIO] Missing CUSTOMERIO_CDP_API_KEY in env config. Skipping initialization.',
      );
      initPromise = null;
      return false;
    }

    try {
      const config: CioConfig = {
        cdpApiKey,
        region: CioRegion.US,
        logLevel: __DEV__ ? CioLogLevel.Debug : CioLogLevel.Error,
        trackApplicationLifecycleEvents: true,
        ...(siteId
          ? {
              inApp: {
                siteId,
              },
            }
          : {}),
      };

      await CustomerIO.initialize(config);
      console.log('[CustomerIO] SDK initialized successfully');
      return true;
    } catch (error) {
      Sentry.captureException(error);
      console.error('[CustomerIO] Failed to initialize SDK:', error);
      initPromise = null;
      return false;
    }
  })();

  return await initPromise;
};

/**
 * Waits for the SDK to be initialized. If initialization hasn't started yet,
 * triggers it automatically so callers like identify/clear never silently fail.
 */
const waitForInit = async (): Promise<boolean> => {
  if (!initPromise) {
    console.log(
      '[CustomerIO] SDK not yet started — auto-initializing before proceeding.',
    );
    return await initializeCustomerIO();
  }
  return await initPromise;
};

/**
 * Identifies the current user with Customer.io so push notifications
 * and campaigns can be targeted to them. Must be called after the user
 * authenticates (e.g. wallet connect, social login).
 *
 * Automatically waits for SDK initialization to complete before identifying.
 *
 * @param userId - Unique identifier for the user (wallet address or email)
 * @param traits - Optional user traits (email, name, etc.)
 */
export const identifyCustomerIOUser = async (
  userId: string,
  traits?: Record<string, unknown>,
): Promise<void> => {
  const ready = await waitForInit();
  if (!ready) {
    return;
  }

  const trimmedUserId = userId?.trim();
  if (!trimmedUserId || trimmedUserId.length === 0) {
    console.warn('[CustomerIO] Cannot identify user with empty userId.');
    return;
  }

  try {
    await CustomerIO.identify({
      userId: trimmedUserId,
      traits: traits ?? {},
    });

    if (Platform.OS === 'ios' && CioPushBridge?.refreshPushToken) {
      try {
        await CioPushBridge.refreshPushToken();
      } catch (pushError) {
        Sentry.captureException(pushError);
      }
    }
  } catch (error) {
    Sentry.captureException(error);
    console.error('[CustomerIO] Failed to identify user:', error);
  }
};

/**
 * Clears the currently identified user from Customer.io.
 * Call this on logout to stop sending notifications to the device
 * for the previous user.
 */
export const clearCustomerIOUser = async (): Promise<void> => {
  const ready = await waitForInit();
  if (!ready) {
    return;
  }

  try {
    await CustomerIO.clearIdentify();
    console.log('[CustomerIO] User cleared');
  } catch (error) {
    Sentry.captureException(error);
    console.error('[CustomerIO] Failed to clear user:', error);
  }
};
