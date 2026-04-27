/**
 * Unit tests for Address utilities.
 *
 * Tests data type conversion functions (Uint8Array <-> hex) and raw address generation.
 * Async functions like wallet generation are excluded due to complex crypto dependencies.
 */

// ─── Mocks (must come before imports) ───
jest.mock('@solana/web3.js', () => ({
  Keypair: { fromSeed: jest.fn() },
}));
jest.mock('@keplr-wallet/crypto', () => ({
  Mnemonic: { generateMasterSeedFromMnemonic: jest.fn(), generatePrivateKeyFromMasterSeed: jest.fn() },
}));
jest.mock('@cosmjs-rn/amino', () => ({
  Secp256k1HdWallet: { fromMnemonic: jest.fn() },
}));
jest.mock('ed25519-hd-key', () => ({
  derivePath: jest.fn(),
}));
jest.mock('micro-ed25519-hdkey', () => ({
  HDKey: { fromMasterSeed: jest.fn() },
}));
jest.mock('../../constants/server', () => ({
  ChainBackendNames: {},
  CHAIN_ETH: { chainName: 'ethereum', backendName: 'ethereum' },
  CHAIN_COSMOS: { chainName: 'cosmos', backendName: 'cosmos' },
}));
jest.mock('../../constants/data', () => ({
  AddressDerivationPath: {
    ETH: "m/44'/60'/0'/0/",
    COSMOS: "m/44'/118'/0'/0/",
    COREUM: "m/44'/529'/0'/0/",
    SOLANA: "m/44'/501'/0'",
  },
  Bech32Prefixes: {
    COSMOS: 'cosmos',
    NOBLE: 'noble',
    OSMOSIS: 'osmo',
    COREUM: 'core',
  },
}));
jest.mock('../util', () => ({
  addHexPrefix: jest.fn((value: string) => value),
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_: 'NO_CRED',
}));
jest.mock('../asyncStorage', () => ({
  setConnectionType: jest.fn(),
}));
jest.mock('../analytics', () => ({
  logAnalyticsToFirebase: jest.fn(),
}));
jest.mock('@injectivelabs/sdk-ts/utils', () => ({
  getInjectiveAddress: jest.fn((addr: string) => addr),
}));

import { uintToHex, hexToUint, generateRawAddressFromPubKeys } from '../Address';

// ─── uintToHex ───
describe('uintToHex', () => {
  it('converts simple Uint8Array to hex string', () => {
    const arr = new Uint8Array([1, 2, 3]);
    expect(uintToHex(arr)).toBe('0x010203');
  });

  it('converts zero bytes', () => {
    const arr = new Uint8Array([0, 0, 0]);
    expect(uintToHex(arr)).toBe('0x000000');
  });

  it('converts high-value bytes', () => {
    const arr = new Uint8Array([255, 254, 253]);
    expect(uintToHex(arr)).toBe('0xfffefd');
  });

  it('converts single byte', () => {
    const arr = new Uint8Array([42]);
    expect(uintToHex(arr)).toBe('0x2a');
  });

  it('converts empty array', () => {
    const arr = new Uint8Array([]);
    expect(uintToHex(arr)).toBe('0x');
  });

  it('converts large array', () => {
    const arr = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
    expect(uintToHex(arr)).toBe('0x123456789abcdef0');
  });

  it('always returns lowercase hex', () => {
    const arr = new Uint8Array([170, 187, 204, 221, 238, 255]);
    const result = uintToHex(arr);
    expect(result).toBe('0xaabbccddeeff');
    expect(result).not.toMatch(/[A-F]/); // No uppercase hex
  });

  it('pads single nibbles with leading zeros', () => {
    const arr = new Uint8Array([1, 2]);
    expect(uintToHex(arr)).toBe('0x0102');
  });
});

// ─── hexToUint ───
describe('hexToUint', () => {
  it('converts hex string with 0x prefix to Uint8Array', () => {
    const hex = '0x010203';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('converts hex string without 0x prefix', () => {
    const hex = '010203';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('converts zero bytes', () => {
    const hex = '0x000000';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([0, 0, 0]));
  });

  it('converts high-value bytes', () => {
    const hex = '0xfffefd';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([255, 254, 253]));
  });

  it('converts single byte', () => {
    const hex = '0x2a';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([42]));
  });

  it('converts empty hex', () => {
    const hex = '0x';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([]));
  });

  it('converts large hex string', () => {
    const hex = '0x123456789abcdef0';
    const result = hexToUint(hex);
    expect(result).toEqual(
      new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]),
    );
  });

  it('handles uppercase hex', () => {
    const hex = '0xAABBCCDDEEFF';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([170, 187, 204, 221, 238, 255]));
  });

  it('handles mixed case hex', () => {
    const hex = '0xAaBbCcDd';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([170, 187, 204, 221]));
  });

  it('converts without 0x prefix (mixed case)', () => {
    const hex = 'AaBbCcDd';
    const result = hexToUint(hex);
    expect(result).toEqual(new Uint8Array([170, 187, 204, 221]));
  });
});

