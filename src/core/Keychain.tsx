import {
  ACCESS_CONTROL,
  ACCESSIBLE,
  AUTHENTICATION_TYPE,
  STORAGE_TYPE,
  canImplyAuthentication,
  getInternetCredentials,
  getSupportedBiometryType,
  hasInternetCredentials,
  resetInternetCredentials,
  setInternetCredentials,
  Options
} from 'react-native-keychain';
import Intercom from '@intercom/intercom-react-native';
import { Alert } from 'react-native';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  CYPHERD_ROOT_DATA,
  CYPHERD_SEED_PHRASE_KEY,
  PIN_AUTH,
  convertToHexa,
  AUTHORIZE_WALLET_DELETION
} from './util';
import DeviceInfo from 'react-native-device-info';
import RNExitApp from 'react-native-exit-app';
import { PORTFOLIO_NEW_LOAD } from '../reducers/portfolio_reducer';
import * as Sentry from '@sentry/react-native';
import { AddressChainNames, generateWalletFromMnemonic, IAccountDetail, IAccountDetailWithChain } from './Address';
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from '@cosmjs-rn/proto-signing';
import CryptoJS from 'crypto-js';
import { isAndroid, isIOS } from '../misc/checkers';
import { setSchemaVersion, getSchemaVersion, clearAllData as clearAsyncStorage } from './asyncStorage';
import { isValidMnemonic, sha256 } from 'ethers/lib/utils';
import { initialHdWalletState } from '../reducers';
import { t } from 'i18next';
import { KeychainErrors } from '../constants/KeychainErrors';

const currentSchemaVersion = 5;

export async function saveCredentialsToKeychain(
  hdWalletContext: any,
  portfolioState: any,
  wallet: any
) {
  await clearAsyncStorage();
  await removeCredentialsFromKeychain();
  // Save Seed Phrase (master private key is not stored)
  if (await isPinAuthenticated()) {
    await saveToKeychain(CYPHERD_SEED_PHRASE_KEY, CryptoJS.AES.encrypt(wallet.mnemonic, hdWalletContext.state.pinValue).toString());
  } else {
    await saveToKeychain(CYPHERD_SEED_PHRASE_KEY, wallet.mnemonic);
  }
  await saveToKeychain(AUTHORIZE_WALLET_DELETION, 'AUTHORIZE_WALLET_DELETION');
  const rootData = constructRootData(wallet.accounts);
  // save root data after wallet creation
  if (isAndroid()) {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(rootData), wallet.mnemonic).toString();
    await saveCyRootDataToKeyChain(encrypted);
  } else {
    await saveCyRootDataToKeyChain(rootData);
  }
  await setSchemaVersion(currentSchemaVersion);
  // Only retain wallet address and private key in memory, load others are required
  wallet.accounts.forEach((account: IAccountDetailWithChain) => {
    hdWalletContext.dispatch({
      type: 'LOAD_WALLET',
      value: {
        address: account.address,
        privateKey: account.privateKey,
        chain: account.name,
        publicKey: account.publicKey,
        rawAddress: account.rawAddress,
        algo: account.algo
      }
    });
  });

  portfolioState.dispatchPortfolio({
    value: { tokenPortfolio: null, portfolioState: PORTFOLIO_NEW_LOAD }
  });
}

export async function removeCredentialsFromKeychain() {
  // Reset Seed Phrase (master private key is not stored)
  await removeFromKeyChain(CYPHERD_SEED_PHRASE_KEY);
  // Remove cypherD root data
  await removeFromKeyChain(CYPHERD_ROOT_DATA);
}

export async function _setInternetCredentialsOptions(key: string, value: string, acl: boolean) {
  try {
    if (acl) {
      let options = await getPrivateACLOptions();
      if (isAndroid() && key === CYPHERD_ROOT_DATA) {
        options = {
          ...options,
          storage: STORAGE_TYPE.AES
        };
      }
      await setInternetCredentials(key, key, value, options);
    } else {
      // For storing wallet address, which is public and to access without faceID or passcode
      await setInternetCredentials(key, key, value);
    }
  } catch (e) {
    Sentry.captureException(e);
    Alert.alert(
      t('UNABLE_TO_CREATE_WALLET'),
      t('CONTACT_CYPHERD_SUPPORT'),
      [
        {
          text: 'OK',
          onPress: () => {
            void Intercom.displayMessenger();
          }
        }
      ],
      { cancelable: false }
    );
  }
}

export async function saveToKeychain(key: string, value: string, acl = true) {
  try {
    await _setInternetCredentialsOptions(key, value, acl);
  } catch (e) {
    // TODO (user feedback): Give feedback to user.
    Sentry.captureException(e);
    const retrySave = async () => {
      try {
        await _setInternetCredentialsOptions(key, value, acl);
      } catch (e1) {
        Sentry.captureException(e1);
      }
    };
    setTimeout(retrySave, 1000);
  }
}

