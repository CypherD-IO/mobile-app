/**
 * Unit tests for useWeb3/util.ts — pure utility functions.
 *
 * Covers:
 *  - JSONUint8Array (parse, stringify, wrap, unwrap)
 *    Also exercises the private toHex / fromHex helpers indirectly.
 *  - checkAndValidateADR36AminoSignDoc
 */

// Mock the deep dependency chain that reaches JSX (server -> appImages -> themeReducer)
jest.mock('../../../constants/config', () => ({
  EmbedChainInfos: [],
}));

jest.mock('../../../constants/server', () => ({
  BASE_GAS_LIMIT: 21000,
  CHAIN_OPTIMISM: { backendName: 'optimism' },
  OPTIMISM_GAS_MULTIPLIER: 1.3,
  CONTRACT_GAS_MULTIPLIER: 1.5,
  OP_ETH_ADDRESS: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000',
  CHAIN_BSC: { backendName: 'bsc' },
  GAS_MULTIPLIER_NATIVE_TOKENS: 1.2,
}));

import {
  JSONUint8Array,
  checkAndValidateADR36AminoSignDoc,
} from '../util';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid ADR-36 signDoc. Override individual fields via `overrides`. */
function makeADR36SignDoc(
  overrides: Record<string, unknown> = {},
  msgOverrides: Record<string, unknown> = {},
) {
  const base = {
    chain_id: '',
    account_number: '0',
    sequence: '0',
    fee: { gas: '0', amount: [] },
    memo: '',
    msgs: [
      {
        type: 'sign/MsgSignData',
        value: {
          signer: 'cosmos1validaddr',
          data: Buffer.from('hello').toString('base64'),
          ...msgOverrides,
        },
      },
    ],
    ...overrides,
  };
  return base;
}

// ---------------------------------------------------------------------------
// JSONUint8Array — also exercises toHex / fromHex indirectly
// ---------------------------------------------------------------------------

describe('JSONUint8Array', () => {
  // --- stringify / parse round-trip ---

  describe('stringify + parse round-trip', () => {
    it('round-trips a Uint8Array through serialize/deserialize', () => {
      const original = { payload: new Uint8Array([0, 1, 127, 255]) };
      const json = JSONUint8Array.stringify(original);

      // The serialized form should contain the hex-prefixed sentinel.
      expect(json).toContain('__uint8array__');
      expect(json).toContain('00017fff'); // hex of [0,1,127,255]

      const restored = JSONUint8Array.parse(json);
      expect(restored.payload).toBeInstanceOf(Uint8Array);
      expect(Array.from(restored.payload)).toEqual([0, 1, 127, 255]);
    });

    it('round-trips an empty Uint8Array', () => {
      const original = { buf: new Uint8Array([]) };
      const json = JSONUint8Array.stringify(original);
      const restored = JSONUint8Array.parse(json);
      expect(restored.buf).toBeInstanceOf(Uint8Array);
      expect(restored.buf.length).toBe(0);
    });

    it('handles nested Uint8Arrays', () => {
      const original = {
        a: new Uint8Array([10, 20]),
        nested: { b: new Uint8Array([30]) },
      };
      const restored = JSONUint8Array.parse(JSONUint8Array.stringify(original));
      expect(Array.from(restored.a)).toEqual([10, 20]);
      expect(Array.from(restored.nested.b)).toEqual([30]);
    });
  });

  // --- stringify: Buffer-shaped objects ---

  describe('stringify', () => {
    it('converts { type: "Buffer", data: [...] } objects to hex sentinel', () => {
      const obj = { key: { type: 'Buffer', data: [72, 101, 108] } };
      const json = JSONUint8Array.stringify(obj);
      expect(json).toContain('__uint8array__48656c'); // hex of [72,101,108]
    });

    it('leaves normal strings and numbers untouched', () => {
      const obj = { name: 'alice', age: 30 };
      expect(JSONUint8Array.stringify(obj)).toBe(JSON.stringify(obj));
    });

    it('throws on __proto__ key (prototype poisoning)', () => {
      const evil = Object.create(null);
      evil['__proto__'] = 'gotcha';
      evil.ok = true;

      expect(() => JSONUint8Array.stringify(evil)).toThrow(
        '__proto__ is disallowed',
      );
    });
  });

  // --- parse ---

  describe('parse', () => {
    it('converts __uint8array__ sentinel strings back to Uint8Array', () => {
      const json = '{"data":"__uint8array__ff00"}';
      const result = JSONUint8Array.parse(json);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(Array.from(result.data)).toEqual([255, 0]);
    });

    it('leaves normal strings alone', () => {
      const json = '{"msg":"hello"}';
      expect(JSONUint8Array.parse(json)).toEqual({ msg: 'hello' });
    });

    it('throws on __proto__ key', () => {
      const json = '{"__proto__":"evil"}';
      expect(() => JSONUint8Array.parse(json)).toThrow(
        '__proto__ is disallowed',
      );
    });
  });

  // --- fromHex edge cases (tested indirectly through parse) ---

  describe('fromHex (via parse)', () => {
    it('throws on odd-length hex string', () => {
      const json = '{"data":"__uint8array__abc"}'; // 3 hex chars = odd
      expect(() => JSONUint8Array.parse(json)).toThrow(
        'hex string length must be a multiple of 2',
      );
    });

    it('throws on invalid hex characters', () => {
      const json = '{"data":"__uint8array__zzzz"}';
      expect(() => JSONUint8Array.parse(json)).toThrow(
        'hex string contains invalid characters',
      );
    });

    it('handles uppercase hex characters', () => {
      const json = '{"data":"__uint8array__FF00"}';
      const result = JSONUint8Array.parse(json);
      expect(Array.from(result.data)).toEqual([255, 0]);
    });
  });

  // --- wrap ---

  describe('wrap', () => {
    it('converts Uint8Array to plain JSON-compatible objects', () => {
      const obj = { buf: new Uint8Array([1, 2, 3]) };
      const wrapped = JSONUint8Array.wrap(obj);

      // After wrap, buf should be a hex-sentinel string (not a Uint8Array).
      expect(wrapped.buf).toBe('__uint8array__010203');
    });

    it('returns undefined for undefined input', () => {
      expect(JSONUint8Array.wrap(undefined)).toBeUndefined();
    });
  });

  // --- unwrap ---

  describe('unwrap', () => {
    it('restores Uint8Array from a previously-wrapped object', () => {
      const original = { buf: new Uint8Array([4, 5, 6]) };
      const wrapped = JSONUint8Array.wrap(original);
      const unwrapped = JSONUint8Array.unwrap(wrapped);

      expect(unwrapped.buf).toBeInstanceOf(Uint8Array);
      expect(Array.from(unwrapped.buf)).toEqual([4, 5, 6]);
    });

    it('returns undefined for undefined input', () => {
      expect(JSONUint8Array.unwrap(undefined)).toBeUndefined();
    });

    it('handles objects with no Uint8Arrays as a no-op round-trip', () => {
      const plain = { x: 1, y: 'two' };
      expect(JSONUint8Array.unwrap(JSONUint8Array.wrap(plain))).toEqual(plain);
    });
  });

  // --- toHex edge cases (tested indirectly through stringify) ---

  describe('toHex (via stringify)', () => {
    it('pads single-digit hex bytes with leading zero', () => {
      const obj = { buf: new Uint8Array([0x0a]) };
      const json = JSONUint8Array.stringify(obj);
      expect(json).toContain('__uint8array__0a');
    });

    it('handles all-zero bytes', () => {
      const obj = { buf: new Uint8Array([0, 0, 0]) };
      const json = JSONUint8Array.stringify(obj);
      expect(json).toContain('__uint8array__000000');
    });
  });
});

