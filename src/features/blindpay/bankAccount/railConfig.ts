import { t } from 'i18next';
import type { BlindpayBankAccountType } from '../types';

/** Field types for dynamic rendering. */
export type FieldType = 'text' | 'dropdown' | 'phone';

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
  maxLength?: number;
  regex?: RegExp;
  regexMessage?: string;
}

export interface FieldGroup {
  title: string;
  helpText?: string;
  fields: FieldDef[];
}

export interface RailDef {
  type: BlindpayBankAccountType;
  label: string;
  shortLabel: string;
  flag: string;
  comingSoon?: boolean;
  /** Each entry is one step/page in the wizard. */
  steps: FieldGroup[];
  /** Flat list for validation — derived from steps. */
  fields: FieldDef[];
}

// ── Shared option sets ──

const RELATIONSHIP_OPTIONS = [
  { value: 'first_party', label: 'Self / First party' },
  { value: 'employee', label: 'Employee' },
  { value: 'independent_contractor', label: 'Independent contractor' },
  { value: 'vendor_or_supplier', label: 'Vendor / Supplier' },
  { value: 'subsidiary_or_affiliate', label: 'Subsidiary / Affiliate' },
  { value: 'merchant_or_partner', label: 'Merchant / Partner' },
  { value: 'customer', label: 'Customer' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'family', label: 'Family' },
  { value: 'other', label: 'Other' },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'saving', label: 'Saving' },
];

const ACCOUNT_CLASS_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Business' },
];

// ── US address fields (shared by ach, wire, rtp) ──

const US_ADDRESS_FIELDS: FieldDef[] = [
  { key: 'addressLine1', label: 'Street Address', placeholder: 'Street address', type: 'text', required: true, maxLength: 256 },
  { key: 'addressLine2', label: 'Apt / Suite', placeholder: 'Apartment, Suite', type: 'text', required: true, maxLength: 256 },
  { key: 'city', label: 'City', placeholder: 'City', type: 'text', required: true },
  { key: 'stateProvinceRegion', label: 'State', placeholder: 'e.g. CA, NY', type: 'text', required: true, autoCapitalize: 'characters', maxLength: 2, regex: /^[A-Z]{2}$/, regexMessage: 'Enter a 2-letter state code' },
  { key: 'country', label: 'Country', placeholder: 'e.g. US', type: 'text', required: true, autoCapitalize: 'characters', maxLength: 2, regex: /^[A-Z]{2}$/, regexMessage: 'Enter a 2-letter country code' },
  { key: 'postalCode', label: 'Postal Code', placeholder: 'Postal code', type: 'text', required: true },
];

// ── US bank common fields ──

const US_BANK_COMMON: FieldDef[] = [
  { key: 'recipientRelationship', label: 'Recipient Relationship', placeholder: 'Select relationship', type: 'dropdown', required: true, options: RELATIONSHIP_OPTIONS },
  { key: 'beneficiaryName', label: 'Beneficiary Name', placeholder: 'Full legal name', type: 'text', required: true, maxLength: 128 },
  { key: 'routingNumber', label: 'Routing Number', placeholder: '9-digit routing number', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 9, regex: /^\d{9}$/, regexMessage: 'Must be exactly 9 digits' },
  { key: 'accountNumber', label: 'Account Number', placeholder: 'Account number', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 17, regex: /^\d{4,17}$/, regexMessage: 'Must be 4-17 digits' },
];

// ── Helpers ──

const PHONE_FIELD: FieldDef = { key: 'phoneNumber', label: 'Phone Number', placeholder: '+14155551234', type: 'text', required: true, keyboardType: 'phone-pad', regex: /^\+\d{7,15}$/, regexMessage: 'E.164 format (e.g. +14155551234)' };
const INDUSTRY_FIELD: FieldDef = { key: 'businessIndustry', label: 'Business Industry (NAICS)', placeholder: 'e.g. 541511', type: 'text', required: true, keyboardType: 'number-pad' };

function buildRail(
  r: Omit<RailDef, 'fields'>,
): RailDef {
  return { ...r, fields: r.steps.flatMap(s => s.fields) };
}

// ── US rail steps (shared by ach, wire, rtp) ──

