/**
 * Unit tests for merchantUtils — merchant logo display helpers.
 */
import { getMerchantLogoProps } from '../merchantUtils';
import { MerchantLike } from '../../models/merchantLogo.interface';

describe('getMerchantLogoProps', () => {
  // ── hasLogo ──────────────────────────────────────────────────────────
  describe('hasLogo', () => {
    it('returns true when logoUrl is present', () => {
      const merchant: MerchantLike = {
        logoUrl: 'https://example.com/logo.png',
      };
      expect(getMerchantLogoProps(merchant).hasLogo).toBe(true);
    });

    it('returns false when logoUrl is undefined', () => {
      const merchant: MerchantLike = {};
      expect(getMerchantLogoProps(merchant).hasLogo).toBe(false);
    });

    it('returns false when logoUrl is empty string', () => {
      const merchant: MerchantLike = { logoUrl: '' };
      expect(getMerchantLogoProps(merchant).hasLogo).toBe(false);
    });
  });

  // ── logoUrl passthrough ──────────────────────────────────────────────
  describe('logoUrl', () => {
    it('passes through the merchant logoUrl', () => {
      const url = 'https://cdn.example.com/img.png';
      const merchant: MerchantLike = { logoUrl: url };
      expect(getMerchantLogoProps(merchant).logoUrl).toBe(url);
    });

    it('is undefined when merchant has no logoUrl', () => {
      const merchant: MerchantLike = { brand: 'Acme' };
      expect(getMerchantLogoProps(merchant).logoUrl).toBeUndefined();
    });
  });

  // ── Fallback text priority ───────────────────────────────────────────
  describe('fallback text priority', () => {
    it('prefers brand over canonicalName', () => {
      const merchant: MerchantLike = {
        brand: 'BrandX',
        canonicalName: 'Canonical',
      };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('BrandX');
    });

    it('falls back to canonicalName when brand is undefined', () => {
      // "Canonical" is 9 chars → first word "Canonical" → truncated to 8 = "Canonica"
      const merchant: MerchantLike = { canonicalName: 'Canonical' };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('Canonica');
    });

    it('returns "?" when both brand and canonicalName are missing', () => {
      const merchant: MerchantLike = {};
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('?');
    });

    it('returns "?" when brand and canonicalName are empty strings', () => {
      const merchant: MerchantLike = { brand: '', canonicalName: '' };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('?');
    });
  });

  // ── Fallback text truncation ─────────────────────────────────────────
  describe('fallback text truncation', () => {
    it('truncates names longer than 8 chars to 8', () => {
      const merchant: MerchantLike = { brand: 'Abcdefghij' }; // 10 chars
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('Abcdefgh');
    });

    it('keeps names of exactly 8 chars intact', () => {
      const merchant: MerchantLike = { brand: 'Abcdefgh' }; // 8 chars
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('Abcdefgh');
    });

    it('keeps names shorter than 8 chars intact', () => {
      const merchant: MerchantLike = { brand: 'Short' };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('Short');
    });
  });

  // ── First word extraction ────────────────────────────────────────────
  describe('first word extraction', () => {
    it('extracts first word from multi-word name', () => {
      const merchant: MerchantLike = { brand: 'Whole Foods Market' };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('Whole');
    });

    it('uses full name when single word', () => {
      const merchant: MerchantLike = { brand: 'Target' };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('Target');
    });
  });

  // ── Font size rules ──────────────────────────────────────────────────
  describe('fontSize', () => {
    it('returns 6 for display text of 8+ chars', () => {
      const merchant: MerchantLike = { brand: 'Abcdefgh' }; // exactly 8
      expect(getMerchantLogoProps(merchant).fontSize).toBe(6);
    });

    it('returns 6 for display text truncated to 8 chars', () => {
      const merchant: MerchantLike = { brand: 'VeryLongBrandName' };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('VeryLong');
      expect(getMerchantLogoProps(merchant).fontSize).toBe(6);
    });

    it('returns 7 for display text of 6-7 chars', () => {
      const merchant6: MerchantLike = { brand: 'Costco' }; // 6 chars
      expect(getMerchantLogoProps(merchant6).fontSize).toBe(7);

      const merchant7: MerchantLike = { brand: 'Safeway' }; // 7 chars
      expect(getMerchantLogoProps(merchant7).fontSize).toBe(7);
    });

    it('returns 7 for display text of 5 chars or fewer', () => {
      const merchant: MerchantLike = { brand: 'Nike' }; // 4 chars
      expect(getMerchantLogoProps(merchant).fontSize).toBe(7);
    });

    it('returns 18 for "?" fallback', () => {
      const merchant: MerchantLike = {};
      expect(getMerchantLogoProps(merchant).fontSize).toBe(18);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('handles empty object', () => {
      const result = getMerchantLogoProps({});
      expect(result.hasLogo).toBe(false);
      expect(result.fallbackText).toBe('?');
      expect(result.fontSize).toBe(18);
      expect(result.logoUrl).toBeUndefined();
    });

    it('handles all undefined fields', () => {
      const merchant: MerchantLike = {
        brand: undefined,
        canonicalName: undefined,
        name: undefined,
        logoUrl: undefined,
      };
      const result = getMerchantLogoProps(merchant);
      expect(result.hasLogo).toBe(false);
      expect(result.fallbackText).toBe('?');
    });

    it('handles name with leading spaces', () => {
      // split(' ')[0] on " Hello" yields "" (empty first segment)
      const merchant: MerchantLike = { brand: ' Hello' };
      expect(getMerchantLogoProps(merchant).fallbackText).toBe('');
    });

    it('accepts optional size parameter without error', () => {
      const merchant: MerchantLike = { brand: 'Test' };
      expect(() => getMerchantLogoProps(merchant, 128)).not.toThrow();
    });
  });
});
