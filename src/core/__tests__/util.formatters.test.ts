/**
 * Unit tests for formatter and converter functions exported from core/util.tsx.
 *
 * Every jest.mock below is required to stop the deep import chain from
 * reaching JSX / native modules that Jest cannot resolve.
 */

jest.mock('../../constants/server', () => ({
  ChainBackendNames: { ETH: 'ethereum', COSMOS: 'cosmos', OSMOSIS: 'osmosis', NOBLE: 'noble', COREUM: 'coreum', INJECTIVE: 'injective', SOLANA: 'solana', BSC: 'bsc', POLYGON: 'polygon', AVALANCHE: 'avalanche', ARBITRUM: 'arbitrum', OPTIMISM: 'optimism', BASE: 'base', ZKSYNC_ERA: 'zksync_era', HYPERLIQUID: 'hyperliquid' },
  CHAIN_ETH: { chainName: 'ethereum', symbol: 'ETH', backendName: 'ethereum', chainIdNumber: 1 },
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
  NativeTokenMapping: {},
  EnsCoinTypes: {},
  NON_EIP1599_CHAINS: [],
}));
jest.mock('../../constants/data', () => ({ chainExplorerMapping: {}, ChainNameToChainMapping: {}, ANALYTICS_ERROR_URL: '', ANALYTICS_SUCCESS_URL: '', MINIMUM_TRANSFER_AMOUNT_ETH: 50, MINIMUM_TRANSFER_AMOUNT_HL_SPOT: 15 }));
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
jest.mock('../../constants/cardColours', () => ({ getCardColorByHex: jest.fn() }));
jest.mock('../../../assets/images/appImages', () => ({ CYPHER_CARD_IMAGES: 'https://example.com/cards' }));
jest.mock('../../../assets/datasets/countryMaster', () => ([]));
jest.mock('../../../assets/datasets/currencySymbolMap', () => ({ currencySymbolMap: {} }));
jest.mock('react-native-svg', () => ({ SvgUri: 'SvgUri' }));
jest.mock('../../styles/tailwindComponents', () => ({ CyDImage: 'CyDImage' }));
jest.mock('../../reducers/activity_reducer', () => ({}));
jest.mock('../../reducers/hdwallet_reducer', () => ({}));

import {
  convertFromUnitAmount,
  convertNumberToShortHandNotation,
  convertAmountOfContractDecimal,
  limitDecimalPlaces,
  beautifyPriceWithUSDDenom,
  formatCurrencyWithSuffix,
  formatAmount,
  toProxyUrl,
  codeToArray,
  convertToHexa,
  addHexPrefix,
  toBase64,
  stripPemHeaders,
  trimWhitespace,
  processMerchantName,
  extractAddressFromURI,
  parseMonthYear,
} from '../util';

// ---------------------------------------------------------------------------
// 1. convertFromUnitAmount
// ---------------------------------------------------------------------------
describe('convertFromUnitAmount', () => {
  it('converts 1 ETH (18 decimals) to "1"', () => {
    expect(convertFromUnitAmount('1000000000000000000', 18)).toBe('1');
  });

  it('converts 1.5 USDC (6 decimals, 2 dp) to "1.5"', () => {
    expect(convertFromUnitAmount('1500000', 6, 2)).toBe('1.5');
  });

  it('returns "0" for zero amount', () => {
    expect(convertFromUnitAmount('0', 18)).toBe('0');
  });

  it('floors rather than rounds (e.g. 1.999... stays below 2)', () => {
    // 1999999 / 10^6 = 1.999999  -> floor to 3dp = 1.999
    expect(convertFromUnitAmount('1999999', 6, 3)).toBe('1.999');
  });

  it('handles large unit amounts', () => {
    // 5_000_000 * 10^18  expressed as string
    const fiveMillion = '5000000000000000000000000';
    expect(convertFromUnitAmount(fiveMillion, 18)).toBe('5000000');
  });
});

// ---------------------------------------------------------------------------
// 2. convertNumberToShortHandNotation
// ---------------------------------------------------------------------------
describe('convertNumberToShortHandNotation', () => {
  it('returns the number unchanged when < 1000', () => {
    expect(convertNumberToShortHandNotation(500)).toBe(500);
  });

  it('returns K suffix for thousands', () => {
    expect(convertNumberToShortHandNotation(1500)).toBe('1.5K');
  });

  it('returns M suffix for millions', () => {
    expect(convertNumberToShortHandNotation(1500000)).toBe('1.5M');
  });

  it('returns B suffix for billions', () => {
    expect(convertNumberToShortHandNotation(2500000000)).toBe('2.5B');
  });

  it('returns T suffix for trillions', () => {
    expect(convertNumberToShortHandNotation(1500000000000)).toBe('1.5T');
  });

  it('handles exact thousand boundary', () => {
    expect(convertNumberToShortHandNotation(1000)).toBe('1K');
  });
});

