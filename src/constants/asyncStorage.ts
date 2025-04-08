export enum AsyncStorageKeys {
  WALLET_KEY = '@wallet_key',
  WALLET_VERSION = '@version',
  LANGUAGE = '@language',
  PIN_VALIDATED = '@pin_validated',
  PIN_PRESENT = '@pin_present',
  FIRST_TIME_USER = '@first_time_user',
  SELECTED_NETWORKS = '@selected_networks',
  ASSETS = '@assets',
  REFERRAL_CODE = '@referral_code',
  WALLET_CONNECT_DATA = '@wc_data',
  DEVICE_TOKEN = '@device_token',
  ACTIVITIES = '@activities',
  COIN_STATS = '@coin_stats',
  DEFAULT_CHAIN_ID = '@default_chain_id',
  PORTFOLIO_REFRESH_TIMESTAMP = '@portfolio_refresh_timestamp',
  PROCESSED_REFERRER_CODE = '@processed_referrer_code',
}

/**
 * Async storage related constants
 */
export const PIN_TTL_IN_SECONDS = 60 * 60 * 2; // 2 hours
export const PIN_TTL_IN_MILLISECONDS = PIN_TTL_IN_SECONDS * 1000; // 2 hours
