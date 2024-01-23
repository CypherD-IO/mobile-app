import * as Sentry from '@sentry/react-native';
import axios from './Http';
import { hostWorker } from '../global';

export const getWalletProfile = async (token: string) => {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const profileUrl = `${ARCH_HOST}/v1/authentication/profile`;
  const config = {
    headers: { Authorization: `Bearer ${String(token)}` },
  };
  console.log('profileData');
  try {
    const { data } = await axios.get(profileUrl, config);
    console.log('profileData', data);
    return data;
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    return e;
  }
};
