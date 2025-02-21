export enum AllChainsEnum {
  ETH = 'ETH',
  POLYGON = 'POLYGON',
  AVALANCHE = 'AVALANCHE',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BSC = 'BSC',
  COSMOS = 'COSMOS',
  OSMOSIS = 'OSMOSIS',
  STARGAZE = 'STARGAZE',
  COREUM = 'COREUM',
  INJECTIVE = 'INJECTIVE',
  KUJIRA = 'KUJIRA',
  NOBLE = 'NOBLE',
  ZKSYNC_ERA = 'ZKSYNC_ERA',
  BASE = 'BASE',
  TRON = 'TRON',
  SOLANA = 'SOLANA',
}

export enum TokenFunctionality {
  TRANSACTIONS = 'TRANSACTIONS',
  ABOUT = 'ABOUT',
}

export enum AddressFunctionality {
  MY_ADDRESS = 'MY ADDRESS',
  CONTACTS = 'CONTACTS',
}

export const AddressFunctionalityList = [
  AddressFunctionality.MY_ADDRESS,
  AddressFunctionality.CONTACTS,
];

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
  KYC_EXPIRED = 'kyc-expired',
  KYC_SUCCESSFUL = 'kyc-successful',
  SUBMITTED = 'submitted',
  COMPLETION_PENDING = 'completion-pending',
  COMPLETED = 'completed',
  DECLINED = 'declined', // permanant decline state
}

export enum Web3Origin {
  BROWSER = 'browser',
  WALLETCONNECT = 'walletconnect',
  ONMETA = 'onmeta',
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
  IN_ACTIVE = 'inactive',
  BLOCKED = 'blocked',
  PENDING_ACTIVATION = 'pendingActivation',
  HIDDEN = 'hidden',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  OTHER = 'other',
  COMING_SOON = 'coming-soon',
  RC_UPGRADABLE = 'rcUpgradable',
}

export enum OTPType {
  PHONE = 'phone',
  EMAIL = 'email',
}

export enum CardProviders {
  SOLID = 'solid',
  APTO = 'apto',
  BRIDGE_CARD = 'bc',
  PAYCADDY = 'pc',
  REAP_CARD = 'rc',
  RAIN_CARD = 'ra',
}

export enum GlobalContextType {
  SIGN_IN = 'SIGN_IN',
  RPC_UPDATE = 'RPC_UPDATE',
  CARD_PROFILE = 'CARD_PROFILE',
  IBC = 'IBC',
  IS_APP_AUTHENTICATED = 'IS_APP_AUTHENTICATED',
  PLAN_INFO = 'PLAN_INFO',
  RESET_GLOBAL_STATE = 'RESET_GLOBAL_STATE',
}