// ---------------------------------------------------------------------------
// 3. convertAmountOfContractDecimal
// ---------------------------------------------------------------------------
describe('convertAmountOfContractDecimal', () => {
  it('truncates decimals to the given precision', () => {
    expect(convertAmountOfContractDecimal('1.123456789', 6)).toBe('1.123456');
  });

  it('appends ".0" when there is no decimal part and default decimal=18', () => {
    expect(convertAmountOfContractDecimal('100', 18)).toBe('100.0');
  });

  it('keeps the decimal part when it is shorter than the limit', () => {
    expect(convertAmountOfContractDecimal('1.1', 2)).toBe('1.1');
  });

  it('handles amount with no decimal point', () => {
    expect(convertAmountOfContractDecimal('42', 6)).toBe('42.0');
  });
});

// ---------------------------------------------------------------------------
// 4. limitDecimalPlaces
// ---------------------------------------------------------------------------
describe('limitDecimalPlaces', () => {
  it('floors to the requested decimal places', () => {
    expect(limitDecimalPlaces('1.123456789', 4)).toBe('1.1234');
  });

  it('returns an integer string unchanged when no decimals present', () => {
    expect(limitDecimalPlaces('5', 2)).toBe('5');
  });

  it('floors (does not round up)', () => {
    expect(limitDecimalPlaces('1.999', 2)).toBe('1.99');
  });

  it('uses default 18 dp when omitted', () => {
    expect(limitDecimalPlaces('1.123456789012345678999')).toBe(
      '1.123456789012345678',
    );
  });
});

// ---------------------------------------------------------------------------
// 5. beautifyPriceWithUSDDenom
// ---------------------------------------------------------------------------
describe('beautifyPriceWithUSDDenom', () => {
  it('returns raw number string for values <= 1000', () => {
    expect(beautifyPriceWithUSDDenom(500)).toBe('500');
  });

  it('labels thousands as "K"', () => {
    expect(beautifyPriceWithUSDDenom(1500)).toBe('1 K');
  });

  it('labels millions', () => {
    expect(beautifyPriceWithUSDDenom(1500000)).toBe('1 Million');
  });

  it('labels billions', () => {
    expect(beautifyPriceWithUSDDenom(2500000000)).toBe('2 Billion');
  });

  it('labels trillions', () => {
    expect(beautifyPriceWithUSDDenom(1500000000000)).toBe('1 Trillion');
  });
});

