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
  CHAIN_NOBLE,
  ChainBackendNames,
  EnsCoinTypes,
  NativeTokenMapping,
  CHAIN_ZKSYNC_ERA,
  CHAIN_BASE,
  CHAIN_COLLECTION,
  EVM_CHAINS,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_SOLANA,
  NON_EIP1599_CHAINS,
  CHAIN_BASE_SEPOLIA,
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
import { find, get, isEmpty, omit } from 'lodash';
import { isCosmosAddress } from '../containers/utilities/cosmosSendUtility';
import { isOsmosisAddress } from '../containers/utilities/osmosisSendUtility';
import { isNobleAddress } from '../containers/utilities/nobleSendUtility';

import { ActivityContextDef } from '../reducers/activity_reducer';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { t } from 'i18next';
import {
  AnalyticsType,
  CardProviders,
  CardTransactionTypes,
  CypherPlanId,
  ReapTxnStatus,
  EcosystemsEnum,
  SignMessageValidationType,
} from '../constants/enum';
import {
  ErrorAnalytics,
  SuccessAnalytics,
} from '../models/analytics.interface';
import {
  ANALYTICS_ERROR_URL,
  ANALYTICS_SUCCESS_URL,
  chainExplorerMapping,
  ChainNameToChainMapping,
  MINIMUM_TRANSFER_AMOUNT_ETH,
  MINIMUM_TRANSFER_AMOUNT_HL_SPOT,
} from '../constants/data';
import DeviceInfo from 'react-native-device-info';
import axios from './Http';
import { Holding, IHyperLiquidHolding } from './portfolio';
import Long from 'long';
import { isCoreumAddress } from '../containers/utilities/coreumUtilities';
import { isInjectiveAddress } from '../containers/utilities/injectiveUtilities';
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
import { Common, Hardfork } from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';
import crypto from 'crypto';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CardProfile } from '../models/cardProfile.model';
import { CardDesign } from '../models/cardDesign.interface';
import { CYPHER_CARD_IMAGES } from '../../assets/images/appImages';
import { Card, ICardTransaction } from '../models/card.model';

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
    case ChainBackendNames.ARBITRUM:
      return `https://arbiscan.io/tx/${hash}`;
    case ChainBackendNames.OPTIMISM:
      return `https://optimistic.etherscan.io/tx/${hash}`;
    case ChainBackendNames.BASE:
      return `https://basescan.org/tx/${hash}`;
    case ChainBackendNames.ZKSYNC_ERA:
      return `https://www.oklink.com/zksync/tx/${hash}`;
    case ChainBackendNames.COSMOS:
      return `https://www.mintscan.io/cosmos/txs/${hash}`;
    case ChainBackendNames.OSMOSIS:
      return `https://www.mintscan.io/osmosis/txs/${hash}`;
    case ChainBackendNames.NOBLE:
      return `https://www.mintscan.io/noble/txs/${hash}`;
    case ChainBackendNames.COREUM:
      return `https://www.mintscan.io/coreum/txs/${hash}`;
    case ChainBackendNames.INJECTIVE:
      return `https://www.mintscan.io/injective/txs/${hash}`;
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
    case CHAIN_ARBITRUM.chainIdNumber.toString():
      return `https://arbiscan.io/tx/${hash}`;
    case CHAIN_OPTIMISM.chainIdNumber.toString():
      return `https://optimistic.etherscan.io/tx/${hash}`;
    case CHAIN_BASE.chainIdNumber.toString():
      return `https://basescan.org/tx/${hash}`;
    case CHAIN_ZKSYNC_ERA.chainIdNumber.toString():
      return `https://www.oklink.com/zksync/tx/${hash}`;
    case CHAIN_COSMOS.chain_id:
      return `https://www.mintscan.io/cosmos/txs/${hash}`;
    case CHAIN_OSMOSIS.chain_id:
      return `https://www.mintscan.io/osmosis/txs/${hash}`;
    case CHAIN_NOBLE.chain_id:
      return `https://www.mintscan.io/noble/txs/${hash}`;
    case CHAIN_COREUM.chain_id:
      return `https://www.mintscan.io/coreum/txs/${hash}`;
    case CHAIN_INJECTIVE.chain_id:
      return `https://www.mintscan.io/injective/txs/${hash}`;
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
        return `https://basescan.org/tx/${hash}`;
      } else if (chainName === CHAIN_BASE_SEPOLIA.name) {
        return `https://sepolia.basescan.org/tx/${hash}`;
      }
      return `https://etherscan.io/tx/${hash}`;
    case CHAIN_AVALANCHE.symbol:
      return `https://explorer.avax.network/tx/${hash}`;
    case CHAIN_BSC.symbol:
      return `https://bscscan.com/tx/${hash}`;
    case CHAIN_POLYGON.symbol:
      return `https://polygonscan.com/tx/${hash}`;
    case CHAIN_COSMOS.symbol:
    case NativeTokenMapping.COSMOS:
      return `https://www.mintscan.io/cosmos/txs/${hash}`;
    case CHAIN_OSMOSIS.symbol:
      return `https://www.mintscan.io/osmosis/txs/${hash}`;
    case CHAIN_NOBLE.symbol:
      return `https://www.mintscan.io/noble/txs/${hash}`;
    case CHAIN_COREUM.symbol:
      return `https://www.mintscan.io/coreum/txs/${hash}`;
    case CHAIN_INJECTIVE.symbol:
      return `https://www.mintscan.io/injective/txs/${hash}`;
    case CHAIN_SOLANA.symbol:
      return `https://solscan.io/tx/${hash}`;
  }
}

