/**
 * Unit tests for card utilities, country/currency lookups, and misc helpers in util.tsx.
 */

// ─── Mocks (must come before imports) ───
jest.mock('../../constants/server', () => ({
  ChainBackendNames: { ETH: 'ethereum', COSMOS: 'cosmos', OSMOSIS: 'osmosis', NOBLE: 'noble', COREUM: 'coreum', INJECTIVE: 'injective', SOLANA: 'solana', BSC: 'bsc', POLYGON: 'polygon', AVALANCHE: 'avalanche', ARBITRUM: 'arbitrum', OPTIMISM: 'optimism', BASE: 'base', ZKSYNC_ERA: 'zksync_era', HYPERLIQUID: 'hyperliquid' },
  CHAIN_ETH: { chainName: 'ethereum', symbol: 'ETH', backendName: 'ethereum', chainIdNumber: 1, native_token_address: '0x0000000000000000000000000000000000000000', secondaryAddress: '0xeeee' },
  CHAIN_COSMOS: { chainName: 'cosmos', symbol: 'ATOM' },
  CHAIN_OSMOSIS: { chainName: 'osmosis', symbol: 'OSMO' },
  CHAIN_NOBLE: { chainName: 'noble', symbol: 'USDC' },
  CHAIN_COREUM: { chainName: 'coreum', symbol: 'CORE' },
  CHAIN_INJECTIVE: { chainName: 'injective', symbol: 'INJ' },
  CHAIN_SOLANA: { chainName: 'solana', symbol: 'SOL', chain_id: 'mainnet-beta' },
  CHAIN_BSC: { chainName: 'bsc', symbol: 'BNB' },
  CHAIN_POLYGON: { chainName: 'polygon', symbol: 'MATIC' },
  CHAIN_AVALANCHE: { chainName: 'avalanche', symbol: 'AVAX' },
  CHAIN_ARBITRUM: { chainName: 'arbitrum', name: 'arbitrum', symbol: 'ETH' },
  CHAIN_OPTIMISM: { chainName: 'optimism', name: 'optimism', symbol: 'ETH' },
  CHAIN_BASE: { chainName: 'base', name: 'base', symbol: 'ETH' },
  CHAIN_BASE_SEPOLIA: { name: 'base_sepolia' },
  CHAIN_ZKSYNC_ERA: { chainName: 'zksync_era', name: 'zksync_era', symbol: 'ETH' },
  CHAIN_COLLECTION: {},
  EVM_CHAINS: [],
  NativeTokenMapping: { ethereum: 'ETH', cosmos: 'ATOM', solana: 'SOL' },
  EnsCoinTypes: {},
  NON_EIP1599_CHAINS: [],
}));
jest.mock('../../constants/data', () => ({
  chainExplorerMapping: {},
  ChainNameToChainMapping: {},
  ANALYTICS_ERROR_URL: '',
  ANALYTICS_SUCCESS_URL: '',
  MINIMUM_TRANSFER_AMOUNT_ETH: 50,
  MINIMUM_TRANSFER_AMOUNT_HL_SPOT: 15,
  CypherPlanId: { PRO_PLAN: 'pro', BASIC_PLAN: 'basic' },
  CardType: { PHYSICAL: 'physical', VIRTUAL: 'virtual', METAL: 'metal' },
  CardTransactionTypes: { DEBIT: 'DEBIT', CREDIT: 'CREDIT' },
  ReapTxnStatus: { DECLINED: 'DECLINED' },
  CardProviders: { REAP_CARD: 'reap_card' },
  SolidProhibitedCountries: [],
}));
jest.mock('../globalContext', () => ({ initialGlobalState: { rpcEndpoints: {} } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('../../misc/checkers', () => ({ isIOS: jest.fn(() => false) }));
jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));
jest.mock('../../containers/utilities/cosmosSendUtility', () => ({ isCosmosAddress: jest.fn() }));
jest.mock('../../containers/utilities/osmosisSendUtility', () => ({ isOsmosisAddress: jest.fn() }));
jest.mock('../../containers/utilities/nobleSendUtility', () => ({ isNobleAddress: jest.fn() }));
jest.mock('../../containers/utilities/coreumUtilities', () => ({ isCoreumAddress: jest.fn() }));
jest.mock('../../containers/utilities/injectiveUtilities', () => ({ isInjectiveAddress: jest.fn() }));
jest.mock('../../containers/utilities/solanaUtilities', () => ({ isSolanaAddress: jest.fn() }));
jest.mock('../Http', () => ({ post: jest.fn() }));
jest.mock('react-native-device-info', () => ({ isEmulatorSync: jest.fn(() => true), getVersion: jest.fn(() => '1.0') }));
jest.mock('react-native-rsa-native', () => ({ RSA: { generateKeys: jest.fn() } }));
jest.mock('../../global', () => ({ hostWorker: { getHost: jest.fn(() => '') } }));
jest.mock('web3-validator', () => ({ isAddress: jest.fn(() => false) }));
jest.mock('viem/accounts', () => ({ privateKeyToAccount: jest.fn() }));
jest.mock('viem', () => ({ createPublicClient: jest.fn(), http: jest.fn() }));
jest.mock('@ethereumjs/common', () => ({ Common: jest.fn(), Hardfork: {} }));
jest.mock('@ethereumjs/tx', () => ({ TransactionFactory: {} }));
jest.mock('../../constants/cardColours', () => ({ getCardColorByHex: jest.fn(() => ({ cardImage: 'color_card_image' })) }));
jest.mock('../../../assets/images/appImages', () => ({ CYPHER_CARD_IMAGES: 'https://example.com/cards' }));
jest.mock('../../../assets/datasets/countryMaster', () => ([
  { name: 'United States', Iso2: 'US', Iso3: 'USA', dial_code: '+1', unicode_flag: '🇺🇸' },
  { name: 'United Kingdom', Iso2: 'GB', Iso3: 'GBR', dial_code: '+44', unicode_flag: '🇬🇧' },
  { name: 'India', Iso2: 'IN', Iso3: 'IND', dial_code: '+91', unicode_flag: '🇮🇳' },
  { name: 'Russia', Iso2: 'RU', Iso3: 'RUS', dial_code: '+7', unicode_flag: '🇷🇺' },
  { name: 'Nigeria', Iso2: 'NG', Iso3: 'NGA', dial_code: '+234', unicode_flag: '🇳🇬' },
]));
jest.mock('../../../assets/datasets/currencySymbolMap', () => ({
  currencySymbolMap: { USD: '$', EUR: '€', GBP: '£', INR: '₹' },
}));
jest.mock('react-native-svg', () => ({ SvgUri: 'SvgUri' }));
jest.mock('../../styles/tailwindComponents', () => ({ CyDImage: 'CyDImage' }));
jest.mock('../../reducers/activity_reducer', () => ({}));
jest.mock('../../reducers/hdwallet_reducer', () => ({}));

// ─── Imports ───
import {
  getCountryObjectById,
  getCountryObjectByDialCode,
  getCountryNameById,
  getSymbolFromCurrency,
  getCardImageUri,
  getMinimumCardLoadAmount,
  sortJSONArrayByKey,
  concatErrorMessagesFromArray,
  concatErrorMessagesFromArrayOneByOne,
  validateAmount,
  calculateTime,
  getTimeForDate,
  isNativeCurrency,
  isNativeToken,
  hasSufficientBalanceAndGasFee,
  removeSolidProhibitedCountriesFromCountryMaster,
} from '../util';

// ─── getCountryObjectById ───
describe('getCountryObjectById', () => {
  it('finds country by Iso2 code', () => {
    const result = getCountryObjectById('US');
    expect(result?.name).toBe('United States');
    expect(result?.flag).toBe('🇺🇸');
  });

  it('finds country by Iso3 code', () => {
    const result = getCountryObjectById('GBR');
    expect(result?.name).toBe('United Kingdom');
  });

  it('is case-insensitive', () => {
    const result = getCountryObjectById('us');
    expect(result?.name).toBe('United States');
  });

  it('returns undefined fields for non-existent country', () => {
    const result = getCountryObjectById('ZZ');
    expect(result?.name).toBeUndefined();
  });
});

// ─── getCountryObjectByDialCode ───
describe('getCountryObjectByDialCode', () => {
  it('finds country by dial code', () => {
    const result = getCountryObjectByDialCode('+1');
    expect(result?.name).toBe('United States');
    expect(result?.dialCode).toBe('+1');
  });

  it('renames dial_code to dialCode', () => {
    const result = getCountryObjectByDialCode('+44');
    expect(result?.dialCode).toBe('+44');
    // dial_code should be omitted
    expect((result as any)?.dial_code).toBeUndefined();
  });

  it('returns undefined fields for non-existent dial code', () => {
    const result = getCountryObjectByDialCode('+999');
    expect(result?.name).toBeUndefined();
  });
});

// ─── getCountryNameById ───
describe('getCountryNameById', () => {
  it('returns country name for valid code', () => {
    expect(getCountryNameById('US')).toBe('United States');
  });

  it('returns empty string for unknown code', () => {
    expect(getCountryNameById('ZZ')).toBe('');
  });
});

// ─── getSymbolFromCurrency ───
describe('getSymbolFromCurrency', () => {
  it('returns $ for USD', () => {
    expect(getSymbolFromCurrency('USD')).toBe('$');
  });

  it('returns € for EUR', () => {
    expect(getSymbolFromCurrency('EUR')).toBe('€');
  });

  it('is case-insensitive', () => {
    expect(getSymbolFromCurrency('usd')).toBe('$');
  });

  it('returns undefined for unknown currency', () => {
    expect(getSymbolFromCurrency('XYZ')).toBeUndefined();
  });

  it('returns undefined for non-string input', () => {
    expect(getSymbolFromCurrency(123 as any)).toBeUndefined();
  });
});

// ─── getCardImageUri ───
describe('getCardImageUri', () => {
  it('constructs URI for virtual card', () => {
    const result = getCardImageUri('virtual', 'design1');
    expect(result.uri).toBe('https://example.com/cards/virtual-design1.png');
  });

  it('adds cache-bust for physical card', () => {
    const result = getCardImageUri('physical', 'design2');
    expect(result.uri).toContain('physical-design2.png?t=');
  });

  it('adds cache-bust for metal card', () => {
    const result = getCardImageUri('metal', 'design3');
    expect(result.uri).toContain('metal-design3.png?t=');
  });

  it('handles null designId', () => {
    const result = getCardImageUri('virtual', null as any);
    expect(result.uri).toBe('https://example.com/cards/virtual-.png');
  });
});

// ─── getMinimumCardLoadAmount ───
describe('getMinimumCardLoadAmount', () => {
  it('returns 15 for hyperliquid spot account', () => {
    const tokenData = { accountType: 'spot', chainDetails: { backendName: 'hyperliquid' } } as any;
    expect(getMinimumCardLoadAmount(tokenData)).toBe(15);
  });

  it('returns 50 for ETH chain', () => {
    const tokenData = { chainDetails: { backendName: 'ethereum' } } as any;
    expect(getMinimumCardLoadAmount(tokenData)).toBe(50);
  });

  it('returns 10 for other chains', () => {
    const tokenData = { chainDetails: { backendName: 'polygon' } } as any;
    expect(getMinimumCardLoadAmount(tokenData)).toBe(10);
  });

  it('returns 10 for undefined tokenData', () => {
    expect(getMinimumCardLoadAmount(undefined)).toBe(10);
  });
});

// ─── sortJSONArrayByKey ───
describe('sortJSONArrayByKey', () => {
  it('sorts array of objects by key ascending', () => {
    const arr = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
    const result = sortJSONArrayByKey(arr, 'name');
    expect(result[0].name).toBe('Alice');
    expect(result[1].name).toBe('Bob');
    expect(result[2].name).toBe('Charlie');
  });

  it('sorts numbers', () => {
    const arr = [{ val: 3 }, { val: 1 }, { val: 2 }];
    const result = sortJSONArrayByKey(arr, 'val');
    expect(result.map(x => x.val)).toEqual([1, 2, 3]);
  });

  it('handles empty array', () => {
    expect(sortJSONArrayByKey([], 'key')).toEqual([]);
  });
});

// ─── concatErrorMessagesFromArray ───
describe('concatErrorMessagesFromArray', () => {
  it('joins messages with period', () => {
    const arr = [{ message: 'Error 1' }, { message: 'Error 2' }] as any;
    expect(concatErrorMessagesFromArray(arr)).toBe('Error 1.Error 2');
  });

  it('returns empty string for empty array', () => {
    expect(concatErrorMessagesFromArray([] as any)).toBe('');
  });
});

// ─── concatErrorMessagesFromArrayOneByOne ───
describe('concatErrorMessagesFromArrayOneByOne', () => {
  it('joins messages with newline', () => {
    const arr = [{ message: 'Error 1' }, { message: 'Error 2' }] as any;
    expect(concatErrorMessagesFromArrayOneByOne(arr)).toBe('Error 1\nError 2');
  });
});

// ─── validateAmount ───
describe('validateAmount', () => {
  it('returns true for valid number string', () => {
    expect(validateAmount('123.45')).toBe(true);
  });

  it('returns true for zero', () => {
    expect(validateAmount('0')).toBe(true);
  });

  it('returns false for non-numeric string', () => {
    expect(validateAmount('abc')).toBe(false);
  });

  it('returns true for empty string (Number("") is 0)', () => {
    expect(validateAmount('')).toBe(true);
  });
});

// ─── calculateTime ───
describe('calculateTime', () => {
  it('returns "Sec ago" for recent timestamps', () => {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 30);
    const result = calculateTime(now.toISOString());
    expect(result).toContain('Sec ago');
  });

  it('returns "Min ago" for minutes-old timestamps', () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 5);
    const result = calculateTime(now.toISOString());
    expect(result).toContain('Min ago');
  });

  it('returns "Hr ago" for 1 hour old', () => {
    const now = new Date();
    now.setHours(now.getHours() - 1);
    const result = calculateTime(now.toISOString());
    expect(result).toContain('Hr ago');
  });

  it('returns "Hrs ago" for multi-hour old', () => {
    const now = new Date();
    now.setHours(now.getHours() - 5);
    const result = calculateTime(now.toISOString());
    expect(result).toContain('Hrs ago');
  });

  it('returns "Day ago" for 1 day old', () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const result = calculateTime(now.toISOString());
    expect(result).toContain('Day ago');
  });

  it('returns date string for old timestamps', () => {
    const result = calculateTime('2020-01-01T00:00:00.000Z');
    // Falls through to ttime.split('T')[0]
    expect(result).toBe('2020-01-01');
  });
});

