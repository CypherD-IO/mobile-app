/**
 * BlindPay API — enums, DTOs, and responses (camelCase, aligned with backend).
 * @see GET/POST /v1/bp/*
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
  DEPRECATED = 'deprecated',
  PENDING_REVIEW = 'pending_review',
}

export enum BlindpayKycType {
  LIGHT = 'light',
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
}

export enum BlindpayAmlStatus {
  CLEAR = 'clear',
  HIT = 'hit',
  ERROR = 'error',
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

export enum BlindpayBankAccountStatus {
  VERIFYING = 'verifying',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DEPRECATED = 'deprecated',
}

export interface IBlindpayOfframpWallet {
  id: string;
  externalId: string | null;
  circleWalletId: string | null;
  network: BlindpayOfframpWalletNetwork;
  address: string;
}

/** POST/GET /v1/bp/bank-accounts response */
export interface IBlindpayBankAccountResponse {
  id: string;
  type: BlindpayBankAccountType;
  name: string;
  status: BlindpayBankAccountStatus | null;
  // US domestic (ACH/Wire/RTP)
  recipientRelationship: BlindpayRecipientRelationship | null;
  routingNumber: string | null;
  accountNumber: string | null;
  accountType: BlindpayBankAccountCheckType | null;
  accountClass: BlindpayBankAccountClass | null;
  beneficiaryName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvinceRegion: string | null;
  country: string | null;
  postalCode: string | null;
  businessIndustry: string | null;
  phoneNumber: string | null;
  // Shared optional
  taxId: string | null;
  dateOfBirth: string | null;
  // PIX
  pixKey: string | null;
  // PIX Safe
  pixSafeCpfCnpj: string | null;
  pixSafeBankCode: string | null;
  pixSafeBranchCode: string | null;
  // SPEI
  speiProtocol: BlindpaySpeiProtocol | null;
  speiClabe: string | null;
  speiInstitutionCode: string | null;
  // Transfers (Argentina)
  transfersType: BlindpayTransfersType | null;
  transfersAccount: string | null;
  // ACH COP (Colombia)
  achCopBeneficiaryFirstName: string | null;
  achCopBeneficiaryLastName: string | null;
  achCopDocumentId: string | null;
  achCopDocumentType: BlindpayAchCopDocumentType | null;
  achCopEmail: string | null;
  achCopBankCode: string | null;
  achCopBankAccount: string | null;
  // SWIFT
  swiftCodeBic: string | null;
  swiftAccountHolderName: string | null;
  swiftAccountNumberIban: string | null;
  swiftPaymentCode: string | null;
  swiftBeneficiaryAddressLine1: string | null;
  swiftBeneficiaryAddressLine2: string | null;
  swiftBeneficiaryCountry: string | null;
  swiftBeneficiaryCity: string | null;
  swiftBeneficiaryStateProvinceRegion: string | null;
  swiftBeneficiaryPostalCode: string | null;
  swiftBankName: string | null;
  swiftBankAddressLine1: string | null;
  swiftBankAddressLine2: string | null;
  swiftBankCountry: string | null;
  swiftBankCity: string | null;
  swiftBankStateProvinceRegion: string | null;
  swiftBankPostalCode: string | null;
  swiftIntermediaryBankSwiftCodeBic: string | null;
  swiftIntermediaryBankAccountNumberIban: string | null;
  swiftIntermediaryBankName: string | null;
  swiftIntermediaryBankCountry: string | null;
  // Tron / wallets
  tronWalletHash: string | null;
  offrampWallets: IBlindpayOfframpWallet[] | null;
  createdAt: string;
}

// ── Payouts ──

export enum BlindpayPayoutStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  ON_HOLD = 'on_hold',
}

export enum BlindpayPayoutTrackingStep {
  PROCESSING = 'processing',
  ON_HOLD = 'on_hold',
  PENDING_REVIEW = 'pending_review',
  COMPLETED = 'completed',
}

export enum BlindpayPaymentEta {
  FIVE_MIN = '5_min',
  THIRTY_MIN = '30_min',
  TWO_HOURS = '2_hours',
  ONE_BUSINESS_DAY = '1_business_day',
  TWO_BUSINESS_DAYS = '2_business_days',
  FIVE_BUSINESS_DAYS = '5_business_days',
}

export enum BlindpayProviderName {
  NVIO_PAGOS = 'Nvio Pagos',
  BREX = 'Brex',
  STARK_BANK = 'Stark Bank',
  JPMORGAN_CHASE = 'JPMorgan Chase',
  HSBC = 'HSBC',
  INTER = 'Inter',
  JP_MORGAN_CHASE = 'JP Morgan Chase',
  BITSO = 'Bitso',
  CITI = 'Citi',
  CFSB = 'CFSB',
}

