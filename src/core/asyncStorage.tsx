import AsyncStorage from '@react-native-async-storage/async-storage';
import { PORTFOLIO_EMPTY } from '../reducers/portfolio_reducer';
import * as Sentry from '@sentry/react-native';
import {
  advancedSettingsInitialState,
  IAdvancedSettingsData,
} from '../containers/Options/advancedSettings';
import { DefiData, DefiResponse } from '../models/defi.interface';
import { CYPHERD_ROOT_DATA } from './util';

export const storePortfolioData = async (
  value: any,
  ethereum: { address: any },
  portfolioState: {
    dispatchPortfolio: (arg0: { value: { portfolioState: string } }) => void;
  },
  key = '',
) => {
  try {
    const jsonValue = JSON.stringify({
      data: value,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem(String(ethereum.address) + key, jsonValue);
  } catch (error) {
    portfolioState.dispatchPortfolio({
      value: { portfolioState: PORTFOLIO_EMPTY },
    });
    Sentry.captureException(error);
  }
};

export const getPortfolioData = async (
  ethereum: { address: any },
  portfolioState: { dispatchPortfolio: any },
  key = '',
) => {
  try {
    const jsonValue = await AsyncStorage.getItem(
      String(ethereum.address) + key,
    );
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    portfolioState.dispatchPortfolio({
      value: { portfolioState: PORTFOLIO_EMPTY },
    });
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
  let enabled;
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

export const setPortfolioHost = async (PORTFOLIO_HOST: string) => {
  try {
    await AsyncStorage.setItem('PORTFOLIO_HOST', PORTFOLIO_HOST);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getPortfolioHost = async () => {
  try {
    const portfolioHost = await AsyncStorage.getItem('PORTFOLIO_HOST');
    return portfolioHost;
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const setOwlracleHost = async (OWLRACLE_HOST: string) => {
  try {
    await AsyncStorage.setItem('OWLRACLE_HOST', OWLRACLE_HOST);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getOwlracleHost = async () => {
  try {
    const owlracleHost = await AsyncStorage.getItem('OWLRACLE_HOST');
    return owlracleHost;
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

export const setSkipSeedConfirmation = async (status: boolean) => {
  try {
    await AsyncStorage.setItem('SEED_PHRASE_CONFIRMED', String(status));
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getSkipSeedConfirmation = async () => {
  try {
    const seedPhraseConfirmed = await AsyncStorage.getItem(
      'SEED_PHRASE_CONFIRMED',
    );
    return seedPhraseConfirmed;
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

export const setConnectionType = async (token: string) => {
  try {
    await AsyncStorage.setItem('CONNECTION_TYPE', token);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getConnectionType = async () => {
  try {
    const connectionType = await AsyncStorage.getItem('CONNECTION_TYPE');
    return connectionType;
  } catch (error) {
    Sentry.captureException(error);
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
