import type { ApiFieldSchema } from '../types';
import type { FieldDef, FieldGroup, RailDef } from './railConfig';
import type { BlindpayBankAccountType } from '../types';

/** Convert snake_case to camelCase: `swift_code_bic` → `swiftCodeBic` */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** Convert camelCase to snake_case: `swiftCodeBic` → `swift_code_bic` */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

// ── Grouping rules per rail type ──
// Each rule: { title, match(camelCaseKey) => boolean }
// Fields are assigned to the FIRST matching group.
// Unmatched fields go into "Additional Details" at the end.

interface GroupRule {
  title: string;
  match: (key: string) => boolean;
  helpText?: string;
}

const SWIFT_ACCOUNT_KEYS = new Set([
  'recipientRelationship', 'accountClass', 'swiftCodeBic',
  'swiftAccountHolderName', 'swiftAccountNumberIban',
]);

const US_ACCOUNT_KEYS = new Set([
  'recipientRelationship', 'beneficiaryName', 'routingNumber',
  'accountNumber', 'accountType', 'accountClass',
]);

const US_ADDRESS_KEYS = new Set([
  'addressLine1', 'addressLine2', 'city', 'stateProvinceRegion',
  'country', 'postalCode', 'businessIndustry', 'phoneNumber',
]);

const RAIL_GROUPS: Record<string, GroupRule[]> = {
  international_swift: [
    {
      title: 'Account Details',
      match: k => SWIFT_ACCOUNT_KEYS.has(k),
      helpText: 'SWIFT/BIC Code: 8 or 11 character code identifying the recipient\'s bank.\n\nAccount Holder Name: The legal name on the receiving bank account.\n\nAccount Number/IBAN: The recipient\'s account number or IBAN.',
    },
    {
      title: 'Beneficiary Details',
      match: k => k.startsWith('swiftBeneficiary') || ['phoneNumber', 'taxId'].includes(k),
      helpText: 'Enter the full address and details of the account holder receiving the SWIFT transfer.',
    },
    {
      title: 'Bank Details',
      match: k => k.startsWith('swiftBank') || k === 'swiftPaymentCode',
      helpText: 'Enter the details of the receiving bank.',
    },
    {
      title: 'Intermediary Bank',
      match: k => k.startsWith('swiftIntermediary'),
      helpText: 'Intermediary/correspondent bank details. Only fill these if the receiving bank requires transfers to go through an intermediary bank.',
    },
    {
      title: 'Business Details',
      match: k => k === 'businessIndustry',
      helpText: 'Select your business industry NAICS code. Required for business accounts.',
    },
  ],
  ach: [
    { title: 'Account Details', match: k => US_ACCOUNT_KEYS.has(k) },
    { title: 'Address & Contact', match: k => US_ADDRESS_KEYS.has(k) },
  ],
  wire: [
    { title: 'Account Details', match: k => US_ACCOUNT_KEYS.has(k) },
    { title: 'Address & Contact', match: k => US_ADDRESS_KEYS.has(k) },
  ],
  rtp: [
    { title: 'Account Details', match: k => US_ACCOUNT_KEYS.has(k) },
    { title: 'Address & Contact', match: k => US_ADDRESS_KEYS.has(k) },
  ],
  pix: [
    { title: 'PIX Details', match: () => true },
  ],
  pix_safe: [
    { title: 'PIX Safe Details', match: () => true },
  ],
  spei_bitso: [
    { title: 'SPEI Details', match: () => true },
  ],
  transfers_bitso: [
    { title: 'Transfer Details', match: () => true },
  ],
  ach_cop_bitso: [
    {
      title: 'Beneficiary Details',
      match: k => k.startsWith('achCop') && !k.includes('Bank'),
    },
    {
      title: 'Bank Account',
      match: k => k.startsWith('achCop') && k.includes('Bank') || k === 'accountType',
    },
  ],
};

/**
 * Generate a human-friendly validation message from an API regex pattern.
 * Falls back to a label-based message when the pattern isn't recognized.
 */
