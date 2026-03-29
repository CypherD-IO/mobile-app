import { countryMaster } from '../../../../assets/datasets/countryMaster';
import { BLINDPAY_PROHIBITED_COUNTRIES } from './blindpayCountryRisk';

/**
 * All countries from countryMaster, excluding BlindPay-prohibited countries.
 * Sorted alphabetically by name.
 */
export const BLINDPAY_COUNTRY_OPTIONS: ReadonlyArray<{
  code: string;
  name: string;
  flag: string;
}> = countryMaster
  .filter(c => c.Iso2 && !BLINDPAY_PROHIBITED_COUNTRIES.has(c.Iso2))
  .map(c => ({ code: c.Iso2!, name: c.name, flag: c.unicode_flag ?? '' }))
  .sort((a, b) => a.name.localeCompare(b.name));