export enum BlindpayProviderStatus {
  CANCELED = 'canceled',
  FAILED = 'failed',
  RETURNED = 'returned',
  SENT = 'sent',
  DEPOSITED = 'deposited',
  CONVERTED = 'converted',
  WITHDRAWN = 'withdrawn',
}

export enum BlindpayTrackingStatus {
  FAILED = 'failed',
  FOUND = 'found',
  TOKENS_REFUNDED = 'tokens_refunded',
  PAID = 'paid',
  WAITING_DOCUMENTS = 'waiting_documents',
  COMPLIANCE_REVIEWING = 'compliance_reviewing',
}

export enum BlindpayVirtualAccountType {
  PERSONAL_CHECKING = 'Personal checking',
  BUSINESS_CHECKING = 'Business checking',
}

export enum BlindpayOfframpWalletNetwork {
  TRON = 'tron',
  SOLANA = 'solana',
}

export enum BlindpayBankingPartner {
  JPMORGAN = 'jpmorgan',
  CITI = 'citi',
  HSBC = 'hsbc',
  CFSB = 'cfsb',
}

export enum BlindpaySoleProprietorDocType {
  MASTER_SERVICE_AGREEMENT = 'master_service_agreement',
  SALARY_SLIP = 'salary_slip',
  BANK_STATEMENT = 'bank_statement',
}

// ── Virtual Account response types ──

export interface IBlindpayVirtualAccountBankDetails {
  routingNumber: string;
  accountNumber: string;
}

export interface IBlindpayVirtualAccountAddress {
  name: string;
  addressLine1: string;
  addressLine2: string | null;
}

export interface IBlindpayVirtualAccountUs {
  ach: IBlindpayVirtualAccountBankDetails | null;
  wire: IBlindpayVirtualAccountBankDetails;
  rtp: IBlindpayVirtualAccountBankDetails | null;
  swiftBicCode: string | null;
  swiftAccountNumber: string | null;
  accountType: BlindpayVirtualAccountType | null;
  beneficiary: IBlindpayVirtualAccountAddress | null;
  receivingBank: IBlindpayVirtualAccountAddress | null;
  swiftReceivingBank: IBlindpayVirtualAccountAddress | null;
}

export interface IBlindpayVirtualAccountBlockchainWallet {
  network: BlindpayNetwork;
  address: string | null;
}

/** POST/GET /v1/bp/virtual-accounts response */
export interface IBlindpayVirtualAccountResponse {
  id: string;
  bankingPartner: BlindpayBankingPartner;
  kycStatus: BlindpayReceiverStatus;
  us: IBlindpayVirtualAccountUs;
  token: BlindpayToken;
  blockchainWalletId: string | null;
  blockchainWallet: IBlindpayVirtualAccountBlockchainWallet | null;
}

/** @deprecated Use IBlindpayPayoutTracking instead */
export type BlindpayTrackingStage = IBlindpayPayoutTracking;

/** Full tracking stage nested in PayoutResponse */
export interface IBlindpayPayoutTracking {
  step: BlindpayPayoutTrackingStep;
  status: BlindpayTrackingStatus | null;
  transactionHash: string | null;
  completedAt: string | null;
  providerName: BlindpayProviderName | null;
  providerTransactionId: string | null;
  providerStatus: BlindpayProviderStatus | null;
  providerErrorReason: string | null;
  providerUetr: string | null;
  estimatedTimeOfArrival: BlindpayPaymentEta | null;
  recipientName: string | null;
  recipientTaxId: string | null;
  recipientBankCode: string | null;
  recipientBranchCode: string | null;
  recipientAccountNumber: string | null;
  recipientAccountType: string | null;
  coelsaId: string | null;
  ledgerInTransactionId: string | null;
  ledgerOutTransactionId: string | null;
  refundReason: string | null;
  reviewedBy: string | null;
}

/** JPMorgan tracking data nested in PayoutResponse */
export interface IBlindpayJpmTrackData {
  jpmTraceNumber: string | null;
  jpmProcessingStatus: string | null;
  extendedTrackingStatus: string | null;
  jpmReferenceNumber: string | null;
  uetr: string | null;
  fedImad: string | null;
  paymentDate: string | null;
  paymentAmount: string | null;
  paymentCurrency: string | null;
}

