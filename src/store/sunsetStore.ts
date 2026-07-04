import { useEffect, useSyncExternalStore } from 'react';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import {
  getSunsetConfigCache,
  setSunsetConfigCache,
} from '../core/asyncStorage';
import { showToast } from '../containers/utilities/toastUtility';
import { hostWorker } from '../global';

/**
 * Backend wind-down config from `GET /v1/wind-down` (public, no auth). `enabled`
 * is the only behavioral gate the frontend acts on; the dates drive sunset copy.
 */
export interface WindDownConfig {
  enabled: boolean;
  windDownStartDate?: string;
  /** Final reward-epoch end / rewards-distribution date (protocol wind-down). */
  finalRewardsDistributionDate?: string;
  cardSpendTillDate?: string;
  cardSpendEndDate?: string;
  shutdownDate?: string;
}

interface SunsetState {
  isSunsetEnabled: boolean;
  initialized: boolean;
  config: WindDownConfig | null;
}

let state: SunsetState = {
  isSunsetEnabled: false,
  initialized: false,
  config: null,
};
const listeners = new Set<() => void>();

const setState = (partial: Partial<SunsetState>): void => {
  state = { ...state, ...partial };
  listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): SunsetState => state;

/**
 * Fetches the wind-down config from the public `GET /v1/wind-down` endpoint.
 * No auth (same posture as /health) — a plain axios call, no bearer.
 */
export const fetchWindDownConfig = async (): Promise<WindDownConfig> => {
  const host = hostWorker.getHost('ARCH_HOST');
  try {
    const { data } = await axios.get<WindDownConfig>(`${host}/v1/wind-down`, {
      timeout: 10000,
    });
    return { ...data, enabled: Boolean(data?.enabled) };
  } catch (error) {
    // A 404 means the wind-down config isn't deployed → definitively not in
    // wind-down. Return a disabled config so the caller overwrites any stale
    // cache. Other errors (network/timeout/5xx) re-throw so the caller keeps
    // the last known value.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { enabled: false };
    }
    throw error;
  }
};

let initPromise: Promise<void> | null = null;

const init = async (): Promise<void> => {
  if (initPromise) return await initPromise;
  initPromise = (async () => {
    try {
      // Answer from the cached config first (flag + dates), then refresh.
      const cached = await getSunsetConfigCache();
      setState({
        isSunsetEnabled: Boolean(cached?.enabled),
        config: cached,
        initialized: true,
      });
      try {
        const config = await fetchWindDownConfig();
        await setSunsetConfigCache(config);
        setState({ isSunsetEnabled: config.enabled, config });
      } catch (error) {
        Sentry.captureException(error); // keep cached value
      }
    } catch (error) {
      Sentry.captureException(error);
      setState({ initialized: true });
    }
  })();
  return await initPromise;
};

/** Synchronous read of the current flag, for non-hook call sites. */
export const getIsSunsetEnabled = (): boolean => getSnapshot().isSunsetEnabled;

/**
 * Premium-upgrade gate. When the sunset is active, shows the "not available"
 * toast and returns true (the caller should bail out); otherwise returns false.
 */
export const blockPremiumIfSunset = (): boolean => {
  if (!getSnapshot().isSunsetEnabled) return false;
  showToast('Upgrade to premium is not available now', 'error');
  return true;
};

/**
 * App-wide sunset feature flag, driven entirely by `GET /v1/wind-down`.
 * true → show every sunset change; false → no trace. `initialized` is false
 * until the flag has resolved once (use it to avoid a wrong-state flash).
 * `config` carries the wind-down dates once fetched (null until then).
 */
export const useSunset = (): {
  isSunsetEnabled: boolean;
  initialized: boolean;
  config: WindDownConfig | null;
} => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void init();
  }, []);
  return {
    isSunsetEnabled: snapshot.isSunsetEnabled,
    initialized: snapshot.initialized,
    config: snapshot.config,
  };
};
