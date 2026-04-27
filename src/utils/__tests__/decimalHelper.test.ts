/**
 * Comprehensive unit tests for DecimalHelper — pure decimal math utilities.
 * Covers all exported functions with edge cases.
 */
import Decimal from 'decimal.js';
import { DecimalHelper } from '../decimalHelper';

describe('DecimalHelper', () => {
  // ─── fromString ───────────────────────────────────────────────────────

  describe('fromString', () => {
    it('converts a numeric string', () => {
      expect(DecimalHelper.fromString('123.45').toString()).toBe('123.45');
    });

    it('converts a number', () => {
      expect(DecimalHelper.fromString(42).toString()).toBe('42');
    });

    it('passes through an existing Decimal instance unchanged', () => {
      const d = new Decimal('99.99');
      const result = DecimalHelper.fromString(d);
      expect(result).toBe(d); // same reference, not a copy
    });

    it('converts a bigint', () => {
      const big = BigInt('1000000000000000000');
      expect(DecimalHelper.fromString(big).toString()).toBe(
        '1000000000000000000',
      );
    });

    it('returns 0 for an empty string', () => {
      expect(DecimalHelper.fromString('').toString()).toBe('0');
    });

    it('returns 0 for an invalid string', () => {
      expect(DecimalHelper.fromString('not-a-number').toString()).toBe('0');
    });

    it('handles negative values', () => {
      expect(DecimalHelper.fromString('-7.5').toString()).toBe('-7.5');
    });

    it('handles zero string', () => {
      expect(DecimalHelper.fromString('0').toString()).toBe('0');
    });

    it('handles very small decimals', () => {
      // toExpNeg is set to -18, so exactly 1e-18 uses scientific notation
      const result = DecimalHelper.fromString('0.00000000000000001');
      expect(result.toString()).toBe('0.00000000000000001');
    });
  });

  // ─── add ──────────────────────────────────────────────────────────────

  describe('add', () => {
    it('adds two string values', () => {
      expect(DecimalHelper.add('1.1', '2.2').toString()).toBe('3.3');
    });

    it('adds with zero', () => {
      expect(DecimalHelper.add('5', '0').toString()).toBe('5');
    });

    it('adds negative numbers', () => {
      expect(DecimalHelper.add('10', '-3').toString()).toBe('7');
    });

    it('adds an array of values to the initial value', () => {
      const result = DecimalHelper.add('10', ['1', '2', '3']);
      expect(result.toString()).toBe('16');
    });

    it('adds an array with a single element', () => {
      expect(DecimalHelper.add('5', ['7']).toString()).toBe('12');
    });

    it('adds an array with mixed types', () => {
      const result = DecimalHelper.add(1, [new Decimal('2'), '3', 4]);
      expect(result.toString()).toBe('10');
    });

    it('avoids floating-point imprecision (0.1 + 0.2)', () => {
      expect(DecimalHelper.add('0.1', '0.2').toString()).toBe('0.3');
    });
  });

  // ─── subtract ─────────────────────────────────────────────────────────

  describe('subtract', () => {
    it('subtracts two values', () => {
      expect(DecimalHelper.subtract('5.5', '2.2').toString()).toBe('3.3');
    });

    it('produces negative results', () => {
      expect(DecimalHelper.subtract('1', '3').toString()).toBe('-2');
    });

    it('subtracts an array of values sequentially', () => {
      const result = DecimalHelper.subtract('100', ['10', '20', '30']);
      expect(result.toString()).toBe('40');
    });

    it('subtracts an array with mixed types', () => {
      const result = DecimalHelper.subtract(50, [new Decimal('5'), '10', 15]);
      expect(result.toString()).toBe('20');
    });

    it('subtracting zero is a no-op', () => {
      expect(DecimalHelper.subtract('7', '0').toString()).toBe('7');
    });
  });

  // ─── multiply ─────────────────────────────────────────────────────────

  describe('multiply', () => {
    it('multiplies two values', () => {
      expect(DecimalHelper.multiply('3', '4').toString()).toBe('12');
    });

    it('handles decimals without floating-point errors', () => {
      expect(DecimalHelper.multiply('0.1', '0.2').toString()).toBe('0.02');
    });

    it('multiplies by zero', () => {
      expect(DecimalHelper.multiply('999', '0').toString()).toBe('0');
    });

    it('multiplies an array of values sequentially', () => {
      const result = DecimalHelper.multiply('2', ['3', '4', '5']);
      expect(result.toString()).toBe('120');
    });

    it('multiplies with negative values', () => {
      expect(DecimalHelper.multiply('-3', '4').toString()).toBe('-12');
      expect(DecimalHelper.multiply('-3', '-4').toString()).toBe('12');
    });
  });

  // ─── divide ───────────────────────────────────────────────────────────

  describe('divide', () => {
    it('divides two values', () => {
      expect(DecimalHelper.divide('10', '4').toString()).toBe('2.5');
    });

    it('divides an array of values sequentially', () => {
      const result = DecimalHelper.divide('1000', ['10', '5', '2']);
      expect(result.toString()).toBe('10');
    });

    it('divides by 1 is identity', () => {
      expect(DecimalHelper.divide('42', '1').toString()).toBe('42');
    });

    it('divides 0 by something returns 0', () => {
      expect(DecimalHelper.divide('0', '5').toString()).toBe('0');
    });

    it('returns Infinity when dividing by zero', () => {
      // Decimal.js returns Infinity rather than throwing
      const result = DecimalHelper.divide('10', '0');
      expect(result.toString()).toBe('Infinity');
    });
  });

  // ─── toString ─────────────────────────────────────────────────────────

  describe('toString', () => {
    it('converts without precision', () => {
      const d = new Decimal('3.14159');
      expect(DecimalHelper.toString(d)).toBe('3.14159');
    });

    it('floors to given precision (does not round up)', () => {
      const d = new Decimal('3.14159');
      expect(DecimalHelper.toString(d, 2)).toBe('3.14');
    });

    it('floors negative values toward zero', () => {
      const d = new Decimal('-3.149');
      expect(DecimalHelper.toString(d, 2)).toBe('-3.14');
    });

    it('treats precision=0 as falsy (returns full string)', () => {
      // In the source, `precision ? floor(...) : decimal.toString()`
      // 0 is falsy, so it takes the else branch
      const d = new Decimal('9.87');
      expect(DecimalHelper.toString(d, 0)).toBe('9.87');
    });

    it('does not add trailing zeros for whole numbers', () => {
      const d = new Decimal('5');
      expect(DecimalHelper.toString(d, 4)).toBe('5');
    });
  });

  // ─── comparison functions ─────────────────────────────────────────────

  describe('isGreaterThan', () => {
    it('returns true when a > b', () => {
      expect(DecimalHelper.isGreaterThan('5', '3')).toBe(true);
    });

    it('returns false when a < b', () => {
      expect(DecimalHelper.isGreaterThan('3', '5')).toBe(false);
    });

    it('returns false when equal', () => {
      expect(DecimalHelper.isGreaterThan('5', '5')).toBe(false);
    });

    it('works with numbers', () => {
      expect(DecimalHelper.isGreaterThan(10, 9.99)).toBe(true);
    });
  });

  describe('isLessThan', () => {
    it('returns true when a < b', () => {
      expect(DecimalHelper.isLessThan('3', '5')).toBe(true);
    });

    it('returns false when a > b', () => {
      expect(DecimalHelper.isLessThan('5', '3')).toBe(false);
    });

    it('returns false when equal', () => {
      expect(DecimalHelper.isLessThan('5', '5')).toBe(false);
    });

    it('works with negative values', () => {
      expect(DecimalHelper.isLessThan('-1', '0')).toBe(true);
    });
  });

  describe('isGreaterThanOrEqualTo', () => {
    it('returns true when a > b', () => {
      expect(DecimalHelper.isGreaterThanOrEqualTo('5', '3')).toBe(true);
    });

    it('returns true when a == b', () => {
      expect(DecimalHelper.isGreaterThanOrEqualTo('5', '5')).toBe(true);
    });

    it('returns false when a < b', () => {
      expect(DecimalHelper.isGreaterThanOrEqualTo('3', '5')).toBe(false);
    });
  });

  describe('isLessThanOrEqualTo', () => {
    it('returns true when a < b', () => {
      expect(DecimalHelper.isLessThanOrEqualTo('3', '5')).toBe(true);
    });

    it('returns true when a == b', () => {
      expect(DecimalHelper.isLessThanOrEqualTo('5', '5')).toBe(true);
    });

    it('returns false when a > b', () => {
      expect(DecimalHelper.isLessThanOrEqualTo('5', '3')).toBe(false);
    });
  });

  describe('isEqualTo', () => {
    it('returns true for equal values', () => {
      expect(DecimalHelper.isEqualTo('5', '5')).toBe(true);
    });

    it('returns true for different representations of the same value', () => {
      expect(DecimalHelper.isEqualTo('5.0', '5')).toBe(true);
    });

    it('returns false for different values', () => {
      expect(DecimalHelper.isEqualTo('5', '6')).toBe(false);
    });
  });

  describe('notEqual', () => {
    it('returns true for different values', () => {
      expect(DecimalHelper.notEqual('5', '6')).toBe(true);
    });

    it('returns false for equal values', () => {
      expect(DecimalHelper.notEqual('5', '5')).toBe(false);
    });

    it('returns false for different representations of the same value', () => {
      expect(DecimalHelper.notEqual('5.00', '5')).toBe(false);
    });
  });

  // ─── toNumber ─────────────────────────────────────────────────────────

  describe('toNumber', () => {
    it('converts string to JS number', () => {
      expect(DecimalHelper.toNumber('42.5')).toBe(42.5);
    });

    it('converts Decimal to JS number', () => {
      expect(DecimalHelper.toNumber(new Decimal('100'))).toBe(100);
    });

    it('returns 0 for zero', () => {
      expect(DecimalHelper.toNumber('0')).toBe(0);
    });

    it('handles negative values', () => {
      expect(DecimalHelper.toNumber('-3.14')).toBe(-3.14);
    });
  });

  // ─── pow ──────────────────────────────────────────────────────────────

  describe('pow', () => {
    it('computes simple exponents', () => {
      expect(DecimalHelper.pow(2, 10).toString()).toBe('1024');
    });

    it('handles exponent of 0', () => {
      expect(DecimalHelper.pow(5, 0).toString()).toBe('1');
    });

    it('handles exponent of 1', () => {
      expect(DecimalHelper.pow(7, 1).toString()).toBe('7');
    });

    it('handles base of 10 with large exponent (token decimals)', () => {
      expect(DecimalHelper.pow(10, 18).toString()).toBe(
        '1000000000000000000',
      );
    });

    it('handles negative exponents', () => {
      expect(DecimalHelper.pow(10, -2).toString()).toBe('0.01');
    });
  });

  // ─── toInteger / toDecimal (token unit conversions) ───────────────────

  describe('toInteger', () => {
    it('converts 1 ETH to wei (18 decimals)', () => {
      const wei = DecimalHelper.toInteger('1', 18);
      expect(wei.toString()).toBe('1000000000000000000');
    });

    it('converts 1.5 ETH to wei', () => {
      const wei = DecimalHelper.toInteger('1.5', 18);
      expect(wei.toString()).toBe('1500000000000000000');
    });

    it('converts 1 USDC to smallest unit (6 decimals)', () => {
      const micro = DecimalHelper.toInteger('1', 6);
      expect(micro.toString()).toBe('1000000');
    });

    it('converts fractional USDC', () => {
      const micro = DecimalHelper.toInteger('0.000001', 6);
      expect(micro.toString()).toBe('1');
    });

    it('handles 0 decimals (no scaling)', () => {
      expect(DecimalHelper.toInteger('42', 0).toString()).toBe('42');
    });
  });

  describe('toDecimal', () => {
    it('converts wei to ETH (18 decimals)', () => {
      const eth = DecimalHelper.toDecimal('1000000000000000000', 18);
      expect(eth.toString()).toBe('1');
    });

    it('converts 1.5 ETH worth of wei back', () => {
      const eth = DecimalHelper.toDecimal('1500000000000000000', 18);
      expect(eth.toString()).toBe('1.5');
    });

    it('converts USDC smallest unit to display (6 decimals)', () => {
      const usdc = DecimalHelper.toDecimal('1000000', 6);
      expect(usdc.toString()).toBe('1');
    });

    it('roundtrips: toDecimal(toInteger(x)) === x', () => {
      const original = '123.456789';
      const integer = DecimalHelper.toInteger(original, 18);
      const back = DecimalHelper.toDecimal(integer, 18);
      expect(back.toString()).toBe(original);
    });

    it('handles 0 decimals (no scaling)', () => {
      expect(DecimalHelper.toDecimal('42', 0).toString()).toBe('42');
    });
  });

  // ─── ceil / floor / round ─────────────────────────────────────────────

  describe('ceil', () => {
    it('rounds up positive values', () => {
      expect(DecimalHelper.ceil('3.141', 2).toString()).toBe('3.15');
    });

    it('does not change exact values', () => {
      expect(DecimalHelper.ceil('3.14', 2).toString()).toBe('3.14');
    });

    it('rounds up negative values (away from zero)', () => {
      expect(DecimalHelper.ceil('-3.141', 2).toString()).toBe('-3.15');
    });

    it('handles precision 0', () => {
      expect(DecimalHelper.ceil('3.1', 0).toString()).toBe('4');
    });
  });

  describe('floor', () => {
    it('truncates positive values toward zero', () => {
      expect(DecimalHelper.floor('3.149', 2).toString()).toBe('3.14');
    });

    it('does not change exact values', () => {
      expect(DecimalHelper.floor('3.14', 2).toString()).toBe('3.14');
    });

    it('truncates negative values toward zero', () => {
      expect(DecimalHelper.floor('-3.149', 2).toString()).toBe('-3.14');
    });

    it('handles precision 0', () => {
      expect(DecimalHelper.floor('3.9', 0).toString()).toBe('3');
    });
  });

  describe('round', () => {
    it('rounds down when < 0.5', () => {
      expect(DecimalHelper.round('3.144', 2).toString()).toBe('3.14');
    });

    it('rounds up when >= 0.5', () => {
      expect(DecimalHelper.round('3.145', 2).toString()).toBe('3.15');
    });

    it('does not change exact values', () => {
      expect(DecimalHelper.round('3.14', 2).toString()).toBe('3.14');
    });

    it('handles precision 0', () => {
      expect(DecimalHelper.round('3.5', 0).toString()).toBe('4');
      expect(DecimalHelper.round('3.4', 0).toString()).toBe('3');
    });

    it('handles negative values', () => {
      expect(DecimalHelper.round('-3.145', 2).toString()).toBe('-3.15');
    });
  });

  // ─── scientificNotationToNumberString ─────────────────────────────────

  describe('scientificNotationToNumberString', () => {
    it('converts scientific notation string to plain number string', () => {
      expect(DecimalHelper.scientificNotationToNumberString('1e-7')).toBe(
        '0.0000001',
      );
    });

    it('handles positive exponents', () => {
      expect(DecimalHelper.scientificNotationToNumberString('1.5e3')).toBe(
        '1500',
      );
    });

    it('passes through plain number strings unchanged', () => {
      expect(DecimalHelper.scientificNotationToNumberString('123.45')).toBe(
        '123.45',
      );
    });

    it('handles a plain number input', () => {
      expect(DecimalHelper.scientificNotationToNumberString(0.0000001)).toBe(
        '0.0000001',
      );
    });

    it('handles very small values', () => {
      // toExpNeg=-18 means 1e-17 expands but 1e-18 stays scientific
      expect(
        DecimalHelper.scientificNotationToNumberString('1e-17'),
      ).toBe('0.00000000000000001');
    });

    it('handles Decimal input', () => {
      const d = new Decimal('2.5e4');
      expect(DecimalHelper.scientificNotationToNumberString(d)).toBe('25000');
    });
  });
});
