/**
 * Zod validation schemas for BlindPay API requests (non-KYC).
 * KYC schemas live in onboarding/blindpayKycFormSchemas.ts.
 */
import { z } from 'zod';
import {
  BlindpayBankAccountType,
  BlindpayBankingPartner,
  BlindpayCurrencyType,
  BlindpayDocumentType,
  BlindpayFiatCurrency,
  BlindpayNetwork,
  BlindpayPayoutStatus,
  BlindpaySoleProprietorDocType,
  BlindpaySupportingDocumentType,
  BlindpayToken,
} from './types';

// ── POST /v1/blindpay/quotes ──

export const blindPayCreateQuoteSchema = z.object({
  bankAccountId: z.string().trim().length(15, 'Invalid bank account ID'),
  currencyType: z.nativeEnum(BlindpayCurrencyType),
  requestAmount: z.number().int('Amount must be a whole number').min(500, 'Minimum amount is $5.00'),
  network: z.nativeEnum(BlindpayNetwork),
  token: z.nativeEnum(BlindpayToken),
  coverFees: z.boolean().optional(),
  description: z.string().trim().max(128).optional(),
  transactionDocumentType: z.nativeEnum(BlindpayDocumentType).optional(),
  transactionDocumentId: z.string().trim().max(512).optional(),
  transactionDocumentFile: z.string().trim().min(1).optional(),
});

export type BlindPayCreateQuoteInput = z.infer<typeof blindPayCreateQuoteSchema>;

// ── POST /v1/blindpay/quotes/fx ──

export const blindPayFxQuoteSchema = z.object({
  from: z.nativeEnum(BlindpayToken),
  to: z.nativeEnum(BlindpayFiatCurrency),
  requestAmount: z.number().int('Amount must be a whole number').min(500, 'Minimum amount is $5.00'),
  currencyType: z.nativeEnum(BlindpayCurrencyType),
});

export type BlindPayFxQuoteInput = z.infer<typeof blindPayFxQuoteSchema>;

// ── POST /v1/blindpay/payouts/evm ──

export const blindPayCreateEvmPayoutSchema = z.object({
  quoteId: z.string().trim().length(15, 'Invalid quote ID'),
  senderWalletAddress: z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid EVM wallet address'),
});

export type BlindPayCreateEvmPayoutInput = z.infer<typeof blindPayCreateEvmPayoutSchema>;

// ── POST /v1/blindpay/payouts/:id/documents ──

export const blindPaySubmitPayoutDocumentsSchema = z.object({
  transactionDocumentType: z.nativeEnum(BlindpayDocumentType),
  transactionDocumentId: z.string().trim().min(1, 'Document ID is required').max(512),
  transactionDocumentFile: z.string().trim().min(1, 'Document file is required'),
  description: z.string().trim().max(128).optional(),
});

export type BlindPaySubmitPayoutDocumentsInput = z.infer<typeof blindPaySubmitPayoutDocumentsSchema>;

// ── POST /v1/blindpay/limits/increase ──

const MAX_LIMIT_CENTS = 100_000_000_000;

export const blindPayRequestLimitIncreaseSchema = z.object({
  perTransaction: z.number().int().max(MAX_LIMIT_CENTS).nullable(),
  daily: z.number().int().max(MAX_LIMIT_CENTS).nullable(),
  monthly: z.number().int().max(MAX_LIMIT_CENTS).nullable(),
  supportingDocumentType: z.nativeEnum(BlindpaySupportingDocumentType),
  supportingDocumentFile: z.string().trim().min(1, 'Supporting document is required'),
});

export type BlindPayRequestLimitIncreaseInput = z.infer<typeof blindPayRequestLimitIncreaseSchema>;

// ── POST /v1/blindpay/virtual-accounts ──

export const blindPayCreateVirtualAccountSchema = z.object({
  bankingPartner: z.nativeEnum(BlindpayBankingPartner),
  token: z.nativeEnum(BlindpayToken),
  blockchainWalletId: z.string().trim().min(1, 'Wallet address is required'),
  signedAgreementId: z.string().uuid().optional(),
  soleProprietorDocType: z.nativeEnum(BlindpaySoleProprietorDocType).optional(),
  soleProprietorDocFile: z.string().trim().min(1).optional(),
});

export type BlindPayCreateVirtualAccountInput = z.infer<typeof blindPayCreateVirtualAccountSchema>;

// ── PUT /v1/blindpay/virtual-accounts/:id ──

export const blindPayUpdateVirtualAccountSchema = z.object({
  token: z.nativeEnum(BlindpayToken),
  blockchainWalletId: z.string().trim().min(1, 'Wallet address is required'),
});

export type BlindPayUpdateVirtualAccountInput = z.infer<typeof blindPayUpdateVirtualAccountSchema>;

// ── POST /v1/blindpay/payouts/solana/prepare-delegate ──

export const blindPayPrepareSolanaDelegateSchema = z
  .object({
    ownerAddress: z.string().trim().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address'),
    quoteId: z.string().trim().length(15).optional(),
    tokenAddress: z.string().trim().min(1).optional(),
    amount: z.string().trim().min(1).optional(),
  })
  .refine(
    data => !!data.quoteId || (!!data.tokenAddress && !!data.amount),
    { message: 'Provide either quoteId or both tokenAddress and amount', path: ['quoteId'] },
  );

export type BlindPayPrepareSolanaDelegateInput = z.infer<typeof blindPayPrepareSolanaDelegateSchema>;

// ── GET /v1/blindpay/payouts (query params) ──

const PAYOUT_LIMIT_VALUES = ['10', '50', '100', '200', '500', '1000'] as const;
const PAYOUT_OFFSET_VALUES = ['0', '10', '50', '100', '200', '500', '1000'] as const;

export const blindPayListPayoutsQuerySchema = z.object({
  limit: z.enum(PAYOUT_LIMIT_VALUES).optional(),
  offset: z.enum(PAYOUT_OFFSET_VALUES).optional(),
  startingAfter: z.string().trim().optional(),
  endingBefore: z.string().trim().optional(),
  status: z.nativeEnum(BlindpayPayoutStatus).optional(),
  receiverName: z.string().trim().optional(),
  bankAccountId: z.string().trim().length(15).optional(),
  country: z.string().trim().length(2).optional(),
  paymentMethod: z.nativeEnum(BlindpayBankAccountType).optional(),
  network: z.nativeEnum(BlindpayNetwork).optional(),
  token: z.nativeEnum(BlindpayToken).optional(),
});

export type BlindPayListPayoutsQuery = z.infer<typeof blindPayListPayoutsQuerySchema>;
