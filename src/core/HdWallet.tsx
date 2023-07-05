import bip39 from 'react-native-bip39';
import { saveCredentialsToKeychain } from './Keychain';
import { generateWalletFromMnemonic } from './Address';
import { ActivityReducerAction } from '../reducers/activity_reducer';

export const _generateWalletFromMnemonic = async (hdWalletContext, portfolioState, mnemonic, trk_event: string) => {
  const wallet = await generateWalletFromMnemonic(mnemonic, trk_event);
  saveCredentialsToKeychain(hdWalletContext, portfolioState, wallet);
};

export const createWallet = (hdWalletContext, portfolioState) => {
  bip39.generateMnemonic().then(mnemonic => {
    _generateWalletFromMnemonic(hdWalletContext, portfolioState, mnemonic, 'create_wallet');
  });
};

export const importWallet = (hdWalletContext, portfolioState, mnemonic) => {
  _generateWalletFromMnemonic(hdWalletContext, portfolioState, mnemonic, 'import_wallet');
};