export function getExplorerUrlFromChainName(chainName: string, hash: string) {
  const sanitizedHash = hash.replace(/[^a-zA-Z0-9]/g, '');
  return chainExplorerMapping[chainName] + sanitizedHash;
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
    case CHAIN_NOBLE.backendName:
      return `https://noblescan.com/address/${contractAddress}`;
    default:
      return `https://etherscan.io/address/${contractAddress}`;
  }
}

export function getWeb3Endpoint(
  selectedChain: Chain,
  context: GlobalContextDef,
): string {
  const chainBackendName =
    selectedChain.backendName === ChainBackendNames.HYPERLIQUID
      ? ChainBackendNames.ARBITRUM
      : selectedChain.backendName;
  try {
    if (context) {
      const globalStateCasted: GlobalStateDef = (
        context as unknown as GlobalContextDef
      ).globalState;
      return globalStateCasted?.rpcEndpoints?.[chainBackendName]?.primary ?? '';
    }
  } catch (e) {
    Sentry.captureException(e);
  }
  return initialGlobalState?.rpcEndpoints?.[chainBackendName]?.primary ?? '';
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
  return address !== undefined && address !== IMPORTING;
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
  } else if (isOsmosisAddress(address)) {
    prefixLength = 4;
  } else if (isNobleAddress(address)) {
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
      case CHAIN_NOBLE.chainName:
        return isNobleAddress(address);
      case CHAIN_COREUM.chainName:
        return isCoreumAddress(address);
      case CHAIN_INJECTIVE.chainName:
        return isInjectiveAddress(address);
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
    if (isNobleAddress(address)) return 'noble';
    if (isCoreumAddress(address)) return 'coreum';
    if (isInjectiveAddress(address)) return 'injective';
    if (isSolanaAddress(address)) return 'solana';
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
    ChainBackendNames.NOBLE,
    ChainBackendNames.COREUM,
    ChainBackendNames.INJECTIVE,
  ].includes(backendName);

export const isCosmosChain = (backendName: string) =>
  isBasicCosmosChain(backendName);

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
    case 'noble':
      blockchain = CHAIN_NOBLE;
      break;
    case 'coreum':
      blockchain = CHAIN_COREUM;
      break;
    case 'injective':
      blockchain = CHAIN_INJECTIVE;
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
  if (DeviceInfo.isEmulatorSync()) {
    return;
  }
  const { type } = params;
  switch (type) {
    case AnalyticsType.SUCCESS: {
      const { chain, txnHash, contractData, address, quoteId, connectionType } =
        params as SuccessAnalytics;
      const data = {
        chain,
        txnHash,
        other: {
          ...(contractData ? { contractData } : {}),
          ...(address ? { address } : {}),
          ...(quoteId ? { quoteId } : {}),
          ...(connectionType ? { connectionType } : {}),
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
        other,
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
          ...(other ? { other } : {}),
        },
      };
      void axios.post(ANALYTICS_ERROR_URL, data);
      break;
    }
  }
}

