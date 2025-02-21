import { NativeModules, Platform } from 'react-native';
import useAxios from '../../core/HttpRequest';
import Config from 'react-native-config';
import { DeviceType } from '../../constants/enum';
import { getDeviceMetadata } from '../../core/util';

const { IntegrityModule } = NativeModules;
const { DeviceCheckBridge } = NativeModules;

export const useIntegrityService = () => {
  const { getWithoutAuth } = useAxios();

  const getIntegrityToken = async () => {
    try {
      // Check for mock token in non-production environments
      if (
        Config.MOCK_INTEGRITY_TOKEN &&
        (Config.ENVIROINMENT === 'staging' ||
          Config.ENVIROINMENT === 'development')
      ) {
        return {
          token: Config.MOCK_INTEGRITY_TOKEN,
          platform: Platform.OS === 'ios' ? DeviceType.IOS : DeviceType.ANDROID,
          deviceMetadata: await getDeviceMetadata(),
        };
      }

      // get nonce from backend
      const nonceResponse = await getWithoutAuth(
        `/v1/authentication/integrity-token-nonce`,
      );

      if (nonceResponse.isError) {
        throw new Error('Failed to get nonce from server');
      }

      const nonce = nonceResponse.data;

      // Get integrity token based on platform
      if (Platform.OS === 'ios') {
        if (!DeviceCheckBridge) {
          console.error('DeviceCheckBridge is not available');
          return null;
        }

        const response = await DeviceCheckBridge.generateToken('', nonce);

        return {
          token: response.attestation,
          keyId: response.keyId,
          challenge: nonce,
          platform: DeviceType.IOS,
          deviceMetadata: await getDeviceMetadata(),
        };
      } else {
        const token = await IntegrityModule.getIntegrityToken(nonce);
        return {
          token,
          platform: DeviceType.ANDROID,
          deviceMetadata: await getDeviceMetadata(),
        };
      }
    } catch (error) {
      console.error('Failed to get integrity token:', error);
      throw error;
    }
  };

  return {
    getIntegrityToken,
  };
};
