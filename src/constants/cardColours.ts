import AppImages from '../../assets/images/appImages';

/**
 * Available card color options for card customization
 */
export const CARD_COLOURS = [
  {
    id: 'mimosa',
    name: 'Mimosa',
    hex: '#D4A534',
    cardImage: AppImages.CARD_MIMOSA,
  },
  {
    id: 'zedBlue',
    name: 'Zed Blue',
    hex: '#5B7FD3',
    cardImage: AppImages.CARD_ZED_BLUE,
  },
  {
    id: 'crimson',
    name: 'Crimson',
    hex: '#E8747C',
    cardImage: AppImages.CARD_CRIMSON,
  },
  {
    id: 'venial',
    name: 'Venial',
    hex: '#E8E8E8',
    cardImage: AppImages.CARD_VENIAL,
  },
  {
    id: 'electricLime',
    name: 'Electric Lime',
    hex: '#6EE7A0',
    cardImage: AppImages.CARD_ELECTRIC_LIME,
  },
  {
    id: 'jetBlack',
    name: 'Jet Black',
    hex: '#2D3436',
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
