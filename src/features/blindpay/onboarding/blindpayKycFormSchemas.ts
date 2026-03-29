import { z } from 'zod';
import { t } from 'i18next';
import {
  BlindpayIdDocType,
  BlindpayProofOfAddressDocType,
  BlindpayPurposeOfTransactions,
  BlindpaySourceOfFundsDocType,
} from '../types';

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

export const blindPayKycBasicSchema = z.object({
  firstName: z.string().trim().min(1, req()),
  lastName: z.string().trim().min(1, req()),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, req())
    .regex(/^\d{4}-\d{2}-\d{2}$/, invalidDate())
    .refine(
      val => {
        const d = new Date(`${val}T12:00:00`);
        return !Number.isNaN(d.getTime());
      },
      { message: invalidDate() },
    )
    .refine(
      val => {
        const d = new Date(`${val}T12:00:00`);
        const max = new Date();
        max.setFullYear(max.getFullYear() - 18);
        return d <= max;
      },
      { message: ageInvalid() },
    )
    .refine(
      val => {
        const d = new Date(`${val}T12:00:00`);
        const min = new Date();
        min.setFullYear(min.getFullYear() - 120);
        return d >= min;
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
    .min(3, String(t('BLINDPAY_ZOD_PHONE', 'Enter a valid phone number'))),
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
          'Enter a 2-letter state code (e.g. CA, NY)',
        ),
      ),
    ),
  postalCode: z.string().trim().min(1, req()),
});

const idNeedsBack = (type: BlindpayIdDocType) =>
  type === BlindpayIdDocType.ID_CARD || type === BlindpayIdDocType.DRIVERS;

export const blindPayKycIdDocsSchema = z
  .object({
    idDocType: z.nativeEnum(BlindpayIdDocType),
    idDocCountry: z
      .string()
      .trim()
      .length(2, String(t('BLINDPAY_ZOD_COUNTRY', 'Select a country'))),
    idDocFrontFile: z
      .string()
      .trim()
      .min(1, String(t('BLINDPAY_ZOD_UPLOAD_FRONT', 'Upload the front of your ID'))),
    idDocBackFile: z.string().trim().optional(),
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
  idDocType: z.nativeEnum(BlindpayIdDocType),
  proofOfAddressDocType: z.nativeEnum(BlindpayProofOfAddressDocType),
});

export const blindPayKycProofSchema = z.object({
  proofOfAddressDocType: z.nativeEnum(BlindpayProofOfAddressDocType),
  proofOfAddressDocFile: z
    .string()
    .trim()
    .min(1, String(t('BLINDPAY_ZOD_UPLOAD_POA', 'Upload a document'))),
});

export const blindPayKycSelfieSchema = z.object({
  selfieFile: z
    .string()
    .trim()
    .min(1, String(t('BLINDPAY_ZOD_UPLOAD_SELFIE', 'Upload a selfie'))),
});

export const blindPayKycPurposeSchema = z.object({
  purposeOfTransactions: z.string().trim().min(1, req()),
  accountPurpose: z.string().trim().min(1, req()),
});

export const blindPayKycSourceOfFundsSchema = z.object({
  sourceOfFundsDocType: z.nativeEnum(BlindpaySourceOfFundsDocType),
  sourceOfFundsDocFile: z
    .string()
    .trim()
    .min(
      1,
      String(
        t('BLINDPAY_ZOD_UPLOAD_SOF', 'Upload a source of funds document'),
      ),
    ),
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
