/**
 * Unit tests for useCustomerIO hook.
 */

/* eslint-disable import/first */

// ── Mocks ──────────────────────────────────────────────────────────────

const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockIdentify = jest.fn().mockResolvedValue(undefined);
const mockClearIdentify = jest.fn().mockResolvedValue(undefined);
const mockScreen = jest.fn().mockResolvedValue(undefined);

jest.mock('customerio-reactnative', () => ({
  CustomerIO: {
    initialize: mockInitialize,
    identify: mockIdentify,
    clearIdentify: mockClearIdentify,
    screen: mockScreen,
  },
  CioLogLevel: { Debug: 'debug', Error: 'error' },
  CioRegion: { US: 'us' },
}));

const mockCaptureException = jest.fn();
jest.mock('@sentry/react-native', () => ({
  captureException: mockCaptureException,
}));

const mockConfig: Record<string, string | undefined> = {};
jest.mock('react-native-config', () => ({
  __esModule: true,
  Config: mockConfig,
}));

const mockRefreshPushToken = jest.fn().mockResolvedValue(undefined);

// CioPushBridge is destructured at module-level in the hook
// (`const { CioPushBridge } = NativeModules`), so we must patch
// NativeModules BEFORE the hook is imported.
import { NativeModules, Platform } from 'react-native';

(NativeModules as Record<string, unknown>).CioPushBridge = {
  refreshPushToken: mockRefreshPushToken,
};

// ── Imports ────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import useCustomerIO, { _resetInitPromise } from '../index';

// ── Helpers ────────────────────────────────────────────────────────────

