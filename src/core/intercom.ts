import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

/**
 * Intercom wrapper for RN 0.83 + New Architecture safety.
 *
 * Why this exists:
 * - With RN 0.83 + TurboModules, importing a native module can throw during module evaluation
 *   (before any app code runs) if the native method signatures are incompatible.
 * - This repo had many top-level imports of `@intercom/intercom-react-native`, which causes the
 *   whole JS bundle to crash on launch if Intercom is incompatible/misconfigured.
 *
 * Strategy:
 * - NEVER import Intercom at top-level from app code.
 * - Lazy-load it via `require()` inside a try/catch so the app can still boot.
 * - Fail closed: if Intercom cannot be loaded, calls become no-ops (with Sentry breadcrumbs).
 *
 * NOTE:
 * - This does not “fix” Intercom native compatibility by itself. It prevents a hard crash so you
 *   can continue running the app while upgrading/replacing the Intercom SDK.
 */

type IntercomModuleType = {
  present: () => void | Promise<void>;
  logEvent: (name: string, params?: Record<string, unknown>) => void | Promise<void>;
  loginUserWithUserAttributes: (attrs: { userId: string }) => Promise<void>;
  updateUser: (attrs: {
    userId: string;
    customAttributes?: Record<string, unknown>;
  }) => Promise<void>;
};

let cachedIntercom: IntercomModuleType | null = null;
let didAttemptLoad = false;

const captureIntercomLoadError = (error: unknown): void => {
  // We want visibility in production but do not want to crash the app.
  // Keep payload small and consistent.
  try {
    Sentry.captureException({
      reason: 'Failed to load @intercom/intercom-react-native',
      platform: Platform.OS,
      error,
    });
  } catch {
    // Avoid secondary failures from error reporting.
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      '[intercom] Failed to load @intercom/intercom-react-native. Calls will be no-ops until fixed.',
      error,
    );
  }
};

const getIntercom = (): IntercomModuleType | null => {
  if (cachedIntercom) return cachedIntercom;
  if (didAttemptLoad) return null;

  didAttemptLoad = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@intercom/intercom-react-native');
    const resolved = (mod?.default ?? mod) as IntercomModuleType;
    cachedIntercom = resolved;
    return cachedIntercom;
  } catch (error) {
    captureIntercomLoadError(error);
    return null;
  }
};

export const intercomPresent = async (): Promise<void> => {
  const intercom = getIntercom();
  if (!intercom) return;

  try {
    await intercom.present();
  } catch (error) {
    // Presenting Intercom should never crash the app; capture for visibility.
    Sentry.captureException({
      reason: 'Intercom.present() failed',
      error,
    });
  }
};

export const intercomLogEvent = async (
  name: string,
  params?: Record<string, unknown>,
): Promise<void> => {
  const intercom = getIntercom();
  if (!intercom) return;

  try {
    await intercom.logEvent(name, params);
  } catch (error) {
    Sentry.captureException({
      reason: 'Intercom.logEvent() failed',
      name,
      error,
    });
  }
};

export const intercomLoginUserWithUserId = async (
  userId: string,
): Promise<void> => {
  const intercom = getIntercom();
  if (!intercom) return;

  try {
    await intercom.loginUserWithUserAttributes({ userId });
  } catch (error) {
    // Intercom frequently throws if the user is already registered; don't crash.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[intercom] loginUserWithUserAttributes failed (ignored)', {
        userId,
        error,
      });
    }
  }
};

export const intercomUpdateUser = async (
  userId: string,
  customAttributes: Record<string, unknown>,
): Promise<void> => {
  const intercom = getIntercom();
  if (!intercom) return;

  try {
    await intercom.updateUser({
      userId,
      customAttributes,
    });
  } catch (error) {
    // Same as login: Intercom may throw on duplicates or internal state issues.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[intercom] updateUser failed (ignored)', {
        userId,
        error,
      });
    }
  }
};