function humanRegexMessage(apiField: ApiFieldSchema): string {
  const { regex, key, label } = apiField;
  // Normalize: some APIs double-escape backslashes
  const pattern = regex.replace(/\\\\/g, '\\');

  const exactDigits = /^\^\\d\{(\d+)\}\$$/.exec(pattern);
  if (exactDigits) return `Must be exactly ${exactDigits[1]} digits`;

  const rangeDigits = /^\^\\d\{(\d+),(\d+)\}\$$/.exec(pattern);
  if (rangeDigits) return `Must be ${rangeDigits[1]}-${rangeDigits[2]} digits`;

  const exactLetters = /^\^\[A-Z\]\{(\d+)\}\$$/i.exec(pattern);
  if (exactLetters) return `Must be exactly ${exactLetters[1]} letters`;

  const rangeAny = /^\^\.\{(\d+),(\d+)\}\$$/.exec(pattern);
  if (rangeAny) return `Must be ${rangeAny[1]}-${rangeAny[2]} characters`;

  const maxAny = /^\^\.\{1,(\d+)\}\$$/.exec(pattern);
  if (maxAny) return `Must be 1-${maxAny[1]} characters`;

  if (key.includes('phone')) return 'Use international format (e.g. +14155551234)';
  if (key.includes('email')) return 'Enter a valid email address';
  if (key.includes('tax_id')) return 'Enter a valid tax ID';
  if (key.includes('swift') || key.includes('bic')) return 'Must be 8 or 11 alphanumeric characters';
  if (key.includes('iban')) return 'Enter a valid IBAN';

  return `Enter a valid ${label.toLowerCase()}`;
}

/** Transform a single API field schema into a FieldDef */
function transformField(apiField: ApiFieldSchema): FieldDef {
  const key = snakeToCamel(apiField.key);
  const hasItems = !!apiField.items?.length;
  const isDropdown = hasItems;

  // `requiredWhen` takes precedence over `required`: if a conditional rule
  // exists, the field is only required when that rule evaluates true.
  const hasConditional = !!apiField.requiredWhen;
  const baseRequired = hasConditional ? false : !!apiField.required;

  const def: FieldDef = {
    key,
    label: apiField.label,
    placeholder: isDropdown ? `Select ${apiField.label.toLowerCase()}` : apiField.label,
    type: isDropdown ? 'dropdown' : 'text',
    required: baseRequired,
  };

  if (isDropdown) {
    def.options = apiField.items!;
    if (apiField.items!.length > 10) {
      def.searchable = true;
    }
  }

  if (apiField.regex) {
    try {
      def.regex = new RegExp(apiField.regex);
      def.regexMessage = humanRegexMessage(apiField);
    } catch {
      // Malformed regex from API — skip validation
    }
  }

  if (apiField.requiredWhen) {
    def.requiredWhen = {
      field: snakeToCamel(apiField.requiredWhen.field),
      operator: apiField.requiredWhen.operator,
      values: apiField.requiredWhen.values,
    };
  }

  // Keyboard type from API regex
  if (!isDropdown && apiField.regex && !def.keyboardType) {
    const isNumeric = /^\^\\d|^\^\[0-9\]/.test(apiField.regex);
    if (isNumeric) {
      def.keyboardType = 'number-pad';
    }
  }

  return def;
}

/**
 * Group transformed fields into steps using hardcoded rules per rail.
 * Any field not matching a known group goes into "Additional Details" at the end.
 */
function groupFields(railType: string, fields: FieldDef[]): FieldGroup[] {
  const rules = RAIL_GROUPS[railType];

  // No grouping rules → single page
  if (!rules) {
    return [{ title: 'Details', fields }];
  }

  const groups: FieldGroup[] = rules.map(r => ({
    title: r.title,
    helpText: r.helpText,
    fields: [],
  }));

  const overflow: FieldDef[] = [];

  for (const field of fields) {
    let placed = false;
    for (let i = 0; i < rules.length; i++) {
      if (rules[i].match(field.key)) {
        groups[i].fields.push(field);
        placed = true;
        break;
      }
    }
    if (!placed) {
      overflow.push(field);
    }
  }

  // Remove empty groups (API may not return all fields)
  const result = groups.filter(g => g.fields.length > 0);

  // Append overflow as a final step
  if (overflow.length > 0) {
    result.push({ title: 'Additional Details', fields: overflow });
  }

  return result;
}

/** Transform full API schema into a RailDef with grouped steps */
export function transformApiSchemaToRailDef(
  railType: string,
  label: string,
  flag: string,
  apiFields: ApiFieldSchema[],
): RailDef {
  const allFields = apiFields.map(transformField);
  const steps = groupFields(railType, allFields);

  return {
    type: railType as BlindpayBankAccountType,
    label,
    shortLabel: label,
    flag,
    steps,
    fields: allFields,
  };
}

/** Evaluate a requiredWhen rule against current form values */
export function evaluateRequiredWhen(
  rule: { field: string; operator: 'eq' | 'in'; values: string[] },
  formValues: Record<string, string>,
): boolean {
  const val = (formValues[rule.field] ?? '').trim();
  if (!val) return false;
  if (rule.operator === 'eq') return rule.values[0] === val;
  if (rule.operator === 'in') return rule.values.includes(val);
  return false;
}
