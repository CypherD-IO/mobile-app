export enum TokenFunctionality {
  STAKING = 'STAKING',
  TRANSACTIONS = 'TRANSACTIONS',
  ABOUT = 'ABOUT'
}

export enum UserCommunicationChannels {
  EMAIL = 'email',
  MOBILE = 'mobile',
  BOTH = 'both',
}

export enum CardApplicationStatus {
  CREATED = 'created',
  VERIFICATION_PENDING = 'verification-pending',
  VERIFICATION_COMPLETE = 'verification-complete',
  KYC_INITIATED = 'kyc-initiated',
  KYC_PENDING = 'kyc-pending',
  KYC_FAILED = 'kyc-failed',
  KYC_SUCCESSFUL = 'kyc-successful',
  COMPLETION_PENDING = 'completion-pending',
  COMPLETED = 'completed',
}

export enum Web3Origin {
  BROWSER = 'browser',
  WALLETCONNECT = 'walletconnect',
  ONMETA = 'onmeta'
}

export enum KYCStatus {
  NOT_STARTED = 'notStarted',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  DECLINED = 'declined',
  IN_REVIEW = 'inReview',
}

export enum CardStatus {
  NA = 'not-available',
  ACTIVE = 'active',
  IN_ACTIVE = 'in-active',
  BLOCKED = 'blocked',
}

export enum OTPType {
  PHONE = 'phone',
  EMAIL = 'email'
}

export enum CardTypes {
  SOLID = 'solid',
  APTO = 'apto'
}

export enum GlobalContextType {
  SIGN_IN = 'SIGN_IN',
  RPC_UPDATE = 'RPC_UPDATE',
  CARD_PROFILE = 'CARD_PROFILE',
  IBC = 'IBC',
}

export enum TransactionFilterTypes {
  ALL = 'ALL_TRANSACTIONS',
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

export enum TransactionTypes {
  CREDIT = 'credit',
  DEBIT = 'debit'
}

export enum TransactionFilterByDateTypes {
  ALL = 'ALL',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum BottomSheetPositions {
  MINIMISED = 'minimised',
  MAXIMISED = 'maximised',
  EXPANDED = 'expanded',
}

export enum PinPresentStates {
  NOTSET = 'notset',
  TRUE = 'true',
  FALSE = 'false'
}

export enum IdTypes {
  SSN = 'ssn',
  PASSPORT = 'passport',
  OTHER = 'otherId'
}

export enum OtherIdTypes {
  PASSPORT = 'passport',
  DRIVING_LICENCE = 'DrivingLicense',
  TAX_ID = 'TaxId',
  NATIONAL_ID = 'NationalId',
  OTHER = 'Other',
  PASSPORT_LABEL = 'Passport',
  DRIVING_LICENCE_LABEL = 'Driving License',
  TAX_ID_LABEL = 'Tax Id',
  NATIONAL_ID_LABEL = 'National Id',
  OTHER_LABEL = 'Other'
}

export enum TokenOverviewTabs {
  OVERVIEW = 'OVERVIEW',
  TRANSACTIONS = 'TRANSACTIONS',
  STAKING = 'STAKING'
}

export enum TokenOverviewTabIndices {
  OVERVIEW = 0,
  TRANSACTIONS = 1,
  STAKING = 2
}
