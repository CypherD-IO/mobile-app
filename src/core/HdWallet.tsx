import bip39 from 'react-native-bip39';
import { saveCredentialsToKeychain } from './Keychain';
import {
  generateWalletFromMnemonic,
  generateWalletFromPrivateKey,
} from './Address';
import { ActivityReducerAction } from '../reducers/activity_reducer';
import { SECRET_TYPES } from '../constants/enum';

export const _generateWalletFromMnemonic = async (
  hdWalletContext,
  portfolioState,
  mnemonic,
  trk_event: string,
) => {
  const wallet = await generateWalletFromMnemonic(mnemonic, trk_event);
  saveCredentialsToKeychain(
    hdWalletContext,
    portfolioState,
    wallet,
    SECRET_TYPES.MENEMONIC,
  );
};

export const createWallet = (hdWalletContext, portfolioState) => {
  bip39.generateMnemonic().then(mnemonic => {
    _generateWalletFromMnemonic(
      hdWalletContext,
      portfolioState,
      mnemonic,
      'create_wallet',
    );
  });
};

export const importWallet = (hdWalletContext, portfolioState, mnemonic) => {
  _generateWalletFromMnemonic(
    hdWalletContext,
    portfolioState,
    mnemonic,
    'import_wallet',
  );
};

export const importWalletPrivateKey = async (
  hdWalletContext,
  portfolioState,
  privateKey,
) => {
  console.log('import wallet priv key ... ');
  const wallet = await generateWalletFromPrivateKey(privateKey);
  console.log('wallet :: ', wallet);
  await saveCredentialsToKeychain(
    hdWalletContext,
    portfolioState,
    wallet,
    SECRET_TYPES.PRIVATE_KEY,
  );
};
