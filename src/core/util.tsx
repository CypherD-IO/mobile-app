/* eslint-disable @typescript-eslint/restrict-plus-operands */
import * as React from 'react';
import { Platform } from 'react-native';
import { CHAIN_ETH, CHAIN_AVALANCHE, CHAIN_POLYGON, CHAIN_BSC, CHAIN_FTM, CHAIN_EVMOS, CHAIN_OPTIMISM, Chain, CHAIN_ARBITRUM, CHAIN_COSMOS, CHAIN_OSMOSIS, CHAIN_JUNO, CHAIN_STARGAZE, ChainBackendNames, EnsCoinTypes, CosmosStakingTokens } from '../constants/server';
import { GlobalStateDef, GlobalContextDef, initialGlobalState } from './globalContext';
import * as Sentry from '@sentry/react-native';
import Toast from 'react-native-toast-message';
import { isIOS } from '../misc/checkers';
import countryMaster from '../../assets/datasets/countryMaster';
import Clipboard from '@react-native-clipboard/clipboard';
import { find } from 'lodash';
import Web3 from 'web3';
import { isCosmosAddress } from '../containers/utilities/cosmosSendUtility';
import { isOsmosisAddress } from '../containers/utilities/osmosisSendUtility';
import { isJunoAddress } from '../containers/utilities/junoSendUtility';
import { isStargazeAddress } from '../containers/utilities/stargazeSendUtility';
import { ActivityContextDef } from '../reducers/activity_reducer';
import { isEvmosAddress } from '../containers/utilities/evmosSendUtility';

// const {showModal, hideModal} = useGlobalModalContext()

export const HdWalletContext = React.createContext(null);
export const PortfolioContext = React.createContext(null);
export const StakingContext = React.createContext(null);
export const ActivityContext = React.createContext<ActivityContextDef | null>(null);

export const IOS = 'ios';
export const ANDROID = 'android';
export const CYPHERD_SEED_PHRASE_KEY = 'CypherD_SPK';
export const CYPHERD_ROOT_DATA = 'CypherD_Root';
export const IMPORTING = 'IMPORTING';
export const _NO_CYPHERD_CREDENTIAL_AVAILABLE_ = '_NO_CYPHERD_CREDENTIAL_AVAILABLE_';

export const PIN_AUTH = 'pin_auth';

export const getPlatform = () => {
  return Platform.OS;
};

export const getPlatformVersion = () => {
  return Platform.Version;
};

export function getExplorerUrl(chainSymbol: string, chainName: string, hash: string) {
  switch (chainSymbol) {
    case CHAIN_ETH.symbol:
      if (chainName === CHAIN_ARBITRUM.name) {
        return `https://arbiscan.io/tx/${hash}`;
      } else if (chainName === CHAIN_OPTIMISM.name) {
        return `https://optimistic.etherscan.io/tx/${hash}`;
      }
      return `https://etherscan.io/tx/${hash}`;
    case CHAIN_AVALANCHE.symbol:
      return `https://explorer.avax.network/tx/${hash}`;
    case CHAIN_BSC.symbol:
      return `https://bscscan.com/tx/${hash}`;
    case CHAIN_POLYGON.symbol:
      return `https://polygonscan.com/tx/${hash}`;
    case CHAIN_FTM.symbol:
      return `https://ftmscan.com/tx/${hash}`;
    case CHAIN_EVMOS.symbol:
      return `https://escan.live/tx/${hash}`;
    case CHAIN_COSMOS.symbol:
      return `https://www.mintscan.io/cosmos/txs/${hash}`;
    case CHAIN_OSMOSIS.symbol:
      return `https://www.mintscan.io/osmosis/txs/${hash}`;
    case CHAIN_JUNO.symbol:
      return `https://www.mintscan.io/juno/txs/${hash}`;
    case CHAIN_STARGAZE.symbol:
      return `https://www.mintscan.io/stargaze/txs/${hash}`;
  }
}
export function getNftExplorerUrl(chain_symbol: string, contractAddress: string, id: string) {
  switch (chain_symbol) {
    case CHAIN_ETH.backendName:
      return `https://opensea.io/assets/ethereum/${contractAddress}/${id}`;
    case CHAIN_POLYGON.backendName:
      return `https://opensea.io/assets/matic/${contractAddress}/${id}`;
    case CHAIN_EVMOS.backendName:
      return `https://www.orbitmarket.io/nft/${contractAddress}/${id}`;
    case CHAIN_AVALANCHE.backendName:
      return `https://explorer.avax.network/address/${contractAddress}`;
    case CHAIN_BSC.backendName:
      return `https://bscscan.com/address/${contractAddress}`;
    case CHAIN_ARBITRUM.backendName:
      return `https://arbitrum.nftscan.com/${contractAddress}`;
    case CHAIN_FTM.backendName:
      return `https://ftmscan.com/address/${contractAddress}`;
    case CHAIN_OPTIMISM.backendName:
      return `https://optimistic.etherscan.io/address/${contractAddress}`;
    case CHAIN_STARGAZE.backendName:
      return `https://www.stargaze.zone/media/${contractAddress}/${id}`;
    default:
      return `https://etherscan.io/address/${contractAddress}`;
  }
}

