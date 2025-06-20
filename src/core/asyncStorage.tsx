import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import {
  advancedSettingsInitialState,
  IAdvancedSettingsData,
} from '../containers/Options/advancedSettings';
import { DefiData, DefiResponse } from '../models/defi.interface';
import { CYPHERD_ROOT_DATA } from './util';
import { WalletHoldings } from './portfolio';
import { ConnectionTypes } from '../constants/enum';

export const storePortfolioData = async (
  value: WalletHoldings,
  address: string,
  key = 'v2',
) => {
  try {
    const jsonValue = JSON.stringify({
      data: value,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem(String(address) + key, jsonValue);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getPortfolioData = async (address: string, key = 'v2') => {
  try {
    const jsonValue = await AsyncStorage.getItem(String(address) + key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const storeDeFiData = async (
  data: {
    iat: string;
    rawData: DefiResponse;
    filteredData: DefiData;
  },
  key = '',
) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(`deFiData${key}`, jsonValue);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getDeFiData = async (key = '') => {
  try {
    const jsonValue = await AsyncStorage.getItem(`deFiData${key}`);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    Sentry.captureException(error);
  }
};
export const storeConnectWalletData = async (value: any, address: string) => {
  try {
    const jsonValue = JSON.stringify({ data: value });
    await AsyncStorage.setItem(address + 'wc', jsonValue);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getConnectWalletData = async (address: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem(address + 'wc');
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setBannerId = async (id: string) => {
  try {
    await AsyncStorage.setItem('cypherDBannerID', id);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getBannerId = async () => {
  try {
    const cypherDBannerID = await AsyncStorage.getItem('cypherDBannerID');
    return cypherDBannerID;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setDeveloperMode = async (enabled: boolean) => {
  try {
    await AsyncStorage.setItem('developerMode', JSON.stringify(enabled));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getDeveloperMode = async (): Promise<boolean> => {
  let enabled = false;
  try {
    const developerMode = await AsyncStorage.getItem('developerMode');
    enabled = developerMode != null ? JSON.parse(developerMode) : false;
  } catch (error) {
    Sentry.captureException(error);
  }
  return enabled;
};

export const setQuoteCancelReasons = async (dontAsk: boolean) => {
  try {
    const now = new Date();
    const item = {
      dontAsk,
      expiry: now.getTime() + 30 * 24 * 60 * 60 * 1000,
    };
    await AsyncStorage.setItem('quoteCancelReasons', JSON.stringify(item));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getQuoteCancelReasons = async (): Promise<boolean> => {
  let dontAsk = false;
  const now = new Date();
  try {
    const quoteCancelReasons = await AsyncStorage.getItem('quoteCancelReasons');
    if (!quoteCancelReasons) {
      return false;
    }
    const reasons = JSON.parse(quoteCancelReasons);
    if (now.getTime() > reasons.expiry) {
      await AsyncStorage.removeItem('quoteCancelReasons');
      return false;
    }
    dontAsk = reasons.dontAsk;
  } catch (error) {
    Sentry.captureException(error);
  }
  return dontAsk;
};

export const setAdvancedSettings = async (data: IAdvancedSettingsData) => {
  try {
    await AsyncStorage.setItem('advancedSettings', JSON.stringify(data));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setSchemaVersion = async (schemaVersion: number) => {
  try {
    await AsyncStorage.setItem('schemaVersion', JSON.stringify(schemaVersion));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getIBC = async () => {
  try {
    const IBCStatus = await AsyncStorage.getItem('IBCStatus');
    return IBCStatus;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setIBC = async (IBCStatus: boolean) => {
  try {
    await AsyncStorage.setItem('IBCStatus', IBCStatus.toString());
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setArchHost = async (ARCH_HOST: string) => {
  try {
    await AsyncStorage.setItem('ARCH_HOST', ARCH_HOST);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getArchHost = async () => {
  try {
    const archHost = await AsyncStorage.getItem('ARCH_HOST');
    return archHost;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getAdvancedSettings = async (): Promise<IAdvancedSettingsData> => {
  let enabled;
  try {
    const advancedSettingsData = await AsyncStorage.getItem('advancedSettings');
    enabled =
      advancedSettingsData != null
        ? JSON.parse(advancedSettingsData)
        : advancedSettingsInitialState;
  } catch (error) {
    Sentry.captureException(error);
  }
  return enabled;
};

export const getSchemaVersion = async () => {
  try {
    const schemaVersion = await AsyncStorage.getItem('schemaVersion');
    return schemaVersion;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getRpcEndpoints = async () => {
  try {
    const RPCEndpoints = await AsyncStorage.getItem('RPC_ENDPOINTS');
    return RPCEndpoints;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setRpcEndpoints = async (rpcEndpoints: string) => {
  try {
    await AsyncStorage.setItem('RPC_ENDPOINTS', rpcEndpoints);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getRpcPreference = async () => {
  try {
    const preference = await AsyncStorage.getItem('RPC_PREFERENCE');
    return preference;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setRpcPreference = async (preference: string) => {
  try {
    await AsyncStorage.setItem('RPC_PREFERENCE', preference);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const clearHost = async (host: string) => {
  try {
    await AsyncStorage.removeItem(host);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const clearRpcEndpoints = async () => {
  await AsyncStorage.removeItem('RPC_ENDPOINTS');
};

export const setCardRevealReuseToken = async (
  cardId: string,
  reuseToken: string,
) => {
  try {
    await AsyncStorage.setItem(cardId + '_CARD_REVEAL_REUSE_TOKEN', reuseToken);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getCardRevealReuseToken = async (cardId: string) => {
  try {
    const cardRevealReuseToken = await AsyncStorage.getItem(
      cardId + '_CARD_REVEAL_REUSE_TOKEN',
    );
    return cardRevealReuseToken;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const clearAllData = async (clearContacts = false) => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    if (!clearContacts) {
      const newAsyncStorageKeys = allKeys.filter(obj => {
        return !/^CONTACT_BOOK/i.test(obj);
      });
      await AsyncStorage.multiRemove(newAsyncStorageKeys);
    } else {
      await AsyncStorage.multiRemove(allKeys);
    }
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setHideBalanceStatus = async (status: boolean) => {
  try {
    await AsyncStorage.setItem('HIDE_BALANCE_STATUS', String(status));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getHideBalanceStatus = async () => {
  try {
    const hideBalanceStaus = await AsyncStorage.getItem('HIDE_BALANCE_STATUS');
    return hideBalanceStaus;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setReadOnlyWalletData = async (data: any) => {
  try {
    await AsyncStorage.setItem('WALLET_DATA', JSON.stringify(data));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getReadOnlyWalletData = async () => {
  try {
    const readOnlyWalletData = await AsyncStorage.getItem('WALLET_DATA');
    return readOnlyWalletData;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setContactBookData = async (data: any) => {
  try {
    await AsyncStorage.setItem('CONTACT_BOOK', JSON.stringify(data));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getContactBookData = async () => {
  try {
    const contactBookData = await AsyncStorage.getItem('CONTACT_BOOK');
    return contactBookData;
  } catch (error) {
    Sentry.captureException(error);
  }
};

// The cardID is in the format <CARD_ID>:<DATE_TIME>
export const getDismissedActivityCardIDs = async () => {
  try {
    const dismissedCardIDs =
      (await AsyncStorage.getItem('DISMISSED_ACTIVITY_CARD_IDS')) ?? '[]';
    return dismissedCardIDs;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setDismissedActivityCardIDs = async (
  newDismissedCardIDs: string[],
) => {
  try {
    await AsyncStorage.setItem(
      'DISMISSED_ACTIVITY_CARD_IDS',
      JSON.stringify(newDismissedCardIDs),
    );
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getDismissedStaticCardIDs = async () => {
  try {
    const dismissedCardIDs =
      (await AsyncStorage.getItem('DISMISSED_STATIC_CARD_IDS')) ?? '[]';
    return dismissedCardIDs;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setDismissedStaticCardIDs = async (
  newDismissedCardIDs: string[],
) => {
  try {
    await AsyncStorage.setItem(
      'DISMISSED_STATIC_CARD_IDS',
      JSON.stringify(newDismissedCardIDs),
    );
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getDismissedMigrationCardIDs = async () => {
  try {
    const dismissedCardIDs =
      (await AsyncStorage.getItem('DISMISSED_MIGRATION_CARD_IDS')) ?? '[]';
    return dismissedCardIDs;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setDismissedMigrationCardIDs = async (
  newDismissedCardIDs: string[],
) => {
  try {
    await AsyncStorage.setItem(
      'DISMISSED_MIGRATION_CARD_IDS',
      JSON.stringify(newDismissedCardIDs),
    );
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setAuthToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('AUTH_TOKEN', JSON.stringify(token));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getAuthToken = async () => {
  try {
    const authToken = await AsyncStorage.getItem('AUTH_TOKEN');
    return authToken;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setRefreshToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('REFRESH_TOKEN', JSON.stringify(token));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getRefreshToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');
    return refreshToken;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setConnectionType = async (token: ConnectionTypes) => {
  try {
    await AsyncStorage.setItem('CONNECTION_TYPE', token);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const removeConnectionType = async () => {
  try {
    await AsyncStorage.removeItem('CONNECTION_TYPE');
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getConnectionType = async (): Promise<ConnectionTypes> => {
  try {
    const connectionType = (await AsyncStorage.getItem(
      'CONNECTION_TYPE',
    )) as ConnectionTypes;
    return connectionType;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

export const setCyRootData = async (cyRootData: any) => {
  try {
    const stringifiedData = JSON.stringify(cyRootData);
    await AsyncStorage.setItem(CYPHERD_ROOT_DATA, stringifiedData);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getCyRootData = async () => {
  try {
    const cyRootData = await AsyncStorage.getItem(CYPHERD_ROOT_DATA);
    return cyRootData;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const removeCyRootData = async () => {
  try {
    await AsyncStorage.removeItem(CYPHERD_ROOT_DATA);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getActivities = async () => {
  try {
    const activities = await AsyncStorage.getItem('activities');
    return activities;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setActivities = async (data: any) => {
  try {
    await AsyncStorage.setItem('activities', JSON.stringify(data));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setIsRcEnabled = async (value: boolean) => {
  try {
    await AsyncStorage.setItem('isRcEnabled', value.toString());
  } catch (e) {
    Sentry.captureException(e);
  }
};

export const getIsRcEnabled = async () => {
  try {
    const value = await AsyncStorage.getItem('isRcEnabled');
    return value;
  } catch (e) {
    Sentry.captureException(e);
  }
};

export const removeIsRcEnabled = async () => {
  try {
    await AsyncStorage.removeItem('isRcEnabled');
  } catch (e) {
    Sentry.captureException(e);
  }
};

export const setReferralCodeAsync = async (code: string) => {
  try {
    await AsyncStorage.setItem('REFERRAL_CODE', code);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getReferralCode = async () => {
  try {
    const referralCode = await AsyncStorage.getItem('REFERRAL_CODE');
    return referralCode;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

export const removeReferralCode = async () => {
  try {
    await AsyncStorage.removeItem('REFERRAL_CODE');
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setRainTerms = async (agreed: boolean) => {
  try {
    await AsyncStorage.setItem('RAIN_TERMS', agreed.toString());
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getRainTerms = async () => {
  try {
    const agreed = await AsyncStorage.getItem('RAIN_TERMS');
    return agreed;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setProcessedReferrerCode = async (code: string) => {
  try {
    await AsyncStorage.setItem('PROCESSED_REFERRER_CODE', code);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

export const getProcessedReferrerCode = async () => {
  try {
    const code = await AsyncStorage.getItem('PROCESSED_REFERRER_CODE');
    return code;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const removeProcessedReferrerCode = async () => {
  try {
    await AsyncStorage.removeItem('PROCESSED_REFERRER_CODE');
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setOverchargeDccInfoModalShown = async (id: string) => {
  try {
    await AsyncStorage.setItem('OVERCHARGE_DCC_INFO_MODAL_SHOWN', id ?? 'true');
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getOverchargeDccInfoModalShown = async () => {
  try {
    const id = await AsyncStorage.getItem('OVERCHARGE_DCC_INFO_MODAL_SHOWN');
    return id;
  } catch (error) {
    Sentry.captureException(error);
  }
};
