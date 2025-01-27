/* eslint-disable @typescript-eslint/restrict-plus-operands */
import * as React from 'react';
import { Platform } from 'react-native';
import {
  CHAIN_ETH,
  CHAIN_AVALANCHE,
  CHAIN_POLYGON,
  CHAIN_BSC,
  CHAIN_OPTIMISM,
  Chain,
  CHAIN_ARBITRUM,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_JUNO,
  CHAIN_STARGAZE,
  CHAIN_NOBLE,
  CHAIN_SHARDEUM,
  ChainBackendNames,
  EnsCoinTypes,
  CosmosStakingTokens,
  NativeTokenMapping,
  CHAIN_SHARDEUM_SPHINX,
  CHAIN_ZKSYNC_ERA,
  CHAIN_BASE,
  CHAIN_POLYGON_ZKEVM,
  CHAIN_AURORA,
  CHAIN_MOONBEAM,
  CHAIN_MOONRIVER,
  CHAIN_COLLECTION,
  EVM_CHAINS,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_KUJIRA,
  CHAIN_SOLANA,
  NON_EIP1599_CHAINS,
} from '../constants/server';
import {
  GlobalStateDef,
  GlobalContextDef,
  initialGlobalState,
} from './globalContext';
import * as Sentry from '@sentry/react-native';
import Toast from 'react-native-toast-message';
import { isIOS } from '../misc/checkers';
import countryMaster from '../../assets/datasets/countryMaster';
import Clipboard from '@react-native-clipboard/clipboard';
import { find, get } from 'lodash';
import Web3 from 'web3';
import { isCosmosAddress } from '../containers/utilities/cosmosSendUtility';
import { isOsmosisAddress } from '../containers/utilities/osmosisSendUtility';
import { isJunoAddress } from '../containers/utilities/junoSendUtility';
import { isStargazeAddress } from '../containers/utilities/stargazeSendUtility';
import { isNobleAddress } from '../containers/utilities/nobleSendUtility';

import { ActivityContextDef } from '../reducers/activity_reducer';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { t } from 'i18next';
import { AnalyticsType, SignMessageValidationType } from '../constants/enum';
import {
  ErrorAnalytics,
  SuccessAnalytics,
} from '../models/analytics.interface';
import {
  ANALYTICS_ERROR_URL,
  ANALYTICS_SUCCESS_URL,
  ChainNameToChainMapping,
} from '../constants/data';
import DeviceInfo from 'react-native-device-info';
import axios from './Http';
import { Holding } from './portfolio';
import Long from 'long';

import { Wallet } from 'ethers';
import { isCoreumAddress } from '../containers/utilities/coreumUtilities';
import { isInjectiveAddress } from '../containers/utilities/injectiveUtilities';
import { isKujiraAddress } from '../containers/utilities/kujiraUtilities';
import moment from 'moment';
import { isSolanaAddress } from '../containers/utilities/solanaUtilities';
import { RSA } from 'react-native-rsa-native';
import { hostWorker } from '../global';
import { v4 as uuidv4 } from 'uuid';
import { ICountry } from '../models/cardApplication.model';
import { currencySymbolMap } from '../../assets/datasets/currencySymbolMap';
import { isAddress } from 'web3-validator';
import Decimal from 'decimal.js';
import { DecimalHelper } from '../utils/decimalHelper';

const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
export const HdWalletContext = React.createContext<HdWalletContextDef | null>(
  null,
);
export const ActivityContext = React.createContext<ActivityContextDef | null>(
  null,
);

export const IOS = 'ios';
export const ANDROID = 'android';
export const CYPHERD_SEED_PHRASE_KEY = 'CypherD_SPK';
export const CYPHERD_PRIVATE_KEY = 'CypherD_PK';
export const CYPHERD_ROOT_DATA = 'CypherD_Root';
export const IMPORTING = 'IMPORTING';
export const _NO_CYPHERD_CREDENTIAL_AVAILABLE_ =
  '_NO_CYPHERD_CREDENTIAL_AVAILABLE_';
export const AUTHORIZE_WALLET_DELETION = 'AUTHORIZE_WALLET_DELETION';
export const DUMMY_AUTH = 'DUMMY_AUTH';
export const PIN_AUTH = 'pin_auth';

export const getPlatform = () => {
  return Platform.OS;
};

export const getPlatformVersion = () => {
  return Platform.Version;
};

