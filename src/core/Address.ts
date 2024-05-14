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
import { addHexPrefix } from './util';
import {
  HDNodeWallet,
  ethers,
  Mnemonic as EthersMnemonic,
  Wallet,
} from 'ethers';
import { setConnectionType } from './asyncStorage';
import { ConnectionTypes } from '../constants/enum';
import { getInjectiveAddress } from '@injectivelabs/sdk-ts';

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
  | 'noble'
  | 'coreum'
  | 'injective'
  | 'kujira';
export interface IAccountDetail {
  address: string;
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

const generateEthPrivateKey = (mnemonic: string, index = 0): string => {
  const hdPathString = "m/44'/60'/0'/0";
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdWallet = hdkey.fromMasterSeed(seed);
  const root = hdWallet.derivePath(hdPathString);
  const wallet = root.deriveChild(index).getWallet();
  return wallet.getPrivateKeyString();
};

export const generateMultipleWalletAddressesFromSeedPhrase = async (
  mnemonic: string,
  numberOfAddresses = 100,
) => {
  return await new Promise((resolve, reject) => {
    // const hdNode = HDNodeWallet.fromPhrase(mnemonic);
    const _mnemonic = EthersMnemonic.fromPhrase(mnemonic);
    const hdNode = HDNodeWallet.fromMnemonic(_mnemonic, "m/44'/60'/0'/0");
    const addresses = Array.from({ length: numberOfAddresses }, (_, index) => {
      const derivedNode = hdNode.derivePath(index.toString());
      return { address: derivedNode.address.toLowerCase(), index };
    });

    resolve(addresses);
  });
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
    publicKey: wallet.getPublicKeyString(),
  };
};

export const generateCosmosPrivateKey = async (
  chainConfig: IIBCData,
  mnemonic: string,
  bip44HDPath: {
    account: number;
    change: number;
    addressIndex: number;
  },
) => {
  const masterSeed = Mnemonic.generateMasterSeedFromMnemonic(mnemonic);

  const path = `m/44'/${chainConfig.coinType}'/${bip44HDPath.account}'/${bip44HDPath.change}/${bip44HDPath.addressIndex}`;
  const privateKey = Mnemonic.generatePrivateKeyFromMasterSeed(
    masterSeed,
    path,
  );

  return uintToHex(privateKey);
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
    // privateKey: uintToHex(privateKey),
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
    // privateKey: uintToHex(privateKey),
    publicKey: uintToHex(publicKey),
  };
};
export const generateInjectiveWallet = (
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
  const address = getInjectiveAddress(ethereumAddress);

  const privKeyInstance = new PrivKeySecp256k1(privateKey);
  const publicKey = privKeyInstance.getPubKey().toBytes();

  return {
    name: 'injective',
    address,
    // privateKey: uintToHex(privateKey),
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

export const generateWalletFromPrivateKey = async (privateKey: string) => {
  const ethersWallet = new Wallet(addHexPrefix(privateKey));
  const ethereumWallet = {
    name: 'ethereum',
    address: ethersWallet.address,
    privateKey: addHexPrefix(privateKey),
    publicKey: ethersWallet.publicKey,
  };

  const evmosWallet = {
    name: 'evmos',
    address: ethToEvmos(ethersWallet.address),
    privateKey: addHexPrefix(privateKey),
    publicKey: ethersWallet.publicKey,
  };

  const accounts: IAccountDetailWithChain[] = [ethereumWallet, evmosWallet];
  // emit event to firebase
  sendFirebaseEvent(ethereumWallet.address, 'import_wallet_private_key');
  // Register FCM
  if (isIOS()) {
    registerForRemoteMessages();
  } else {
    onMessage();
  }

  return { accounts, privateKey };
};

export const generateWalletFromMnemonic = async (
  mnemonic: string,
  trackingEventId: string,
  addressIndex = 0,
): Promise<{
  accounts: IAccountDetailWithChain[];
  mnemonic: string;
  privateKey: string;
}> => {
  addressIndex = addressIndex === -1 ? 0 : addressIndex;
  const bip44HDPath = {
    account: 0,
    change: 0,
    addressIndex,
  };
  void setConnectionType(ConnectionTypes.SEED_PHRASE);

  const ethereumWallet = await generateEthAddress(mnemonic, addressIndex);

  const ethereumPrivateKey = await generateEthPrivateKey(
    mnemonic,
    addressIndex,
  );

  const cosmosChains: AddressChainNames[] = [
    'cosmos',
    'osmosis',
    'juno',
    'stargaze',
    'noble',
    'coreum',
    'kujira',
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

  const injectiveWallet = generateInjectiveWallet(
    ethereumWallet.address,
    cosmosConfig.injective,
    mnemonic,
    bip44HDPath,
  );

  const accounts: IAccountDetailWithChain[] = [
    ethereumWallet,
    ...cosmosAccounts,
    evmosWallet,
    injectiveWallet,
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
    { address: coreumAddress },
    // { address: injectiveAddress },
    // { address: kujiraAddress },
  ] = cosmosAccounts;
  await getToken(
    ethereumWallet.address,
    cosmosAddress,
    osmosisAddress,
    junoAddress,
    stargazeAddress,
    nobleAddress,
    coreumAddress,
    // injectiveAddress,
    // kujiraAddress,
  );

  if (isIOS()) {
    registerForRemoteMessages();
  } else {
    onMessage();
  }
  return { accounts, mnemonic, privateKey: ethereumPrivateKey };
};
