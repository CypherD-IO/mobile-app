import { BLINDPAY_COUNTRIES } from '../countries';
import { BLINDPAY_PROHIBITED_COUNTRIES } from './blindpayCountryRisk';

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

/**
 * All BlindPay countries, excluding prohibited countries.
 * Sorted alphabetically by name.
 */
export const BLINDPAY_COUNTRY_OPTIONS: ReadonlyArray<{
  code: string;
  name: string;
  flag: string;
}> = BLINDPAY_COUNTRIES
  .filter(c => !BLINDPAY_PROHIBITED_COUNTRIES.has(c.value))
  .map(c => ({ code: c.value, name: c.label, flag: countryFlag(c.value) }));
