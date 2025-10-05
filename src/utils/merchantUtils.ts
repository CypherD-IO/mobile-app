import { MerchantLike } from '../models/merchantLogo.interface';

export interface MerchantLogoComputedProps {
  hasLogo: boolean;
  logoUrl?: string;
  fallbackText: string;
  fontSize: number;
}

const computeFallback = (
  merchant: MerchantLike,
): { text: string; fontSize: number } => {
  const name = merchant.brand ?? merchant.canonicalName ?? '';
  console.log('****************** name : ', name);
  if (!name) return { text: '?', fontSize: 18 };
  const firstWord = name.split(' ')[0];
  const display = firstWord.length > 8 ? firstWord.substring(0, 8) : firstWord;
  let fontSize = 7;
  if (display.length >= 8) fontSize = 6;
  else if (display.length > 5) fontSize = 7;
  return { text: display, fontSize };
};

export const getMerchantLogoProps = (
  merchant: MerchantLike,
  _size = 64,
): MerchantLogoComputedProps => {
  const hasLogo = Boolean(merchant?.logoUrl);
  const { text, fontSize } = computeFallback(merchant);
  return {
    hasLogo,
    logoUrl: merchant.logoUrl,
    fallbackText: text,
    fontSize,
  };
};
