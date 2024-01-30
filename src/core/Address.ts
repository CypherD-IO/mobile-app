import { hdkey } from 'ethereumjs-wallet';
import * as bip39 from 'bip39';
import analytics from '@react-native-firebase/analytics';
import { getToken, registerForRemoteMessages, onMessage } from '../core/push';
import { ethToEvmos } from '@tharsis/address-converter';
import { Slip10RawIndex } from '@cosmjs-rn/crypto';
import { Secp256k1HdWallet } from '@cosmjs-rn/amino';
import { cosmosConfig, IIBCData } from '../constants/cosmosConfig';
import CryptoJS from 'crypto-js';
import { Mnemonic, PrivKeySecp256k1 } from '@keplr-wallet/crypto';
import { isIOS } from '../misc/checkers';

function sendFirebaseEvent(walletaddress: string, trkEvent: string) {
  void analytics().logEvent(trkEvent, {
    walletaddress,
  });
}

export type AddressChainNames =
  | 'ethereum'
  | 'evmos'
  | 'cosmos'
  | 'osmosis'
  | 'juno'
  | 'stargaze'
  | 'noble';
export interface IAccountDetail {
  address: string;
  privateKey: string;
  algo?: string;
  publicKey: string;
  rawAddress?: Uint8Array;
}

export interface IAccountDetailWithChain extends IAccountDetail {
  name: AddressChainNames;
}

export const uintToHex = (value: Uint8Array) =>
  `0x${Buffer.from(value).toString('hex')}`;

export const hexToUint = (value: string) => {
  const inp = value.startsWith('0x') ? value.slice(2) : value;
  return Uint8Array.from(Buffer.from(inp, 'hex'));
};

export const generateEthAddress = (
  mnemonic: string,
  index = 0,
): IAccountDetailWithChain => {
  const hdPathString = "m/44'/60'/0'/0";
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdWallet = hdkey.fromMasterSeed(seed);
  const root = hdWallet.derivePath(hdPathString);
  const wallet = root.deriveChild(index).getWallet();
  return {
    name: 'ethereum',
    address: wallet.getAddressString(),
    privateKey: wallet.getPrivateKeyString(),
    publicKey: wallet.getPublicKeyString(),
  };
};

export const generateCosmosWallet = async (
  chainName: AddressChainNames,
  chainConfig: IIBCData,
  mnemonic: string,
  bip44HDPath: {
    account: number;
    change: number;
    addressIndex: number;
  },
): Promise<IAccountDetailWithChain> => {
  const mnemonicPath = [
    Slip10RawIndex.hardened(44),
    Slip10RawIndex.hardened(chainConfig.coinType),
    Slip10RawIndex.hardened(bip44HDPath.account),
    Slip10RawIndex.normal(bip44HDPath.change),
    Slip10RawIndex.normal(bip44HDPath.addressIndex),
  ];

  const masterSeed = Mnemonic.generateMasterSeedFromMnemonic(mnemonic);

  const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [mnemonicPath],
    prefix: chainConfig.prefix,
  });

  const [account] = await wallet.getAccounts();
  const { address, pubkey: publicKey } = account;

  const path = `m/44'/${chainConfig.coinType}'/${bip44HDPath.account}'/${bip44HDPath.change}/${bip44HDPath.addressIndex}`;
  const privateKey = Mnemonic.generatePrivateKeyFromMasterSeed(
    masterSeed,
    path,
  );

  return {
    name: chainName,
    address,
    privateKey: uintToHex(privateKey),
    publicKey: uintToHex(publicKey),
  };
};

export const generateEvmosWallet = (
  ethereumAddress: string,
  chainConfig: IIBCData,
  mnemonic: string,
  bip44HDPath: {
    account: number;
    change: number;
    addressIndex: number;
  },
): IAccountDetailWithChain => {
  const masterSeed = Mnemonic.generateMasterSeedFromMnemonic(mnemonic);
  const path = `m/44'/${chainConfig.coinType}'/${bip44HDPath.account}'/${bip44HDPath.change}/${bip44HDPath.addressIndex}`;
  const privateKey = Mnemonic.generatePrivateKeyFromMasterSeed(
    masterSeed,
    path,
  );
  const address = ethToEvmos(ethereumAddress);

  const privKeyInstance = new PrivKeySecp256k1(privateKey);
  const publicKey = privKeyInstance.getPubKey().toBytes();

  return {
    name: 'evmos',
    address,
    privateKey: uintToHex(privateKey),
    publicKey: uintToHex(publicKey),
  };
};

export const generateRawAddressFromPubKeys = (publicKey: Uint8Array) => {
  let hash = CryptoJS.SHA256(
    CryptoJS.lib.WordArray.create(publicKey as any),
  ).toString();
  hash = CryptoJS.RIPEMD160(CryptoJS.enc.Hex.parse(hash)).toString();
  return new Uint8Array(Buffer.from(hash, 'hex'));
};

export const generateWalletFromMnemonic = async (
  mnemonic: string,
  trackingEventId: string,
): Promise<{ accounts: IAccountDetailWithChain[]; mnemonic: string }> => {
  const bip44HDPath = {
    account: 0,
    change: 0,
    addressIndex: 0,
  };

  const ethereumWallet = await generateEthAddress(mnemonic);

  const cosmosChains: AddressChainNames[] = [
    'cosmos',
    'osmosis',
    'juno',
    'stargaze',
    'noble',
  ];

  const cosmosAccounts = await Promise.all(
    cosmosChains.map(async (chain: AddressChainNames) => {
      return await generateCosmosWallet(
        chain,
        cosmosConfig[chain],
        mnemonic,
        bip44HDPath,
      );
    }),
  );

  const evmosWallet = generateEvmosWallet(
    ethereumWallet.address,
    cosmosConfig.evmos,
    mnemonic,
    bip44HDPath,
  );

  const accounts: IAccountDetailWithChain[] = [
    ethereumWallet,
    ...cosmosAccounts,
    evmosWallet,
  ];
  // emit event to firebase
  sendFirebaseEvent(ethereumWallet.address, trackingEventId);
  // Register FCM
  const [
    { address: cosmosAddress },
    { address: osmosisAddress },
    { address: junoAddress },
    { address: stargazeAddress },
    { address: nobleAddress },
  ] = cosmosAccounts;
  getToken(
    ethereumWallet.address,
    cosmosAddress,
    osmosisAddress,
    junoAddress,
    stargazeAddress,
    nobleAddress,
  );

  if (isIOS()) {
    registerForRemoteMessages();
  } else {
    onMessage();
  }

  return { accounts, mnemonic };
};
