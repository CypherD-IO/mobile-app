/**
 * Unit tests for winddown date helpers.
 */
import { getDaysRemaining } from '../winddown';

describe('getDaysRemaining', () => {
  it('returns whole days until the target', () => {
    expect(
      getDaysRemaining('2026-10-06', new Date('2026-10-01T00:00:00Z')),
    ).toBe(5);
  });

  it('rounds partial days up', () => {
    expect(
      getDaysRemaining('2026-10-06', new Date('2026-10-04T06:00:00Z')),
    ).toBe(2);
  });

  it('returns 0 on the target day itself', () => {
    expect(
      getDaysRemaining('2026-10-06', new Date('2026-10-06T00:00:00Z')),
    ).toBe(0);
  });

  it('clamps to 0 when the target is in the past', () => {
    expect(
      getDaysRemaining('2026-10-06', new Date('2026-10-10T00:00:00Z')),
    ).toBe(0);
  });

  it('returns 0 for an invalid target date', () => {
    expect(
      getDaysRemaining('not-a-date', new Date('2026-01-01T00:00:00Z')),
    ).toBe(0);
  });

  it('returns 0 for an empty target (no hardcoded fallback)', () => {
    expect(getDaysRemaining('', new Date('2026-01-01T00:00:00Z'))).toBe(0);
  });
});
