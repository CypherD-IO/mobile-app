import AppImages from '../../assets/images/appImages';

/**
 * Available card color options for card customization
 */
export const CARD_COLOURS = [
  {
    id: 'mimosa',
    name: 'Mimosa',
    hex: '#D4A534',
    textColor: '#000000',
    cardImage: AppImages.CARD_MIMOSA,
  },
  {
    id: 'zedBlue',
    name: 'Zed Blue',
    hex: '#5B7FD3',
    textColor: '#FFFFFF',
    cardImage: AppImages.CARD_ZED_BLUE,
  },
  {
    id: 'crimson',
    name: 'Crimson',
    hex: '#E8747C',
    textColor: '#FFFFFF',
    cardImage: AppImages.CARD_CRIMSON,
  },
  {
    id: 'venial',
    name: 'Venial',
    hex: '#E8E8E8',
    textColor: '#000000',
    cardImage: AppImages.CARD_VENIAL,
  },
  {
    id: 'electricLime',
    name: 'Electric Lime',
    hex: '#6EE7A0',
    textColor: '#000000',
    cardImage: AppImages.CARD_ELECTRIC_LIME,
  },
  {
    id: 'jetBlack',
    name: 'Jet Black',
    hex: '#2D3436',
    textColor: '#FFFFFF',
    cardImage: AppImages.CARD_JET_BLACK,
  },
] as const;

/** Type for a single card color option */
export type CardColor = (typeof CARD_COLOURS)[number];

/** Default card color (Mimosa) */
export const DEFAULT_CARD_COLOUR = CARD_COLOURS[0];

/**
 * Find a card color by hex code
 * @param hex - The hex color code to search for
 * @returns The matching CardColor or the default (Mimosa)
 */
export const getCardColorByHex = (hex: string | undefined): CardColor => {
  if (!hex) return DEFAULT_CARD_COLOUR;
  return (
    CARD_COLOURS.find(c => c.hex.toLowerCase() === hex.toLowerCase()) ??
    DEFAULT_CARD_COLOUR
  );
};

/**
 * Gradient colors for the card controls background, keyed by card color id.
 */
const CARD_GRADIENT_COLORS: Record<string, [string, string]> = {
  jetBlack: ['rgba(9, 30, 66, 0.5)', 'rgba(23, 76, 168, 0.5)'],
  mimosa: ['#694C00', '#E7A700'],
  zedBlue: ['rgba(58, 58, 58, 0.5)', 'rgba(0, 43, 162, 0.5)'],
  crimson: ['rgba(95, 0, 24, 0.5)', 'rgba(255, 0, 23, 0.5)'],
  electricLime: ['rgba(0, 21, 12, 0.5)', 'rgba(37, 191, 73, 0.5)'],
  metal: ['rgba(9, 30, 66, 0.5)', 'rgba(23, 76, 168, 0.5)'],
};

const DEFAULT_GRADIENT: [string, string] = ['#694C00', '#E7A700'];

/**
 * Get gradient colors for the card controls background based on card properties.
 * @param cardColorHex - The card's color hex code (e.g., '#2D3436')
 * @param isPhysical - Whether the card is a physical card
 * @param isMetal - Whether the physical card is a metal card
 * @returns Tuple of [startColor, endColor] for the gradient
 */
export const getCardGradientColors = (
  cardColorHex: string | undefined,
  isPhysical: boolean,
  isMetal: boolean,
): [string, string] => {
  if (isPhysical) {
    return isMetal ? CARD_GRADIENT_COLORS.metal : DEFAULT_GRADIENT;
  }

  const colorInfo = getCardColorByHex(cardColorHex);
  return CARD_GRADIENT_COLORS[colorInfo.id] ?? DEFAULT_GRADIENT;
};