export function getExplorerUrlFromBackendNames(chain: string, hash: string) {
  switch (chain) {
    case ChainBackendNames.ETH:
      return `https://etherscan.io/tx/${hash}`;
    case ChainBackendNames.AVALANCHE:
      return `https://snowtrace.io/tx/${hash}`;
    case ChainBackendNames.BSC:
      return `https://bscscan.com/tx/${hash}`;
    case ChainBackendNames.POLYGON:
      return `https://polygonscan.com/tx/${hash}`;
    case ChainBackendNames.SHARDEUM:
      return `https://explorer-dapps.shardeum.org/transaction/${hash}`;
    case ChainBackendNames.SHARDEUM_SPHINX:
      return `https://explorer-sphinx.shardeum.org/transaction/${hash}`;
    case ChainBackendNames.ARBITRUM:
      return `https://arbiscan.io/tx/${hash}`;
    case ChainBackendNames.OPTIMISM:
      return `https://optimistic.etherscan.io/tx/${hash}`;
    case ChainBackendNames.BASE:
      return `https://basescan.org/tx/${hash}`;
    case ChainBackendNames.POLYGON_ZKEVM:
      return `https://zkevm.polygonscan.com/tx/${hash}`;
    case ChainBackendNames.ZKSYNC_ERA:
      return `https://www.oklink.com/zksync/tx/${hash}`;
    case ChainBackendNames.AURORA:
      return `https://explorer.aurora.dev/tx/${hash}`;
    case ChainBackendNames.MOONBEAM:
      return `https://moonbeam.moonscan.io/tx/${hash}`;
    case ChainBackendNames.MOONRIVER:
      return `https://moonriver.moonscan.io/tx/${hash}`;
    case ChainBackendNames.COSMOS:
      return `https://www.mintscan.io/cosmos/txs/${hash}`;
    case ChainBackendNames.OSMOSIS:
      return `https://www.mintscan.io/osmosis/txs/${hash}`;
    case ChainBackendNames.JUNO:
      return `https://www.mintscan.io/juno/txs/${hash}`;
    case ChainBackendNames.STARGAZE:
      return `https://www.mintscan.io/stargaze/txs/${hash}`;
    case ChainBackendNames.NOBLE:
      return `https://www.mintscan.io/noble/txs/${hash}`;
    case ChainBackendNames.COREUM:
      return `https://www.mintscan.io/coreum/txs/${hash}`;
    case ChainBackendNames.INJECTIVE:
      return `https://www.mintscan.io/injective/txs/${hash}`;
    case ChainBackendNames.KUJIRA:
      return `https://atomscan.com/kujira/transactions/${hash}`;
    default:
      return '';
  }
}

export function getExplorerUrlFromChainId(chainId: string, hash: string) {
  switch (chainId) {
    case CHAIN_ETH.chainIdNumber.toString():
      return `https://etherscan.io/tx/${hash}`;
    case CHAIN_AVALANCHE.chainIdNumber.toString():
      return `https://snowtrace.io/tx/${hash}`;
    case CHAIN_BSC.chainIdNumber.toString():
      return `https://bscscan.com/tx/${hash}`;
    case CHAIN_POLYGON.chainIdNumber.toString():
      return `https://polygonscan.com/tx/${hash}`;
    case CHAIN_SHARDEUM.chainIdNumber.toString():
      return `https://explorer-dapps.shardeum.org/transaction/${hash}`;
    case CHAIN_SHARDEUM_SPHINX.chainIdNumber.toString():
      return `https://explorer-sphinx.shardeum.org/transaction/${hash}`;
    case CHAIN_ARBITRUM.chainIdNumber.toString():
      return `https://arbiscan.io/tx/${hash}`;
    case CHAIN_OPTIMISM.chainIdNumber.toString():
      return `https://optimistic.etherscan.io/tx/${hash}`;
    case CHAIN_BASE.chainIdNumber.toString():
      return `https://basescan.org/tx/${hash}`;
    case CHAIN_POLYGON_ZKEVM.chainIdNumber.toString():
      return `https://zkevm.polygonscan.com/tx/${hash}`;
    case CHAIN_ZKSYNC_ERA.chainIdNumber.toString():
      return `https://www.oklink.com/zksync/tx/${hash}`;
    case CHAIN_AURORA.chainIdNumber.toString():
      return `https://explorer.aurora.dev/tx/${hash}`;
    case CHAIN_MOONBEAM.chainIdNumber.toString():
      return `https://moonbeam.moonscan.io/tx/${hash}`;
    case CHAIN_MOONRIVER.chainIdNumber.toString():
      return `https://moonriver.moonscan.io/tx/${hash}`;
    case CHAIN_COSMOS.chain_id:
      return `https://www.mintscan.io/cosmos/txs/${hash}`;
    case CHAIN_OSMOSIS.chain_id:
      return `https://www.mintscan.io/osmosis/txs/${hash}`;
    case CHAIN_JUNO.chain_id:
      return `https://www.mintscan.io/juno/txs/${hash}`;
    case CHAIN_STARGAZE.chain_id:
      return `https://www.mintscan.io/stargaze/txs/${hash}`;
    case CHAIN_NOBLE.chain_id:
      return `https://www.mintscan.io/noble/txs/${hash}`;
    case CHAIN_COREUM.chain_id:
      return `https://www.mintscan.io/coreum/txs/${hash}`;
    case CHAIN_INJECTIVE.chain_id:
      return `https://www.mintscan.io/injective/txs/${hash}`;
    case CHAIN_KUJIRA.chain_id:
      return `https://atomscan.com/kujira/transactions/${hash}`;
    case CHAIN_SOLANA.chain_id:
      return `https://solscan.io/tx/${hash}`;
    default:
      return '';
  }
}