export enum TransactionFilterTypes {
  ALL = 'ALL_TRANSACTIONS',
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REFUND = 'REFUND',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum CardTransactionTypes {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  REFUND = 'REFUND',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum CardControlTypes {
  DOMESTIC = 'dom',
  INTERNATIONAL = 'intl',
}

export enum CardType {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
}

export enum PhysicalCardType {
  METAL = 'metal',
}

export enum CardDesignType {
  METAL = 'metal',
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
}

export enum CardTransactionStatuses {
  SETTLED = 'Settled',
  PENDING = 'Pending',
  DECLINED = 'Declined',
}

export enum ReapTxnStatus {
  DECLINED = 'DECLINED',
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
  VOID = 'VOID',
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
  FALSE = 'false',
}

export enum IdTypes {
  SSN = 'ssn',
  PASSPORT = 'passport',
  OTHER = 'otherId',
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
  OTHER_LABEL = 'Other',
}

export enum TokenOverviewTabs {
  OVERVIEW = 'OVERVIEW',
  TRANSACTIONS = 'TRANSACTIONS',
}

export enum TokenOverviewTabIndices {
  OVERVIEW = 0,
  TRANSACTIONS = 1,
}

export enum RPCPreference {
  DEFAULT = 'default',
  OVERIDDEN = 'overridden',
}

export enum ButtonType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERNARY = 'ternary',
  GREY = 'grey',
  RED = 'red',
  DARK = 'dark',
  GREY_FILL = 'greyFill',
  WHITE_FILL = 'whiteFill',
}

export enum ImagePosition {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum IconPosition {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum RenderViewType {
  LIST_VIEW = 'LIST_VIEW',
  GRID_VIEW = 'GRID_VIEW',
}

export enum GlobalModalType {
  STATE = 'state',
  PROMPT_IMPORT_WALLET = 'promptImportWallet',
  REMOVE_WALLET = 'removeWallet',
  WALLET_CONNECT_V2_PAIRING = 'walletConnectV2Pairing',
  WALLET_CONNECT_V2_SIGNING = 'walletConnectV2Signing',
  WALLET_CONNECT_V2_TYPED_SIGNING = 'walletConnectV2TypedSigning',
  WALLET_CONNECT_V2_TRANSACTION_SIGNING = 'walletConnectV2TransactionSigning',
  WALLET_CONNECT_V2_COSMOS_SIGNING = 'walletConnectV2CosmosSigning',
  CUSTOM_LAYOUT = 'customLayout',
  THREE_D_SECURE_APPROVAL = 'threeDSecureApproval',
  CARD_ACTIONS_FROM_NOTIFICATION = 'cardActionsFromNotification',
}

export enum TokenModalType {
  PORTFOLIO = 'portfolio',
  CARD_LOAD = 'cardLoad',
  SWAP = 'swap',
}

export enum SeedPhraseType {
  TWELVE_WORDS = 'TWELVE_WORDS',
  TWENTY_FOUR_WORDS = 'TWENTY_FOUR_WORDS',
}

export enum SignMessageValidationType {
  VALID = 'VALID',
  NEEDS_UPDATE = 'NEEDS_UPDATE',
  INVALID = 'INVALID',
}

export enum MessageType {
  ETH_SEND_TRANSACTION,
}

export enum DecodedResponseTypes {
  SEND = 'type_send',
  CALL = 'type_call',
  APPROVE = 'type_token_approval',
  REVOKE = 'type_cancel_token_approval',
  UNKNOWN = 'Unknown',
}

export enum SigningModalPayloadFrom {
  BROWSER = 'BROWSER',
  WALLETCONNECT = 'WALLETCONNECT',
}

export enum ScrollableType {
  SCROLLVIEW = 'ScrollView',
  FLATLIST = 'FlatList',
}

export enum TransactionType {
  SEND = 'send',
  SWAP = 'swap',
  RECEIVE = 'receive',
  APPROVE = 'approve',
  REVOKE = 'revoke',
  OTHERS = 'others',
  SELF = 'self',
}

export enum ApplicationName {
  SQUID = 'Squid',
  ODOS = 'Odos',
  SUSHISWAP = 'SushiSwap',
  UNISWAP = 'UniSwap',
  GMX = 'GMX',
  AAVE = 'Aave',
  POOL_TOGETHER = 'PoolTogether',
  PARA_SWAP = 'ParaSwap',
  OPEN_SEA = 'OpenSea',
  ENS = 'ENS',
  PANCAKE_SWAP = 'PancakeSwap',
  POLYGON_BRIDGE = 'Polygon Bridge',
  METAMASK = 'METAMASK',
  SYNAPSE = 'Synapse',
  _1_INCH = '1inch',
  SPOOKY_SWAP = 'SpookySwap',
  _0X_EXCHANGE = '0x Exchange',
  QUICK_SWAP = 'QuickSwap',
  LIFI = 'Lifi',
  WRAPPED_MATIC = 'Wrapped Matic',
  SPIRIT_SWAP = 'SpiritSwap',
  DIFFUSION = 'Diffusion',
  TRADER_JOE = 'Trader Joe',
  SOCKET = 'Socket',
  APE_SWAP = 'ApeSwap',
  ARB_SWAP = 'ArbSwap',
  CBRIDGE = 'cBridge',
  HOP = 'Hop',
  WORM_HOLE = 'WormHole',
}

export enum AnalyticsType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum CardDetails {
  PHONE = 'phone',
  EMAIL = 'email',
}

export enum ConnectionTypes {
  SEED_PHRASE = 'seedPhrase',
  PRIVATE_KEY = 'privateKey',
  WALLET_CONNECT = 'walletConnect',
  WALLET_CONNECT_WITHOUT_SIGN = 'walletConnectWithoutSign',
}

export enum CARD_ALERT_TYPES {
  WEEKLY_REMINDER_LIMITED = 'weeklyReminderLimited',
  CARD_TRANSACTION_SMS = 'cardTransactionSms',
  CARD_TRANSACTION_EMAIL = 'cardTransactionEmail',
  CARD_TRANSACTION_FCM = 'cardTransactionFcm',
  CARD_TRANSACTION_TELEGRAM = 'cardTransactionTelegram',
}

export enum CARD_NOTIFICATION_TYPES {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  SMS = 'sms',
  FCM = 'fcm',
}

export enum SECRET_TYPES {
  MENEMONIC = 'mnemonic',
  PRIVATE_KEY = 'privateKey',
}

export enum CardReferralStatus {
  CREATED = 'created',
  CARD_ISSUED = 'card-issued',
  KYC_FAILED = 'kyc-failed',
  INVITE_USED = 'invite-used',
  LOADED = 'loaded',
}

export enum CARD_LIMIT_TYPE {
  DISABLED = 'dis',
  ALLOWED_COUNTRIES = 'cLs', // allowed country list / default allow all
  CARD_PIN = 'pos',
  CONTACTLESS = 'tap',
  ATM = 'atm',
  ONLINE = 'ecom',
  MOBILE_WALLET = 'wal',
}

export enum ACCOUNT_STATUS {
  ACTIVE = 'active',
  LOCKED = 'locked',
  INACTIVE = 'inactive',
}

export enum CypherPlanId {
  BASIC_PLAN = 'basic_plan_v1',
  PRO_PLAN = 'pro_plan_v1',
}

export enum CardOperationsAuthType {
  UNLOCK = 'status',
  UNBLOCK = 'unblock',
  ZERO_RESTRICTION_MODE_ON = 'god-mode',
}

export enum JoinDiscordStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum RPCODES {
  InsufficientFunds = '51',
  NotPermitted = '57',
  SUCCESS = '00',
  NetworkTimedOut = '05',
  InvalidCardStatusLost = '41',
  InvalidCardStatusDestroyed = '46',
  AtmWithdrawalAmountLimitExceeded = '61',
  AtmWithdrawalNotPermittedInMerchantCountry = '62',
  AtmWithdrawalFrequencyExceeded = '65',
  InvalidCardStatusUnknown = '70',
  CardBlockedDueToExceedingMaximumNumberOfIncorrectAtmPinAttempts = '75',
  CardBlockedDueToExceedingMaximumNumberOfIncorrectCvvTransactionAttempts = 'R2',
  CardHasBeenBlockedDueToExceedingTheMaximumNumberOfIncorrectCvvTransactionAttempts = 'R2',
  CardHasBeenBlockedDueToExceedingTheMaximumNumberOfIncorrectExpiryDateTransactionAttempts = 'R3',
  CardIsNotActivated = 'R4',
  CardIsBlocked = 'R8',
}

// I - international
// D - domestic
// R - Reap Specific Codes
export enum CypherDeclineCodes {
  OTHERS = 'C0',
  BALANCE = 'C1',
  ACC_LOCKED = 'C2',
  ACC_INACTIVE = 'C3',
  INT_COUNTRY = 'I4G',
  INT_CHANNEL_LIMIT = 'I5G',
  DOM_CHANNEL_LIMIT = 'D5G',
  DAILY_LIMIT = 'C6',
  MONTHLY_LIMIT = 'C7',
  RATE_CHECK_USER = 'U8G',
  LOCATION_CHECK_USER = 'L8G',
  RATE_CHECK_MERCHANT = 'M8G',
  HIGH_RISK = 'C9',
  CATERGORY = 'A1G',
  CATERGORY_LIMIT = 'A2G',
  CATERGORY_DENIED = 'A3G',
  MERCHANT_GLOBAL = 'B2G', // cypher global settings
  MERCHANT_DENIED = 'B3G', // user settings
  MERCHANT_LIMIT = 'B4G', // user settings
}

export enum NOTIFE_ACTIONS {
  ADD_COUNTRY = 'add-country',
  INCREASE_DOMESTIC_LIMIT = 'increase-domestic-limit',
  INCREASE_INTERNATIONAL_LIMIT = 'increase-international-limit',
  INCREASE_DAILY_LIMIT = 'increase-daily-limit',
  INCREASE_MONTHLY_LIMIT = 'increase-monthly-limit',
  ENABLE_ZERO_RESTRICTION_MODE = 'enable-zero-restriction-mode',
  ACTIVATE_CARD = 'activate-card',
  UNBLOCK_CARD = 'unblock-card',
}

export const CARD_IDS = {
  METAL_CARD: 'metal-card',
  HIDDEN_CARD: 'hidden',
};
