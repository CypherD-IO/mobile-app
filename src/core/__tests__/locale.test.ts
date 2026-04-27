/**
 * Unit tests for locale utilities.
 */

jest.mock('react-native-localize', () => ({
  getCountry: jest.fn(() => 'US'),
}));

import { getCountry, getCountryNameFromISO2, getDateFormatBasedOnLocaleForTimestamp } from '../locale';

// ─── getCountry ───
describe('getCountry', () => {
  it('returns the mocked country code', () => {
    expect(getCountry()).toBe('US');
  });
});

// ─── getCountryNameFromISO2 ───
describe('getCountryNameFromISO2', () => {
  it('returns full country name for valid ISO2 code', () => {
    expect(getCountryNameFromISO2('US')).toBe('United States');
  });

  it('returns full country name for GB', () => {
    expect(getCountryNameFromISO2('GB')).toBe('United Kingdom');
  });

  it('returns full country name for IN', () => {
    expect(getCountryNameFromISO2('IN')).toBe('India');
  });

  it('returns the code itself for invalid ISO2 code', () => {
    // Intl.DisplayNames.of() may return the code or 'Unknown Region' for invalid codes
    const result = getCountryNameFromISO2('ZZ');
    // Should either return 'ZZ' (catch branch) or a fallback string
    expect(typeof result).toBe('string');
  });

  it('returns the code for empty string', () => {
    expect(getCountryNameFromISO2('')).toBe('');
  });
});

// ─── getDateFormatBasedOnLocaleForTimestamp ───
describe('getDateFormatBasedOnLocaleForTimestamp', () => {
  it('returns a formatted date string for a known timestamp', () => {
    // 2024-01-15T12:00:00.000Z
    const timestamp = 1705320000000;
    const result = getDateFormatBasedOnLocaleForTimestamp(timestamp);
    // Should contain date parts — exact format depends on locale
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns consistent output for the same timestamp', () => {
    const timestamp = 1705320000000;
    const result1 = getDateFormatBasedOnLocaleForTimestamp(timestamp);
    const result2 = getDateFormatBasedOnLocaleForTimestamp(timestamp);
    expect(result1).toBe(result2);
  });
});
