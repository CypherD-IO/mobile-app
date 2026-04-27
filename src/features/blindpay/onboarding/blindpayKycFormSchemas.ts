import { t } from 'i18next';
import { z } from 'zod';
import type {
  IBlindpayAmlHits,
  IBlindpayFraudWarning,
  IBlindpayKycWarning,
} from '../types';
import {
  BlindpayAccountPurpose,
  BlindpayAmlStatus,
  BlindpayBusinessType,
  BlindpayEstimatedAnnualRevenue,
  BlindpayIdDocType,
  BlindpayKycType,
  BlindpayProofOfAddressDocType,
  BlindpayPurposeOfTransactions,
  BlindpayReceiverStatus,
  BlindpayReceiverType,
  BlindpaySourceOfFundsDocType,
  BlindpaySourceOfWealth,
} from '../types';

function invalidPhone(): string {
  return String(t('BLINDPAY_ZOD_PHONE', 'Enter a valid phone number (e.g. +1234567890)'));
}

function invalidUrl(): string {
  return String(t('BLINDPAY_ZOD_URL', 'Invalid file URL'));
}

/** File URL from POST /blindpay/documents — trusted S3 URL, just check non-empty */
const fileUrlSchema = z.string().trim().min(1, invalidUrl());

function req(): string {
  return String(t('BLINDPAY_FIELD_REQUIRED', 'This field is required'));
}

function invalidEmail(): string {
  return String(t('BLINDPAY_ZOD_EMAIL', 'Enter a valid email address'));
}

function invalidDate(): string {
  return String(
    t('BLINDPAY_ZOD_DATE_INVALID', 'Enter a valid date of birth'),
  );
}

function ageInvalid(): string {
  return String(
    t(
      'BLINDPAY_ZOD_AGE',
      'You must be at least 18 years old',
    ),
  );
}

function parseYmdParts(val: string): { y: number; m: number; d: number } | null {
  const parts = val.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

function ymdNumeric(y: number, m: number, d: number): number {
  return y * 10000 + m * 100 + d;
}

const dobOptionalSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, invalidDate())
  .refine(val => parseYmdParts(val) !== null, { message: invalidDate() })
  .refine(
    val => {
      const parts = parseYmdParts(val);
      if (!parts) return true;
      const now = new Date();
      const todayNum = ymdNumeric(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
      );
      const cutoffNum = ymdNumeric(
        now.getFullYear() - 18,
        now.getMonth() + 1,
        now.getDate(),
      );
      const dobNum = ymdNumeric(parts.y, parts.m, parts.d);
      return dobNum <= cutoffNum && dobNum <= todayNum;
    },
    { message: ageInvalid() },
  )
  .refine(
    val => {
      const parts = parseYmdParts(val);
      if (!parts) return true;
      const now = new Date();
      const minNum = ymdNumeric(
        now.getFullYear() - 120,
        now.getMonth() + 1,
        now.getDate(),
      );
      const dobNum = ymdNumeric(parts.y, parts.m, parts.d);
      return dobNum >= minNum;
    },
    { message: invalidDate() },
  )
  .optional();

const phoneOptionalSchema = z
  .string()
  .trim()
  .regex(/^\+\d{7,15}$/, invalidPhone())
  .optional();

export const blindPayKycBasicSchema = z.object({
  firstName: z.string().trim().min(1, req()),
  lastName: z.string().trim().min(1, req()),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, req())
    .regex(/^\d{4}-\d{2}-\d{2}$/, invalidDate())
    .refine(val => parseYmdParts(val) !== null, { message: invalidDate() })
    .refine(
      val => {
        const parts = parseYmdParts(val);
        if (!parts) return true;
        const now = new Date();
        const todayNum = ymdNumeric(
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate(),
        );
        const cutoffNum = ymdNumeric(
          now.getFullYear() - 18,
          now.getMonth() + 1,
          now.getDate(),
        );
        const dobNum = ymdNumeric(parts.y, parts.m, parts.d);
        return dobNum <= cutoffNum && dobNum <= todayNum;
      },
      { message: ageInvalid() },
    )
    .refine(
      val => {
        const parts = parseYmdParts(val);
        if (!parts) return true;
        const now = new Date();
        const minNum = ymdNumeric(
          now.getFullYear() - 120,
          now.getMonth() + 1,
          now.getDate(),
        );
        const dobNum = ymdNumeric(parts.y, parts.m, parts.d);
        return dobNum >= minNum;
      },
      { message: invalidDate() },
    ),
  email: z.string().trim().min(1, req()).email(invalidEmail()),
});

