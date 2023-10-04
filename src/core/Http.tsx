import axios from 'axios';
import axiosRetry from 'axios-retry';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

export const INFO_WAITING_TIMEOUT = 1500;
export const TIMEOUT = 5000;
export const PORTFOLIO_TIMEOUT = 20000;
export const MODAL_HIDE_TIMEOUT = 100;
export const MODAL_HIDE_TIMEOUT_250 = 250;
export const SHARE_TRANSACTION_TIMEOUT = 250;
export const DEFAULT_AXIOS_TIMEOUT = 20000;
axiosRetry(axios, {
  retries: 5, // number of retries
  retryDelay: () => {
    return 100;
  },
  retryCondition: (error) => {
    // if retry condition is not specified, by default idempotent requests are retried
    const statusCode = error.response?.status;
    return statusCode && (statusCode === 403 || statusCode >= 500);
  }
});
axios.defaults.headers.common = {
  client: `${Platform.OS}:${DeviceInfo.getVersion()}`
};
export default axios;