export const TARGET_CARD_EVM_WALLET_ADDRESS = '0x';
export const TARGET_CARD_COSMOS_WALLET_ADDRESS = '0x';
export const TARGET_CARD_EVMOS_WALLET_ADDRESS = '0x';
export const TARGET_CARD_EVMOS_WALLET_CORRESPONDING_EVM_ADDRESS = '0x';
export const TARGET_CARD_OSMOSIS_WALLET_ADDRESS = '0x';
export const TARGET_CARD_JUNO_WALLET_ADDRESS = '0x';
export const TARGET_CARD_STARGAZE_WALLET_ADDRESS = '0x';

export const TARGET_BRIDGE_EVM_WALLET_ADDRESS = '0x';
export const TARGET_BRIDGE_COSMOS_WALLET_ADDRESS = '0x';
export const TARGET_BRIDGE_OSMOSIS_WALEET_ADDRESS = '0x';
export const TARGET_BRIDGE_EVMOS_WALLET_ADDRESS = '0x';
export const TARGET_BRIDGE_JUNO_WALLET_ADDRESS = '0x';
export const TARGET_BRIDGE_STARGAZE_WALLET_ADDRESS = '0x';

export function getWeb3Endpoint(selectedChain: Chain, context): string {
  try {
    if (context) {
      const globalStateCasted: GlobalStateDef = (context as unknown as GlobalContextDef).globalState;
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
      position: 'bottom'
    });
    return false;
  }
};

export const convertFromUnitAmount = (amount: string, decimal: number, decimalPlaces: number = 3) => {
  return (parseFloat(amount) * (10 ** -decimal)).toFixed(decimalPlaces);
};

export const convertNumberToShortHandNotation = n => {
  if (n < 1e3) return n;
  if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
  if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
  if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
  if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
};

// removes the extra decimal places and only returns the amount with the tokens contract decimals
export const convertAmountOfContractDecimal = (amount: string, decimal: number = 18): string => {
  return [amount.split('.')[0], amount.split('.')[1]?.slice(0, decimal) ? amount.split('.')[1].slice(0, decimal) : '0'].join('.');
};

export const isValidEmailID = (email: string): boolean => {
  const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return pattern.test(String(email).toLowerCase());
};

export const isValidSSN = (ssn: string): boolean => {
  const SSN_BLACKLIST = ['078051120', '219099999', '457555462'];
  const SSN_WHITELIST = ['999999999'];

  const SSN_REGEX = /^(?!666|000|9\d{2})\d{3}[- ]{0,1}(?!00)\d{2}[- ]{0,1}(?!0{4})\d{4}$/;
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

export const convertToEvmosFromAevmos = (aevmos) => {
  return parseFloat(aevmos) * 10 ** -18;
};

export const isBigIntZero = (num: BigInt): Boolean => {
  return num === BigInt(0);
};

export const getTimeForDate = (d: Date): { hours: string, minutes: string, seconds: string } => {
  const hours: number | string = 18 - d.getUTCHours() >= 0 ? 18 - d.getUTCHours() : 23 - (d.getUTCHours() - 19);
  const min: number | string = 60 - d.getUTCMinutes() - 1;
  const sec: number | string = 60 - d.getUTCSeconds();
  return { hours: hours < 10 ? '0' + hours.toString() : hours.toString(), minutes: min < 10 ? '0' + min.toString() : min.toString(), seconds: sec < 10 ? '0' + sec.toString() : sec.toString() };
};

export const shuffleSeedPhrase = (array: []): [] => {
  let currentIndex = array.length;
  let randomIndex;

  // While there are remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
};

export const sortJSONArrayByKey = (array, key): [] => {
  return array.sort((a, b) => {
    const x = a[key];
    const y = b[key];
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });
};

export const concatErrorMessagesFromArray = (array: []): string => {
  return array.map((messageObject) => messageObject.message).join('.');
};

export const concatErrorMessagesFromArrayOneByOne = (array: []) => {
  return array.map((messageObject) => messageObject.message).join('\n');
};

export const isAutoFillSupported = (): boolean => {
  const majorVersionIOS = parseInt(String(Platform.Version), 10);
  return (isIOS() && majorVersionIOS >= 12);
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
  };
  return res.join('');
};

