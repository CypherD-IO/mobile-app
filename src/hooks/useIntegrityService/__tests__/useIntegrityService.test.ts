/**
 * Unit tests for the integrity service.
 *
 * Covers the iOS attest/assert branching, Android Play Integrity path, and the
 * mock-token bypass gate. `NativeModules.IntegrityModule` and
 * `NativeModules.DeviceCheckBridge` are destructured at module load time, so
 * we re-import the module under jest.isolateModules per test after setting
 * the relevant NativeModules state.
 */

import { NativeModules, Platform } from 'react-native';

jest.mock('react-native-config', () => ({}));

jest.mock('../../../core/Http', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../../../global', () => ({
  hostWorker: { getHost: jest.fn(() => 'https://arch.test') },
}));

jest.mock('../../../core/util', () => ({
  getDeviceMetadata: jest.fn(async () => ({
    brand: 'Apple',
    manufacturer: 'Apple',
    model: 'iPhone',
    deviceId: 'iPhone14,2',
    systemVersion: '17.0',
    appVersion: '1.0.0',
    buildNumber: '1',
    bundleId: 'com.cypherd.iosWalletv1',
    platform: 'ios' as const,
  })),
}));

jest.mock('../../../core/asyncStorage', () => ({
  getAppAttestKeyId: jest.fn(),
  setAppAttestKeyId: jest.fn(),
  clearAppAttestKeyId: jest.fn(),
}));

const setPlatform = (os: 'ios' | 'android') => {
  (Platform as any).OS = os;
};

const setNativeModules = (mods: {
  IntegrityModule?: any;
  DeviceCheckBridge?: any;
}) => {
  (NativeModules as any).IntegrityModule = mods.IntegrityModule;
  (NativeModules as any).DeviceCheckBridge = mods.DeviceCheckBridge;
};

const loadService = () => {
  let mod!: typeof import('../index');
  jest.isolateModules(() => {
    mod = require('../index');
  });
  return mod;
};

const setConfig = (config: Record<string, any>) => {
  const Config = require('react-native-config');
  Object.keys(Config).forEach(k => delete Config[k]);
  Object.assign(Config, config);
};

