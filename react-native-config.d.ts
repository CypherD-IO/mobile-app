declare module 'react-native-config' {
  export interface NativeConfig {
    SENTRY_DSN: string;
    ENVIRONMENT: string;
    AF_DEVKEY: string;
    AF_APPID: string;
    AF_BARNDED_DOMAINS: string;
    AF_ONE_LINK_ID: string;
    AF_USER_INVITE_CHANNEL: string;
    INTERCOM_APP_KEY: string;
    INTERCOM_IOS_SDK_KEY: string;
    WALLET_CONNECT_PROJECTID: string;
    WEB3_AUTH_CLIENT_ID: string;
    HELIUS_API_KEY: string;
    IS_TESTING: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