function usSteps(extra: FieldDef[]): FieldGroup[] {
  return [
    {
      title: 'Account Details',
      helpText: 'Recipient Relationship: Select how the recipient is related to you (e.g. "Self" for your own account).\n\nBeneficiary Name: The legal name on the bank account.\n\nRouting Number: 9-digit ABA routing number found on your checks or bank\'s website (e.g. 021000021).\n\nAccount Number: Your bank account number, typically 4-17 digits.',
      fields: [
        ...US_BANK_COMMON,
        ...extra,
      ],
    },
    {
      title: 'Address & Contact',
      helpText: 'Enter the address associated with the bank account.\n\nState: Use 2-letter state code (e.g. CA, NY, TX).\n\nCountry: Use 2-letter country code (e.g. US).\n\nBusiness Industry: Enter your NAICS code (e.g. 541511 for custom software development). Find yours at naics.com.\n\nPhone: International format with country code (e.g. +14155551234).',
      fields: [
        ...US_ADDRESS_FIELDS,
        INDUSTRY_FIELD,
        PHONE_FIELD,
      ],
    },
  ];
}

// ── Rail definitions ──

export const RAIL_TYPES: RailDef[] = [
  buildRail({
    type: 'ach' as BlindpayBankAccountType,
    label: 'ACH (US)',
    shortLabel: 'ACH',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    steps: usSteps([
      { key: 'accountType', label: 'Account Type', placeholder: 'Select type', type: 'dropdown', required: true, options: ACCOUNT_TYPE_OPTIONS },
      { key: 'accountClass', label: 'Account Class', placeholder: 'Select class', type: 'dropdown', required: true, options: ACCOUNT_CLASS_OPTIONS },
    ]),
  }),
  buildRail({
    type: 'wire' as BlindpayBankAccountType,
    label: 'Wire (US)',
    shortLabel: 'Domestic Wire',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    steps: usSteps([
      { key: 'accountClass', label: 'Account Class', placeholder: 'Select class', type: 'dropdown', required: true, options: ACCOUNT_CLASS_OPTIONS },
    ]),
  }),
  buildRail({
    type: 'rtp' as BlindpayBankAccountType,
    label: 'RTP (US, instant)',
    shortLabel: 'RTP',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    steps: usSteps([
      { key: 'accountClass', label: 'Account Class', placeholder: 'Select class', type: 'dropdown', required: true, options: ACCOUNT_CLASS_OPTIONS },
    ]),
  }),
  buildRail({
    type: 'pix' as BlindpayBankAccountType,
    label: 'PIX (Brazil)',
    shortLabel: 'PIX',
    flag: '\uD83C\uDDE7\uD83C\uDDF7',
    steps: [{
      title: 'PIX Details',
      fields: [
        { key: 'pixKey', label: 'PIX Key', placeholder: 'CPF, CNPJ, email, phone, or UUID', type: 'text', required: true, maxLength: 128 },
      ],
    }],
  }),
  buildRail({
    type: 'pix_safe' as BlindpayBankAccountType,
    label: 'PIX Safe (Brazil)',
    shortLabel: 'PIX Safe',
    flag: '\uD83C\uDDE7\uD83C\uDDF7',
    steps: [{
      title: 'PIX Safe Details',
      fields: [
        { key: 'beneficiaryName', label: 'Beneficiary Name', placeholder: 'Full legal name', type: 'text', required: true, maxLength: 128 },
        { key: 'accountType', label: 'Account Type', placeholder: 'Select type', type: 'dropdown', required: true, options: ACCOUNT_TYPE_OPTIONS },
        { key: 'accountNumber', label: 'Account Number', placeholder: 'Account number', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 17, regex: /^\d{4,17}$/, regexMessage: 'Must be 4-17 digits' },
        { key: 'pixSafeCpfCnpj', label: 'CPF / CNPJ', placeholder: '11 or 14 digits', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 14, regex: /^\d{11}$|^\d{14}$/, regexMessage: 'Must be CPF (11 digits) or CNPJ (14 digits)' },
        { key: 'pixSafeBankCode', label: 'Bank Code (ISPB)', placeholder: '4-8 digits', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 8, regex: /^\d{4,8}$/, regexMessage: 'Must be 4-8 digits' },
        { key: 'pixSafeBranchCode', label: 'Branch Code', placeholder: '4 digits', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 4, regex: /^\d{4}$/, regexMessage: 'Must be exactly 4 digits' },
      ],
    }],
  }),
  buildRail({
    type: 'spei_bitso' as BlindpayBankAccountType,
    label: 'SPEI (Mexico)',
    shortLabel: 'SPEI',
    flag: '\uD83C\uDDF2\uD83C\uDDFD',
    steps: [{
      title: 'SPEI Details',
      fields: [
        { key: 'speiProtocol', label: 'SPEI Protocol', placeholder: 'Select protocol', type: 'dropdown', required: true, options: [{ value: 'clabe', label: 'CLABE' }, { value: 'debitcard', label: 'Debit Card' }, { value: 'phonenum', label: 'Phone Number' }] },
        { key: 'speiClabe', label: 'CLABE', placeholder: '18-digit CLABE', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 18, regex: /^\d{18}$/, regexMessage: 'Must be exactly 18 digits' },
        { key: 'beneficiaryName', label: 'Beneficiary Name', placeholder: 'Full legal name', type: 'text', required: true, maxLength: 128 },
        { key: 'speiInstitutionCode', label: 'Institution Code', placeholder: '5-digit code', type: 'text', required: true, keyboardType: 'number-pad', maxLength: 5, regex: /^\d{5}$/, regexMessage: 'Must be exactly 5 digits' },
      ],
    }],
  }),
  buildRail({
    type: 'transfers_bitso' as BlindpayBankAccountType,
    label: 'Transfers (Argentina)',
    shortLabel: 'Transfers',
    flag: '\uD83C\uDDE6\uD83C\uDDF7',
    steps: [{
      title: 'Transfer Details',
      fields: [
        { key: 'transfersType', label: 'Transfer Type', placeholder: 'Select type', type: 'dropdown', required: true, options: [{ value: 'CVU', label: 'CVU' }, { value: 'CBU', label: 'CBU' }, { value: 'ALIAS', label: 'ALIAS' }] },
        { key: 'transfersAccount', label: 'Account', placeholder: 'Up to 22 characters', type: 'text', required: true, maxLength: 22 },
        { key: 'beneficiaryName', label: 'Beneficiary Name', placeholder: 'Full legal name', type: 'text', required: true, maxLength: 128 },
      ],
    }],
  }),
  buildRail({
    type: 'ach_cop_bitso' as BlindpayBankAccountType,
    label: 'ACH COP (Colombia)',
    shortLabel: 'ACH Colombia',
    flag: '\uD83C\uDDE8\uD83C\uDDF4',
    steps: [
      {
        title: 'Beneficiary Details',
        fields: [
          { key: 'achCopBeneficiaryFirstName', label: 'First Name', placeholder: 'First name', type: 'text', required: true, maxLength: 128 },
          { key: 'achCopBeneficiaryLastName', label: 'Last Name', placeholder: 'Last name', type: 'text', required: true, maxLength: 128 },
          { key: 'achCopDocumentType', label: 'Document Type', placeholder: 'Select type', type: 'dropdown', required: true, options: [{ value: 'CC', label: 'CC' }, { value: 'CE', label: 'CE' }, { value: 'NIT', label: 'NIT' }, { value: 'PASS', label: 'PASS' }, { value: 'PEP', label: 'PEP' }] },
          { key: 'achCopDocumentId', label: 'Document ID', placeholder: 'Document number', type: 'text', required: true, maxLength: 20 },
          { key: 'achCopEmail', label: 'Email', placeholder: 'email@example.com', type: 'text', required: true, keyboardType: 'email-address', autoCapitalize: 'none', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, regexMessage: 'Enter a valid email' },
        ],
      },
      {
        title: 'Bank Account',
        fields: [
          { key: 'achCopBankCode', label: 'Bank Code', placeholder: 'Bank code', type: 'text', required: true, maxLength: 10 },
          { key: 'achCopBankAccount', label: 'Bank Account', placeholder: 'Account number', type: 'text', required: true, maxLength: 20 },
          { key: 'accountType', label: 'Account Type', placeholder: 'Select type', type: 'dropdown', required: true, options: ACCOUNT_TYPE_OPTIONS },
        ],
      },
    ],
  }),
  buildRail({
    type: 'international_swift' as BlindpayBankAccountType,
    label: 'SWIFT (International)',
    shortLabel: 'International Swift',
    flag: '\uD83C\uDF10',
    steps: [
      {
        title: 'Account Details',
        helpText: 'SWIFT/BIC Code: 8 or 11 character code identifying the recipient\'s bank (e.g. CHASUS33).\n\nAccount Holder Name: The legal name on the receiving bank account.\n\nAccount Number/IBAN: The recipient\'s account number or IBAN (up to 34 characters).\n\nAccount Class: Individual for personal accounts, Business for company accounts.',
        fields: [
          { key: 'recipientRelationship', label: 'Recipient Relationship', placeholder: 'Select relationship', type: 'dropdown', required: true, options: RELATIONSHIP_OPTIONS },
          { key: 'accountClass', label: 'Account Class', placeholder: 'Select class', type: 'dropdown', required: true, options: ACCOUNT_CLASS_OPTIONS },
          { key: 'swiftCodeBic', label: 'SWIFT / BIC Code', placeholder: '8 or 11 characters', type: 'text', required: true, autoCapitalize: 'characters', maxLength: 11, regex: /^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/, regexMessage: 'Must be 8 or 11 alphanumeric characters' },
          { key: 'swiftAccountHolderName', label: 'Account Holder Name', placeholder: 'Full name', type: 'text', required: true, maxLength: 50 },
          { key: 'swiftAccountNumberIban', label: 'Account Number / IBAN', placeholder: 'Up to 34 characters', type: 'text', required: true, autoCapitalize: 'characters', maxLength: 34, regex: /^[A-Z0-9]{1,34}$/i, regexMessage: 'Must be up to 34 alphanumeric characters' },
          { key: 'swiftPaymentCode', label: 'Payment Purpose Code', placeholder: 'Payment code (optional)', type: 'text' },
        ],
      },
      {
        title: 'Beneficiary Details',
        helpText: 'Enter the full address of the account holder receiving the SWIFT transfer.',
        fields: [
          { key: 'swiftBeneficiaryAddressLine1', label: 'Beneficiary Address', placeholder: 'Street address', type: 'text', required: true, maxLength: 256 },
          { key: 'swiftBeneficiaryAddressLine2', label: 'Beneficiary Address Line 2', placeholder: 'Apt, Suite', type: 'text', required: true, maxLength: 256 },
          { key: 'swiftBeneficiaryCity', label: 'Beneficiary City', placeholder: 'City', type: 'text', required: true, maxLength: 128 },
          { key: 'swiftBeneficiaryStateProvinceRegion', label: 'Beneficiary State', placeholder: 'State/Province', type: 'text', required: true, maxLength: 128 },
          { key: 'swiftBeneficiaryCountry', label: 'Beneficiary Country', placeholder: 'e.g. US', type: 'text', required: true, autoCapitalize: 'characters', maxLength: 2, regex: /^[A-Z]{2}$/, regexMessage: 'Enter a 2-letter country code' },
          { key: 'swiftBeneficiaryPostalCode', label: 'Beneficiary Postal Code', placeholder: 'Postal code', type: 'text', required: true, maxLength: 20 },
        ],
      },
      {
        title: 'Bank Details',
        helpText: 'Enter the details of the receiving bank.',
        fields: [
          { key: 'swiftBankName', label: 'Bank Name', placeholder: 'Bank name', type: 'text', required: true, maxLength: 128 },
          { key: 'swiftBankAddressLine1', label: 'Bank Address', placeholder: 'Bank address', type: 'text', required: true, maxLength: 256 },
          { key: 'swiftBankAddressLine2', label: 'Bank Address Line 2', placeholder: 'Bank address line 2', type: 'text', required: true, maxLength: 256 },
          { key: 'swiftBankCity', label: 'Bank City', placeholder: 'City', type: 'text', required: true, maxLength: 128 },
          { key: 'swiftBankStateProvinceRegion', label: 'Bank State', placeholder: 'State/Province', type: 'text', required: true, maxLength: 128 },
          { key: 'swiftBankCountry', label: 'Bank Country', placeholder: 'e.g. US', type: 'text', required: true, autoCapitalize: 'characters', maxLength: 2, regex: /^[A-Z]{2}$/, regexMessage: 'Enter a 2-letter country code' },
          { key: 'swiftBankPostalCode', label: 'Bank Postal Code', placeholder: 'Postal code', type: 'text', required: true, maxLength: 20 },
        ],
      },
      {
        title: 'Intermediary Bank',
        helpText: 'Intermediary/correspondent bank details. Only fill these if the receiving bank requires transfers to go through an intermediary bank.',
        fields: [
          { key: 'swiftIntermediaryBankSwiftCodeBic', label: 'Intermediary SWIFT', placeholder: 'SWIFT code (optional)', type: 'text', autoCapitalize: 'characters', maxLength: 11, regex: /^$|^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/, regexMessage: 'Must be 8 or 11 alphanumeric characters' },
          { key: 'swiftIntermediaryBankAccountNumberIban', label: 'Intermediary Account / IBAN', placeholder: 'Account (optional)', type: 'text', maxLength: 34 },
          { key: 'swiftIntermediaryBankName', label: 'Intermediary Bank Name', placeholder: 'Bank name (optional)', type: 'text', maxLength: 128 },
          { key: 'swiftIntermediaryBankCountry', label: 'Intermediary Country', placeholder: 'e.g. US (optional)', type: 'text', autoCapitalize: 'characters', maxLength: 2 },
        ],
      },
    ],
  }),
];

/**
 * For SPEI: speiInstitutionCode is required when protocol is debitcard or phonenum.
 */
export function isSpeiInstitutionRequired(
  formValues: Record<string, string>,
): boolean {
  const p = formValues.speiProtocol;
  return p === 'debitcard' || p === 'phonenum';
}
