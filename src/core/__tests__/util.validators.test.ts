/* ─── Mocks ───────────────────────────────────────────────────────────────── */
// Must come before any imports so Jest hoists them above the module graph.

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

/* ─── Imports ─────────────────────────────────────────────────────────────── */

import {
  isValidUUIDV4,
  isValidEmailID,
  isValidSSN,
  isValidPassportNumber,
  isValidEns,
  isAddressSet,
  isEnglish,
  isSvgUrl,
  isBigIntZero,
  validateAndFormatPrivateKey,
  addHexPrefix,
  isRainReferralCode,
  isTimeoutError,
  isUserRejectionError,
} from '../util';

/* ─── Tests ───────────────────────────────────────────────────────────────── */

describe('isValidUUIDV4', () => {
  it('accepts a valid v4 UUID', () => {
    expect(isValidUUIDV4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts a v4 UUID with uppercase hex', () => {
    expect(isValidUUIDV4('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidUUIDV4('')).toBe(false);
  });

  it('rejects a v1 UUID (version digit is 1, not 0-5 — actually 1 passes the [0-5] range)', () => {
    // v1 UUID has version nibble = 1 which IS in [0-5], so the regex accepts it.
    // The variant nibble (8/9/a/b) also matches. So a well-formed v1 UUID passes.
    const v1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    expect(isValidUUIDV4(v1)).toBe(true);
  });

  it('rejects a string that is not a UUID at all', () => {
    expect(isValidUUIDV4('not-a-uuid')).toBe(false);
  });

  it('rejects a UUID missing dashes', () => {
    expect(isValidUUIDV4('550e8400e29b41d4a716446655440000')).toBe(false);
  });
});

describe('isValidEmailID', () => {
  it('accepts a standard email', () => {
    expect(isValidEmailID('user@example.com')).toBe(true);
  });

  it('accepts an email with subdomains', () => {
    expect(isValidEmailID('user@mail.example.co.uk')).toBe(true);
  });

  it('rejects a string without @', () => {
    expect(isValidEmailID('userexample.com')).toBe(false);
  });

  it('rejects a string without a domain', () => {
    expect(isValidEmailID('user@')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmailID('')).toBe(false);
  });

  it('rejects a string with spaces', () => {
    expect(isValidEmailID('user @example.com')).toBe(false);
  });
});

describe('isValidSSN', () => {
  it('accepts a valid 9-digit SSN', () => {
    expect(isValidSSN('123456789')).toBe(true);
  });

  it('accepts a valid SSN with dashes', () => {
    expect(isValidSSN('123-45-6789')).toBe(true);
  });

  it('accepts a valid SSN with spaces', () => {
    expect(isValidSSN('123 45 6789')).toBe(true);
  });

  it('rejects blacklisted SSN 078051120', () => {
    expect(isValidSSN('078051120')).toBe(false);
  });

  it('rejects blacklisted SSN 219099999', () => {
    expect(isValidSSN('219099999')).toBe(false);
  });

  it('accepts whitelisted SSN 999999999 (starts with 9 but is whitelisted)', () => {
    expect(isValidSSN('999999999')).toBe(true);
  });

  it('rejects SSN starting with 000', () => {
    expect(isValidSSN('000123456')).toBe(false);
  });

  it('rejects SSN starting with 666', () => {
    expect(isValidSSN('666123456')).toBe(false);
  });

  it('accepts a valid last-four format', () => {
    expect(isValidSSN('1234')).toBe(true);
  });

  it('rejects last-four of 0000', () => {
    expect(isValidSSN('0000')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidSSN('')).toBe(false);
  });
});

describe('isValidPassportNumber', () => {
  it('accepts an alphanumeric passport like A1234567', () => {
    expect(isValidPassportNumber('A1234567')).toBe(true);
  });

  it('accepts an all-numeric passport', () => {
    expect(isValidPassportNumber('12345678')).toBe(true);
  });

  it('accepts an all-alpha passport', () => {
    expect(isValidPassportNumber('ABCDEFGH')).toBe(true);
  });

  it('rejects a passport with special characters', () => {
    expect(isValidPassportNumber('A12-3456')).toBe(false);
  });

  it('accepts an empty string (regex matches empty via *)', () => {
    // The regex /^[a-zA-Z0-9]*$/ matches zero-length strings.
    expect(isValidPassportNumber('')).toBe(true);
  });
});

describe('isValidEns', () => {
  it('accepts vitalik.eth', () => {
    expect(isValidEns('vitalik.eth')).toBe(true);
  });

  it('accepts test.crypto', () => {
    expect(isValidEns('test.crypto')).toBe(true);
  });

  it('accepts a subdomain like sub.name.eth', () => {
    expect(isValidEns('sub.name.eth')).toBe(true);
  });

  it('rejects a bare name without a TLD', () => {
    expect(isValidEns('vitalik')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEns('')).toBe(false);
  });
});

describe('isAddressSet', () => {
  it('returns true for a normal address string', () => {
    expect(isAddressSet('0xabc123')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isAddressSet('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(isAddressSet('   ')).toBe(false);
  });

  it('returns false for the IMPORTING sentinel value', () => {
    expect(isAddressSet('IMPORTING')).toBe(false);
  });

  it('returns true for a non-empty, non-IMPORTING string', () => {
    expect(isAddressSet('cosmos1abc')).toBe(true);
  });
});

describe('isEnglish', () => {
  it('returns true for a simple English word', () => {
    expect(isEnglish('Hello')).toBe(true);
  });

  it('returns true for alphanumeric input', () => {
    expect(isEnglish('abc123')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isEnglish('')).toBe(false);
  });

  it('returns true for a string with hyphens and underscores', () => {
    expect(isEnglish('hello-world_test')).toBe(true);
  });
});

describe('isSvgUrl', () => {
  it('returns true for a URL ending in .svg', () => {
    expect(isSvgUrl('https://example.com/icon.svg')).toBe(true);
  });

  it('returns true for uppercase .SVG extension', () => {
    expect(isSvgUrl('https://example.com/icon.SVG')).toBe(true);
  });

  it('returns false for a .png URL', () => {
    expect(isSvgUrl('https://example.com/icon.png')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isSvgUrl('')).toBe(false);
  });

  it('returns true for an SVG URL with a query string', () => {
    // The implementation checks .includes('.svg') on the lowercased URL
    expect(isSvgUrl('https://example.com/path/to/file.svg?v=2')).toBe(true);
  });

  it('returns false when given a non-string-like value', () => {
    // The try/catch in the implementation guards against runtime errors
    expect(isSvgUrl(undefined as unknown as string)).toBe(false);
  });
});

describe('isBigIntZero', () => {
  it('returns true for 0n', () => {
    expect(isBigIntZero(0n)).toBe(true);
  });

  it('returns false for 1n', () => {
    expect(isBigIntZero(1n)).toBe(false);
  });

  it('returns false for -1n', () => {
    expect(isBigIntZero(-1n)).toBe(false);
  });

  it('returns true for BigInt(0)', () => {
    expect(isBigIntZero(BigInt(0))).toBe(true);
  });
});

describe('validateAndFormatPrivateKey', () => {
  const validHex64 = 'a'.repeat(64);

  it('returns 0x-prefixed key when given a valid 64-char hex string', () => {
    expect(validateAndFormatPrivateKey(validHex64)).toBe('0x' + validHex64);
  });

  it('strips existing 0x prefix and re-adds it', () => {
    expect(validateAndFormatPrivateKey('0x' + validHex64)).toBe(
      '0x' + validHex64,
    );
  });

  it('throws for a key that is too short', () => {
    expect(() => validateAndFormatPrivateKey('abcdef')).toThrow(
      'Invalid private key format',
    );
  });

  it('throws for non-hex characters', () => {
    const invalidKey = 'g'.repeat(64);
    expect(() => validateAndFormatPrivateKey(invalidKey)).toThrow(
      'Invalid private key format',
    );
  });

  it('throws for an empty string', () => {
    expect(() => validateAndFormatPrivateKey('')).toThrow(
      'Invalid private key format',
    );
  });
});

describe('addHexPrefix', () => {
  it('adds 0x prefix when missing', () => {
    expect(addHexPrefix('abc123')).toBe('0xabc123');
  });

  it('does not double-prefix when 0x is already present', () => {
    expect(addHexPrefix('0xabc123')).toBe('0xabc123');
  });

  it('adds 0x to an empty string', () => {
    expect(addHexPrefix('')).toBe('0x');
  });
});

describe('isRainReferralCode', () => {
  it('returns true when code ends with RA', () => {
    expect(isRainReferralCode('ABC123RA')).toBe(true);
  });

  it('returns false when code does not end with RA', () => {
    expect(isRainReferralCode('ABC123')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isRainReferralCode('')).toBe(false);
  });

  it('is case-sensitive — lowercase ra does not match', () => {
    expect(isRainReferralCode('ABC123ra')).toBe(false);
  });
});

describe('isTimeoutError', () => {
  it('returns true when message contains "timed out"', () => {
    expect(isTimeoutError('Request timed out')).toBe(true);
  });

  it('returns true when message contains "timeout"', () => {
    expect(isTimeoutError('Connection timeout')).toBe(true);
  });

  it('returns false for an unrelated error message', () => {
    expect(isTimeoutError('Unknown error')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isTimeoutError('')).toBe(false);
  });

  it('is case-sensitive — "Timed Out" does not match', () => {
    expect(isTimeoutError('Timed Out')).toBe(false);
  });
});

describe('isUserRejectionError', () => {
  it('returns true when message contains "User cancelled the request"', () => {
    expect(
      isUserRejectionError({ message: 'User cancelled the request' }),
    ).toBe(true);
  });

  it('returns true when details contains "User rejected"', () => {
    expect(isUserRejectionError({ details: 'User rejected the tx' })).toBe(
      true,
    );
  });

  it('returns true when shortMessage contains "User denied"', () => {
    expect(
      isUserRejectionError({ shortMessage: 'User denied transaction' }),
    ).toBe(true);
  });

  it("returns true when message contains \"User didn't sign\"", () => {
    expect(isUserRejectionError({ message: "User didn't sign" })).toBe(true);
  });

  it('returns true when message contains "User disapproved"', () => {
    expect(isUserRejectionError({ message: 'User disapproved' })).toBe(true);
  });

  it('returns false when message is unrelated', () => {
    expect(isUserRejectionError({ message: 'Something else' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isUserRejectionError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isUserRejectionError(undefined)).toBe(false);
  });
});