export function getExplorerUrl(
  chainSymbol: string,
  chainName: string,
  hash: string,
) {
  switch (chainSymbol) {
    case CHAIN_ETH.symbol:
      if (chainName === CHAIN_ARBITRUM.name) {
        return `https://arbiscan.io/tx/${hash}`;
      } else if (chainName === CHAIN_OPTIMISM.name) {
        return `https://optimistic.etherscan.io/tx/${hash}`;
      } else if (chainName === CHAIN_ZKSYNC_ERA.name) {
        return `https://explorer.zksync.io/tx/${hash}`;
      } else if (chainName === CHAIN_BASE.name) {
        return `https://base.dex.guru/tx/${hash}`;
      } else if (chainName === CHAIN_POLYGON_ZKEVM.name) {
        return `https://zkevm.polygonscan.com/tx/${hash}`;
      } else if (chainName === CHAIN_AURORA.name) {
        return `https://explorer.aurora.dev/tx/${hash}`;
      }
      return `https://etherscan.io/tx/${hash}`;
    case CHAIN_AVALANCHE.symbol:
      return `https://explorer.avax.network/tx/${hash}`;
    case CHAIN_BSC.symbol:
      return `https://bscscan.com/tx/${hash}`;
    case CHAIN_POLYGON.symbol:
      return `https://polygonscan.com/tx/${hash}`;
    case CHAIN_MOONBEAM.symbol:
      return `https://moonbeam.moonscan.io/tx/${hash}`;
    case CHAIN_MOONRIVER.symbol:
      return `https://moonriver.moonscan.io/tx/${hash}`;
    case CHAIN_COSMOS.symbol:
    case NativeTokenMapping.COSMOS:
      return `https://www.mintscan.io/cosmos/txs/${hash}`;
    case CHAIN_OSMOSIS.symbol:
      return `https://www.mintscan.io/osmosis/txs/${hash}`;
    case CHAIN_JUNO.symbol:
      return `https://www.mintscan.io/juno/txs/${hash}`;
    case CHAIN_STARGAZE.symbol:
      return `https://www.mintscan.io/stargaze/txs/${hash}`;
    case CHAIN_NOBLE.symbol:
      return `https://www.mintscan.io/noble/txs/${hash}`;
    case CHAIN_COREUM.symbol:
      return `https://www.mintscan.io/coreum/txs/${hash}`;
    case CHAIN_INJECTIVE.symbol:
      return `https://www.mintscan.io/injective/txs/${hash}`;
    case CHAIN_KUJIRA.symbol:
      return `https://atomscan.com/kujira/transactions/${hash}`;
    case CHAIN_SHARDEUM.symbol:
      return `https://explorer-dapps.shardeum.org/transaction/${hash}`;
    case CHAIN_SHARDEUM_SPHINX.symbol:
      return `https://explorer-sphinx.shardeum.org/transaction/${hash}`;
    case CHAIN_SOLANA.symbol:
      return `https://solscan.io/tx/${hash}`;
  }
}
export function getNftExplorerUrl(
  chain_symbol: string,
  contractAddress: string,
  id: string,
) {
  switch (chain_symbol) {
    case CHAIN_ETH.backendName:
      return `https://opensea.io/assets/ethereum/${contractAddress}/${id}`;
    case CHAIN_POLYGON.backendName:
      return `https://opensea.io/assets/matic/${contractAddress}/${id}`;
    case CHAIN_AVALANCHE.backendName:
      return `https://explorer.avax.network/address/${contractAddress}`;
    case CHAIN_BSC.backendName:
      return `https://bscscan.com/address/${contractAddress}`;
    case CHAIN_ARBITRUM.backendName:
      return `https://arbitrum.nftscan.com/${contractAddress}`;
    case CHAIN_OPTIMISM.backendName:
      return `https://optimistic.etherscan.io/address/${contractAddress}`;
    case CHAIN_STARGAZE.backendName:
      return `https://www.stargaze.zone/media/${contractAddress}/${id}`;
    case CHAIN_NOBLE.backendName:
      return `https://noblescan.com/address/${contractAddress}`;
    case CHAIN_SHARDEUM.backendName:
      return `https://explorer-dapps.shardeum.org/account/${contractAddress}`;
    case CHAIN_SHARDEUM_SPHINX.backendName:
      return `https://explorer-sphinx.shardeum.org/account/${contractAddress}`;
    default:
      return `https://etherscan.io/address/${contractAddress}`;
  }
}

export const TARGET_CARD_EVM_WALLET_ADDRESS =
  '0x43ea3262A6a208470AA686254bE9673F97CbCeD9';
export const TARGET_CARD_COSMOS_WALLET_ADDRESS =
  'cosmos15fm4ycvl6skw4h5v76tqt2zg36nzxl4mklkr8j';
export const TARGET_CARD_OSMOSIS_WALLET_ADDRESS =
  'osmo15fm4ycvl6skw4h5v76tqt2zg36nzxl4m7y9n3q';
export const TARGET_CARD_JUNO_WALLET_ADDRESS =
  'juno15fm4ycvl6skw4h5v76tqt2zg36nzxl4mqd4cqw';
export const TARGET_CARD_STARGAZE_WALLET_ADDRESS =
  'stars15fm4ycvl6skw4h5v76tqt2zg36nzxl4mzrp7vr';
export const TARGET_CARD_NOBLE_WALLET_ADDRESS =
  'noble15fm4ycvl6skw4h5v76tqt2zg36nzxl4mzrp7vr';

export const TARGET_BRIDGE_EVM_WALLET_ADDRESS =
  '0xa2a048426dd38b4925283230bfa9ebce2ab4c037';
export const TARGET_BRIDGE_COSMOS_WALLET_ADDRESS =
  'cosmos1e6khhgeyut7y0qxw2glrdl4al3acavdf9mypt9';
export const TARGET_BRIDGE_OSMOSIS_WALEET_ADDRESS =
  'osmo1e6khhgeyut7y0qxw2glrdl4al3acavdfdqh3ah';
export const TARGET_BRIDGE_JUNO_WALLET_ADDRESS =
  'juno1e6khhgeyut7y0qxw2glrdl4al3acavdfnf86ve';
export const TARGET_BRIDGE_STARGAZE_WALLET_ADDRESS =
  'stars1e6khhgeyut7y0qxw2glrdl4al3acavdf38nuq5';
