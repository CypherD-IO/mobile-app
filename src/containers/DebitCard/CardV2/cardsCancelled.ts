/**
 * Whether the Card screen should render the sunset "cards cancelled" empty
 * state: the sunset is active, cards have finished loading, and there are no
 * active cards left.
 */
export const shouldShowCancelledCards = (
  isSunsetEnabled: boolean,
  cardsLoaded: boolean,
  activeCardCount: number,
): boolean => isSunsetEnabled && cardsLoaded && activeCardCount === 0;
