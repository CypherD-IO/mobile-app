/**
 * Predefined card tag options
 * Tag is stored as "emoji name" combined string in backend
 */
export const PREDEFINED_CARD_TAGS = [
  { emoji: '🛍️', name: 'Shopping' },
  { emoji: '✈️', name: 'Travel' },
  { emoji: '🌐', name: 'E-commerce' },
  { emoji: '📋', name: 'Bills & Subscription' },
  { emoji: '🧳', name: 'International Card' },
  { emoji: '⛽', name: 'Fuel Card' },
  { emoji: '🎬', name: 'Entertainment Card' },
  { emoji: '🚗', name: 'Emergency Card' },
] as const;

export type PredefinedCardTag = (typeof PREDEFINED_CARD_TAGS)[number];

/** Combines emoji and name into the stored format */
export const formatCardTag = (emoji: string, name: string): string => {
  return `${emoji} ${name}`.trim();
};

/** Parses a stored tag into emoji and name parts */
export const parseCardTag = (tag: string): { emoji: string; name: string } => {
  // Split on the first space character, assuming emoji does not have spaces
  const firstSpaceIdx = tag.indexOf(' ');
  if (firstSpaceIdx > 0) {
    const emoji = tag.slice(0, firstSpaceIdx);
    const name = tag.slice(firstSpaceIdx + 1);
    return { emoji, name };
  }
  // If there is no space, treat the whole tag as the name
  return { emoji: '', name: tag };
};
