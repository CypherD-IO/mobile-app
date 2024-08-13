import * as bip39 from 'bip39';
import analytics from '@react-native-firebase/analytics';
import { getToken, registerForRemoteMessages, onMessage } from '../core/push';
import { ethToEvmos } from '@tharsis/address-converter';
import { Slip10RawIndex } from '@cosmjs-rn/crypto';
import { Secp256k1HdWallet, pubkeyToAddress } from '@cosmjs-rn/amino';
import { Secp256k1HdWallet, pubkeyToAddress } from '@cosmjs-rn/amino';
import { cosmosConfig, IIBCData } from '../constants/cosmosConfig';
import CryptoJS from 'crypto-js';
import { Mnemonic, PrivKeySecp256k1 } from '@keplr-wallet/crypto';
import { isIOS } from '../misc/checkers';
import { addHexPrefix } from './util';
import {
  HDNodeWallet,
  Mnemonic as EthersMnemonic,
  Wallet,
  sha256,
  hexlify,
  getBytes,
  ripemd160,
} from 'ethers';
import {
  HDNodeWallet,
  Mnemonic as EthersMnemonic,
  Wallet,
  sha256,
  hexlify,
  getBytes,
  ripemd160,
} from 'ethers';
import { setConnectionType } from './asyncStorage';
import { ConnectionTypes } from '../constants/enum';
import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { Keypair } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { Bech32 } from '@cosmjs-rn/encoding';
import { Bech32 } from '@cosmjs-rn/encoding';
import * as bs58 from 'bs58';
import { AddressDerivationPath, Bech32Prefixes } from '../constants/data';

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
  | 'kujira'
  | 'solana';
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

export const generateEthAddressFromSeedPhrase = async (mnemonic: string) => {
  const seed = await bip39.mnemonicToSeed(mnemonic);

  const hdNode = HDNodeWallet.fromSeed(seed);

  // ethereum privatekey and ethereum address generation
  const ethPath = AddressDerivationPath.ETH + String(0);
  const ethWallet = hdNode.derivePath(ethPath);
  const ethAddress = ethWallet.address;

  return ethAddress;
};

export const generateMultipleWalletAddressesFromSeedPhrase = async (
  mnemonic: string,
  numberOfAddresses = 100,
) => {
  return await new Promise((resolve, reject) => {
    const _mnemonic = EthersMnemonic.fromPhrase(mnemonic);
    const hdNode = HDNodeWallet.fromMnemonic(_mnemonic, "m/44'/60'/0'/0");
    const addresses = Array.from({ length: numberOfAddresses }, (_, index) => {
      const derivedNode = hdNode.derivePath(index.toString());
      return { address: derivedNode.address.toLowerCase(), index };
    });
    resolve(addresses);
  });
};

export const generateWalletFromMnemonic = async (
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
  void setConnectionType(ConnectionTypes.SEED_PHRASE);

  const seed = await bip39.mnemonicToSeed(mnemonic);

  const hdNode = HDNodeWallet.fromSeed(seed);

  // ethereum privatekey and ethereum address generation
  const ethPath = AddressDerivationPath.ETH + String(addressIndex);
  const ethWallet = hdNode.derivePath(ethPath);
  const ethAddress = ethWallet.address;
  const ethPubKey = ethWallet.publicKey;
  const ethPrivateKey = ethWallet.privateKey;

  // cosmos chains address generation
  const cosmosPath = AddressDerivationPath.COSMOS + String(addressIndex);
  const cosmosWallet = hdNode.derivePath(cosmosPath);
  const cosmosPubKey = cosmosWallet.publicKey;
  const cosmosPubKeyHash = sha256(hexlify(cosmosPubKey));
  const cosmosRipemd160Hash = ripemd160(cosmosPubKeyHash);
  const cosmosAddress = Bech32.encode(
    Bech32Prefixes.COSMOS,
    getBytes(cosmosRipemd160Hash),
  );
  const junoAddress = Bech32.encode(
    Bech32Prefixes.JUNO,
    getBytes(cosmosRipemd160Hash),
  );
  const stargazeAddress = Bech32.encode(
    Bech32Prefixes.STARGAZE,
    getBytes(cosmosRipemd160Hash),
  );
  const nobleAddress = Bech32.encode(
    Bech32Prefixes.NOBLE,
    getBytes(cosmosRipemd160Hash),
  );
  const kujiraAddress = Bech32.encode(
    Bech32Prefixes.KUJIRA,
    getBytes(cosmosRipemd160Hash),
  );
  const osmosisAddress = Bech32.encode(
    Bech32Prefixes.OSMOSIS,
    getBytes(cosmosRipemd160Hash),
  );

  // coreum address generation
  const coreumPath = AddressDerivationPath.COREUM + String(addressIndex);
  const coreumWallet = hdNode.derivePath(coreumPath);
  const coreumPubKey = coreumWallet.publicKey;
  const coreumPubKeyHash = sha256(hexlify(coreumPubKey));
  const coreumRipemd160Hash = ripemd160(coreumPubKeyHash);
  const coreumAddress = Bech32.encode(
    Bech32Prefixes.COREUM,
    getBytes(coreumRipemd160Hash),
  );

  const solanaPath = AddressDerivationPath.SOLANA;
  const solanaPrivateKey = derivePath(solanaPath, seed.toString('hex')).key;
  const solanaKeypair = Keypair.fromSeed(Uint8Array.from(solanaPrivateKey));
  const solanaAddress = solanaKeypair.publicKey.toBase58();

  return {
    accounts: [
      {
        name: 'ethereum',
        address: ethAddress,
        publicKey: ethPubKey,
      },
      {
        name: 'cosmos',
        address: cosmosAddress,
        publicKey: cosmosPubKey,
      },
      {
        name: 'osmosis',
        address: osmosisAddress,
        publicKey: cosmosPubKey,
      },
      {
        name: 'juno',
        address: junoAddress,
        publicKey: cosmosPubKey,
      },
      {
        name: 'stargaze',
        address: stargazeAddress,
        publicKey: cosmosPubKey,
      },
      {
        name: 'noble',
        address: nobleAddress,
        publicKey: cosmosPubKey,
      },
      {
        name: 'kujira',
        address: kujiraAddress,
        publicKey: cosmosPubKey,
      },
      {
        name: 'coreum',
        address: coreumAddress,
        publicKey: coreumPubKey,
      },
      {
        name: 'evmos',
        address: ethToEvmos(ethAddress),
        publicKey: ethPubKey,
      },
      {
        name: 'solana',
        address: solanaAddress,
        publicKey: solanaAddress,
      },
      // {
      //   name: 'injective',
      //   address: getInjectiveAddress(ethAddress),
      //   publicKey: ethPubKey,
      // },
    ],
    privateKey: ethPrivateKey,
    mnemonic,
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

export const generateSolanaPrivateKey = async (
  mnemonic: string,
  bip44HDPath: string,
) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedKey = derivePath(bip44HDPath, seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedKey);
  return bs58.default.encode(keypair.secretKey);
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

export const generateSolanaWallet = async (
  mnemonic: string,
  bip44HDPath = `m/44'/501'/0'/0'`,
): Promise<IAccountDetailWithChain> => {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const derivedSeed = derivePath(bip44HDPath, seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedSeed);
  const address = keypair.publicKey.toBase58();
  return {
    name: 'solana',
    address,
    // privateKey: uintToHex(privateKey),
    publicKey: address,
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