// ─── roundtrip conversion ───
describe('hexToUint <-> uintToHex roundtrip', () => {
  it('uintToHex then hexToUint recovers original array', () => {
    const original = new Uint8Array([1, 2, 3, 255, 128, 0]);
    const hex = uintToHex(original);
    const result = hexToUint(hex);
    expect(result).toEqual(original);
  });

  it('hexToUint then uintToHex recovers original hex (with 0x prefix)', () => {
    const original = '0x010203ff8000';
    const arr = hexToUint(original);
    const hex = uintToHex(arr);
    expect(hex).toBe(original);
  });

  it('roundtrip with empty array', () => {
    const original = new Uint8Array([]);
    const hex = uintToHex(original);
    const result = hexToUint(hex);
    expect(result).toEqual(original);
  });
});

// ─── generateRawAddressFromPubKeys ───
describe('generateRawAddressFromPubKeys', () => {
  it('generates deterministic address from public key', () => {
    const publicKey = new Uint8Array([1, 2, 3, 4, 5]);
    const result1 = generateRawAddressFromPubKeys(publicKey);
    const result2 = generateRawAddressFromPubKeys(publicKey);

    expect(result1).toEqual(result2);
    expect(result1).toBeInstanceOf(Uint8Array);
  });

  it('generates different addresses for different public keys', () => {
    const publicKey1 = new Uint8Array([1, 2, 3, 4, 5]);
    const publicKey2 = new Uint8Array([5, 4, 3, 2, 1]);

    const address1 = generateRawAddressFromPubKeys(publicKey1);
    const address2 = generateRawAddressFromPubKeys(publicKey2);

    expect(address1).not.toEqual(address2);
  });

  it('returns 20-byte address (RIPEMD160 hash output)', () => {
    const publicKey = new Uint8Array([1, 2, 3]);
    const result = generateRawAddressFromPubKeys(publicKey);

    expect(result.length).toBe(20); // RIPEMD160 produces 20 bytes
  });

  it('handles longer public keys', () => {
    const publicKey = new Uint8Array(65); // Common compressed pubkey length
    publicKey[0] = 2; // Even compressed prefix
    for (let i = 1; i < 33; i++) {
      publicKey[i] = i % 256;
    }

    const result = generateRawAddressFromPubKeys(publicKey);
    expect(result.length).toBe(20);
  });

  it('handles full-length uncompressed public key', () => {
    // 65 bytes: 0x04 + 32 bytes X + 32 bytes Y
    const publicKey = new Uint8Array(65);
    publicKey[0] = 0x04;
    for (let i = 1; i < 65; i++) {
      publicKey[i] = (i * 7) % 256; // Deterministic pattern
    }

    const result = generateRawAddressFromPubKeys(publicKey);
    expect(result.length).toBe(20);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('generates address with all zero bytes for zero key', () => {
    const publicKey = new Uint8Array([0, 0, 0, 0, 0]);
    const result = generateRawAddressFromPubKeys(publicKey);

    expect(result.length).toBe(20);
    expect(result).toBeInstanceOf(Uint8Array);
    // Result is deterministic but not all zeros (due to hashing)
  });

  it('produces different addresses for single-byte difference', () => {
    const publicKey1 = new Uint8Array([1, 2, 3, 4, 5]);
    const publicKey2 = new Uint8Array([1, 2, 3, 4, 6]); // Last byte different

    const address1 = generateRawAddressFromPubKeys(publicKey1);
    const address2 = generateRawAddressFromPubKeys(publicKey2);

    expect(address1).not.toEqual(address2);
  });

  it('address values are in valid byte range', () => {
    const publicKey = new Uint8Array([42, 99, 128, 255]);
    const result = generateRawAddressFromPubKeys(publicKey);

    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(0);
      expect(result[i]).toBeLessThanOrEqual(255);
    }
  });
});