export const blindPayKycTaxSchema = z.object({
  taxId: z.string().trim().min(1, req()),
});

export const blindPayKycLocationSchema = z.object({
  country: z
    .string()
    .trim()
    .length(2, String(t('BLINDPAY_ZOD_COUNTRY', 'Select a country'))),
});

export const blindPayKycAddressSchema = z.object({
  country: z
    .string()
    .trim()
    .length(2, String(t('BLINDPAY_ZOD_COUNTRY', 'Select a country'))),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+\d{7,15}$/, invalidPhone()),
  addressLine1: z.string().trim().min(1, req()),
  city: z.string().trim().min(1, req()),
  stateProvinceRegion: z
    .string()
    .trim()
    .regex(
      /^[A-Z]{2}$/,
      String(
        t(
          'BLINDPAY_ZOD_STATE',
          'Enter a 2-letter state/province code (e.g. CA, NY, ON)',
        ),
      ),
    ),
  postalCode: z.string().trim().min(1, req()),
});

const idNeedsBack = (type: BlindpayIdDocType) =>
  type === BlindpayIdDocType.ID_CARD || type === BlindpayIdDocType.DRIVERS;

export const blindPayKycIdDocsSchema = z
  .object({
    idDocType: z.nativeEnum(BlindpayIdDocType, {
      errorMap: () => ({ message: String(t('BLINDPAY_ZOD_SELECT_ID_DOC', 'Select an ID document type')) }),
    }),
    idDocCountry: z
      .string()
      .trim()
      .length(2, String(t('BLINDPAY_ZOD_COUNTRY', 'Select a country'))),
    idDocFrontFile: fileUrlSchema.min(1, String(t('BLINDPAY_ZOD_UPLOAD_FRONT', 'Upload the front of your ID'))),
    idDocBackFile: fileUrlSchema.optional(),
  })
  .refine(
    data =>
      !idNeedsBack(data.idDocType) ||
      (data.idDocBackFile?.trim() ?? '').length > 0,
    {
      message: String(
        t('BLINDPAY_ZOD_UPLOAD_BACK', 'Upload the back of your ID'),
      ),
      path: ['idDocBackFile'],
    },
  );

export const blindPayKycDocTypeSchema = z.object({
  idDocType: z.nativeEnum(BlindpayIdDocType, {
    errorMap: () => ({ message: String(t('BLINDPAY_ZOD_SELECT_ID_DOC', 'Select an ID document type')) }),
  }),
  proofOfAddressDocType: z.nativeEnum(BlindpayProofOfAddressDocType, {
    errorMap: () => ({ message: String(t('BLINDPAY_ZOD_SELECT_POA_DOC', 'Select a proof of address document')) }),
  }),
});

export const blindPayKycProofSchema = z.object({
  proofOfAddressDocType: z.nativeEnum(BlindpayProofOfAddressDocType, {
    errorMap: () => ({ message: String(t('BLINDPAY_ZOD_SELECT_POA_DOC', 'Select a proof of address document')) }),
  }),
  proofOfAddressDocFile: fileUrlSchema.min(1, String(t('BLINDPAY_ZOD_UPLOAD_POA', 'Upload a document'))),
});

export const blindPayKycSelfieSchema = z.object({
  selfieFile: fileUrlSchema.min(1, String(t('BLINDPAY_ZOD_UPLOAD_SELFIE', 'Upload a selfie'))),
});

export const blindPayKycPurposeSchema = z
  .object({
    purposeOfTransactions: z.nativeEnum(BlindpayPurposeOfTransactions, { message: req() }),
    accountPurpose: z.nativeEnum(BlindpayAccountPurpose, { message: req() }),
    accountPurposeOther: z.string().trim().max(512).optional(),
  })
  .refine(
    data =>
      data.accountPurpose !== BlindpayAccountPurpose.OTHER ||
      (data.accountPurposeOther?.trim() ?? '').length > 0,
    {
      message: String(t('BLINDPAY_ZOD_ACCOUNT_PURPOSE_OTHER', 'Please specify the account purpose')),
      path: ['accountPurposeOther'],
    },
  );

export const blindPayKycSourceOfFundsSchema = z.object({
  sourceOfFundsDocType: z.nativeEnum(BlindpaySourceOfFundsDocType, {
    errorMap: () => ({ message: String(t('BLINDPAY_ZOD_SELECT_SOF_DOC', 'Select a source of funds document')) }),
  }),
  sourceOfFundsDocFile: fileUrlSchema.min(1, String(t('BLINDPAY_ZOD_UPLOAD_SOF', 'Upload a source of funds document'))),
});

