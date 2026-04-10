/** Lowercase English name → ISO 3166-2 subdivision code (US). */
const US_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

const US_CODE_SET = new Set(Object.values(US_NAME_TO_CODE));

/** Lowercase English / common French name → ISO 3166-2 subdivision code (CA). */
const CA_NAME_TO_CODE: Record<string, string> = {
  alberta: 'AB',
  'british columbia': 'BC',
  manitoba: 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'northwest territories': 'NT',
  'nova scotia': 'NS',
  nunavut: 'NU',
  ontario: 'ON',
  'prince edward island': 'PE',
  quebec: 'QC',
  québec: 'QC',
  saskatchewan: 'SK',
  yukon: 'YT',
};

const CA_CODE_SET = new Set(Object.values(CA_NAME_TO_CODE));

function canonicalSubdivisionCode(countryIso2: string, input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const iso = countryIso2.toUpperCase();
  const lower = trimmed.toLowerCase();

  if (iso === 'US') {
    const byName = US_NAME_TO_CODE[lower];
    if (byName) {
      return byName;
    }
    const upper = trimmed.toUpperCase();
    if (US_CODE_SET.has(upper)) {
      return upper;
    }
    return upper;
  }

  if (iso === 'CA') {
    const byName = CA_NAME_TO_CODE[lower];
    if (byName) {
      return byName;
    }
    const upper = trimmed.toUpperCase();
    if (CA_CODE_SET.has(upper)) {
      return upper;
    }
    return upper;
  }

  return trimmed.toUpperCase();
}

/**
 * Whether two state/province strings refer to the same subdivision for the
 * given country (e.g. "California" vs "CA" for US).
 */
export function subdivisionsEquivalent(
  countryIso2: string,
  a: string,
  b: string,
): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) {
    return true;
  }

  const ca = canonicalSubdivisionCode(countryIso2, left);
  const cb = canonicalSubdivisionCode(countryIso2, right);
  if (ca && cb && ca === cb) {
    return true;
  }

  return left.toLowerCase() === right.toLowerCase();
}
