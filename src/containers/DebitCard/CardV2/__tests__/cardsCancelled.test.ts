import { shouldShowCancelledCards } from '../cardsCancelled';

describe('shouldShowCancelledCards', () => {
  it('is true when sunset on, cards loaded, and 0 active cards', () => {
    expect(shouldShowCancelledCards(true, true, 0)).toBe(true);
  });

  it('is false while cards are still loading', () => {
    expect(shouldShowCancelledCards(true, false, 0)).toBe(false);
  });

  it('is false when there are active cards', () => {
    expect(shouldShowCancelledCards(true, true, 2)).toBe(false);
  });

  it('is false when the sunset flag is off', () => {
    expect(shouldShowCancelledCards(false, true, 0)).toBe(false);
  });
});