export const removeSolidProhibitedCountriesFromCountryMaster = () => {
  const prohibitedCountries = ['Albania', 'Bosnia', 'Belarus', 'Burundi', 'Africa', 'Croatia', 'Cuba', 'Cyprus', 'Korea', 'Congo', 'Iran', 'Iraq', 'Lebanon', 'Libya', 'Macedonia', 'Montenegro', 'Nigeria', 'Pakistan', 'Russia', 'Serbia', 'Slovenia', 'Somalia', 'Sudan', 'Syria', 'Turkey', 'Ukraine', 'Venezuela', 'Yemen', 'Zimbabwe'];
  const allowedCountries = countryMaster.filter(country =>
    prohibitedCountries.every(prohibitedCountry => !country.name.toLowerCase().includes(prohibitedCountry.toLowerCase())));
  return allowedCountries;
};

export const isAddressSet = (address: string) => {
  return address !== undefined && address !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_ && address !== IMPORTING;
};

export function copyToClipboard(text: string) {
  Clipboard.setString(text);
}

export const getNativeTokenBalance = (tokenSymbol: string, chainHoldings: any) => {
  const nativeToken = find(chainHoldings, { symbol: tokenSymbol });
  const balance = nativeToken ? nativeToken.actualBalance : 0;
  return balance;
};

export function getSendAddressFieldPlaceholder(chainName: string, backendName: string) {
  if (chainName === 'ethereum') {
    return Object.keys(EnsCoinTypes).includes(backendName) ? 'Enter ethereum address (0x...)  or ens domain' : 'Enter ethereum address (0x...)';
  } else if (chainName === 'evmos') {
    return Object.keys(EnsCoinTypes).includes(ChainBackendNames.ETH) ? 'Enter evmos address (evmos...) / ethereum address (0x...) / ens domain' : 'Enter evmos address (evmos...) or ethereum address (0x...)';
  } else {
    return `Enter ${chainName} address`;
  }
}

export async function sleepFor(milliseconds: number) {
  return await new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), milliseconds);
  });
}

export function isValidEns(domain: string) {
  const ensReg = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/ig;
  return ensReg.test(domain);
}

export function getMaskedAddress(address: string, maskLength: number = 6) {
  let prefixLength = 2;
  const len = address.length;
  if (Web3.utils.isAddress(address)) {
    prefixLength = 2; // length of 0x
  } else if (isCosmosAddress(address)) {
    prefixLength = 6;
  } else if (isOsmosisAddress(address) || isJunoAddress(address)) {
    prefixLength = 4;
  } else if (isStargazeAddress(address)) {
    prefixLength = 5;
  } else {
    prefixLength = 0;
  }
  return `${address.slice(0, prefixLength + maskLength)}...${address.slice(len - maskLength, len)}`;
}

export function SendToAddressValidator(chainName: string | undefined, backendName: string | undefined, address: string | undefined) {
  if (chainName && backendName && address) {
    switch (chainName) {
      case CHAIN_ETH.chainName:
        return Object.keys(EnsCoinTypes).includes(backendName) ? (Web3.utils.isAddress(address) || isValidEns(address)) : Web3.utils.isAddress(address);
      case CHAIN_EVMOS.chainName:
        return isEvmosAddress(address) || (Object.keys(EnsCoinTypes).includes(ChainBackendNames.ETH) ? (Web3.utils.isAddress(address) || isValidEns(address)) : Web3.utils.isAddress(address));
      case CHAIN_COSMOS.chainName:
        return isCosmosAddress(address);
      case CHAIN_OSMOSIS.chainName:
        return isOsmosisAddress(address);
      case CHAIN_JUNO.chainName:
        return isJunoAddress(address);
      case CHAIN_STARGAZE.chainName:
        return isStargazeAddress(address);
      default:
        return false;
    }
  }
  return false;
}

export function limitDecimalPlaces(num: string | number, decimalPlaces: number) {
  num = String(num);
  return num.includes('.') ? num.slice(0, num.indexOf('.') + (decimalPlaces + 1)) : num;
}

export const isBasicCosmosChain = (backendName: string) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(backendName);

export const isEvmosChain = (backendName: string) => ChainBackendNames.EVMOS === backendName;

export const isCosmosChain = (backendName: string) => isBasicCosmosChain(backendName) || isEvmosChain(backendName);

export const isCosmosStakingToken = (chain: string, tokenData: any) => tokenData.chainDetails.backendName === ChainBackendNames[chain as ChainBackendNames] && tokenData.name === CosmosStakingTokens[chain as CosmosStakingTokens];

export const isACosmosStakingToken = (tokenData: any) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE].some(chain => isCosmosStakingToken(chain as string, tokenData));

export const isABasicCosmosStakingToken = (tokenData: any) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].some(chain => isCosmosStakingToken(chain as string, tokenData));

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
    return `$${Math.floor(price / 1000000000000)} Trillion`;
  }
  if (price > 1000000000) {
    return `$${Math.floor(price / 1000000000)} Billion`;
  }
  if (price > 1000000) {
    return `$${Math.floor(price / 1000000)} Million`;
  }
  if (price > 1000) {
    return `$${Math.floor(price / 1000)} K`;
  }
  return `$${price}`;
};
