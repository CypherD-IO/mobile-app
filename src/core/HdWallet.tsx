import bip39 from 'react-native-bip39';
import { saveCredentialsToKeychain } from './Keychain';
import {
  generateWalletFromMnemonic,
  generateWalletFromEthPrivateKey,
  generateWalletFromSolanaPrivateKey,
} from './Address';
import { SECRET_TYPES } from '../constants/enum';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';

export const _generateWalletFromMnemonic = async (
  hdWalletContext: HdWalletContextDef,
  mnemonic: string,
  addressIndex: number,
) => {
  const wallet = await generateWalletFromMnemonic(mnemonic, addressIndex);
  void saveCredentialsToKeychain(
    hdWalletContext,
    wallet,
    SECRET_TYPES.MENEMONIC,
  );
};

export const createWallet = async (hdWalletContext: HdWalletContextDef) => {
  bip39.generateMnemonic().then(async (mnemonic: string) => {
    await _generateWalletFromMnemonic(hdWalletContext, mnemonic, 0);
  });
};

export const importWallet = async (
  hdWalletContext: HdWalletContextDef,
  mnemonic: string,
) => {
  await _generateWalletFromMnemonic(
    hdWalletContext,
    mnemonic,
    hdWalletContext.state.choosenWalletIndex,
  );
};

export const importWalletFromEvmPrivateKey = async (
  hdWalletContext: HdWalletContextDef,
  privateKey: string,
) => {
  const wallet = await generateWalletFromEthPrivateKey(privateKey);
  await saveCredentialsToKeychain(
    hdWalletContext,
    wallet,
    SECRET_TYPES.PRIVATE_KEY,
  );
};

export const importWalletFromSolanaPrivateKey = async (
  hdWalletContext: HdWalletContextDef,
  privateKey: string,
) => {
  const wallet = await generateWalletFromSolanaPrivateKey(privateKey);
  await saveCredentialsToKeychain(
    hdWalletContext,
    wallet,
    SECRET_TYPES.PRIVATE_KEY,
  );
};