// ---------------------------------------------------------------------------
// checkAndValidateADR36AminoSignDoc
// ---------------------------------------------------------------------------

describe('checkAndValidateADR36AminoSignDoc', () => {
  describe('valid sign docs', () => {
    it('returns true for a well-formed ADR-36 signDoc', () => {
      const signDoc = makeADR36SignDoc();
      expect(
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toBe(true);
    });

    it('returns true with different bech32 prefix', () => {
      const signDoc = makeADR36SignDoc({}, { signer: 'osmo1someaddress' });
      expect(
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'osmo'),
      ).toBe(true);
    });
  });

  describe('returns false (non-ADR-36)', () => {
    it('returns false when msgs is empty', () => {
      const signDoc = makeADR36SignDoc({ msgs: [] });
      expect(
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toBe(false);
    });

    it('returns false when msg type is not sign/MsgSignData', () => {
      const signDoc = makeADR36SignDoc({
        msgs: [
          {
            type: 'cosmos-sdk/MsgSend',
            value: { signer: 'cosmos1x', data: 'aGVsbG8=' },
          },
        ],
      });
      expect(
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toBe(false);
    });

    it('returns false when there are multiple msgs', () => {
      const msg = {
        type: 'sign/MsgSignData',
        value: {
          signer: 'cosmos1x',
          data: Buffer.from('hi').toString('base64'),
        },
      };
      const signDoc = makeADR36SignDoc({ msgs: [msg, msg] });
      expect(
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toBe(false);
    });
  });

  describe('throws on invalid fields', () => {
    it('throws if chain_id is non-empty', () => {
      const signDoc = makeADR36SignDoc({ chain_id: 'cosmoshub-4' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Chain id should be empty string for ADR-36 signing');
    });

    it('throws if memo is non-empty', () => {
      const signDoc = makeADR36SignDoc({ memo: 'some memo' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Memo should be empty string for ADR-36 signing');
    });

    it('throws if account_number is not "0"', () => {
      const signDoc = makeADR36SignDoc({ account_number: '5' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Account number should be "0" for ADR-36 signing');
    });

    it('throws if sequence is not "0"', () => {
      const signDoc = makeADR36SignDoc({ sequence: '1' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Sequence should be "0" for ADR-36 signing');
    });

    it('throws if fee.gas is not "0"', () => {
      const signDoc = makeADR36SignDoc({
        fee: { gas: '200000', amount: [] },
      });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Gas should be "0" for ADR-36 signing');
    });

    it('throws if fee.amount is non-empty', () => {
      const signDoc = makeADR36SignDoc({
        fee: { gas: '0', amount: [{ denom: 'uatom', amount: '1' }] },
      });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Fee amount should be empty array for ADR-36 signing');
    });

    it('throws if signer prefix does not match bech32PrefixAccAddr', () => {
      const signDoc = makeADR36SignDoc({}, { signer: 'osmo1wrongprefix' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Singer prefix mismatch');
    });

    it('throws if signer is empty', () => {
      const signDoc = makeADR36SignDoc({}, { signer: '' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Empty signer in the ADR-36 msg');
    });

    it('throws if msg value is empty', () => {
      const signDoc = makeADR36SignDoc({
        msgs: [{ type: 'sign/MsgSignData', value: null }],
      });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Empty value in the msg');
    });

    it('throws if data is missing', () => {
      const signDoc = makeADR36SignDoc({}, { data: '' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Empty data in the ADR-36 msg');
    });

    it('throws if data is not valid base64', () => {
      const signDoc = makeADR36SignDoc({}, { data: '!!!not-base64!!!' });
      expect(() =>
        checkAndValidateADR36AminoSignDoc(signDoc as any, 'cosmos'),
      ).toThrow('Data is not encoded by base64');
    });
  });
});