export async function loadFromKeyChain(key: string, forceCloseOnFailure = false, showModal = () => { }) {
  try {
    // Retrieve the credentials
    let requestMessage = '';
    switch (key) {
      case 'AUTHORIZE_WALLET_DELETION':
        requestMessage = 'Requesting permission to delete the wallet';
        break;
      default:
        requestMessage = 'Requesting access to continue using this app';
    }
    const credentials = await getInternetCredentials(key, {
      authenticationPrompt: {
        title: requestMessage
      }
    });
    if (credentials) {
      const value = credentials.password;
      return value;
    } else {
      return _NO_CYPHERD_CREDENTIAL_AVAILABLE_;
    }
  } catch (error) {
    // TODO (user feedback): Give feedback to user.
    if (error.message === KeychainErrors.CODE_11 || error.message === KeychainErrors.USERNAME_OR_PASSPHRASE_NOT_CORRECT) {
      showModal();
    } else if (error.message === KeychainErrors.CODE_1) {
      if (forceCloseOnFailure) {
        await fingerprintHardwareAlert();
      }
    } else {
      Sentry.captureException(error);
      if (forceCloseOnFailure) {
        await showReAuthAlert();
      }
    }
  }
}

async function showReAuthAlert() {
  return await new Promise((resolve) => {
    Alert.alert(
      t('AUTHENTICATION_CANCELLED'),
      t('AUTHENTICATE_TO_CONTINUE'),
      [
        {
          text: 'OK',
          onPress: () => {
            resolve(true);
            RNExitApp.exitApp();
          }
        }
      ],
      { cancelable: false }
    );
  });
}

async function fingerprintHardwareAlert() {
  return await new Promise((resolve) => {
    Alert.alert(
      t('FINGERPRINT_HARDWARE_NOT_AVAILABLE'),
      t('FIX_THIS_ISSUE_TO_CONTINUE'),
      [
        {
          text: 'OK',
          onPress: () => {
            resolve(true);
            RNExitApp.exitApp();
          }
        }
      ],
      { cancelable: false }
    );
  });
}

// Utility methods
export async function loadRecoveryPhraseFromKeyChain(forceCloseOnFailure = false, pin = '', showModal = () => { }) {
  let mnemonic = await loadFromKeyChain(CYPHERD_SEED_PHRASE_KEY, forceCloseOnFailure, showModal);
  if (mnemonic && await isPinAuthenticated()) {
    mnemonic = decryptMnemonic(mnemonic, pin);
  }
  return mnemonic;
}

export async function isAuthenticatedForPrivateKey(forceCloseOnFailure = false) {
  const mnemonic = await loadFromKeyChain(CYPHERD_SEED_PHRASE_KEY, forceCloseOnFailure);
  return mnemonic && mnemonic !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_;
}

export async function loadCyRootDataFromKeyChain(hdWallet = initialHdWalletState, showModal = () => { }) {
  // Update schemaVersion whenever adding a new address generation logic
  let mnemonic: string | undefined;
  // const hdWallet = useContext<any>(HdWalletContext);

  if (isAndroid()) {
    mnemonic = await loadRecoveryPhraseFromKeyChain(true, hdWallet.pinValue, showModal);
  }

  // No authentication needed to fetch CYD_RootData in Android but needed in case of IOS
  const schemaVersion = await getSchemaVersion();
  if (schemaVersion === currentSchemaVersion.toString()) {
    let cyData = await loadFromKeyChain(CYPHERD_ROOT_DATA);

    if (isAndroid() && cyData && cyData !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_ && mnemonic) {
      const bytes = CryptoJS.AES.decrypt(cyData, mnemonic);
      cyData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    }
    if (cyData && cyData !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      let parsedData;
      if (isAndroid()) {
        parsedData = cyData;
      } else {
        parsedData = JSON.parse(cyData);
      }
      if (parsedData.accounts && parsedData.schemaVersion === currentSchemaVersion) {
        return parsedData;
      }
    } else {
      // on cyData being undefined, auth has been cancelled.
      await showReAuthAlert();
    }
  }

  if (isIOS()) {
    mnemonic = await loadRecoveryPhraseFromKeyChain(true, hdWallet.pinValue, showModal);
  }

  if (mnemonic && mnemonic !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
    const wallet = await generateWalletFromMnemonic(mnemonic, 'import_wallet');
    const rootData = constructRootData(wallet.accounts);
    let dataToSave;
    if (isAndroid() && rootData) {
      dataToSave = CryptoJS.AES.encrypt(JSON.stringify(rootData), mnemonic).toString();
    } else {
      dataToSave = rootData;
    }
    await saveCyRootDataToKeyChain(dataToSave);
    await setSchemaVersion(currentSchemaVersion);
    return rootData;
  }

  // delete old keys
  // Reset wallet address
  const defaultData = constructRootData([
    {
      name: 'ethereum',
      address: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
      privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
      publicKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    }
  ]);

  return defaultData;
}

function constructRootData(accounts: IAccountDetailWithChain[]) {
  const accountDetails: { [key in AddressChainNames]?: IAccountDetail[] } = {};
  accounts.forEach((account) => {
    const { address, privateKey, algo, publicKey, rawAddress } = account;
    accountDetails[account.name] = [
      {
        address,
        privateKey,
        algo,
        publicKey,
        rawAddress
      }
    ];
  });
  return {
    accounts: accountDetails,
    schemaVersion: currentSchemaVersion
  };
}