export const TARGET_BRIDGE_NOBLE_WALLET_ADDRESS =
  'noble1e6khhgeyut7y0qxw2glrdl4al3acavdf38nuq5';

export function getWeb3Endpoint(selectedChain: Chain, context): string {
  try {
    if (context) {
      const globalStateCasted: GlobalStateDef = (
        context as unknown as GlobalContextDef
      ).globalState;
      return globalStateCasted.rpcEndpoints[selectedChain.backendName].primary;
    }
  } catch (e) {
    Sentry.captureException(e);
  }
  return initialGlobalState.rpcEndpoints[selectedChain.backendName].primary;
}

export const apiTimeout = 30000;
export const validateAmount = (amount: string): boolean => {
  if (!Number.isNaN(Number(amount))) return true;
  else {
    // showModal('state', {type: 'error', title: 'Invalid input', description: 'Enter a valid input', onSuccess: hideModal, onFailure: hideModal});
    Toast.show({
      type: 'error',
      text1: 'Invalid input',
      text2: 'Enter a valid input',
      position: 'bottom',
    });
    return false;
  }
};

export const convertFromUnitAmount = (
  amount: string | number | Decimal,
  decimal: number,
  decimalPlaces = 3,
): string => {
  return DecimalHelper.toString(
    DecimalHelper.divide(amount, DecimalHelper.pow(10, decimal)),
    decimalPlaces,
  );
};

export const convertNumberToShortHandNotation = n => {
  if (n < 1e3) return n;
  if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
  if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
  if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
  if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
};

// removes the extra decimal places and only returns the amount with the tokens contract decimals
export const convertAmountOfContractDecimal = (
  amount: string,
  decimal = 18,
): string => {
  return [
    amount.split('.')[0],
    amount.split('.')[1]?.slice(0, decimal)
      ? amount.split('.')[1].slice(0, decimal)
      : '0',
  ].join('.');
};

export const isValidUUIDV4 = (uuid: string) => {
  const pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(uuid);
};

export const isValidEmailID = (email: string): boolean => {
  const pattern =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return pattern.test(String(email).toLowerCase());
};

export const isValidSSN = (ssn: string): boolean => {
  const SSN_BLACKLIST = ['078051120', '219099999', '457555462'];
  const SSN_WHITELIST = ['999999999'];

  const SSN_REGEX =
    /^(?!666|000|9\d{2})\d{3}[- ]{0,1}(?!00)\d{2}[- ]{0,1}(?!0{4})\d{4}$/;
  const SSN_REGEX_LAST_FOUR = /^(?!0000)[0-9]{4}$/;

  ssn = ssn.trim();

  if (SSN_WHITELIST.includes(ssn)) {
    return true;
  }

  if (!SSN_REGEX.test(ssn) && !SSN_REGEX_LAST_FOUR.test(ssn)) {
    return false;
  }

  return !SSN_BLACKLIST.includes(ssn.replace(/\D/g, ''));
};

export const isValidPassportNumber = (ppn: string): boolean => {
  // const PP_REGEX = /^([A-Z a-z]){1}([0-9]){7}$/;
  const PP_REGEX = /^[a-zA-Z0-9]*$/;
  ppn = ppn.trim();
  return PP_REGEX.test(ppn);
};

export const isBigIntZero = (num: bigint): boolean => {
  return num === BigInt(0);
};

export const getTimeForDate = (
  d: Date,
): { hours: string; minutes: string; seconds: string } => {
  const hours: number | string =
    18 - d.getUTCHours() >= 0
      ? 18 - d.getUTCHours()
      : 23 - (d.getUTCHours() - 19);
  const min: number | string = 60 - d.getUTCMinutes() - 1;
  const sec: number | string = 60 - d.getUTCSeconds();
  return {
    hours: hours < 10 ? '0' + hours.toString() : hours.toString(),
    minutes: min < 10 ? '0' + min.toString() : min.toString(),
    seconds: sec < 10 ? '0' + sec.toString() : sec.toString(),
  };
};

export const shuffleSeedPhrase = (array: string[]): string[] => {
  let currentIndex = array.length;
  let randomIndex;

  // While there are remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
};

export const sortJSONArrayByKey = (array, key): [] => {
  return array.sort((a, b) => {
    const x = a[key];
    const y = b[key];
    return x < y ? -1 : x > y ? 1 : 0;
  });
};

export const concatErrorMessagesFromArray = (array: []): string => {
  return array.map(messageObject => messageObject.message).join('.');
};

export const concatErrorMessagesFromArrayOneByOne = (array: []) => {
  return array.map(messageObject => messageObject.message).join('\n');
};

export const isAutoFillSupported = (): boolean => {
  const majorVersionIOS = parseInt(String(Platform.Version), 10);
  return isIOS() && majorVersionIOS >= 12;
};

export const codeToArray = (code?: string): string[] => {
  return code?.split('') ?? [];
};

export const convertToHexa = (str = '') => {
  const res = [];
  const { length: len } = str;
  for (let n = 0, l = len; n < l; n++) {
    const hex = Number(str.charCodeAt(n)).toString(16);
    res.push(hex);
  }
  return res.join('');
};

