/**
 * Unit tests for address-validation utilities in utils.ts.
 *
 * Both @cosmjs/encoding and @solana/web3.js are mocked because they
 * rely on native/WASM binaries that aren't available in the Jest
 * environment.
 */

import {
  isCosmosAddress,
  isNobleAddress,
  isOsmosisAddress,
  isInjectiveAddress,
  isCoreumAddress,
  isSolanaAddress,
} from '../utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @cosmjs/encoding -- fromBech32 decodes a bech32 string into
// { prefix, data }. We simulate valid/invalid addresses here.
jest.mock('@cosmjs/encoding', () => ({
  fromBech32: jest.fn((address: string) => {
    const knownPrefixes: Record<string, string> = {
      cosmos1validaddress: 'cosmos',
      noble1validaddress: 'noble',
      osmo1validaddress: 'osmo',
      inj1validaddress: 'inj',
      core1validaddress: 'core',
      // Wrong-length data helper (prefix correct but 32 bytes instead of 20)
      cosmos1wronglength: 'cosmos',
      // Wrong-prefix helper
      wrong1validaddress: 'wrong',
    };

    const prefix = knownPrefixes[address];
    if (prefix === undefined) {
      throw new Error('Invalid bech32 address');
    }

    // For the "wronglength" case, return 32 bytes instead of the expected 20
    const dataLength = address.includes('wronglength') ? 32 : 20;
    return { prefix, data: new Uint8Array(dataLength) };
  }),
}));

// Mock @solana/web3.js -- PublicKey validates base58 addresses and
// exposes toBytes() returning a 32-byte Uint8Array.
jest.mock('@solana/web3.js', () => {
  return {
    PublicKey: jest.fn().mockImplementation((address: string) => {
      if (address === 'validSolanaPublicKey') {
        return { toBytes: () => new Uint8Array(32) };
      }
      throw new Error('Invalid public key input');
    }),
  };
});

// ---------------------------------------------------------------------------
// Bech32 address validators
// ---------------------------------------------------------------------------

describe('isCosmosAddress', () => {
  it('returns true for a valid cosmos address', () => {
    expect(isCosmosAddress('cosmos1validaddress')).toBe(true);
  });

  it('returns false when prefix does not match', () => {
    expect(isCosmosAddress('wrong1validaddress')).toBe(false);
  });

  it('returns false when data length is not 20 bytes', () => {
    expect(isCosmosAddress('cosmos1wronglength')).toBe(false);
  });

  it('returns false for an invalid bech32 string', () => {
    expect(isCosmosAddress('not-a-bech32-address')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isCosmosAddress('')).toBe(false);
  });
});

describe('isNobleAddress', () => {
  it('returns true for a valid noble address', () => {
    expect(isNobleAddress('noble1validaddress')).toBe(true);
  });

  it('returns false when prefix does not match', () => {
    expect(isNobleAddress('cosmos1validaddress')).toBe(false);
  });

  it('returns false for an invalid bech32 string', () => {
    expect(isNobleAddress('xyz')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isNobleAddress('')).toBe(false);
  });
});

describe('isOsmosisAddress', () => {
  it('returns true for a valid osmosis address', () => {
    expect(isOsmosisAddress('osmo1validaddress')).toBe(true);
  });

  it('returns false when prefix does not match', () => {
    expect(isOsmosisAddress('noble1validaddress')).toBe(false);
  });

  it('returns false for an invalid bech32 string', () => {
    expect(isOsmosisAddress('garbage')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isOsmosisAddress('')).toBe(false);
  });
});

describe('isInjectiveAddress', () => {
  it('returns true for a valid injective address', () => {
    expect(isInjectiveAddress('inj1validaddress')).toBe(true);
  });

  it('returns false when prefix does not match', () => {
    expect(isInjectiveAddress('osmo1validaddress')).toBe(false);
  });

  it('returns false for an invalid bech32 string', () => {
    expect(isInjectiveAddress('nope')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isInjectiveAddress('')).toBe(false);
  });
});

describe('isCoreumAddress', () => {
  it('returns true for a valid coreum address', () => {
    expect(isCoreumAddress('core1validaddress')).toBe(true);
  });

  it('returns false when prefix does not match', () => {
    expect(isCoreumAddress('inj1validaddress')).toBe(false);
  });

  it('returns false for an invalid bech32 string', () => {
    expect(isCoreumAddress('random')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isCoreumAddress('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Solana address validator
// ---------------------------------------------------------------------------

describe('isSolanaAddress', () => {
  it('returns true for a valid Solana public key', () => {
    expect(isSolanaAddress('validSolanaPublicKey')).toBe(true);
  });

  it('returns false for an invalid Solana public key', () => {
    expect(isSolanaAddress('not-a-valid-key')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isSolanaAddress('')).toBe(false);
  });
});
