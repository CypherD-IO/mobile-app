import { Secp256k1HdWallet } from '@cosmjs-rn/amino';
import { Slip10RawIndex } from '@cosmjs-rn/crypto';
import { Bech32 } from '@cosmjs-rn/encoding';
import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { Mnemonic } from '@keplr-wallet/crypto';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import * as bs58 from 'bs58';
import CryptoJS from 'crypto-js';
import { derivePath } from 'ed25519-hd-key';
import {
  Mnemonic as EthersMnemonic,
  HDNodeWallet,
  Wallet,
  getBytes,
  hexlify,
  ripemd160,
  sha256,
} from 'ethers';
import { CosmosChainConfig } from '../constants/cosmosConfig';
import { AddressDerivationPath, Bech32Prefixes } from '../constants/data';
import { ConnectionTypes } from '../constants/enum';
import { setConnectionType } from './asyncStorage';
import { _NO_CYPHERD_CREDENTIAL_AVAILABLE_, addHexPrefix } from './util';
import { HDKey } from 'micro-ed25519-hdkey';
import { logAnalyticsToFirebase } from './analytics';

function sendFirebaseEvent(walletaddress: string, trkEvent: string) {
  void logAnalyticsToFirebase(trkEvent, {
    walletaddress,
  });
}

export type AddressChainNames =
  | 'ethereum'
  | 'cosmos'
  | 'osmosis'
  | 'noble'
  | 'coreum'
  | 'injective'
  | 'solana';

export interface IAccountDetail {
  address: string | undefined;
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

  return ethAddress.toLowerCase();
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

  const seed = bip39.mnemonicToSeedSync(mnemonic);

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
  const nobleAddress = Bech32.encode(
    Bech32Prefixes.NOBLE,
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

  const hd = HDKey.fromMasterSeed(seed.toString('hex'));
  const solanaPath = `${AddressDerivationPath.SOLANA}${String(addressIndex)}'/0'`;
  const keypair = Keypair.fromSeed(hd.derive(solanaPath).privateKey);
  const solanaAddress = keypair.publicKey.toBase58();

  return {
    accounts: [
      {
        name: 'ethereum',
        address: ethAddress.toLowerCase(),
        publicKey: ethPubKey,
      },
      {
        name: 'cosmos',
        address: cosmosAddress.toLowerCase(),
        publicKey: cosmosPubKey,
      },
      {
        name: 'osmosis',
        address: osmosisAddress.toLowerCase(),
        publicKey: cosmosPubKey,
      },
      {
        name: 'noble',
        address: nobleAddress.toLowerCase(),
        publicKey: cosmosPubKey,
      },
      {
        name: 'coreum',
        address: coreumAddress.toLowerCase(),
        publicKey: coreumPubKey,
      },
      {
        name: 'solana',
        address: solanaAddress,
        publicKey: solanaAddress,
      },
      {
        name: 'injective',
        address: getInjectiveAddress(ethAddress),
        publicKey: ethPubKey,
      },
    ],
    privateKey: ethPrivateKey,
    mnemonic,
  };
};

export const generateCosmosPrivateKey = async (
  chainConfig: CosmosChainConfig,
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
  try {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const derivedKey = derivePath(bip44HDPath, seed.toString('hex')).key;
    const keypair = Keypair.fromSeed(derivedKey);
    return bs58.default.encode(keypair.secretKey);
  } catch (e) {
    return _NO_CYPHERD_CREDENTIAL_AVAILABLE_;
  }
};

export const generateCosmosWallet = async (
  chainName: AddressChainNames,
  chainConfig: CosmosChainConfig,
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

export const generateRawAddressFromPubKeys = (publicKey: Uint8Array) => {
  let hash = CryptoJS.SHA256(
    CryptoJS.lib.WordArray.create(publicKey as any),
  ).toString();
  hash = CryptoJS.RIPEMD160(CryptoJS.enc.Hex.parse(hash)).toString();
  return new Uint8Array(Buffer.from(hash, 'hex'));
};

export const generateWalletFromEthPrivateKey = async (privateKey: string) => {
  const ethersWallet = new Wallet(addHexPrefix(privateKey));
  const ethereumWallet = {
    name: 'ethereum',
    address: ethersWallet.address,
    privateKey: addHexPrefix(privateKey),
    publicKey: ethersWallet.publicKey,
  };

  const accounts: IAccountDetailWithChain[] = [ethereumWallet];
  // emit event to firebase
  sendFirebaseEvent(ethereumWallet.address, 'import_wallet_private_key');
  return { accounts, privateKey };
};

export const generateWalletFromSolanaPrivateKey = async (
  privateKey: string,
) => {
  const keypair = Keypair.fromSecretKey(bs58.default.decode(privateKey));
  const solanaWallet = {
    name: 'solana',
    address: keypair.publicKey.toBase58(),
    publicKey: keypair.publicKey.toBase58(),
  };
  const accounts: IAccountDetailWithChain[] = [solanaWallet];
  return { accounts, privateKey };
};