export function parseErrorMessage(error: any): string {
  // Case 1: Axios/HTTP error response object
  const errorObj = error;
  if (errorObj?.response?.data) {
    // Handle various API error response formats
    const { data } = errorObj.response;

    // Case 2a: { message: string }
    if (typeof data.message === 'string') {
      return data.message;
    }

    // Case 2b: { error: string }
    if (typeof data.error === 'string') {
      return data.error;
    }

    // Case 2c: { errors: string[] }
    if (Array.isArray(data.errors)) {
      return data.errors.join(', ');
    }

    // Case 2d: Nested error messages
    if (data.error?.message) {
      return data.error.message;
    }

    // Case 2e: If data itself is a string
    if (typeof data === 'string') {
      return data;
    }

    // Case 2f: Try to stringify the data object
    try {
      return JSON.stringify(data);
    } catch {
      // If stringification fails, continue to other cases
    }
  }

  // Case 3: Error instance
  if (error instanceof Error) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  // Case 3: Simple string conversion possible
  if (`${error}` !== '[object Object]') {
    return `${error}`;
  }

  // Case 4: Complex object that needs stringification
  try {
    const errorString = JSON.stringify(
      error,
      (key, value) => {
        if (typeof value === 'function') {
          return 'Function';
        }
        if (typeof value === 'undefined') {
          return 'undefined';
        }
        return value;
      },
      2,
    );

    if (errorString !== '{}') {
      return errorString;
    }
  } catch {
    // If JSON.stringify fails, fall through to default
  }

  // Case 5: Default fallback
  return 'Unknown Error';
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
  } else if (isNobleAddress(address)) {
    return ChainBackendNames.NOBLE;
  } else if (isCoreumAddress(address)) {
    return ChainBackendNames.COREUM;
  } else if (isInjectiveAddress(address)) {
    return ChainBackendNames.INJECTIVE;
  } else if (isSolanaAddress(address)) {
    return ChainBackendNames.SOLANA;
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

export function addHexPrefix(value: string): `0x${string}` {
  if (!value.startsWith('0x')) {
    return `0x${value}`;
  }
  return value as `0x${string}`;
}

export function isValidPrivateKey(privateKey: string): boolean {
  try {
    const wallet = privateKeyToAccount(addHexPrefix(privateKey));
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
  const { ethereum, solana, cosmos, osmosis, noble, coreum, injective } =
    hdWallet.state.wallet;
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
  if (get(noble.wallets, noble.currentIndex)?.address) {
    availableChains.push(CHAIN_NOBLE);
  }
  if (get(coreum.wallets, coreum.currentIndex)?.address) {
    availableChains.push(CHAIN_COREUM);
  }
  if (get(injective.wallets, injective.currentIndex)?.address) {
    availableChains.push(CHAIN_INJECTIVE);
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
): { hasSufficientBalance: boolean; hasSufficientGasFee: boolean } => {
  const hasSufficientGasFee = DecimalHelper.isLessThanOrEqualTo(
    gasFeeEstimation,
    nativeTokenBalance,
  );
  if (DecimalHelper.isLessThan(sentAmount, 0)) {
    return { hasSufficientBalance: false, hasSufficientGasFee: false };
  }
  const hasSufficientBalance = isNativeToken
    ? DecimalHelper.isLessThanOrEqualTo(
        DecimalHelper.add(sentAmount, gasFeeEstimation),
        sendingTokenBalance,
      )
    : DecimalHelper.isLessThanOrEqualTo(sentAmount, sendingTokenBalance);
  return { hasSufficientBalance, hasSufficientGasFee };
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
  ecosystem: EcosystemsEnum = EcosystemsEnum.EVM,
) => {
  const messageToBeValidatedWith =
    ecosystem === EcosystemsEnum.EVM
      ? /^Cypher Wallet wants you to sign in with your Ethereum account: \nAddress: 0x[a-fA-F0-9]{40} \n\nBy signing this transaction you are allowing Cypher Wallet to see the following: \n\nYour wallet address: 0x[a-fA-F0-9]{40} \nSessionId: [0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12} \nVersion: 1.0 \n\nPlease sign this message to authenticate. \nThis is a proof that you own this account. \nThis will not consume any gas.$/i
      : /^Cypher Wallet wants you to sign in with your Solana account: \nAddress: [1-9A-HJ-NP-Za-km-z]{32,44} \n\nBy signing this transaction you are allowing Cypher Wallet to see the following: \n\nYour wallet address: [1-9A-HJ-NP-Za-km-z]{32,44} \nSessionId: [0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12} \nVersion: 1.0 \n\nPlease sign this message to authenticate. \nThis is a proof that you own this account. \nThis will not consume any gas.$/i;
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

export const generateSessionId = async (pem: string, secret?: string) => {
  if (!pem) throw new Error('pem is required');
  if (secret && !/^[0-9A-Fa-f]+$/.test(secret)) {
    throw new Error('secret must be a hex string');
  }

  const secretKey = secret ?? uuidv4().replace(/-/g, '');
  const secretKeyBase64 = Buffer.from(secretKey, 'hex').toString('base64');
  const secretKeyBase64Buffer = Buffer.from(secretKeyBase64, 'utf-8');
  const secretKeyBase64BufferEncrypted = crypto.publicEncrypt(
    {
      key: pem,
      padding: 4, // crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    secretKeyBase64Buffer,
  );

  return {
    secretKey,
    sessionId: secretKeyBase64BufferEncrypted.toString('base64'),
  };
};

export const encryptPin = async ({
  pin,
  sessionKey,
  sessionId,
}: {
  pin: string;
  sessionKey: string;
  sessionId: string;
}) => {
  const formattedPin = `2${pin.length.toString(16)}${pin}${'F'.repeat(14 - pin.length)}`;

  // Convert sessionKey from hex to Buffer
  const keyBytes = Buffer.from(sessionKey, 'hex');

  const iv = crypto.randomBytes(16);

  // Encrypt using AES-256-GCM
  const cipher = crypto.createCipheriv('aes-128-gcm', keyBytes, iv);
  let encrypted = cipher.update(formattedPin, 'utf8'); // Encrypted part
  encrypted = Buffer.concat([encrypted, cipher.final()]); // Finalize encryption
  const tag = cipher.getAuthTag(); // Authentication tag

  // Concatenate the encrypted data (ciphertext) and tag
  const result = Buffer.concat([encrypted, tag]);

  // Encode the result (ciphertext + tag) in base64
  const encryptedPin = result.toString('base64'); // Final encrypted PIN to send to API

  return {
    encryptedPin,
    encodedIv: iv.toString('base64'),
    sessionId,
  };
};

export const decryptWithSecretKey = (
  secretKey: string,
  base64Secret: string,
  base64Iv: string,
) => {
  if (!base64Secret) throw new Error('base64Secret is required');
  if (!base64Iv) throw new Error('base64Iv is required');
  if (!secretKey || !/^[0-9A-Fa-f]+$/.test(secretKey)) {
    throw new Error('secretKey must be a hex string');
  }

  const secret = Buffer.from(base64Secret, 'base64');
  const iv = Buffer.from(base64Iv, 'base64');
  const secretKeyBuffer = Buffer.from(secretKey, 'hex');

  const authTag = secret.slice(secret.length - 16); // Assuming the last 16 bytes are the auth tag
  const encryptedData = secret.slice(0, secret.length - 16);

  // Create decipher
  const cryptoKey = crypto.createDecipheriv('aes-128-gcm', secretKeyBuffer, iv);
  cryptoKey.setAuthTag(authTag); // Set the authentication tag

  const decrypted = Buffer.concat([
    cryptoKey.update(encryptedData),
    cryptoKey.final(),
  ]);

  return decrypted.toString('utf-8');
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
  return {
    ...country,
    flag: country?.unicode_flag,
  };
}

export function getCountryObjectByDialCode(
  dialCode: string,
): ICountry | undefined {
  const country = countryMaster.find(c => c?.dial_code === dialCode);
  return {
    ...omit(country, ['dial_code']),
    dialCode: country?.dial_code,
  };
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

function buildTxParams(txParams) {
  return {
    ...omit(txParams, 'gas'),
    gasLimit: txParams.gas,
  };
}

function buildTransactionCommon(txMeta) {
  // This produces a transaction whose information does not completely match an
  // Optimism transaction — for instance, DEFAULT_CHAIN is still 'mainnet' and
  // genesis points to the mainnet genesis, not the Optimism genesis — but
  // considering that all we want to do is serialize a transaction, this works
  // fine for our use case.
  return Common.custom({
    chainId: Number(txMeta.chainId),
    // Optimism only supports type-0 transactions; it does not support any of
    // the newer EIPs since EIP-155. Source:
    // <https://github.com/ethereum-optimism/optimism/blob/develop/specs/l2geth/transaction-types.md>
    defaultHardfork: Hardfork.SpuriousDragon,
  });
}

export default function buildUnserializedTransaction(txMeta) {
  const txParams = buildTxParams(txMeta);
  const common = buildTransactionCommon(txMeta);
  return TransactionFactory.fromTxData(txParams, { common });
}

export const getViemPublicClient = (rpc: string) => {
  return createPublicClient({
    transport: http(rpc),
  });
};

export const isRainReferralCode = (referralCode: string) => {
  return referralCode.endsWith('RA');
};

// show the get physical card in stack if it is their first plastic physical card alone
export const shouldShowGetPhysicalCardInStack = (
  profile: CardProfile,
  cardDesignAndFeeData: CardDesign,
) => {
  if (
    (get(profile, ['planInfo', 'planId'], '') === CypherPlanId.PRO_PLAN &&
      // cardDesignAndFeeData?.allowedCount?.physical === 3 &&
      cardDesignAndFeeData?.allowedCount?.physical > 0 &&
      // cardDesignAndFeeData?.allowedCount?.metal === 0) ||
      cardDesignAndFeeData?.allowedCount?.metal > 0) ||
    (get(profile, ['planInfo', 'planId'], '') === CypherPlanId.BASIC_PLAN &&
      // cardDesignAndFeeData?.allowedCount?.physical === 1
      cardDesignAndFeeData?.allowedCount?.physical > 0)
  ) {
    return true;
  }
  return false;
};

export const getCardImage = (card: Card, provider: CardProviders) => {
  if (!card || !card.type) {
    return undefined;
  }

  if (provider === CardProviders.REAP_CARD) {
    const cardImage = `${CYPHER_CARD_IMAGES}/${card.type}-${card.designId ?? ''}.png`;
    return {
      uri: cardImage,
    };
  }
};

export const toBase64 = (bytes: Uint8Array): string => {
  return Buffer.from(bytes).toString('base64');
};

export function isPotentiallyDccOvercharged(txn: ICardTransaction): boolean {
  const country = txn.metadata?.merchant?.merchantCountry;
  return (
    Boolean(country) &&
    country !== 'US' &&
    !isEmpty(country) &&
    !txn.fxCurrencySymbol &&
    txn.type === CardTransactionTypes.DEBIT &&
    txn.tStatus !== ReapTxnStatus.DECLINED &&
    txn.amount !== 0 &&
    txn.channel !== 'ECOMMERCE'
  );
}

// Format currency with K, M, B suffixes
export const formatCurrencyWithSuffix = (value: number): string => {
  if (value == null || isNaN(value)) return '0';
  if (value < 0) return `-${formatCurrencyWithSuffix(Math.abs(value))}`;
  if (value >= 1000000000) {
    return `${Math.round((value / 1000000000) * 10) / 10}B`;
  }
  if (value >= 1000000) {
    return `${Math.round((value / 1000000) * 10) / 10}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return `${value}`;
};

export const getMinimumCardLoadAmount = (
  tokenData: Holding | IHyperLiquidHolding | undefined,
) => {
  // hyperliquid spot account $15
  // eth $50
  // all other $10

  return tokenData?.accountType === 'spot'
    ? MINIMUM_TRANSFER_AMOUNT_HL_SPOT
    : tokenData?.chainDetails?.backendName === CHAIN_ETH.backendName
      ? MINIMUM_TRANSFER_AMOUNT_ETH
      : 10;
};

export const extractAddressFromURI = (content: string): string => {
  try {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const trimmedContent = content.trim();
    let extractedAddress = '';

    // Handle ethereum: URI scheme (e.g., ethereum:0xBd1cD305900424CD4fAd1736a2B4d118c7CA935D@9001)
    if (trimmedContent.startsWith('ethereum:')) {
      const ethereumRegex = /(\b0x[a-fA-F0-9]{40}\b)/g;
      const matches = trimmedContent.match(ethereumRegex);
      extractedAddress = matches && matches.length > 0 ? matches[0] : '';
    }
    // Handle solana: URI scheme (e.g., solana:7ZSvadKmLuxp6Hr9wDFSDKVMyhScDbau7aReDEM3ET5h)
    else if (trimmedContent.startsWith('solana:')) {
      // Solana addresses are base58-encoded, 32-44 characters, excluding 0, O, I, l
      const solanaRegex = /(\b[1-9A-HJ-NP-Za-km-z]{32,44}\b)/g;
      const matches = trimmedContent.match(solanaRegex);
      extractedAddress = matches && matches.length > 0 ? matches[0] : '';
    }

    // Handle other URI schemes or plain addresses
    else {
      extractedAddress = trimmedContent;
    }

    // Final validation to ensure we have a non-empty result
    if (!extractedAddress) {
      return '';
    }

    return extractedAddress;
  } catch (error) {
    return '';
  }
};
