export interface CountryCodesWithFlags {
  Iso2: string;
  Iso3?: string;
  code?: string;
  dial_code: string;
  flag?: string;
  unicode_flag: string;
  name: string;
  preferred?: true;
  currency?: string;
}