export const blindPayKycPurposeOfTxSchema = z
  .object({
    purposeOfTransactions: z.nativeEnum(BlindpayPurposeOfTransactions),
    purposeOfTransactionsExplanation: z.string().trim().optional(),
  })
  .refine(
    data =>
      data.purposeOfTransactions !== BlindpayPurposeOfTransactions.OTHER ||
      (data.purposeOfTransactionsExplanation?.trim() ?? '').length > 0,
    {
      message: String(
        t('BLINDPAY_ZOD_PURPOSE_EXPLAIN', 'Please explain the purpose'),
      ),
      path: ['purposeOfTransactionsExplanation'],
    },
  );

// ── Full onboard request schema (POST /v1/bp/onboard) ──
// Validates the complete payload sent to the backend.
// Server-injected fields NOT included: kycType, tosId, ipAddress, externalId

export const blindPayOnboardRequestSchema = z
  .object({
    // Required
    type: z.literal('individual'),
    country: z.string().trim().length(2, 'Select a country'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),

    // Personal
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    dateOfBirth: dobOptionalSchema,
    phoneNumber: phoneOptionalSchema,
    imageUrl: z.string().url().optional(),
    taxId: z.string().trim().optional(),
    occupation: z.string().trim().max(255).optional(),

    // Address
    addressLine1: z.string().trim().optional(),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().optional(),
    stateProvinceRegion: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),

    // ID documents
    idDocCountry: z.string().trim().length(2).optional(),
    idDocType: z.nativeEnum(BlindpayIdDocType).optional(),
    idDocFrontFile: z.string().trim().url().optional(),
    idDocBackFile: z.string().trim().url().optional(),

    // Proof of address
    proofOfAddressDocType: z.nativeEnum(BlindpayProofOfAddressDocType).optional(),
    proofOfAddressDocFile: z.string().trim().url().optional(),

    // Selfie & source of funds
    selfieFile: z.string().trim().url().optional(),
    sourceOfFundsDocType: z.nativeEnum(BlindpaySourceOfFundsDocType).optional(),
    sourceOfFundsDocFile: z.string().trim().url().optional(),

    // Purpose
    purposeOfTransactions: z.nativeEnum(BlindpayPurposeOfTransactions).optional(),
    purposeOfTransactionsExplanation: z.string().trim().optional(),
    accountPurpose: z.nativeEnum(BlindpayAccountPurpose).optional(),
    accountPurposeOther: z.string().trim().max(512).optional(),
  })
  .refine(
    data =>
      data.accountPurpose !== BlindpayAccountPurpose.OTHER ||
      (data.accountPurposeOther?.trim() ?? '').length > 0,
    {
      message: 'Please specify the account purpose',
      path: ['accountPurposeOther'],
    },
  )
  .refine(
    data =>
      data.purposeOfTransactions !== BlindpayPurposeOfTransactions.OTHER ||
      (data.purposeOfTransactionsExplanation?.trim() ?? '').length > 0,
    {
      message: String(
        t('BLINDPAY_ZOD_PURPOSE_EXPLAIN', 'Please explain the purpose'),
      ),
      path: ['purposeOfTransactionsExplanation'],
    },
  )
  .refine(
    data =>
      !data.idDocType ||
      !idNeedsBack(data.idDocType) ||
      (data.idDocBackFile?.trim() ?? '').length > 0,
    {
      message: String(
        t('BLINDPAY_ZOD_UPLOAD_BACK', 'Upload the back of your ID'),
      ),
      path: ['idDocBackFile'],
    },
  );

export type BlindPayOnboardRequest = z.infer<typeof blindPayOnboardRequestSchema>;

// ── Update receiver schema (PUT /v1/bp/receiver) ──
// Same fields as onboard minus `type`. Server derives receiverId from JWT.

