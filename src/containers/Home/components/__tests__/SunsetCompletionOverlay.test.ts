import { shouldShowCompletion } from '../sunsetCompletion';

describe('shouldShowCompletion', () => {
  it('shows when sunset on, all steps complete, not dismissed', () => {
    expect(shouldShowCompletion(true, 4, 4, false)).toBe(true);
  });

  it('is hidden when not all steps are complete', () => {
    expect(shouldShowCompletion(true, 3, 4, false)).toBe(false);
  });

  it('is hidden once dismissed', () => {
    expect(shouldShowCompletion(true, 4, 4, true)).toBe(false);
  });

  it('is hidden when the sunset flag is off', () => {
    expect(shouldShowCompletion(false, 4, 4, false)).toBe(false);
  });

  it('is hidden when there are no steps', () => {
    expect(shouldShowCompletion(true, 0, 0, false)).toBe(false);
  });
});
