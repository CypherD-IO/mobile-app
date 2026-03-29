/**
 * BlindPay offramp (TOS → KYC → receiver → bank → quotes → payouts).
 *
 * Onboarding screen fetches status on focus to gate the intro (see `BlindPayOnboardingScreen`).
 * Types match backend DTOs (`types.ts`).
 */

export { default as useBlindPayApi } from './api';

export {
  BlindpayAchCopDocumentType,
  BlindpayBankAccountClass,
  BlindpayBankAccountCheckType,
  BlindpayBankAccountType,
  BlindpayCurrencyType,
  BlindpayDocumentType,
  BlindpayFiatCurrency,
  BlindpayIdDocType,
  BlindpayNetwork,
  BlindpayOwnerRole,
  BlindpayPayoutStatus,
  BlindpayProofOfAddressDocType,
  BlindpayReceiverStatus,
  BlindpayReceiverType,
  BlindpayRecipientRelationship,
  BlindpaySpeiProtocol,
  BlindpaySupportingDocumentType,
  BlindpayToken,
  BlindpayTransfersType,
  BlindpayUploadCategory,
} from './types';

export type {
  AddBankAccountRequest,
  BlindpayUserConfig,
  BlindpayStatusResponse,
  CompleteTermsRequest,
  CompleteTermsResponse,
  CreateFxQuoteRequest,
  CreatePayoutEvmRequest,
  CreatePayoutSolanaRequest,
  CreateQuoteRequest,
  CreateReceiverRequest,
  CreateReceiverResponse,
  IBlindpayBankAccountSummary,
  IBlindpayLimits,
  IBlindpayLimitIncreaseStatus,
  InitiateTermsResponse,
  ListPayoutsQuery,
  ReceiverOwner,
  RequestLimitIncreaseRequest,
  SubmitPayoutDocumentsRequest,
  UploadDocumentRequest,
  UploadDocumentResponse,
  BlindPayConfig,
  BlindPayReceiverStatus,
  BlindPayStatusResponse,
  BlindPayTermsInitiateResponse,
} from './types';

export { extractTermsIdFromUrl } from './tosUrl';
export { default as BlindPayOnboardingScreen } from './BlindPayOnboardingScreen';
export { default as BlindPayTosWebViewScreen } from './BlindPayTosWebViewScreen';
export type { BlindPayTosWebViewParams } from './BlindPayTosWebViewScreen';