export const blindPayUpdateReceiverRequestSchema = z
  .object({
    // Required
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
    country: z.string().trim().length(2, 'Select a country'),

    // Personal
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    dateOfBirth: dobOptionalSchema,
    phoneNumber: phoneOptionalSchema,
    imageUrl: z.string().url().optional(),
    taxId: z.string().trim().optional(),
    occupation: z.string().trim().max(255).optional(),

    // Address
    addressLine1: z.string().trim().optional(),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().optional(),
    stateProvinceRegion: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),

    // ID documents
    idDocCountry: z.string().trim().length(2).optional(),
    idDocType: z.nativeEnum(BlindpayIdDocType).optional(),
    idDocFrontFile: z.string().trim().url().optional(),
    idDocBackFile: z.string().trim().url().optional(),

    // Proof of address
    proofOfAddressDocType: z.nativeEnum(BlindpayProofOfAddressDocType).optional(),
    proofOfAddressDocFile: z.string().trim().url().optional(),

    // Selfie & source of funds
    selfieFile: z.string().trim().url().optional(),
    sourceOfFundsDocType: z.nativeEnum(BlindpaySourceOfFundsDocType).optional(),
    sourceOfFundsDocFile: z.string().trim().url().optional(),

    // Purpose
    purposeOfTransactions: z.nativeEnum(BlindpayPurposeOfTransactions).optional(),
    purposeOfTransactionsExplanation: z.string().trim().optional(),
    accountPurpose: z.nativeEnum(BlindpayAccountPurpose).optional(),
    accountPurposeOther: z.string().trim().max(512).optional(),
  })
  .refine(
    data =>
      data.accountPurpose !== BlindpayAccountPurpose.OTHER ||
      (data.accountPurposeOther?.trim() ?? '').length > 0,
    {
      message: 'Please specify the account purpose',
      path: ['accountPurposeOther'],
    },
  )
  .refine(
    data =>
      data.purposeOfTransactions !== BlindpayPurposeOfTransactions.OTHER ||
      (data.purposeOfTransactionsExplanation?.trim() ?? '').length > 0,
    {
      message: String(
        t('BLINDPAY_ZOD_PURPOSE_EXPLAIN', 'Please explain the purpose'),
      ),
      path: ['purposeOfTransactionsExplanation'],
    },
  )
  .refine(
    data =>
      !data.idDocType ||
      !idNeedsBack(data.idDocType) ||
      (data.idDocBackFile?.trim() ?? '').length > 0,
    {
      message: String(
        t('BLINDPAY_ZOD_UPLOAD_BACK', 'Upload the back of your ID'),
      ),
      path: ['idDocBackFile'],
    },
  );

export type BlindPayUpdateReceiverRequest = z.infer<typeof blindPayUpdateReceiverRequestSchema>;

// ── Response types (re-exported from ../types for backward compat) ──

export type {
  IBlindpayAmlHits, IBlindpayFraudWarning, IBlindpayKycWarning, IBlindpaySuccessResponse
} from '../types';

export interface IBlindpayReceiverResponse {
  id: string;
  type: BlindpayReceiverType;
  country: string;
  kycStatus: BlindpayReceiverStatus;
  kycType: BlindpayKycType;
  email: string;
  externalId: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  occupation: string | null;
  ipAddress: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvinceRegion: string | null;
  postalCode: string | null;
  taxId: string | null;
  idDocType: BlindpayIdDocType | null;
  idDocCountry: string | null;
  idDocFrontFile: string | null;
  idDocBackFile: string | null;
  proofOfAddressDocType: BlindpayProofOfAddressDocType | null;
  proofOfAddressDocFile: string | null;
  selfieFile: string | null;
  sourceOfFundsDocType: BlindpaySourceOfFundsDocType | null;
  sourceOfFundsDocFile: string | null;
  purposeOfTransactions: BlindpayPurposeOfTransactions | null;
  purposeOfTransactionsExplanation: string | null;
  accountPurpose: BlindpayAccountPurpose | null;
  accountPurposeOther: string | null;
  // Business fields
  legalName: string | null;
  alternateName: string | null;
  formationDate: string | null;
  website: string | null;
  businessType: BlindpayBusinessType | null;
  businessDescription: string | null;
  businessIndustry: string | null;
  estimatedAnnualRevenue: BlindpayEstimatedAnnualRevenue | null;
  sourceOfWealth: BlindpaySourceOfWealth | null;
  publiclyTraded: boolean | null;
  incorporationDocFile: string | null;
  proofOfOwnershipDocFile: string | null;
  owners: Record<string, unknown>[] | null;
  // Compliance
  isFbo: boolean | null;
  kycWarnings: IBlindpayKycWarning[] | null;
  fraudWarnings: IBlindpayFraudWarning[] | null;
  amlStatus: BlindpayAmlStatus | null;
  amlHits: IBlindpayAmlHits | null;
  tosId: string | null;
  isTosAccepted: boolean | null;
  limit?: { perTransaction: number | null; daily: number | null; monthly: number | null };
  createdAt: string;
  updatedAt: string;
}