function setConfig(values: Record<string, string> = {}): void {
  Object.keys(mockConfig).forEach(key => {
    mockConfig[key] = undefined;
  });
  Object.assign(mockConfig, values);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('useCustomerIO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setConfig();
    _resetInitPromise();
    Platform.OS = 'ios';
  });

  // ── initializeCustomerIO ─────────────────────────────────────────────

  describe('initializeCustomerIO', () => {
    it('initializes SDK with correct config when both keys present', async () => {
      setConfig({
        CUSTOMERIO_CDP_API_KEY: 'test-cdp-key',
        CUSTOMERIO_SITE_ID: 'test-site-id',
      });
      const { result } = renderHook(() => useCustomerIO());

      let success = false;
      await act(async () => {
        success = await result.current.initializeCustomerIO();
      });

      expect(success).toBe(true);
      expect(mockInitialize).toHaveBeenCalledTimes(1);
      expect(mockInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          cdpApiKey: 'test-cdp-key',
          region: 'us',
          trackApplicationLifecycleEvents: true,
          inApp: { siteId: 'test-site-id' },
        }),
      );
    });

    it('omits inApp when CUSTOMERIO_SITE_ID is missing', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.initializeCustomerIO();
      });

      expect(mockInitialize).toHaveBeenCalledWith(
        expect.not.objectContaining({ inApp: expect.anything() }),
      );
    });

    it('returns false when CDP API key is missing', async () => {
      const { result } = renderHook(() => useCustomerIO());

      let success = true;
      await act(async () => {
        success = await result.current.initializeCustomerIO();
      });

      expect(success).toBe(false);
      expect(mockInitialize).not.toHaveBeenCalled();
    });

    it('returns false and reports to Sentry when SDK throws', async () => {
      const sdkError = new Error('SDK init failed');
      mockInitialize.mockRejectedValueOnce(sdkError);
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      let success = true;
      await act(async () => {
        success = await result.current.initializeCustomerIO();
      });

      expect(success).toBe(false);
      expect(mockCaptureException).toHaveBeenCalledWith(sdkError);
    });

    it('reuses singleton on subsequent calls', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.initializeCustomerIO();
        await result.current.initializeCustomerIO();
      });

      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('allows re-initialization after a previous failure', async () => {
      mockInitialize.mockRejectedValueOnce(new Error('transient'));
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      let first = true;
      await act(async () => {
        first = await result.current.initializeCustomerIO();
      });
      expect(first).toBe(false);

      mockInitialize.mockResolvedValueOnce(undefined);
      let second = false;
      await act(async () => {
        second = await result.current.initializeCustomerIO();
      });
      expect(second).toBe(true);
      expect(mockInitialize).toHaveBeenCalledTimes(2);
    });

  });

  // ── identifyCustomerIOUser ───────────────────────────────────────────

  describe('identifyCustomerIOUser', () => {
    it('identifies user with userId and traits', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('user-123', {
          email: 'test@example.com',
          plan: 'pro',
        });
      });

      expect(mockIdentify).toHaveBeenCalledWith({
        userId: 'user-123',
        traits: { email: 'test@example.com', plan: 'pro' },
      });
    });

    it('passes empty traits when omitted', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('user-456');
      });

      expect(mockIdentify).toHaveBeenCalledWith({
        userId: 'user-456',
        traits: {},
      });
    });

    it('trims whitespace from userId', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('  user-789  ');
      });

      expect(mockIdentify).toHaveBeenCalledWith({
        userId: 'user-789',
        traits: {},
      });
    });

    it('skips identify when userId is empty', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('');
      });

      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it('skips identify when userId is only whitespace', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('   ');
      });

      expect(mockIdentify).not.toHaveBeenCalled();
    });

    it('refreshes push token on iOS after identify', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      Platform.OS = 'ios';
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('user-ios');
      });

      expect(mockRefreshPushToken).toHaveBeenCalledTimes(1);
    });

    it('does NOT refresh push token on Android', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      Platform.OS = 'android';
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('user-android');
      });

      expect(mockRefreshPushToken).not.toHaveBeenCalled();
    });

    it('reports to Sentry when identify throws', async () => {
      const identifyError = new Error('identify failed');
      mockIdentify.mockRejectedValueOnce(identifyError);
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('user-err');
      });

      expect(mockCaptureException).toHaveBeenCalledWith(identifyError);
    });

    it('reports to Sentry when push token refresh fails', async () => {
      const pushError = new Error('push refresh failed');
      mockRefreshPushToken.mockRejectedValueOnce(pushError);
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      Platform.OS = 'ios';
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('user-push');
      });

      expect(mockIdentify).toHaveBeenCalled();
      expect(mockCaptureException).toHaveBeenCalledWith(pushError);
    });

    it('skips identify when SDK not initialized', async () => {
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.identifyCustomerIOUser('user-123');
      });

      expect(mockIdentify).not.toHaveBeenCalled();
    });
  });

  // ── clearCustomerIOUser ──────────────────────────────────────────────

  describe('clearCustomerIOUser', () => {
    it('calls clearIdentify on the SDK', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.clearCustomerIOUser();
      });

      expect(mockClearIdentify).toHaveBeenCalledTimes(1);
    });

    it('reports to Sentry when clearIdentify throws', async () => {
      const clearError = new Error('clear failed');
      mockClearIdentify.mockRejectedValueOnce(clearError);
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.clearCustomerIOUser();
      });

      expect(mockCaptureException).toHaveBeenCalledWith(clearError);
    });

    it('skips clearIdentify when SDK not initialized', async () => {
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.clearCustomerIOUser();
      });

      expect(mockClearIdentify).not.toHaveBeenCalled();
    });
  });

  // ── trackScreen ────────────────────────────────────────────────────

  describe('trackScreen', () => {
    it('sends screen event with name and properties', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.trackScreen('HomeScreen', { tab: 'cards' });
      });

      expect(mockScreen).toHaveBeenCalledWith('HomeScreen', { tab: 'cards' });
    });

    it('sends empty properties when omitted', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.trackScreen('CardScreen');
      });

      expect(mockScreen).toHaveBeenCalledWith('CardScreen', {});
    });

    it('skips when screen name is empty', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.trackScreen('');
      });

      expect(mockScreen).not.toHaveBeenCalled();
    });

    it('trims whitespace from screen name', async () => {
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.trackScreen('  CardScreen  ');
      });

      expect(mockScreen).toHaveBeenCalledWith('CardScreen', {});
    });

    it('reports to Sentry when screen call throws', async () => {
      const screenError = new Error('screen failed');
      mockScreen.mockRejectedValueOnce(screenError);
      setConfig({ CUSTOMERIO_CDP_API_KEY: 'test-cdp-key' });
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.trackScreen('CardScreen');
      });

      expect(mockCaptureException).toHaveBeenCalledWith(screenError);
    });

    it('skips when SDK not initialized', async () => {
      const { result } = renderHook(() => useCustomerIO());

      await act(async () => {
        await result.current.trackScreen('CardScreen');
      });

      expect(mockScreen).not.toHaveBeenCalled();
    });
  });
});