// ---------------------------------------------------------------------------
// 6. formatCurrencyWithSuffix
// ---------------------------------------------------------------------------
describe('formatCurrencyWithSuffix', () => {
  it('returns "0" for null', () => {
    expect(formatCurrencyWithSuffix(null as unknown as number)).toBe('0');
  });

  it('returns "0" for NaN', () => {
    expect(formatCurrencyWithSuffix(NaN)).toBe('0');
  });

  it('handles negative values with suffix', () => {
    expect(formatCurrencyWithSuffix(-1500)).toBe('-2K');
  });

  it('returns raw number string when < 1000', () => {
    expect(formatCurrencyWithSuffix(999)).toBe('999');
  });

  it('returns K suffix for thousands', () => {
    expect(formatCurrencyWithSuffix(1500)).toBe('2K');
  });

  it('returns M suffix for millions', () => {
    expect(formatCurrencyWithSuffix(1500000)).toBe('1.5M');
  });

  it('returns B suffix for billions', () => {
    expect(formatCurrencyWithSuffix(2500000000)).toBe('2.5B');
  });

  it('returns "0" for undefined', () => {
    expect(formatCurrencyWithSuffix(undefined as unknown as number)).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// 7. formatAmount
// ---------------------------------------------------------------------------
describe('formatAmount', () => {
  it('uses significant digits for numbers < 1', () => {
    const result = formatAmount('0.001234567', 4);
    expect(result).toBe('0.001235'); // 4 significant digits
  });

  it('uses fixed decimal places for numbers >= 1', () => {
    expect(formatAmount('123.456789', 2)).toBe('123.45');
  });

  it('returns "0" for zero input', () => {
    expect(formatAmount('0', 4)).toBe('0');
  });

  it('handles integer input', () => {
    expect(formatAmount('42', 3)).toBe('42');
  });

  it('handles very small numbers', () => {
    const result = formatAmount('0.000000001', 4);
    // 4 significant digits of 0.000000001 = 0.000000001000
    expect(result).toBe('0.000000001');
  });
});

// ---------------------------------------------------------------------------
// 8. toProxyUrl
// ---------------------------------------------------------------------------
describe('toProxyUrl', () => {
  it('builds a weserv.nl proxy URL', () => {
    const result = toProxyUrl('https://example.com/img.png');
    expect(result).toContain('images.weserv.nl');
  });

  it('strips the protocol from the original URL', () => {
    const result = toProxyUrl('https://example.com/img.png');
    // The encoded URL should NOT contain "https://" or "http://"
    expect(result).not.toContain('https%3A%2F%2F');
    expect(result).not.toContain('http%3A%2F%2F');
  });

  it('includes width, height, and fit params', () => {
    const result = toProxyUrl('https://cdn.example.io/logo.jpg');
    expect(result).toContain('w=128');
    expect(result).toContain('h=128');
    expect(result).toContain('fit=contain');
  });

  it('encodes the domain and path', () => {
    const result = toProxyUrl('http://my-site.com/path/to/image.png');
    expect(result).toContain(
      encodeURIComponent('my-site.com/path/to/image.png'),
    );
  });
});

// ---------------------------------------------------------------------------
// 9. codeToArray
// ---------------------------------------------------------------------------
describe('codeToArray', () => {
  it('splits a numeric string into individual characters', () => {
    expect(codeToArray('1234')).toEqual(['1', '2', '3', '4']);
  });

  it('returns an empty array for undefined input', () => {
    expect(codeToArray(undefined)).toEqual([]);
  });

  it('returns empty array for empty string input', () => {
    // ''.split('') returns [] in JS
    expect(codeToArray('')).toEqual([]);
  });

  it('handles alpha characters', () => {
    expect(codeToArray('AB')).toEqual(['A', 'B']);
  });
});

// ---------------------------------------------------------------------------
// 10. convertToHexa
// ---------------------------------------------------------------------------
describe('convertToHexa', () => {
  it('converts a single character to hex', () => {
    expect(convertToHexa('A')).toBe('41');
  });

  it('converts multiple characters', () => {
    expect(convertToHexa('AB')).toBe('4142');
  });

  it('returns empty string for empty input', () => {
    expect(convertToHexa('')).toBe('');
  });

  it('converts lowercase letters', () => {
    expect(convertToHexa('a')).toBe('61');
  });
});

// ---------------------------------------------------------------------------
// 11. addHexPrefix
// ---------------------------------------------------------------------------
describe('addHexPrefix', () => {
  it('adds 0x prefix when missing', () => {
    expect(addHexPrefix('abc')).toBe('0xabc');
  });

  it('does not double-prefix when 0x is already present', () => {
    expect(addHexPrefix('0xabc')).toBe('0xabc');
  });

  it('handles empty string', () => {
    expect(addHexPrefix('')).toBe('0x');
  });

  it('handles uppercase hex', () => {
    expect(addHexPrefix('DEADBEEF')).toBe('0xDEADBEEF');
  });
});

// ---------------------------------------------------------------------------
// 12. toBase64
// ---------------------------------------------------------------------------
describe('toBase64', () => {
  it('encodes "hello" to base64', () => {
    expect(toBase64(Buffer.from('hello'))).toBe('aGVsbG8=');
  });

  it('encodes empty buffer to empty string', () => {
    expect(toBase64(new Uint8Array([]))).toBe('');
  });

  it('encodes binary data correctly', () => {
    expect(toBase64(new Uint8Array([0, 1, 2, 255]))).toBe('AAEC/w==');
  });
});

// ---------------------------------------------------------------------------
// 13. stripPemHeaders
// ---------------------------------------------------------------------------
describe('stripPemHeaders', () => {
  it('removes BEGIN and END headers from a public key PEM', () => {
    const pem =
      '-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----';
    expect(stripPemHeaders(pem)).toBe('abc');
  });

  it('removes headers from RSA private key PEM', () => {
    const pem =
      '-----BEGIN RSA PRIVATE KEY-----\nxyz123\n-----END RSA PRIVATE KEY-----';
    expect(stripPemHeaders(pem)).toBe('xyz123');
  });

  it('strips whitespace/newlines along with headers', () => {
    const pem =
      '-----BEGIN PUBLIC KEY-----\n  abc def  \n-----END PUBLIC KEY-----';
    expect(stripPemHeaders(pem)).toBe('abcdef');
  });

  it('handles already-clean base64 string', () => {
    expect(stripPemHeaders('abcdef')).toBe('abcdef');
  });
});

// ---------------------------------------------------------------------------
// 14. trimWhitespace
// ---------------------------------------------------------------------------
describe('trimWhitespace', () => {
  it('trims leading and trailing spaces and collapses internal spaces', () => {
    expect(trimWhitespace('  hello  world  ')).toBe('hello world');
  });

  it('collapses multiple internal spaces', () => {
    expect(trimWhitespace('a   b   c')).toBe('a b c');
  });

  it('handles already-clean input', () => {
    expect(trimWhitespace('clean')).toBe('clean');
  });

  it('handles string that is only whitespace', () => {
    expect(trimWhitespace('   ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 15. processMerchantName
// ---------------------------------------------------------------------------
describe('processMerchantName', () => {
  it('takes the first word and computes fontSize for short name', () => {
    const result = processMerchantName('Whole Foods');
    expect(result.displayName).toBe('Whole');
    expect(result.fontSize).toBe(20);
  });

  it('truncates long first words to 8 chars with smaller font', () => {
    const result = processMerchantName('VeryLongName');
    expect(result.displayName).toBe('VeryLong');
    expect(result.fontSize).toBe(14);
  });

  it('uses fontSize 16 for names between 6 and 7 chars', () => {
    const result = processMerchantName('Target Store');
    // "Target" is 6 chars  -> > 5 so fontSize 16
    expect(result.displayName).toBe('Target');
    expect(result.fontSize).toBe(16);
  });

  it('handles single word input', () => {
    const result = processMerchantName('Uber');
    expect(result.displayName).toBe('Uber');
    expect(result.fontSize).toBe(20);
  });

  it('handles exactly 8-character first word', () => {
    const result = processMerchantName('Costcooo');
    expect(result.displayName).toBe('Costcooo');
    expect(result.fontSize).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// 16. extractAddressFromURI
// ---------------------------------------------------------------------------
describe('extractAddressFromURI', () => {
  it('extracts address from ethereum: URI with chain id', () => {
    const uri =
      'ethereum:0xBd1cD305900424CD4fAd1736a2B4d118c7CA935D@9001';
    const result = extractAddressFromURI(uri);
    expect(result).toBe('0xBd1cD305900424CD4fAd1736a2B4d118c7CA935D');
  });

  it('extracts address from solana: URI', () => {
    const uri = 'solana:7ZSvadKmLuxp6Hr9wDFSDKVMyhScDbau7aReDEM3ET5h';
    const result = extractAddressFromURI(uri);
    expect(result).toBe('7ZSvadKmLuxp6Hr9wDFSDKVMyhScDbau7aReDEM3ET5h');
  });

  it('passes through a plain address unchanged', () => {
    const plain = '0xBd1cD305900424CD4fAd1736a2B4d118c7CA935D';
    expect(extractAddressFromURI(plain)).toBe(plain);
  });

  it('returns empty string for empty input', () => {
    expect(extractAddressFromURI('')).toBe('');
  });

  it('returns empty string for null input', () => {
    expect(extractAddressFromURI(null as unknown as string)).toBe('');
  });

  it('returns empty string for non-string input', () => {
    expect(extractAddressFromURI(undefined as unknown as string)).toBe('');
  });

  it('handles ethereum: URI without chain id suffix', () => {
    const uri = 'ethereum:0xAbCdEf0123456789AbCdEf0123456789AbCdEf01';
    const result = extractAddressFromURI(uri);
    expect(result).toBe('0xAbCdEf0123456789AbCdEf0123456789AbCdEf01');
  });
});

// ---------------------------------------------------------------------------
// 17. parseMonthYear
// ---------------------------------------------------------------------------
describe('parseMonthYear', () => {
  it('parses ISO date string to "Month YYYY"', () => {
    // Note: new Date('2024-03-15') is parsed in UTC; month name comes from
    // Intl.DateTimeFormat which defaults to system locale in Node.
    const result = parseMonthYear('2024-03-15');
    expect(result).toContain('2024');
    expect(result).toContain('March');
  });

  it('returns empty string for empty input', () => {
    expect(parseMonthYear('')).toBe('');
  });

  it('parses first day of year', () => {
    const result = parseMonthYear('2023-01-01');
    expect(result).toContain('January');
    expect(result).toContain('2023');
  });

  it('parses December date', () => {
    const result = parseMonthYear('2025-12-25');
    expect(result).toContain('December');
    expect(result).toContain('2025');
  });
});