// ─── getTimeForDate ───
describe('getTimeForDate', () => {
  it('returns hours, minutes, seconds as padded strings', () => {
    const result = getTimeForDate(new Date('2024-01-01T10:30:15Z'));
    expect(result).toHaveProperty('hours');
    expect(result).toHaveProperty('minutes');
    expect(result).toHaveProperty('seconds');
    // All should be strings
    expect(typeof result.hours).toBe('string');
    expect(typeof result.minutes).toBe('string');
    expect(typeof result.seconds).toBe('string');
  });

  it('pads single-digit values with leading zero', () => {
    const result = getTimeForDate(new Date('2024-01-01T10:55:55Z'));
    // hours = 18 - 10 = 8 → '08'
    expect(result.hours).toBe('08');
  });

  it('returns consistent output for same input', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const r1 = getTimeForDate(date);
    const r2 = getTimeForDate(date);
    expect(r1).toEqual(r2);
  });
});

// ─── isNativeCurrency ───
describe('isNativeCurrency', () => {
  it('returns true when contract matches native_token_address', () => {
    const chain = { native_token_address: '0x0000', secondaryAddress: '0xeeee' };
    expect(isNativeCurrency(chain as any, '0x0000')).toBe(true);
  });

  it('returns true when contract matches secondaryAddress', () => {
    const chain = { native_token_address: '0x0000', secondaryAddress: '0xeeee' };
    expect(isNativeCurrency(chain as any, '0xeeee')).toBe(true);
  });

  it('returns false when contract matches neither', () => {
    const chain = { native_token_address: '0x0000', secondaryAddress: '0xeeee' };
    expect(isNativeCurrency(chain as any, '0x1111')).toBe(false);
  });
});

