/**
 * Unit tests for DecimalHelper — pure decimal math utilities.
 * Starter file to verify Jest unit test setup works.
 */
import { DecimalHelper } from '../decimalHelper';

describe('DecimalHelper', () => {
  describe('fromString', () => {
    it('converts string to Decimal', () => {
      expect(DecimalHelper.fromString('123.45').toString()).toBe('123.45');
    });

    it('handles empty string as zero', () => {
      expect(DecimalHelper.fromString('').toString()).toBe('0');
    });

    it('handles numbers', () => {
      expect(DecimalHelper.fromString(42).toString()).toBe('42');
    });
  });

  describe('add', () => {
    it('adds two values', () => {
      expect(DecimalHelper.add('1.1', '2.2').toString()).toBe('3.3');
    });

    it('handles zero', () => {
      expect(DecimalHelper.add('5', '0').toString()).toBe('5');
    });
  });

  describe('subtract', () => {
    it('subtracts two values', () => {
      expect(DecimalHelper.subtract('5.5', '2.2').toString()).toBe('3.3');
    });

    it('handles negative results', () => {
      expect(DecimalHelper.subtract('1', '3').toString()).toBe('-2');
    });
  });

  describe('multiply', () => {
    it('multiplies two values', () => {
      expect(DecimalHelper.multiply('3', '4').toString()).toBe('12');
    });

    it('handles decimals without floating-point errors', () => {
      expect(DecimalHelper.multiply('0.1', '0.2').toString()).toBe('0.02');
    });
  });

  describe('divide', () => {
    it('divides two values', () => {
      expect(DecimalHelper.divide('10', '4').toString()).toBe('2.5');
    });
  });

  describe('comparisons', () => {
    it('isGreaterThan', () => {
      expect(DecimalHelper.isGreaterThan('5', '3')).toBe(true);
      expect(DecimalHelper.isGreaterThan('3', '5')).toBe(false);
    });

    it('isLessThan', () => {
      expect(DecimalHelper.isLessThan('3', '5')).toBe(true);
      expect(DecimalHelper.isLessThan('5', '3')).toBe(false);
    });
  });
});
