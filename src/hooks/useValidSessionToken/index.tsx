import jwt_decode, { JwtPayload } from 'jwt-decode';
import { nanoid } from 'nanoid';
import {
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from '../../core/asyncStorage';
import { hostWorker } from '../../global';
import axios from '../../core/Http';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useContext } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { GlobalContextType } from '../../constants/enum';

export default function useValidSessionToken() {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const globalContext = useContext<any>(GlobalContext);
  const verifySessionToken = async () => {
    const authToken: string = await getAuthToken();
    if (authToken) {
      const jwtInfo = jwt_decode<JwtPayload>(authToken);

      if (jwtInfo.exp && Date.now() >= jwtInfo.exp * 1000) {
        const refreshToken = await getRefreshToken();

        const baseUrl: string = ARCH_HOST;

        const config = {
          headers: {
            Accept: 'application/json',
            client: `${Platform.OS}:${DeviceInfo.getVersion()}`,
            'Content-Type': 'application/json',
            Authorization: refreshToken ? `Bearer ${String(refreshToken)}` : '',
          },
        };
        try {
          const resp = await axios.post(
            `${baseUrl}/v1/authentication/refresh`,
            {},
            config,
          );
          if (resp?.data) {
            const { token, refreshToken } = resp.data;
            void setAuthToken(token);
            void setRefreshToken(refreshToken);
            globalContext.globalDispatch({
              type: GlobalContextType.SIGN_IN,
              sessionToken: token,
            });
            console.log('setNewAuthToken');
            return true;
          } else {
            // throw error
            return false;
          }
        } catch (e) {
          // throw error
          return false;
        }
      }
      return true;
    }
    return false;
  };

  return { verifySessionToken };
}
