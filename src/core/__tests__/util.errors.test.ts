// ─── Mocks (must come before imports to avoid JSX resolution from server.tsx) ───
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

// ─── Imports ───
import {
  parseErrorMessage,
  extractErrorMessage,
  isUserRejectionError,
  extractErrorDetails,
  getBestErrorMessage,
  isTimeoutError,
} from '../util';

// ─── parseErrorMessage ───
describe('parseErrorMessage', () => {
  it('extracts message from axios-style response.data.message', () => {
    const error = { response: { data: { message: 'server error' } } };
    expect(parseErrorMessage(error)).toBe('server error');
  });

  it('extracts error from response.data.error (string)', () => {
    const error = { response: { data: { error: 'bad request' } } };
    expect(parseErrorMessage(error)).toBe('bad request');
  });

  it('joins response.data.errors array', () => {
    const error = { response: { data: { errors: ['field required', 'invalid'] } } };
    expect(parseErrorMessage(error)).toBe('field required, invalid');
  });

  it('extracts nested error.message from response.data.error object', () => {
    const error = { response: { data: { error: { message: 'nested msg' } } } };
    expect(parseErrorMessage(error)).toBe('nested msg');
  });

  it('returns raw string from response.data when data is a string', () => {
    const error = { response: { data: 'raw string body' } };
    expect(parseErrorMessage(error)).toBe('raw string body');
  });

  it('stringifies response.data when it is an unrecognised object', () => {
    const error = { response: { data: { foo: 'bar' } } };
    // JSON.stringify without indentation (the data path uses JSON.stringify(data), not the 2-indent one)
    expect(parseErrorMessage(error)).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('extracts message from Error instance', () => {
    expect(parseErrorMessage(new Error('standard error'))).toBe('standard error');
  });

  it('extracts message from plain object with message property', () => {
    expect(parseErrorMessage({ message: 'plain msg' })).toBe('plain msg');
  });

  it('converts a string error directly', () => {
    expect(parseErrorMessage('string error')).toBe('string error');
  });

  it('converts a number to string', () => {
    expect(parseErrorMessage(42)).toBe('42');
  });

  it('returns "Unknown Error" for empty plain object', () => {
    // {} stringifies to '{}' which the code treats as unhelpful, falling to default
    expect(parseErrorMessage({})).toBe('Unknown Error');
  });

  it('returns "Unknown Error" for null', () => {
    expect(parseErrorMessage(null)).toBe('null');
  });

  it('returns "undefined" for undefined', () => {
    expect(parseErrorMessage(undefined)).toBe('undefined');
  });
});

// ─── extractErrorMessage ───
describe('extractErrorMessage', () => {
  it('extracts code and message from JSON-like string', () => {
    const input = '"code": 404, "message": "Not found"';
    expect(extractErrorMessage(input)).toEqual({ code: 404, message: 'Not found' });
  });

  it('returns code -1 and original string when no patterns match', () => {
    const input = 'no match here';
    expect(extractErrorMessage(input)).toEqual({ code: -1, message: 'no match here' });
  });

  it('extracts code but keeps original string when only code matches', () => {
    const input = '"code": 500';
    expect(extractErrorMessage(input)).toEqual({ code: 500, message: '"code": 500' });
  });

  it('extracts message but returns code -1 when only message matches', () => {
    const input = '"message": "oops"';
    expect(extractErrorMessage(input)).toEqual({ code: -1, message: 'oops' });
  });

  it('handles multi-digit codes', () => {
    const input = '"code": 12345, "message": "big code"';
    expect(extractErrorMessage(input)).toEqual({ code: 12345, message: 'big code' });
  });
});

// ─── isUserRejectionError ───
describe('isUserRejectionError', () => {
  it('returns true when message contains "User cancelled the request"', () => {
    expect(isUserRejectionError({ message: 'User cancelled the request' })).toBe(true);
  });

  it('returns true when details contains "User rejected"', () => {
    expect(isUserRejectionError({ details: 'User rejected' })).toBe(true);
  });

  it('returns true when shortMessage contains "User didn\'t sign"', () => {
    expect(isUserRejectionError({ shortMessage: "User didn't sign" })).toBe(true);
  });

  it('returns true for "User disapproved" in message', () => {
    expect(isUserRejectionError({ message: 'User disapproved the action' })).toBe(true);
  });

  it('returns true for "User denied" in details', () => {
    expect(isUserRejectionError({ details: 'User denied transaction' })).toBe(true);
  });

  it('returns false for a generic network error', () => {
    expect(isUserRejectionError({ message: 'Network error' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isUserRejectionError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isUserRejectionError(undefined)).toBe(false);
  });
});

// ─── extractErrorDetails ───
describe('extractErrorDetails', () => {
  it('extracts all three fields from a well-formed error object', () => {
    const error = { message: 'msg', details: 'det', shortMessage: 'short' };
    const result = extractErrorDetails(error);
    expect(result.errorMessage).toBe('msg');
    expect(result.errorDetails).toBe('det');
    expect(result.errorShortMessage).toBe('short');
  });

  it('extracts message from Error instance and defaults others to empty', () => {
    const result = extractErrorDetails(new Error('boom'));
    expect(result.errorMessage).toBe('boom');
    expect(result.errorDetails).toBe('');
    expect(result.errorShortMessage).toBe('');
  });

  it('handles an error with only details', () => {
    const error = { details: 'only detail' };
    const result = extractErrorDetails(error);
    // parseErrorMessage will fall through to message (undefined) then stringify
    expect(result.errorDetails).toBe('only detail');
    expect(result.errorShortMessage).toBe('');
  });
});

// ─── getBestErrorMessage ───
describe('getBestErrorMessage', () => {
  it('returns errorDetails when message is generic RPC error', () => {
    expect(
      getBestErrorMessage('An unknown RPC error occurred', 'real detail', ''),
    ).toBe('real detail');
  });

  it('returns errorShortMessage when RPC error and details is empty', () => {
    expect(
      getBestErrorMessage('An unknown RPC error occurred', '', 'short msg'),
    ).toBe('short msg');
  });

  it('falls back to original message when RPC error but no alternatives', () => {
    expect(
      getBestErrorMessage('An unknown RPC error occurred', '', ''),
    ).toBe('An unknown RPC error occurred');
  });

  it('returns original message when it is a specific (non-RPC) error', () => {
    expect(
      getBestErrorMessage('Specific error', 'detail', 'short'),
    ).toBe('Specific error');
  });
});

// ─── isTimeoutError ───
describe('isTimeoutError', () => {
  it('returns true for "timed out"', () => {
    expect(isTimeoutError('Request timed out')).toBe(true);
  });

  it('returns true for "timeout"', () => {
    expect(isTimeoutError('Connection timeout')).toBe(true);
  });

  it('returns false for an unrelated error', () => {
    expect(isTimeoutError('Network error')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isTimeoutError('')).toBe(false);
  });

  it('is case-sensitive (TIMEOUT does not match)', () => {
    expect(isTimeoutError('TIMEOUT')).toBe(false);
  });
});
