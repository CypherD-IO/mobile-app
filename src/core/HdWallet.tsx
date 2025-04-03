import bip39 from 'react-native-bip39';
import { saveCredentialsToKeychain } from './Keychain';
import {
  generateWalletFromMnemonic,
  generateWalletFromPrivateKey,
} from './Address';
import { SECRET_TYPES } from '../constants/enum';

export const _generateWalletFromMnemonic = async (
  hdWalletContext,
  mnemonic,
  trk_event: string,
) => {
  const wallet = await generateWalletFromMnemonic(
    mnemonic,
    trk_event,
    hdWalletContext.state.choosenWalletIndex,
  );
  void saveCredentialsToKeychain(
    hdWalletContext,
    wallet,
    SECRET_TYPES.MENEMONIC,
  );
};

export const createWallet = hdWalletContext => {
  bip39.generateMnemonic().then(async mnemonic => {
    await _generateWalletFromMnemonic(
      hdWalletContext,
      mnemonic,
      'create_wallet',
    );
  });
};

export const importWallet = async (hdWalletContext, mnemonic) => {
  await _generateWalletFromMnemonic(hdWalletContext, mnemonic, 'import_wallet');
};

export const importWalletPrivateKey = async (hdWalletContext, privateKey) => {
  const wallet = await generateWalletFromPrivateKey(privateKey);
  await saveCredentialsToKeychain(
    hdWalletContext,
    wallet,
    SECRET_TYPES.PRIVATE_KEY,
  );
};
