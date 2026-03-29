/**
 * ISO 3166-1 alpha-2 codes for countries prohibited by BlindPay.
 * Receivers from these countries cannot onboard.
 */
export const BLINDPAY_PROHIBITED_COUNTRIES = new Set([
  'AF', 'BY', 'CD', 'CF', 'CG', 'CU', 'GN', 'IR', 'IQ', 'KP',
  'LY', 'ML', 'MM', 'NG', 'PS', 'QA', 'RU', 'SD', 'SO', 'SS',
  'SY', 'UA', 'VE', 'YE',
]);

/**
 * ISO 3166-1 alpha-2 codes for countries BlindPay classifies as high-risk.
 * Receivers from these countries require Enhanced KYC (source of funds + purpose).
 */
export const BLINDPAY_HIGH_RISK_COUNTRIES = new Set([
  'AI', 'AO', 'AS', 'BB', 'BF', 'BG', 'BI', 'BJ', 'BL', 'BO',
  'BQ', 'BS', 'BW', 'CC', 'CI', 'CK', 'CM', 'CO', 'CX', 'DJ',
  'DM', 'DZ', 'EG', 'EH', 'ER', 'ET', 'FJ', 'GA', 'GH', 'GQ',
  'GT', 'GU', 'GW', 'HT', 'IO', 'JM', 'KE', 'KG', 'KH', 'KI',
  'KM', 'KW', 'LA', 'LB', 'LR', 'MC', 'MD', 'MF', 'MG', 'MP',
  'MR', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NI', 'NP', 'PA', 'PG',
  'PK', 'PM', 'RW', 'SB', 'SL', 'SN', 'SR', 'SV', 'SX', 'SZ',
  'TD', 'TG', 'TJ', 'TK', 'TM', 'TN', 'TO', 'TT', 'TZ', 'UG',
  'VG', 'VI', 'VN', 'VU', 'WS', 'ZA', 'ZM', 'ZW',
]);

export function isHighRiskCountry(code: string): boolean {
  return BLINDPAY_HIGH_RISK_COUNTRIES.has(code.toUpperCase());
}