describe('useIntegrityService', () => {
  let axiosMock: { get: jest.Mock };
  let asyncStorageMock: {
    getAppAttestKeyId: jest.Mock;
    setAppAttestKeyId: jest.Mock;
    clearAppAttestKeyId: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock = require('../../../core/Http').default;
    asyncStorageMock = require('../../../core/asyncStorage');
    setConfig({});
    setNativeModules({ IntegrityModule: undefined, DeviceCheckBridge: undefined });
  });

  describe('mock token bypass', () => {
    it('returns the mock token when ENVIRONMENT=staging and MOCK_INTEGRITY_TOKEN is set', async () => {
      setPlatform('android');
      setConfig({
        MOCK_INTEGRITY_TOKEN: 'mock-token-abc',
        ENVIRONMENT: 'staging',
      });

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(result.token).toBe('mock-token-abc');
      expect(result.platform).toBe('android');
      expect(result.deviceInfo).toBeDefined();
      expect(axiosMock.get).not.toHaveBeenCalled();
    });

    it('returns the mock token when ENVIRONMENT=development', async () => {
      setPlatform('ios');
      setConfig({
        MOCK_INTEGRITY_TOKEN: 'mock-token-dev',
        ENVIRONMENT: 'development',
      });

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(result.token).toBe('mock-token-dev');
      expect(result.platform).toBe('iOS');
    });

    it('falls through to real integrity when ENVIRONMENT=production even if mock is set', async () => {
      setPlatform('android');
      setConfig({
        MOCK_INTEGRITY_TOKEN: 'should-not-be-used',
        ENVIRONMENT: 'production',
      });
      setNativeModules({
        IntegrityModule: { getIntegrityToken: jest.fn(async () => 'real-token') },
      });
      axiosMock.get.mockResolvedValue({ data: 'nonce-xyz' });

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(result.token).toBe('real-token');
      expect(axiosMock.get).toHaveBeenCalled();
    });

    it('falls through when MOCK_INTEGRITY_TOKEN is not set', async () => {
      setPlatform('android');
      setConfig({ ENVIRONMENT: 'staging' });
      setNativeModules({
        IntegrityModule: { getIntegrityToken: jest.fn(async () => 'real') },
      });
      axiosMock.get.mockResolvedValue({ data: 'nonce' });

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(result.token).toBe('real');
    });
  });

  describe('Android path', () => {
    beforeEach(() => {
      setPlatform('android');
    });

    it('fetches nonce and calls IntegrityModule.getIntegrityToken', async () => {
      const playIntegrity = jest.fn(async () => 'play-integrity-jws');
      setNativeModules({
        IntegrityModule: { getIntegrityToken: playIntegrity },
      });
      axiosMock.get.mockResolvedValue({ data: 'srv-nonce' });

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(axiosMock.get).toHaveBeenCalledWith(
        'https://arch.test/v1/authentication/integrity-token-nonce',
      );
      expect(playIntegrity).toHaveBeenCalledWith('srv-nonce');
      expect(result).toEqual({
        token: 'play-integrity-jws',
        platform: 'android',
        deviceInfo: expect.objectContaining({ platform: 'ios' }),
      });
    });

    it('throws when IntegrityModule native module is missing', async () => {
      setNativeModules({});
      axiosMock.get.mockResolvedValue({ data: 'nonce' });

      const { getIntegrityToken } = loadService();
      await expect(getIntegrityToken()).rejects.toThrow(
        /IntegrityModule native module not available/,
      );
    });

    it('throws when the nonce endpoint returns a non-string', async () => {
      setNativeModules({
        IntegrityModule: { getIntegrityToken: jest.fn() },
      });
      axiosMock.get.mockResolvedValue({ data: { wrapped: 'nope' } });

      const { getIntegrityToken } = loadService();
      await expect(getIntegrityToken()).rejects.toThrow(
        /nonce response shape unexpected/,
      );
    });
  });

  describe('iOS path', () => {
    beforeEach(() => {
      setPlatform('ios');
    });

    it('calls attestDevice on first install (no stored keyId) and persists the new keyId', async () => {
      const attestDevice = jest.fn(async () => ({
        keyId: 'new-key-id',
        attestation: 'base64-attestation',
      }));
      setNativeModules({ DeviceCheckBridge: { attestDevice } });
      axiosMock.get.mockResolvedValue({ data: 'nonce-1' });
      asyncStorageMock.getAppAttestKeyId.mockResolvedValue(null);

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(attestDevice).toHaveBeenCalledWith('nonce-1');
      expect(asyncStorageMock.setAppAttestKeyId).toHaveBeenCalledWith(
        'new-key-id',
      );
      expect(result).toMatchObject({
        token: 'base64-attestation',
        keyId: 'new-key-id',
        challenge: 'nonce-1',
        platform: 'iOS',
        isAssertion: false,
      });
    });

    it('calls generateAssertion when a keyId is already stored', async () => {
      const generateAssertion = jest.fn(async () => ({
        assertion: 'base64-assertion',
      }));
      const attestDevice = jest.fn();
      setNativeModules({
        DeviceCheckBridge: { generateAssertion, attestDevice },
      });
      axiosMock.get.mockResolvedValue({ data: 'nonce-2' });
      asyncStorageMock.getAppAttestKeyId.mockResolvedValue('stored-key');

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(generateAssertion).toHaveBeenCalledWith('stored-key', 'nonce-2');
      expect(attestDevice).not.toHaveBeenCalled();
      expect(asyncStorageMock.setAppAttestKeyId).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        token: 'base64-assertion',
        keyId: 'stored-key',
        challenge: 'nonce-2',
        clientData: 'nonce-2',
        platform: 'iOS',
        isAssertion: true,
      });
    });

    it('recovers from INVALID_KEY by clearing keyId, fetching a fresh nonce, and re-attesting', async () => {
      const invalidKeyErr: any = new Error('Key invalid');
      invalidKeyErr.code = 'INVALID_KEY';
      const generateAssertion = jest.fn(async () => {
        throw invalidKeyErr;
      });
      const attestDevice = jest.fn(async () => ({
        keyId: 'fresh-key',
        attestation: 'fresh-attestation',
      }));
      setNativeModules({
        DeviceCheckBridge: { generateAssertion, attestDevice },
      });
      asyncStorageMock.getAppAttestKeyId.mockResolvedValue('stale-key');
      axiosMock.get
        .mockResolvedValueOnce({ data: 'nonce-stale' })
        .mockResolvedValueOnce({ data: 'nonce-fresh' });

      const { getIntegrityToken } = loadService();
      const result = await getIntegrityToken();

      expect(generateAssertion).toHaveBeenCalledWith('stale-key', 'nonce-stale');
      expect(asyncStorageMock.clearAppAttestKeyId).toHaveBeenCalled();
      expect(axiosMock.get).toHaveBeenCalledTimes(2);
      expect(attestDevice).toHaveBeenCalledWith('nonce-fresh');
      expect(asyncStorageMock.setAppAttestKeyId).toHaveBeenCalledWith(
        'fresh-key',
      );
      expect(result).toMatchObject({
        token: 'fresh-attestation',
        keyId: 'fresh-key',
        isAssertion: false,
      });
    });

    it('propagates non-INVALID_KEY assertion errors without re-attesting', async () => {
      const genericErr: any = new Error('something else');
      genericErr.code = 'ASSERT_FAILED';
      const generateAssertion = jest.fn(async () => {
        throw genericErr;
      });
      const attestDevice = jest.fn();
      setNativeModules({
        DeviceCheckBridge: { generateAssertion, attestDevice },
      });
      asyncStorageMock.getAppAttestKeyId.mockResolvedValue('some-key');
      axiosMock.get.mockResolvedValue({ data: 'nonce' });

      const { getIntegrityToken } = loadService();
      await expect(getIntegrityToken()).rejects.toThrow('something else');

      expect(attestDevice).not.toHaveBeenCalled();
      expect(asyncStorageMock.clearAppAttestKeyId).not.toHaveBeenCalled();
    });

    it('throws when DeviceCheckBridge is missing (no stored keyId path)', async () => {
      setNativeModules({});
      asyncStorageMock.getAppAttestKeyId.mockResolvedValue(null);
      axiosMock.get.mockResolvedValue({ data: 'nonce' });

      const { getIntegrityToken } = loadService();
      await expect(getIntegrityToken()).rejects.toThrow(
        /DeviceCheckBridge native module not available/,
      );
    });

    it('throws when DeviceCheckBridge is missing (assertion path)', async () => {
      setNativeModules({});
      asyncStorageMock.getAppAttestKeyId.mockResolvedValue('stored');
      axiosMock.get.mockResolvedValue({ data: 'nonce' });

      const { getIntegrityToken } = loadService();
      await expect(getIntegrityToken()).rejects.toThrow(
        /DeviceCheckBridge native module not available/,
      );
    });
  });

  describe('handleBackendIntegrityRejection', () => {
    it('clears the stored keyId', async () => {
      const { handleBackendIntegrityRejection } = loadService();
      await handleBackendIntegrityRejection();
      expect(asyncStorageMock.clearAppAttestKeyId).toHaveBeenCalled();
    });

    it('swallows storage errors and reports them to Sentry', async () => {
      const Sentry = require('@sentry/react-native');
      asyncStorageMock.clearAppAttestKeyId.mockRejectedValueOnce(
        new Error('disk error'),
      );

      const { handleBackendIntegrityRejection } = loadService();
      await expect(handleBackendIntegrityRejection()).resolves.toBeUndefined();
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('useIntegrityService hook', () => {
    it('returns the public surface', () => {
      const { useIntegrityService } = loadService();
      const svc = useIntegrityService();
      expect(typeof svc.getIntegrityToken).toBe('function');
      expect(typeof svc.handleBackendIntegrityRejection).toBe('function');
    });
  });
});