export const removeSolidProhibitedCountriesFromCountryMaster = () => {
  const prohibitedCountries = [
    'Albania',
    'Bosnia',
    'Belarus',
    'Burundi',
    'Africa',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Korea',
    'Congo',
    'Iran',
    'Iraq',
    'Lebanon',
    'Libya',
    'Macedonia',
    'Montenegro',
    'Nigeria',
    'Pakistan',
    'Russia',
    'Serbia',
    'Slovenia',
    'Somalia',
    'Sudan',
    'Syria',
    'Turkey',
    'Ukraine',
    'Venezuela',
    'Yemen',
    'Zimbabwe',
  ];
  const allowedCountries = countryMaster.filter(country =>
    prohibitedCountries.every(
      prohibitedCountry =>
        !country.name.toLowerCase().includes(prohibitedCountry.toLowerCase()),
    ),
  );
  return allowedCountries;
};

export const isAddressSet = (address: string) => {
  return (
    address !== undefined &&
    address !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_ &&
    address !== IMPORTING
  );
};

export function copyToClipboard(text: string) {
  Clipboard.setString(text);
}

export const getNativeToken = (
  tokenSymbol: string,
  chainHoldings: Holding[],
): Holding => {
  const nativeToken = find(chainHoldings, { symbol: tokenSymbol });
  return nativeToken;
};

export function getSendAddressFieldPlaceholder(
  chainName: string,
  backendName: string,
) {
  if (chainName === 'ethereum') {
    return Object.keys(EnsCoinTypes).includes(backendName)
      ? t('SEND_ETHEREUM_PLACEHOLDER_WITH_ENS')
      : t('SEND_ETHEREUM_PLACEHOLDER');
  } else {
    return `${t('ENTER_CONTACT_NAME')} / ${chainName} ${t(
      'ADDRESS_ALL_SMALL',
    )}`;
  }
}

export async function sleepFor(milliseconds: number) {
  return await new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), milliseconds);
  });
}

export function isValidEns(domain: string) {
  const ensReg =
    /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?$/gi;
  return ensReg.test(domain);
}

export function getMaskedAddress(address: string, maskLength = 6) {
  let prefixLength = 2;
  const len = address?.length;
  if (isAddress(address)) {
    prefixLength = 2; // length of 0x
  } else if (isCosmosAddress(address)) {
    prefixLength = 6;
  } else if (isOsmosisAddress(address) || isJunoAddress(address)) {
    prefixLength = 4;
  } else if (isStargazeAddress(address) || isNobleAddress(address)) {
    prefixLength = 3;
  } else {
    prefixLength = 0;
  }
  return `${address?.slice(0, prefixLength + maskLength)}...${address?.slice(
    len - maskLength,
    len,
  )}`;
}

export function SendToAddressValidator(
  chainName: string | undefined,
  backendName: string | undefined,
  address: string | undefined,
) {
  if (chainName && backendName && address) {
    switch (chainName) {
      case CHAIN_ETH.chainName:
        return Object.keys(EnsCoinTypes).includes(backendName)
          ? isAddress(address) || isValidEns(address)
          : isAddress(address);
      case CHAIN_COSMOS.chainName:
        return isCosmosAddress(address);
      case CHAIN_OSMOSIS.chainName:
        return isOsmosisAddress(address);
      case CHAIN_JUNO.chainName:
        return isJunoAddress(address);
      case CHAIN_STARGAZE.chainName:
        return isStargazeAddress(address);
      case CHAIN_NOBLE.chainName:
        return isNobleAddress(address);
      case CHAIN_COREUM.chainName:
        return isCoreumAddress(address);
      case CHAIN_INJECTIVE.chainName:
        return isInjectiveAddress(address);
      case CHAIN_KUJIRA.chainName:
        return isKujiraAddress(address);
      case CHAIN_SOLANA.chainName:
        return isSolanaAddress(address);
      default:
        return false;
    }
  }
  return false;
}

export function findChainOfAddress(address: string) {
  if (address) {
    if (isCosmosAddress(address)) return 'cosmos';
    if (isOsmosisAddress(address)) return 'osmosis';
    if (isJunoAddress(address)) return 'juno';
    if (isStargazeAddress(address)) return 'stargaze';
    if (isNobleAddress(address)) return 'noble';
    if (isCoreumAddress(address)) return 'coreum';
    if (isInjectiveAddress(address)) return 'injective';
    if (isKujiraAddress(address)) return 'kujira';
    if (
      Object.keys(EnsCoinTypes).includes(ChainBackendNames.ETH)
        ? isAddress(address) || isValidEns(address)
        : isAddress(address)
    )
      return 'ethereum';
  }
  return false;
}

export function isEthereumAddress(address: string) {
  return Object.keys(EnsCoinTypes).includes(ChainBackendNames.ETH)
    ? isAddress(address) || isValidEns(address)
    : isAddress(address);
}

export function limitDecimalPlaces(
  num: string | number | Decimal,
  decimalPlaces = 18,
): string {
  return DecimalHelper.floor(
    DecimalHelper.fromString(num),
    decimalPlaces,
  ).toString();
}

export const isBasicCosmosChain = (backendName: string) =>
  [
    ChainBackendNames.OSMOSIS,
    ChainBackendNames.COSMOS,
    ChainBackendNames.JUNO,
    ChainBackendNames.STARGAZE,
    ChainBackendNames.NOBLE,
    ChainBackendNames.COREUM,
    ChainBackendNames.INJECTIVE,
    ChainBackendNames.KUJIRA,
  ].includes(backendName);

export const isCosmosChain = (backendName: string) =>
  isBasicCosmosChain(backendName);

export const isCosmosStakingToken = (chain: string, tokenData: any) =>
  tokenData.chainDetails.backendName ===
    ChainBackendNames[chain as ChainBackendNames] &&
  tokenData.name.toLowerCase() ===
    CosmosStakingTokens[chain as CosmosStakingTokens];