async function saveCyRootDataToKeyChain(result: any) {
  let password: string;
  if (isAndroid()) {
    password = result;
  } else {
    password = JSON.stringify(result);
  }
  await saveToKeychain(CYPHERD_ROOT_DATA, password, true);
}

// End of load utility methods

export async function removeFromKeyChain(key: string) {
  try {
    await resetInternetCredentials(key);
  } catch (err) {
    // TODO (user feedback): Give feedback to user.
    Sentry.captureException(err);
  }
}

export async function doesKeyExistInKeyChain(key: string) {
  const exists = await hasInternetCredentials(key);
  return exists;
}

export async function getPrivateACLOptions(): Promise<Options> {
  let res = {};
  try {
    let canAuthenticate;
    if (isIOS()) {
      canAuthenticate = await canImplyAuthentication({
        authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
      });
    } else {
      const hasBiometricsEnabled = await getSupportedBiometryType();
      canAuthenticate = !!hasBiometricsEnabled;
    }

    let isSimulator = false;
    const isEmulator = await DeviceInfo.isEmulator();
    if (canAuthenticate) {
      isSimulator = __DEV__ && isEmulator;
    }
    if (canAuthenticate && !isSimulator) {
      res = {
        accessControl: isIOS()
          ? ACCESS_CONTROL.USER_PRESENCE
          : ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      };
    }
  } catch (e) {
    // TODO (user feedback): Give feedback to user.
    Sentry.captureException(e);
  }
  return res;
}

export async function getSignerClient(hdWallet: any = initialHdWalletState): Promise<Map<string, OfflineDirectSigner>> {
  const seedPhrase = await loadRecoveryPhraseFromKeyChain(false, hdWallet.state?.pinValue ? hdWallet.state.pinValue : hdWallet.pinValue);
  const accounts: string[] = ['cosmos', 'osmo', 'juno', 'stars', 'noble'];
  const wallets: Map<string, OfflineDirectSigner> = new Map();
  if (seedPhrase && isValidMnemonic(seedPhrase)) {
    for (const wallet of accounts) {
      const signer: OfflineDirectSigner = await DirectSecp256k1HdWallet.fromMnemonic(seedPhrase, {
        prefix: wallet
      });
      wallets.set(wallet, signer);
    }
  }

  return wallets;
}

export const savePin = async (pin: string) => {
  try {
    await saveToKeychain(PIN_AUTH, sha256('0x' + convertToHexa(pin)));
    const mnemonic = await loadRecoveryPhraseFromKeyChain(true);
    if (mnemonic && mnemonic !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      await saveToKeychain(CYPHERD_SEED_PHRASE_KEY, CryptoJS.AES.encrypt(mnemonic, pin).toString());
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};

export const changePin = async (oldPin: string, newPin: string) => {
  await saveToKeychain(PIN_AUTH, sha256('0x' + convertToHexa(newPin)));
  const mnemonic = await loadRecoveryPhraseFromKeyChain(false, oldPin);
  if (mnemonic) {
    await saveToKeychain(CYPHERD_SEED_PHRASE_KEY, CryptoJS.AES.encrypt(mnemonic, newPin).toString());
  }
};

export const validatePin = async (pin: string) => {
  const pinValue = await loadFromKeyChain(PIN_AUTH);
  if (pinValue === sha256('0x' + convertToHexa(pin))) {
    return true;
  }
  return false;
};

export const isBiometricEnabled = async () => {
  let canAuthenticate;
  if (isIOS()) {
    canAuthenticate = await canImplyAuthentication({
      authenticationType: AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
    });
  } else {
    const hasBiometricsEnabled = await getSupportedBiometryType();
    canAuthenticate = hasBiometricsEnabled !== null;
  }
  return canAuthenticate;
};

export const removePin = async (hdWallet: any, pin = '') => {
  const mnemonic = await loadRecoveryPhraseFromKeyChain(false, pin);
  if (mnemonic) {
    await removeFromKeyChain(CYPHERD_SEED_PHRASE_KEY);

    await saveToKeychain(CYPHERD_SEED_PHRASE_KEY, mnemonic);
  }
  await removeFromKeyChain(PIN_AUTH);
  hdWallet.dispatch({ type: 'SET_PIN_VALUE', value: { pin: '' } });
};

export async function isPinAuthenticated() {
  const pinValue = await loadFromKeyChain(PIN_AUTH);
  if (pinValue === _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
    return false;
  }
  return true;
}

export async function loadPinFromKeyChain() {
  const pinValue = await loadFromKeyChain(PIN_AUTH);
  return pinValue;
}

export function decryptMnemonic(encryptedMnemonic: string, pin: string) {
  const mnemonic = CryptoJS.AES.decrypt(encryptedMnemonic, pin).toString(CryptoJS.enc.Utf8);
  return mnemonic;
}
