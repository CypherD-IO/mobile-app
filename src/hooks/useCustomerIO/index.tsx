import { useCallback, useRef } from 'react';
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

/** @internal Reset singleton for unit tests only. */
export function _resetInitPromise(): void {
  initPromise = null;
}

interface UseCustomerIOReturn {
  initializeCustomerIO: () => Promise<boolean>;
  identifyCustomerIOUser: (
    userId: string,
    traits?: Record<string, unknown>,
  ) => Promise<void>;
  clearCustomerIOUser: () => Promise<void>;
  trackScreen: (
    screenName: string,
    properties?: Record<string, unknown>,
  ) => Promise<void>;
}

export default function useCustomerIO(): UseCustomerIOReturn {
  const initPromiseRef = useRef(initPromise);

  const initializeCustomerIO = useCallback(async (): Promise<boolean> => {
    if (initPromiseRef.current) {
      return await initPromiseRef.current;
    }

    const promise = (async (): Promise<boolean> => {
      const cdpApiKey = Config.CUSTOMERIO_CDP_API_KEY;
      const siteId = Config.CUSTOMERIO_SITE_ID;

      if (!cdpApiKey) {
        console.warn(
          '[CustomerIO] Missing CUSTOMERIO_CDP_API_KEY in env config. Skipping initialization.',
        );
        initPromise = null;
        initPromiseRef.current = null;
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
        return true;
      } catch (error) {
        Sentry.captureException(error);
        initPromise = null;
        initPromiseRef.current = null;
        return false;
      }
    })();

    initPromise = promise;
    initPromiseRef.current = promise;
    return await promise;
  }, []);

  const waitForInit = useCallback(async (): Promise<boolean> => {
    if (!initPromiseRef.current) {
      return await initializeCustomerIO();
    }
    return await initPromiseRef.current;
  }, [initializeCustomerIO]);

  /**
   * Identifies the current user with Customer.io so push notifications
   * and campaigns can be targeted to them. Must be called after the user
   * authenticates (e.g. wallet connect, social login).
   *
   * @param userId - Unique identifier for the user (wallet address or email)
   * @param traits - Optional user traits (email, name, etc.)
   */
  const identifyCustomerIOUser = useCallback(
    async (
      userId: string,
      traits?: Record<string, unknown>,
    ): Promise<void> => {
      const ready = await waitForInit();
      if (!ready) {
        return;
      }

      const trimmedUserId = userId?.trim();
      if (!trimmedUserId || trimmedUserId.length === 0) {
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
      }
    },
    [waitForInit],
  );

  const clearCustomerIOUser = useCallback(async (): Promise<void> => {
    const ready = await waitForInit();
    if (!ready) {
      return;
    }

    try {
      await CustomerIO.clearIdentify();
    } catch (error) {
      Sentry.captureException(error);
    }
  }, [waitForInit]);

  /**
   * Tracks a screen view in Customer.io, enabling page-targeted
   * in-app messages. Called from navigation state changes.
   */
  const trackScreen = useCallback(
    async (
      screenName: string,
      properties?: Record<string, unknown>,
    ): Promise<void> => {
      const ready = await waitForInit();
      if (!ready) {
        return;
      }

      const trimmed = screenName?.trim();
      if (!trimmed) {
        return;
      }

      try {
        await CustomerIO.screen(trimmed, properties ?? {});
      } catch (error) {
        Sentry.captureException(error);
      }
    },
    [waitForInit],
  );

  return {
    initializeCustomerIO,
    identifyCustomerIOUser,
    clearCustomerIOUser,
    trackScreen,
  };
}
