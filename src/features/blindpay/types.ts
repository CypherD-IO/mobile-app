/**
 * BlindPay API — enums, DTOs, and responses (camelCase, aligned with backend).
 * @see GET/POST /v1/blindpay/*
 */

// ── Receiver / KYC ──

export enum BlindpayReceiverType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export enum BlindpayReceiverStatus {
  VERIFYING = 'verifying',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum BlindpayIdDocType {
  PASSPORT = 'PASSPORT',
  ID_CARD = 'ID_CARD',
  DRIVERS = 'DRIVERS',
}

export enum BlindpayProofOfAddressDocType {
  UTILITY_BILL = 'UTILITY_BILL',
  BANK_STATEMENT = 'BANK_STATEMENT',
  RENTAL_AGREEMENT = 'RENTAL_AGREEMENT',
  TAX_DOCUMENT = 'TAX_DOCUMENT',
  GOVERNMENT_CORRESPONDENCE = 'GOVERNMENT_CORRESPONDENCE',
}

export enum BlindpaySourceOfFundsDocType {
  BUSINESS_INCOME = 'business_income',
  GAMBLING_PROCEEDS = 'gambling_proceeds',
  GIFTS = 'gifts',
  GOVERNMENT_BENEFITS = 'government_benefits',
  INHERITANCE = 'inheritance',
  INVESTMENT_LOANS = 'investment_loans',
  PENSION_RETIREMENT = 'pension_retirement',
  SALARY = 'salary',
  SALE_OF_ASSETS_REAL_ESTATE = 'sale_of_assets_real_estate',
  SAVINGS = 'savings',
  ESOPS = 'esops',
  INVESTMENT_PROCEEDS = 'investment_proceeds',
  SOMEONE_ELSE_FUNDS = 'someone_else_funds',
}

export enum BlindpayPurposeOfTransactions {
  BUSINESS_TRANSACTIONS = 'business_transactions',
  CHARITABLE_DONATIONS = 'charitable_donations',
  INVESTMENT_PURPOSES = 'investment_purposes',
  PAYMENTS_TO_FRIENDS_OR_FAMILY_ABROAD = 'payments_to_friends_or_family_abroad',
  PERSONAL_OR_LIVING_EXPENSES = 'personal_or_living_expenses',
  PROTECT_WEALTH = 'protect_wealth',
  PURCHASE_GOOD_AND_SERVICES = 'purchase_good_and_services',
  RECEIVE_PAYMENT_FOR_FREELANCING = 'receive_payment_for_freelancing',
  RECEIVE_SALARY = 'receive_salary',
  OTHER = 'other',
}

export enum BlindpayAccountPurpose {
  CHARITABLE_DONATIONS = 'charitable_donations',
  ECOMMERCE_RETAIL_PAYMENTS = 'ecommerce_retail_payments',
  INVESTMENT_PURPOSES = 'investment_purposes',
  BUSINESS_EXPENSES = 'business_expenses',
  PAYMENTS_TO_FRIENDS_OR_FAMILY_ABROAD = 'payments_to_friends_or_family_abroad',
  PERSONAL_OR_LIVING_EXPENSES = 'personal_or_living_expenses',
  PROTECT_WEALTH = 'protect_wealth',
  PURCHASE_GOODS_AND_SERVICES = 'purchase_goods_and_services',
  RECEIVE_PAYMENTS_FOR_GOODS_AND_SERVICES = 'receive_payments_for_goods_and_services',
  TAX_OPTIMIZATION = 'tax_optimization',
  THIRD_PARTY_MONEY_TRANSMISSION = 'third_party_money_transmission',
  OTHER = 'other',
  PAYROLL = 'payroll',
  TREASURY_MANAGEMENT = 'treasury_management',
}

export enum BlindpaySourceOfWealth {
  BUSINESS_DIVIDENDS_OR_PROFITS = 'business_dividends_or_profits',
  INVESTMENTS = 'investments',
  ASSET_SALES = 'asset_sales',
  CLIENT_INVESTOR_CONTRIBUTIONS = 'client_investor_contributions',
  GAMBLING = 'gambling',
  CHARITABLE_CONTRIBUTIONS = 'charitable_contributions',
  INHERITANCE = 'inheritance',
  AFFILIATE_OR_ROYALTY_INCOME = 'affiliate_or_royalty_income',
}

export enum BlindpayBusinessType {
  CORPORATION = 'corporation',
  LLC = 'llc',
  PARTNERSHIP = 'partnership',
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  TRUST = 'trust',
  NON_PROFIT = 'non_profit',
}

export enum BlindpayEstimatedAnnualRevenue {
  RANGE_0_99999 = '0_99999',
  RANGE_100000_999999 = '100000_999999',
  RANGE_1000000_9999999 = '1000000_9999999',
  RANGE_10000000_49999999 = '10000000_49999999',
  RANGE_50000000_249999999 = '50000000_249999999',
  RANGE_2500000000_PLUS = '2500000000_plus',
}

export enum BlindpayTaxType {
  SSN = 'SSN',
  ITIN = 'ITIN',
}

export enum BlindpayOwnerRole {
  BENEFICIAL_CONTROLLING = 'beneficial_controlling',
  BENEFICIAL_OWNER = 'beneficial_owner',
  CONTROLLING_PERSON = 'controlling_person',
}

// ── Tokens / Chains / Currency ──

export enum BlindpayToken {
  USDC = 'USDC',
  USDT = 'USDT',
  USDB = 'USDB',
}

export enum BlindpayFiatCurrency {
  BRL = 'BRL',
  USD = 'USD',
  MXN = 'MXN',
  COP = 'COP',
  ARS = 'ARS',
}

export enum BlindpayNetwork {
  BASE = 'base',
  ARBITRUM = 'arbitrum',
  POLYGON = 'polygon',
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
  TRON = 'tron',
  STELLAR = 'stellar',
  SEPOLIA = 'sepolia',
  ARBITRUM_SEPOLIA = 'arbitrum_sepolia',
  BASE_SEPOLIA = 'base_sepolia',
  POLYGON_AMOY = 'polygon_amoy',
  STELLAR_TESTNET = 'stellar_testnet',
  SOLANA_DEVNET = 'solana_devnet',
}

export enum BlindpayCurrencyType {
  SENDER = 'sender',
  RECEIVER = 'receiver',
}

// ── Bank Accounts ──

export enum BlindpayBankAccountType {
  WIRE = 'wire',
  ACH = 'ach',
  PIX = 'pix',
  PIX_SAFE = 'pix_safe',
  SPEI_BITSO = 'spei_bitso',
  TRANSFERS_BITSO = 'transfers_bitso',
  ACH_COP_BITSO = 'ach_cop_bitso',
  INTERNATIONAL_SWIFT = 'international_swift',
  RTP = 'rtp',
}

export enum BlindpayRecipientRelationship {
  FIRST_PARTY = 'first_party',
  EMPLOYEE = 'employee',
  INDEPENDENT_CONTRACTOR = 'independent_contractor',
  VENDOR_OR_SUPPLIER = 'vendor_or_supplier',
  SUBSIDIARY_OR_AFFILIATE = 'subsidiary_or_affiliate',
  MERCHANT_OR_PARTNER = 'merchant_or_partner',
  CUSTOMER = 'customer',
  LANDLORD = 'landlord',
  FAMILY = 'family',
  OTHER = 'other',
}

export enum BlindpayBankAccountClass {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export enum BlindpayBankAccountCheckType {
  CHECKING = 'checking',
  SAVING = 'saving',
}

export enum BlindpaySpeiProtocol {
  CLABE = 'clabe',
  DEBITCARD = 'debitcard',
  PHONENUM = 'phonenum',
}

export enum BlindpayTransfersType {
  CVU = 'CVU',
  CBU = 'CBU',
  ALIAS = 'ALIAS',
}

export enum BlindpayAchCopDocumentType {
  CC = 'CC',
  CE = 'CE',
  NIT = 'NIT',
  PASS = 'PASS',
  PEP = 'PEP',
}

// ── Payouts ──

export enum BlindpayPayoutStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  ON_HOLD = 'on_hold',
}

export enum BlindpayDocumentType {
  INVOICE = 'invoice',
  PURCHASE_ORDER = 'purchase_order',
  DELIVERY_SLIP = 'delivery_slip',
  CONTRACT = 'contract',
  CUSTOMS_DECLARATION = 'customs_declaration',
  BILL_OF_LADING = 'bill_of_lading',
  OTHERS = 'others',
}

// ── Document Uploads ──

export enum BlindpayUploadCategory {
  ID_DOC_FRONT = 'id_doc_front',
  ID_DOC_BACK = 'id_doc_back',
  PROOF_OF_ADDRESS = 'proof_of_address',
  SELFIE = 'selfie',
  SOURCE_OF_FUNDS = 'source_of_funds',
  INCORPORATION_DOC = 'incorporation_doc',
  PROOF_OF_OWNERSHIP = 'proof_of_ownership',
  TRANSACTION_DOCUMENT = 'transaction_document',
  PROFILE_IMAGE = 'profile_image',
}

// ── Limit Increase ──

export enum BlindpaySupportingDocumentType {
  INDIVIDUAL_BANK_STATEMENT = 'individual_bank_statement',
  INDIVIDUAL_TAX_RETURN = 'individual_tax_return',
  INDIVIDUAL_PROOF_OF_INCOME = 'individual_proof_of_income',
  BUSINESS_BANK_STATEMENT = 'business_bank_statement',
  BUSINESS_FINANCIAL_STATEMENTS = 'business_financial_statements',
  BUSINESS_TAX_RETURN = 'business_tax_return',
}

// ── Response interfaces ──

export interface IBlindpayLimits {
  perTransaction?: number;
  daily?: number;
  monthly?: number;
  updatedAt?: string;
}

export interface IBlindpayLimitIncreaseStatus {
  status?: 'pending' | 'approved' | 'rejected';
  requestedPerTransaction?: number;
  requestedDaily?: number;
  requestedMonthly?: number;
  requestedAt?: string;
  updatedAt?: string;
}

export interface IBlindpayBankAccountSummary {
  id: string;
  name?: string;
  type?: string;
  lastFour?: string;
  country?: string;
}

/** Nested `blindpay` object — also returned (safe fields) from POST /terms/complete */
export interface BlindpayUserConfig {
  receiverId?: string;
  receiverType?: BlindpayReceiverType;
  country?: string;
  kycType?: string;
  receiverStatus?: BlindpayReceiverStatus | string;
  receiverStatusUpdatedAt?: string;
  kycWarnings?: string[];
  fraudWarnings?: string[];
  limits?: IBlindpayLimits;
  limitIncrease?: IBlindpayLimitIncreaseStatus;
  defaultBankAccountId?: string;
  bankAccountCount?: number;
  bankAccounts?: IBlindpayBankAccountSummary[];
  tosId?: string;
  tosAcceptedAt?: string;
  // Profile endpoint returns snake_case fields directly
  id?: string;
  kyc_status?: string;
  kyc_warnings?: string[] | null;
  fraud_warnings?: string[] | null;
  is_tos_accepted?: boolean;
}

/** GET /v1/blindpay/status */
export interface BlindpayStatusResponse {
  blindpay?: BlindpayUserConfig;
}

/** POST /v1/blindpay/terms/initiate — response only; app sends `{}`; redirect URL is set server-side for BlindPay. */
export interface InitiateTermsResponse {
  url: string;
  idempotencyKey: string;
}

/** POST /v1/blindpay/terms/complete — safe fields only; same shape as `blindpay` in status */
export type CompleteTermsResponse = BlindpayUserConfig;

/** POST /v1/blindpay/documents */
export interface UploadDocumentResponse {
  url: string;
  key: string;
  documentType: BlindpayUploadCategory;
}

// ── Request DTOs ──

export interface CompleteTermsRequest {
  termsId: string;
}

/**
 * Multipart body for POST /v1/blindpay/documents.
 * `file`: web `File`; React Native typically appends `{ uri, name, type }` via FormData.
 */
export interface UploadDocumentRequest {
  file: File | Blob;
  documentType: BlindpayUploadCategory;
}

export interface ReceiverOwner {
  role: BlindpayOwnerRole;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  taxId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvinceRegion: string;
  country: string;
  postalCode: string;
  idDocCountry: string;
  idDocType: BlindpayIdDocType;
  idDocFrontFile: string;
  idDocBackFile?: string;
  proofOfAddressDocType?: BlindpayProofOfAddressDocType;
  proofOfAddressDocFile?: string;
  ownershipPercentage?: number;
  title?: string;
  taxType?: string;
}

/** POST /v1/blindpay/onboard — response mirrors status `blindpay` where applicable */
export interface CreateReceiverResponse {
  blindpay?: BlindpayUserConfig;
}

/** POST /v1/blindpay/onboard */
export interface CreateReceiverRequest {
  type: BlindpayReceiverType;
  country: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  email?: string;
  imageUrl?: string;
  taxId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvinceRegion?: string;
  postalCode?: string;
  idDocCountry?: string;
  idDocType?: BlindpayIdDocType;
  idDocFrontFile?: string;
  idDocBackFile?: string;
  proofOfAddressDocType?: BlindpayProofOfAddressDocType;
  proofOfAddressDocFile?: string;
  selfieFile?: string;
  sourceOfFundsDocType?: string;
  sourceOfFundsDocFile?: string;
  purposeOfTransactions?: string;
  purposeOfTransactionsExplanation?: string;
  accountPurpose?: string;
  accountPurposeOther?: string;
  legalName?: string;
  alternateName?: string;
  formationDate?: string;
  website?: string;
  businessType?: string;
  businessDescription?: string;
  businessIndustry?: string;
  estimatedAnnualRevenue?: string;
  sourceOfWealth?: string;
  publiclyTraded?: boolean;
  incorporationDocFile?: string;
  proofOfOwnershipDocFile?: string;
  owners?: ReceiverOwner[];
}

/** POST /v1/blindpay/bank-accounts */
export interface AddBankAccountRequest {
  type: BlindpayBankAccountType;
  name: string;
  recipientRelationship?: BlindpayRecipientRelationship;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: BlindpayBankAccountCheckType;
  accountClass?: BlindpayBankAccountClass;
  beneficiaryName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvinceRegion?: string;
  country?: string;
  postalCode?: string;
  pixKey?: string;
  forceCpfCnpj?: boolean;
  pixSafeBankCode?: string;
  pixSafeBranchCode?: string;
  pixSafeCpfCnpj?: string;
  speiProtocol?: BlindpaySpeiProtocol;
  speiInstitutionCode?: string;
  speiClabe?: string;
  transfersType?: BlindpayTransfersType;
  transfersAccount?: string;
  achCopBeneficiaryFirstName?: string;
  achCopBeneficiaryLastName?: string;
  achCopDocumentId?: string;
  achCopDocumentType?: BlindpayAchCopDocumentType;
  achCopEmail?: string;
  achCopBankCode?: string;
  achCopBankAccount?: string;
  swiftPaymentCode?: string;
  swiftCodeBic?: string;
  swiftAccountHolderName?: string;
  swiftAccountNumberIban?: string;
  swiftBeneficiaryAddressLine1?: string;
  swiftBeneficiaryAddressLine2?: string;
  swiftBeneficiaryCountry?: string;
  swiftBeneficiaryCity?: string;
  swiftBeneficiaryStateProvinceRegion?: string;
  swiftBeneficiaryPostalCode?: string;
  swiftBankName?: string;
  swiftBankAddressLine1?: string;
  swiftBankAddressLine2?: string;
  swiftBankCountry?: string;
  swiftBankCity?: string;
  swiftBankStateProvinceRegion?: string;
  swiftBankPostalCode?: string;
  swiftIntermediaryBankSwiftCodeBic?: string;
  swiftIntermediaryBankAccountNumberIban?: string;
  swiftIntermediaryBankName?: string;
  swiftIntermediaryBankCountry?: string;
  checkbookAccountId?: string;
  checkbookUserKey?: string;
  onemoneyExternalAccountId?: string;
}

/** POST /v1/blindpay/quotes */
export interface CreateQuoteRequest {
  bankAccountId: string;
  currencyType: BlindpayCurrencyType;
  requestAmount: number;
  network: BlindpayNetwork;
  token: BlindpayToken;
  coverFees?: boolean;
  description?: string;
  partnerFeeId?: string;
  transactionDocumentType?: BlindpayDocumentType;
  transactionDocumentId?: string;
  transactionDocumentFile?: string;
}

/** POST /v1/blindpay/quotes/fx */
export interface CreateFxQuoteRequest {
  from: BlindpayToken;
  to: BlindpayFiatCurrency;
  requestAmount: number;
  currencyType: BlindpayCurrencyType;
}

/** POST /v1/blindpay/payouts/evm */
export interface CreatePayoutEvmRequest {
  quoteId: string;
  senderWalletAddress: string;
}

/** POST /v1/blindpay/payouts/solana */
export interface CreatePayoutSolanaRequest {
  quoteId: string;
  senderWalletAddress: string;
  signedTransaction?: string;
}

/** POST /v1/blindpay/payouts/:id/documents */
export interface SubmitPayoutDocumentsRequest {
  transactionDocumentType: BlindpayDocumentType;
  transactionDocumentId: string;
  transactionDocumentFile: string;
  description?: string;
}

/** GET /v1/blindpay/payouts */
export interface ListPayoutsQuery {
  limit?: string;
  offset?: string;
  startingAfter?: string;
  endingBefore?: string;
  receiverId?: string;
  status?: BlindpayPayoutStatus;
}

/** POST /v1/blindpay/limits/increase */
export interface RequestLimitIncreaseRequest {
  perTransaction?: number | null;
  daily?: number | null;
  monthly?: number | null;
  supportingDocumentType: BlindpaySupportingDocumentType;
  supportingDocumentFile: string;
}

// ── Legacy aliases (same shapes; keep existing imports stable) ──

/** @deprecated Use `BlindpayUserConfig` */
export type BlindPayConfig = BlindpayUserConfig;

/** @deprecated Use `BlindpayStatusResponse` */
export type BlindPayStatusResponse = BlindpayStatusResponse;

/** @deprecated Use `InitiateTermsResponse` */
export type BlindPayTermsInitiateResponse = InitiateTermsResponse;

/** @deprecated Use `BlindpayReceiverStatus` enum (or `BlindpayReceiverStatus | string` for forward compat) */
export type BlindPayReceiverStatus = BlindpayReceiverStatus | string;