export const isACosmosStakingToken = (tokenData: any) =>
  [
    ChainBackendNames.OSMOSIS,
    ChainBackendNames.COSMOS,
    ChainBackendNames.JUNO,
    ChainBackendNames.STARGAZE,
  ].some(chain => isCosmosStakingToken(chain as string, tokenData));

export const isABasicCosmosStakingToken = (tokenData: any) =>
  [
    ChainBackendNames.OSMOSIS,
    ChainBackendNames.COSMOS,
    ChainBackendNames.JUNO,
    ChainBackendNames.STARGAZE,
  ].some(chain => isCosmosStakingToken(chain as string, tokenData));

export const calculateTime = function time(ttime: string) {
  const ms = Date.parse(String(new Date())) - Date.parse(ttime);
  const seconds: number = Number.parseInt((ms / 1000).toFixed(0));
  const minutes: number = Number.parseInt((ms / (1000 * 60)).toFixed(0));
  const hours: number = Number.parseInt((ms / (1000 * 60 * 60)).toFixed(0));
  const days: number = Number.parseInt((ms / (1000 * 60 * 60 * 24)).toFixed(0));
  if (seconds < 60) return seconds.toString() + ' Sec ago';
  else if (minutes < 60) return minutes.toString() + ' Min ago';
  else if (hours === 1) return hours.toString() + ' Hr ago';
  else if (hours < 24) return hours.toString() + ' Hrs ago';
  else if (days === 1) return days.toString() + ' Day ago';
  else if (days < 6) return days.toString() + ' Days ago';
  else return ttime?.split('T')[0];
};

export const beautifyPriceWithUSDDenom = (price: number): string => {
  if (price > 1000000000000) {
    return `${DecimalHelper.toString(
      DecimalHelper.divide(price, 1000000000000).floor(),
    )} Trillion`;
  }
  if (price > 1000000000) {
    return `${DecimalHelper.toString(
      DecimalHelper.divide(price, 1000000000).floor(),
    )} Billion`;
  }
  if (price > 1000000) {
    return `${DecimalHelper.toString(
      DecimalHelper.divide(price, 1000000).floor(),
    )} Million`;
  }
  if (price > 1000) {
    return `${DecimalHelper.toString(DecimalHelper.divide(price, 1000).floor())} K`;
  }
  return `${price}`;
};

export const getChain = (chain: string): Chain => {
  let blockchain: Chain = {
    chainName: '',
    name: '',
    symbol: '',
    id: 0,
    logo_url: undefined,
    backendName: 'ALL',
    chain_id: '',
    native_token_address: '',
    chainIdNumber: 0,
  };
  switch (chain.toLowerCase()) {
    case 'eth':
      blockchain = CHAIN_ETH;
      break;
    case 'polygon':
      blockchain = CHAIN_POLYGON;
      break;
    case 'base':
      blockchain = CHAIN_BASE;
      break;
    case 'avalanche':
      blockchain = CHAIN_AVALANCHE;
      break;
    case 'arbitrum':
      blockchain = CHAIN_ARBITRUM;
      break;
    case 'optimism':
      blockchain = CHAIN_OPTIMISM;
      break;
    case 'bsc':
      blockchain = CHAIN_BSC;
      break;
    case 'cosmos':
      blockchain = CHAIN_COSMOS;
      break;
    case 'osmosis':
      blockchain = CHAIN_OSMOSIS;
      break;
    case 'juno':
      blockchain = CHAIN_JUNO;
      break;
    case 'stargaze':
      blockchain = CHAIN_STARGAZE;
      break;
    case 'noble':
      blockchain = CHAIN_NOBLE;
      break;
    case 'coreum':
      blockchain = CHAIN_COREUM;
      break;
    case 'injective':
      blockchain = CHAIN_INJECTIVE;
      break;
    case 'kujira':
      blockchain = CHAIN_KUJIRA;
      break;
    case 'shardeum':
      blockchain = CHAIN_SHARDEUM;
      break;
    case 'shardeum_sphinx':
      blockchain = CHAIN_SHARDEUM_SPHINX;
      break;
  }
  return blockchain;
};
export const generateRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const formatAmount = (
  amount: string | number | Decimal,
  precision = 4,
): string => {
  const decimalAmount = DecimalHelper.fromString(amount ?? 0);
  if (DecimalHelper.isLessThan(decimalAmount, 1)) {
    // For numbers less than 1, maintain significant digits
    return decimalAmount.toSignificantDigits(precision).toString();
  } else {
    // For numbers >= 1, use fixed decimal places
    return decimalAmount
      .toDecimalPlaces(precision, Decimal.ROUND_DOWN)
      .toString();
  }
};

