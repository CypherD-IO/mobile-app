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
      match: k => k.startsWith('swiftBeneficiary'),
      helpText: 'Enter the full address of the account holder receiving the SWIFT transfer.',
    },
    {
      title: 'Bank Details',
      match: k => k.startsWith('swiftBank'),
      helpText: 'Enter the details of the receiving bank.',
    },
    {
      title: 'Intermediary Bank',
      match: k => k.startsWith('swiftIntermediary'),
      helpText: 'Intermediary/correspondent bank details. Only fill these if the receiving bank requires transfers to go through an intermediary bank.',
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

/** Transform a single API field schema into a FieldDef */
function transformField(apiField: ApiFieldSchema): FieldDef {
  const key = snakeToCamel(apiField.key);
  const hasItems = !!apiField.items?.length;
  const isDropdown = hasItems;

  const def: FieldDef = {
    key,
    label: apiField.label,
    placeholder: isDropdown ? `Select ${apiField.label.toLowerCase()}` : apiField.label,
    type: isDropdown ? 'dropdown' : 'text',
    required: apiField.required,
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
      def.regexMessage = 'Invalid format';
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

  // Heuristics for better UX
  if (!isDropdown && apiField.regex) {
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
  return rule.values.includes(val);
}
