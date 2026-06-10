import { NativeModules, Platform } from 'react-native';
import Config from 'react-native-config';
import * as Sentry from '@sentry/react-native';
import axios from '../../core/Http';
import { hostWorker } from '../../global';
import { DeviceType } from '../../constants/enum';
import { getDeviceMetadata } from '../../core/util';
import {
  getAppAttestKeyId,
  setAppAttestKeyId,
  clearAppAttestKeyId,
} from '../../core/asyncStorage';
import { IIntegrity } from '../../models/integrity.interface';

const { IntegrityModule, DeviceCheckBridge } = NativeModules;

const fetchNonce = async (): Promise<string> => {
  const host = hostWorker.getHost('ARCH_HOST');
  const { data } = await axios.get(
    `${host}/v1/authentication/integrity-token-nonce`,
  );
  if (typeof data !== 'string') {
    throw new Error('Integrity nonce response shape unexpected');
  }
  return data;
};

const attestIos = async (nonce: string): Promise<IIntegrity> => {
  if (!DeviceCheckBridge) {
    throw new Error('DeviceCheckBridge native module not available');
  }
  const { keyId, attestation } = await DeviceCheckBridge.attestDevice(nonce);
  await setAppAttestKeyId(keyId);
  return {
    token: attestation,
    keyId,
    challenge: nonce,
    platform: DeviceType.IOS,
    isAssertion: false,
    deviceInfo: await getDeviceMetadata(),
  };
};

const ATTESTATION_KEY_INVALID = 'ATTESTATION_KEY_INVALID';

const assertIos = async (keyId: string, nonce: string): Promise<IIntegrity> => {
  if (!DeviceCheckBridge) {
    throw new Error('DeviceCheckBridge native module not available');
  }
  try {
    const { assertion } = await DeviceCheckBridge.generateAssertion(
      keyId,
      nonce,
    );
    return {
      token: assertion,
      keyId,
      challenge: nonce,
      clientData: nonce,
      platform: DeviceType.IOS,
      isAssertion: true,
      deviceInfo: await getDeviceMetadata(),
    };
  } catch (err: any) {
    if (err?.code === 'INVALID_KEY') {
      await clearAppAttestKeyId();
      throw new Error(ATTESTATION_KEY_INVALID);
    }
    throw err;
  }
};

// Matches backend's `NODE_ENV != 'production'` gate.
const shouldUseMockToken = (): boolean => {
  const env = Config.ENVIRONMENT;
  return (
    !!Config.MOCK_INTEGRITY_TOKEN &&
    (env === 'staging' || env === 'development')
  );
};

export const getIntegrityToken = async (): Promise<IIntegrity> => {
  if (shouldUseMockToken()) {
    return {
      token: Config.MOCK_INTEGRITY_TOKEN,
      platform: Platform.OS === 'ios' ? DeviceType.IOS : DeviceType.ANDROID,
      deviceInfo: await getDeviceMetadata(),
    };
  }

  const nonce = await fetchNonce();

  if (Platform.OS === 'ios') {
    const storedKeyId = await getAppAttestKeyId();
    try {
      if (storedKeyId) return await assertIos(storedKeyId, nonce);
      return await attestIos(nonce);
    } catch (err: any) {
      if (err?.message === ATTESTATION_KEY_INVALID) {
        // Previous nonce may have been consumed during the failed assertion;
        // fetch a fresh one before re-attesting.
        const freshNonce = await fetchNonce();
        return await attestIos(freshNonce);
      }
      throw err;
    }
  }

  if (!IntegrityModule) {
    throw new Error('IntegrityModule native module not available');
  }
  const token = await IntegrityModule.getIntegrityToken(nonce);
  return {
    token,
    platform: DeviceType.ANDROID,
    deviceInfo: await getDeviceMetadata(),
  };
};

// Call after a 401 from the backend when isAssertion was true — clears the
// stored keyId so the next getIntegrityToken() call attests fresh.
export const handleBackendIntegrityRejection = async (): Promise<void> => {
  try {
    await clearAppAttestKeyId();
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const useIntegrityService = () => ({
  getIntegrityToken,
  handleBackendIntegrityRejection,
});