export function logAnalytics(params: SuccessAnalytics | ErrorAnalytics): void {
  const { type } = params;
  switch (type) {
    case AnalyticsType.SUCCESS: {
      const { chain, txnHash, contractData, address } =
        params as SuccessAnalytics;
      const data = {
        chain,
        txnHash,
        other: {
          ...(contractData ? { contractData } : {}),
          ...(address ? { address } : {}),
        },
      };
      void axios.post(ANALYTICS_SUCCESS_URL, data);
      break;
    }
    case AnalyticsType.ERROR: {
      const {
        chain,
        message,
        screen,
        address,
        contractData,
        quoteId,
        connectionType,
      } = params as ErrorAnalytics;
      const data = {
        chain,
        message,
        client: `${Platform.OS}:${DeviceInfo.getVersion()}`,
        screen,
        other: {
          ...(address ? { address } : {}),
          ...(contractData ? { contractData } : {}),
          ...(quoteId ? { quoteId } : {}),
          ...(connectionType ? { connectionType } : {}),
        },
      };
      void axios.post(ANALYTICS_ERROR_URL, data);
      break;
    }
  }
}
export function parseErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  } else if (`${error}` !== '[object Object]') {
    return `${error}`;
  } else {
    const errorString = JSON.stringify(error, (k, v) => {
      if (typeof v === 'function' || typeof v === 'undefined') {
        return 'Non-enumerable type';
      }
      return v;
    });
    if (errorString !== '{}') {
      return errorString;
    } else {
      return 'Unknown Error';
    }
  }
}

export const isEnglish = (value: string) => {
  const validatedLName = value
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+(.)(\w*)/g, (_$1, $2, $3) => ` ${$2.toUpperCase() + $3}`)
    .replace(/\w/, s => s.toUpperCase());
  return validatedLName !== '';
};

export function getChainNameFromAddress(address: string) {
  if (isAddress(address)) {
    return ChainBackendNames.ETH;
  } else if (isCosmosAddress(address)) {
    return ChainBackendNames.COSMOS;
  } else if (isOsmosisAddress(address)) {
    return ChainBackendNames.OSMOSIS;
  } else if (isJunoAddress(address)) {
    return ChainBackendNames.JUNO;
  } else if (isStargazeAddress(address)) {
    return ChainBackendNames.STARGAZE;
  } else if (isNobleAddress(address)) {
    return ChainBackendNames.NOBLE;
  } else if (isCoreumAddress(address)) {
    return ChainBackendNames.COREUM;
  } else if (isInjectiveAddress(address)) {
    return ChainBackendNames.INJECTIVE;
  } else if (isKujiraAddress(address)) {
    return ChainBackendNames.KUJIRA;
  }
}

export function isNativeCurrency(
  fromChain: Chain,
  contractAddress: string,
): boolean {
  const isNative = [
    fromChain.native_token_address,
    fromChain.secondaryAddress,
  ].includes(contractAddress);
  return isNative;
}

export function addHexPrefix(value: string): string {
  if (!value.startsWith('0x')) {
    return '0x' + value;
  }
  return value;
}

export function isValidPrivateKey(privateKey: string): boolean {
  try {
    const wallet = new Wallet(addHexPrefix(privateKey));
    return !!wallet;
  } catch (e) {
    return false;
  }
}

export const validateAndFormatPrivateKey = (privateKey: string): string => {
  // Remove '0x' prefix if present
  const cleanKey = privateKey.replace('0x', '');

  // Check if it's a valid 64-character hex string
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error('Invalid private key format');
  }

  // Ensure '0x' prefix for Web3 v4
  return '0x' + cleanKey;
};

export function getAvailableChains(hdWallet: HdWalletContextDef): Chain[] {
  const {
    ethereum,
    solana,
    cosmos,
    osmosis,
    juno,
    stargaze,
    noble,
    coreum,
    injective,
    kujira,
  } = hdWallet.state.wallet;
  let availableChains: Chain[] = [];
  if (get(ethereum.wallets, ethereum.currentIndex)?.address) {
    availableChains = [CHAIN_COLLECTION, ...EVM_CHAINS];
  }
  // add Solana to the 2nd postion of the array to show it after Ethereum
  if (get(solana.wallets, solana.currentIndex)?.address) {
    availableChains.splice(2, 0, CHAIN_SOLANA);
  }
  if (get(cosmos.wallets, cosmos.currentIndex)?.address) {
    availableChains.push(CHAIN_COSMOS);
  }
  if (get(osmosis.wallets, osmosis.currentIndex)?.address) {
    availableChains.push(CHAIN_OSMOSIS);
  }
  if (get(juno.wallets, juno.currentIndex)?.address) {
    availableChains.push(CHAIN_JUNO);
  }
  if (get(stargaze.wallets, stargaze.currentIndex)?.address) {
    availableChains.push(CHAIN_STARGAZE);
  }
  if (get(noble.wallets, noble.currentIndex)?.address) {
    availableChains.push(CHAIN_NOBLE);
  }
  if (get(coreum.wallets, coreum.currentIndex)?.address) {
    availableChains.push(CHAIN_COREUM);
  }
  if (get(injective.wallets, injective.currentIndex)?.address) {
    availableChains.push(CHAIN_INJECTIVE);
  }
  if (get(kujira.wallets, kujira.currentIndex)?.address) {
    availableChains.push(CHAIN_KUJIRA);
  }

  return availableChains;
}

export function getTimeOutTime() {
  return Long.fromNumber(Math.floor(Date.now() / 1000) + 60).multiply(
    1000000000,
  );
}

export const hasSufficientBalanceAndGasFee = (
  isNativeToken: boolean,
  gasFeeEstimation: string,
  nativeTokenBalance: string,
  sentAmount: string,
  sendingTokenBalance: string,
): boolean => {
  const hasSufficientGasFee = DecimalHelper.isLessThanOrEqualTo(
    gasFeeEstimation,
    nativeTokenBalance,
  );
  if (DecimalHelper.isLessThan(sentAmount, 0)) {
    return false;
  }
  const hasSufficientBalance = isNativeToken
    ? DecimalHelper.isLessThanOrEqualTo(
        DecimalHelper.add(sentAmount, gasFeeEstimation),
        sendingTokenBalance,
      )
    : DecimalHelper.isLessThanOrEqualTo(sentAmount, sendingTokenBalance);
  return hasSufficientBalance && hasSufficientGasFee;
};