/** GET /v1/bp/payouts/:id, POST /v1/bp/payouts/evm, POST /v1/bp/payouts/solana */
export interface BlindpayPayoutResponse {
  id: string;
  status: BlindpayPayoutStatus;
  senderWalletAddress: string;
  quoteId: string;
  bankAccountId: string | null;
  offrampWalletId: string | null;
  network: BlindpayNetwork;
  token: BlindpayToken;
  currency: BlindpayFiatCurrency;
  description: string | null;
  signedTransaction: string | null;
  senderAmount: number | null;
  receiverAmount: number | null;
  receiverLocalAmount: number | null;
  blindpayQuotation: number | null;
  transactionFeeAmount: number | null;
  billingFeeAmount: number | null;
  totalFeeAmount: number | null;
  // Tracking
  trackingTransaction: IBlindpayPayoutTracking | null;
  trackingPayment: IBlindpayPayoutTracking | null;
  trackingLiquidity: IBlindpayPayoutTracking | null;
  trackingComplete: IBlindpayPayoutTracking | null;
  trackingPartnerFee: IBlindpayPayoutTracking | null;
  trackingDocuments: IBlindpayPayoutTracking | null;
  jpmTrackData: IBlindpayJpmTrackData | null;
  // Inline bank account fields
  name: string | null;
  type: BlindpayBankAccountType | null;
  pixKey: string | null;
  pixSafeBankCode: string | null;
  pixSafeBranchCode: string | null;
  pixSafeCpfCnpj: string | null;
  accountNumber: string | null;
  routingNumber: string | null;
  country: string | null;
  accountClass: BlindpayBankAccountClass | null;
  accountType: BlindpayBankAccountCheckType | null;
  beneficiaryName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvinceRegion: string | null;
  postalCode: string | null;
  speiClabe: string | null;
  speiProtocol: BlindpaySpeiProtocol | null;
  speiInstitutionCode: string | null;
  transfersAccount: string | null;
  transfersType: BlindpayTransfersType | null;
  achCopBeneficiaryFirstName: string | null;
  achCopBeneficiaryLastName: string | null;
  achCopDocumentId: string | null;
  achCopDocumentType: BlindpayAchCopDocumentType | null;
  achCopEmail: string | null;
  achCopBankCode: string | null;
  achCopBankAccount: string | null;
  swiftCodeBic: string | null;
  swiftAccountHolderName: string | null;
  swiftAccountNumberIban: string | null;
  swiftBeneficiaryCountry: string | null;
  // Sender info
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
  // Transaction documents
  transactionDocumentFile: string | null;
  transactionDocumentType: BlindpayDocumentType | null;
  transactionDocumentId: string | null;
  // Flags
  hasVirtualAccount: boolean | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
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

/** @deprecated Old per-category upload type. Use BlindpayUploadBucket instead. */
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

/** New bucket-based upload. POST /v1/bp/documents form field: "bucket" */
export enum BlindpayUploadBucket {
  ONBOARDING = 'onboarding',
  LIMIT_INCREASE = 'limit_increase',
  AVATAR = 'avatar',
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

// ── Reference data types ──

/** GET /v1/bp/available/rails */
export interface IBlindpayAvailableRail {
  label: string;
  value: BlindpayBankAccountType;
  country: string;
}

/** GET /v1/bp/available/swift/:code */
export interface IBlindpaySwiftLookupResult {
  id: string;
  bank: string;
  city: string;
  branch: string;
  swiftCode: string;
  swiftCodeLink: string;
  country: string;
  countrySlug: string;
}

// ── Dynamic form schema (API-driven bank account fields) ──

export interface ApiFieldSchemaRequiredWhen {
  field: string;
  operator: 'eq' | 'in';
  values: string[];
}

export interface ApiFieldSchema {
  label: string;
  regex: string;
  key: string;
  items?: Array<{ label: string; value: string }>;
  required: boolean;
  requiredWhen?: ApiFieldSchemaRequiredWhen;
}

// ── Shared response types ──

export interface IBlindpaySuccessResponse {
  success: boolean;
}

export interface IBlindpayKycWarning {
  code: string | null;
  message: string | null;
  resolutionStatus: string | null;
  warningId: string | null;
}

export interface IBlindpayFraudWarning {
  id: string | null;
  name: string | null;
  operation: string | null;
  score: number | null;
}

export interface IBlindpayAmlHits {
  hasSanctionMatch: boolean;
  hasPepMatch: boolean;
  hasWatchlistMatch: boolean;
  hasCrimelistMatch: boolean;
  hasAdversemediaMatch: boolean;
}

// ── Limits ──

/** @deprecated Old flat limits structure used in status response */
export interface IBlindpayLimits {
  perTransaction?: number;
  daily?: number;
  monthly?: number;
  updatedAt?: string;
}

export interface IBlindpayDirectionLimits {
  daily: number;
  monthly: number;
}

/** GET /v1/bp/limits response */
export interface IBlindpayLimitsResponse {
  limits: {
    payin: IBlindpayDirectionLimits;
    payout: IBlindpayDirectionLimits;
  };
}

export enum BlindpayLimitIncreaseStatus {
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** Nested in status response — summary of latest limit increase */
export interface IBlindpayLimitIncreaseStatus {
  status?: BlindpayLimitIncreaseStatus;
  requestedPerTransaction?: number;
  requestedDaily?: number;
  requestedMonthly?: number;
  requestedAt?: string;
  updatedAt?: string;
}

/** POST /v1/bp/limits/increase response */
export interface IBlindpayLimitIncreaseResponse {
  id: string;
}

/** GET /v1/bp/limits/increase response item */
export interface IBlindpayLimitIncreaseHistoryItem {
  id: string;
  status: BlindpayLimitIncreaseStatus;
  receiverId: string;
  perTransaction: number | null;
  daily: number | null;
  monthly: number | null;
  approvedPerTransaction: number | null;
  approvedDaily: number | null;
  approvedMonthly: number | null;
  supportingDocumentType: BlindpaySupportingDocumentType | null;
  supportingDocumentFile: string | null;
  createdAt: string;
  updatedAt: string;
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
  // Profile endpoint fields (same shape as status now — all camelCase)
  id?: string;
  kycStatus?: string;
  email?: string;
  occupation?: string;
  accountPurpose?: string;
  estimatedAnnualRevenue?: string;
  sourceOfFundsDocType?: string;
}

/** GET /v1/bp/status */
export interface BlindpayStatusResponse {
  blindpay?: BlindpayUserConfig;
}

/** POST /v1/bp/terms/initiate — response only; app sends `{}`; redirect URL is set server-side for BlindPay. */
export interface InitiateTermsResponse {
  url: string;
  idempotencyKey: string;
}

/** POST /v1/bp/terms/complete — safe fields only; same shape as `blindpay` in status */
export type CompleteTermsResponse = BlindpayUserConfig;

/** POST /v1/bp/documents (new bucket-based response) */
export interface UploadDocumentResponse {
  fileUrl: string;
  bucket: BlindpayUploadBucket | string;
}

// ── Request DTOs ──

export interface CompleteTermsRequest {
  termsId: string;
}

/**
 * Multipart body for POST /v1/bp/documents.
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

/** POST /v1/bp/onboard — response mirrors status `blindpay` where applicable */
export interface CreateReceiverResponse {
  blindpay?: BlindpayUserConfig;
}

/** POST /v1/bp/onboard */
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

/** POST /v1/bp/bank-accounts */
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

/** POST /v1/bp/quotes */
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

/** POST /v1/bp/quotes/fx */
export interface CreateFxQuoteRequest {
  from: BlindpayToken;
  to: BlindpayFiatCurrency;
  requestAmount: number;
  currencyType: BlindpayCurrencyType;
}

/** POST /v1/bp/quotes/fx response (indicative rate preview, no binding) */
export interface IBlindpayFxQuoteResponse {
  commercialQuotation: number | null;
  blindpayQuotation: number | null;
  resultAmount: number;
  instanceFlatFee: number | null;
  instancePercentageFee: number;
}

/** ERC-20 approval contract data nested in quote response */
export interface IBlindpayQuoteContract {
  abi: Record<string, unknown>[];
  address: string;
  functionName: string;
  blindpayContractAddress: string;
  amount: string;
  network: { name: string; chainId: number };
}

/** POST /v1/bp/quotes response */
export interface IBlindpayQuoteResponse {
  id: string;
  expiresAt: number | null;
  commercialQuotation: number | null;
  blindpayQuotation: number | null;
  receiverAmount: number | null;
  senderAmount: number | null;
  partnerFeeAmount: number | null;
  flatFee: number | null;
  billingFeeAmount: number | null;
  contract: IBlindpayQuoteContract | null;
  receiverLocalAmount: number | null;
  description: string | null;
}

/** POST /v1/bp/payouts/evm */
export interface CreatePayoutEvmRequest {
  quoteId: string;
  senderWalletAddress: string;
}

/** POST /v1/bp/payouts/solana */
export interface CreatePayoutSolanaRequest {
  quoteId: string;
  senderWalletAddress: string;
  signedTransaction?: string;
}

/** POST /v1/bp/payouts/solana/prepare-delegate response */
export interface IBlindpayPrepareDelegateResponse {
  success: boolean;
  transaction: string;
  debug?: unknown;
}

/** POST /v1/bp/payouts/:id/documents */
export interface SubmitPayoutDocumentsRequest {
  transactionDocumentType: BlindpayDocumentType;
  transactionDocumentId: string;
  transactionDocumentFile: string;
  description?: string;
}

/** GET /v1/bp/payouts */
export interface ListPayoutsQuery {
  limit?: '10' | '50' | '100' | '200' | '500' | '1000';
  offset?: '0' | '10' | '50' | '100' | '200' | '500' | '1000';
  startingAfter?: string;
  endingBefore?: string;
  status?: BlindpayPayoutStatus;
  receiverName?: string;
  bankAccountId?: string;
  country?: string;
  paymentMethod?: BlindpayBankAccountType;
  network?: BlindpayNetwork;
  token?: BlindpayToken;
}

/** POST /v1/bp/limits/increase */
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