// ─── isNativeToken ───
describe('isNativeToken', () => {
  it('returns false for null tokenData', () => {
    expect(isNativeToken(null)).toBe(false);
  });

  it('returns true when isNativeToken flag is true', () => {
    expect(isNativeToken({ isNativeToken: true })).toBe(true);
  });

  it('returns false when isNativeToken flag is false', () => {
    expect(isNativeToken({ isNativeToken: false })).toBe(false);
  });

  it('detects native token by symbol match when flag is absent', () => {
    expect(isNativeToken({
      symbol: 'ETH',
      chainDetails: { backendName: 'ethereum', symbol: 'ETH' },
    })).toBe(true);
  });

  it('returns false for non-native token symbol', () => {
    expect(isNativeToken({
      symbol: 'USDC',
      chainDetails: { backendName: 'ethereum', symbol: 'ETH' },
    })).toBe(false);
  });
});

// ─── hasSufficientBalanceAndGasFee ───
describe('hasSufficientBalanceAndGasFee', () => {
  it('returns true for both when balance is sufficient', () => {
    const result = hasSufficientBalanceAndGasFee(false, '0.01', '1', '50', '100');
    expect(result.hasSufficientBalance).toBe(true);
    expect(result.hasSufficientGasFee).toBe(true);
  });

  it('returns false for both when sentAmount is negative', () => {
    const result = hasSufficientBalanceAndGasFee(false, '0.01', '1', '-1', '100');
    expect(result.hasSufficientBalance).toBe(false);
    expect(result.hasSufficientGasFee).toBe(false);
  });

  it('checks combined amount + gas for native tokens', () => {
    // Native token: sentAmount + gasFee must be <= balance
    const result = hasSufficientBalanceAndGasFee(true, '0.5', '1', '0.6', '1');
    // 0.6 + 0.5 = 1.1 > 1.0 → insufficient balance
    expect(result.hasSufficientBalance).toBe(false);
    expect(result.hasSufficientGasFee).toBe(true);
  });

  it('checks only sentAmount for non-native tokens', () => {
    // Non-native token: sentAmount <= sendingTokenBalance
    const result = hasSufficientBalanceAndGasFee(false, '0.5', '1', '90', '100');
    expect(result.hasSufficientBalance).toBe(true);
    expect(result.hasSufficientGasFee).toBe(true);
  });

  it('returns insufficient gas when gas > nativeBalance', () => {
    const result = hasSufficientBalanceAndGasFee(false, '2', '1', '50', '100');
    expect(result.hasSufficientGasFee).toBe(false);
  });
});

// ─── removeSolidProhibitedCountriesFromCountryMaster ───
describe('removeSolidProhibitedCountriesFromCountryMaster', () => {
  it('filters out prohibited countries', () => {
    const result = removeSolidProhibitedCountriesFromCountryMaster();
    const names = result.map(c => c.name);
    // Russia and Nigeria are in the prohibited list
    expect(names).not.toContain('Russia');
    expect(names).not.toContain('Nigeria');
  });

  it('keeps allowed countries', () => {
    const result = removeSolidProhibitedCountriesFromCountryMaster();
    const names = result.map(c => c.name);
    expect(names).toContain('United States');
    expect(names).toContain('United Kingdom');
    expect(names).toContain('India');
  });
});