export const isNativeToken = (tokenData: any) => {
  const nativeTokenSymbol =
    NativeTokenMapping[tokenData.chainDetails.symbol] ||
    tokenData.chainDetails.symbol;
  return tokenData.symbol === nativeTokenSymbol;
};

export const isValidMessage = (
  address: string,
  messageToBeValidated: string,
) => {
  const messageToBeValidatedWith =
    /^Cypher Wallet wants you to sign in with your Ethereum account: \nAddress: 0x[a-fA-F0-9]{40} \n\nBy signing this transaction you are allowing Cypher Wallet to see the following: \n\nYour wallet address: 0x[a-fA-F0-9]{40} \nSessionId: [0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12} \nVersion: 1.0 \n\nPlease sign this message to authenticate. \nThis is a proof that you own this account. \nThis will not consume any gas.$/i;
  const currentVersion = '1.0';
  const versionSubstring = messageToBeValidated
    .match(/Version: (.*)[^\\n]/g)
    ?.join('');
  const expectedVersion = versionSubstring
    ?.match(/[^Version: ](.*)[^\\n]/g)
    ?.join('')
    .trim();
  if (messageToBeValidatedWith.test(messageToBeValidated)) {
    return { message: SignMessageValidationType.VALID };
  } else {
    if (currentVersion !== expectedVersion) {
      return { message: SignMessageValidationType.NEEDS_UPDATE };
    } else {
      return { message: SignMessageValidationType.INVALID };
    }
  }
};

export const generateUserInviteLink = () => {
  if (Platform.OS === 'ios') {
    return 'https://apps.apple.com/us/app/cypher-wallet/id1604120414';
  } else if (Platform.OS === 'android') {
    return 'https://play.google.com/store/apps/details?id=com.cypherd.androidwallet';
  }
  return '';
};

export function trimWhitespace(textValue: string) {
  let tempTextValue = textValue.trim();
  tempTextValue = tempTextValue.replace(/\s+/g, ' ');
  return tempTextValue;
}

export function formatToLocalDate(date: string) {
  return moment.utc(date).local().format('MMM DD YYYY, h:mm a');
}

export const parseMonthYear = (dateString: string): string => {
  if (dateString) {
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' })
      .format;
    const date = new Date(dateString);
    return `${monthName(date)} ${date.getFullYear()}`;
  }
  return '';
};

export function extractErrorMessage(errorMessage: string): {
  code: number;
  message: string;
} {
  const regexCode = /"code":\s*(\d+)/;
  const regexMessage = /"message":\s*"([^"]+)"/;

  const codeMatch: RegExpExecArray | null = regexCode.exec(errorMessage);
  const messageMatch: RegExpExecArray | null = regexMessage.exec(errorMessage);

  const code: number = codeMatch && codeMatch[1] ? parseInt(codeMatch[1]) : -1;
  const message: string =
    messageMatch && messageMatch[1] ? messageMatch[1] : errorMessage;

  return { code, message };
}

export async function setTimeOutNSec<T>(
  timeOutDuration: number,
  returnData?: T | undefined,
) {
  return await new Promise<T | undefined>(resolve => {
    setTimeout(() => {
      resolve(returnData);
    }, timeOutDuration);
  });
}

export const stripPemHeaders = (pem: string) => {
  const pemHeaderFooterRegex =
    /-----BEGIN [A-Z ]+-----|-----END [A-Z ]+-----|\s+/g;
  return pem.replace(pemHeaderFooterRegex, '');
};

export const generateKeys = async () => {
  try {
    const keyPair = await RSA.generateKeys(4096); // Generate a 2048-bit key pair
    const privateKey = keyPair.private; // Private key in PEM format
    const publicKey = keyPair.public; // Public key in PEM format

    // Convert the public key to base64
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
    return { publicKeyBase64, privateKey };
  } catch (error) {
    // error in genrating keys
  }
};

export const referralLinkAnalytics = async (referralCode: string) => {
  try {
    const payload = {
      referralCode,
      trackId: uuidv4(),
    };
    await axios.post(`${ARCH_HOST}/v1/cards/referral-v2/click`, payload);
  } catch (e) {
    Sentry.captureException(e);
  }
};

export function getCountryObjectById(countryId: string): ICountry | undefined {
  const country = countryMaster.find(
    c =>
      c?.Iso2?.toLowerCase() === countryId.toLowerCase() ||
      c?.Iso3?.toLowerCase() === countryId.toLowerCase(),
  );
  return country;
}

export function getCountryNameById(countryId: string): string | undefined {
  const country = getCountryObjectById(countryId);
  return country?.name ?? '';
}

export function getSymbolFromCurrency(currencyCode: string) {
  if (typeof currencyCode !== 'string') {
    return undefined;
  }

  const code = currencyCode.toUpperCase();

  if (!Object.prototype.hasOwnProperty.call(currencySymbolMap, code)) {
    return undefined;
  }

  return currencySymbolMap[code];
}

export function getChainIconFromChainName(chainName: ChainBackendNames) {
  return ChainNameToChainMapping[chainName].logo_url;
}

export const isEIP1599Chain = (chainName: ChainBackendNames) => {
  return !NON_EIP1599_CHAINS.includes(chainName);
};
