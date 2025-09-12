import {
  ActivityStatus,
  CypherCardPrograms,
  FdActionType,
  FdCardProviders,
} from '../constants/enum';
import { ALL_CHAINS_TYPE } from '../constants/type';

// import { CypherCardPrograms, CypherB2BCardPrograms } from '../enums/card.enums';
// import { ActivityStatus } from '../enums/chain.enum';

export type FdActionRequestBase = {
  masterAddress: string;
  programId: CypherCardPrograms;
  freshdeskId: number;
  activityStatus:
    | ActivityStatus.CREATED
    | ActivityStatus.PENDING
    | ActivityStatus.IN_PROGRESS
    | ActivityStatus.DELAYED
    | ActivityStatus.COMPLETED
    | ActivityStatus.FAILED
    | ActivityStatus.INSTANT_SWAP_INITIATED
    | ActivityStatus.INSTANT_SWAP_COMPLETED
    | ActivityStatus.CRYPTO_REVERSAL_INITIATED
    | ActivityStatus.CRYPTO_REVERSAL_COMPLETED
    | ActivityStatus.ONCHAIN_TRANSACTION_INITIATED
    | ActivityStatus.USER_REPORTED
    | ActivityStatus.TRANSACTION_VERIFIED_ON_CHAIN;
  requesterId?: number;
  email?: string;
  externalId?: string;
} & ({ requestId: string } | { quoteId: string });

/**
 * Base response type containing common fields for all FdActionType responses
 * Extends FdActionRequestBase to inherit common request fields and adds response-specific fields
 * All specific FdActionType responses extend this type
 */
export type BaseFdActionResponse = FdActionRequestBase & {
  /** Timestamp when the action was created */
  createdOn: number;

  /** Type of FD action */
  fdActionType: FdActionType;
};

/**
 * Response type for MIGRATION actions
 * Contains migration-specific fields in addition to common fields
 */
export type MigrationResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.MIGRATION;

  /** Source card provider being migrated from */
  sourceProvider: FdCardProviders;

  /** Target card provider being migrated to */
  targetProvider: FdCardProviders;

  /** Migration batch identifier */
  batchId?: string;

  /** Whether the migration is completed */
  isCompleted: boolean;
};

/**
 * Response type for CRYPTO_WITHDRAWAL actions
 * Contains withdrawal-specific fields in addition to common fields
 */
export type CryptoWithdrawalResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.CRYPTO_WITHDRAWAL;

  /** Blockchain network for the withdrawal */
  chain: ALL_CHAINS_TYPE;

  /** Amount requested for withdrawal */
  requestedAmount: number;

  /** Actual withdrawable amount after fees */
  withdrawableAmount: number;

  /** Fee amount deducted */
  feeAmount: number;

  /** Destination wallet address */
  toAddress: string;

  /** Card provider account ID */
  accountId: string;

  /** Transaction hash (if completed) */
  transactionHash?: string;

  /** Provider transfer ID */
  providerTransferId?: string;

  /** Whether funds have been transferred from user ledger */
  isFundTransferred: boolean;

  /** Whether crypto withdrawal is completed */
  isWithdrawalCompleted: boolean;
};

/**
 * Response type for CARD_FUND actions
 * Contains card funding-specific fields in addition to common fields
 */
export type CardFundResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.CARD_FUND;

  /** Quote ID for the funding request */
  quoteId: string;

  /** Blockchain network */
  chain: ALL_CHAINS_TYPE;

  /** Funding amount in fiat */
  amount: number;

  /** Required tokens for funding */
  tokensRequired: number;

  /** Token symbol */
  tokenSymbol: string;

  /** Token address (if applicable) */
  tokenAddress?: string;

  /** Source wallet address */
  fromAddress: string;

  /** Target card address */
  targetAddress: string;

  /** Card provider */
  cardProvider: FdCardProviders;

  /** Delay duration if delayed */
  delayDuration?: string;

  /** Delay set on */
  delaySetOn?: number;

  /** Delay expires on */
  delayExpiresOn?: number;
};

/**
 * Response type for CARD_CLOSURE actions
 * Contains card closure-specific fields in addition to common fields
 */
export type CardClosureResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.CARD_CLOSURE;

  /** Card provider */
  provider: FdCardProviders;

  /** Withdrawal amount from closed card */
  withdrawalAmount?: number;

  /** Whether account is archived */
  isAccountArchived: boolean;

  /** Whether closure report is generated */
  isReportGenerated: boolean;

  /** Whether the closure is resolved */
  isResolved: boolean;

  /** Withdrawal destination */
  withdrawalDestination: 'CR' | 'RC' | 'NA';

  /** Provider transfer ID for withdrawal */
  providerTransferId?: string;

  /** Card balance at closure time */
  balance?: number;
};

/**
 * Response type for CARD_SHIPPING actions
 * Contains card shipping-specific fields in addition to common fields
 */
export type CardShippingResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.CARD_SHIPPING;

  /** Shipping address */
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  /** Tracking number (if available) */
  trackingNumber?: string;

  /** Shipping provider */
  shippingProvider?: string;

  /** Expected delivery date */
  expectedDeliveryDate?: Date;

  /** Whether shipping is completed */
  isShipped: boolean;
};

/**
 * Response type for PLAN_UPDATE actions
 * Contains plan update-specific fields in addition to common fields
 */
export type PlanUpdateResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.PLAN_UPDATE;

  /** Previous plan ID */
  previousPlanId?: string;

  /** New plan ID */
  newPlanId: string;

  /** Whether the plan update is effective */
  isEffective: boolean;

  /** Effective date of plan change */
  effectiveDate?: Date;
};

/**
 * Response type for TXN_COMPLAIN actions
 * Contains transaction complaint-specific fields in addition to common fields
 */
export type TransactionComplainResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.TXN_COMPLAIN;

  /** Disputed transaction ID */
  disputedTransactionId: string;

  /** Complaint reason */
  complainReason: string;

  /** Disputed amount */
  disputedAmount: number;

  /** Currency of disputed amount */
  currency: string;

  /** Whether complaint is resolved */
  isResolved: boolean;

  /** Resolution details */
  resolutionDetails?: string;

  /** Merchant information */
  merchantInfo?: {
    name: string;
    id?: string;
    category?: string;
  };
};

/**
 * Response type for CARD_LIMIT_UPDATE actions
 * Contains card limit update-specific fields in addition to common fields
 */
export type CardLimitUpdateResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.CARD_LIMIT_UPDATE;

  /** Previous spending limit */
  previousLimit?: number;

  /** New spending limit */
  newLimit: number;

  /** Limit type (daily, monthly, etc.) */
  limitType: 'DAILY' | 'MONTHLY' | 'TRANSACTION';

  /** Whether the limit update is applied */
  isApplied: boolean;

  /** Effective date of limit change */
  effectiveDate?: Date;
};

/**
 * Response type for CARD_WALLET_CHANGE_REQUEST actions
 * Contains wallet change request-specific fields in addition to common fields
 */
export type CardWalletChangeResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.CARD_WALLET_CHANGE_REQUEST;

  /** Previous wallet address */
  previousWalletAddress?: string;

  /** New wallet address */
  newWalletAddress: string;

  /** Whether the wallet change is approved */
  isApproved: boolean;

  /** Whether the wallet change is effective */
  isEffective: boolean;

  /** Approval date */
  approvalDate?: Date;

  /** Effective date of wallet change */
  effectiveDate?: Date;
};

/**
 * Response type for OTHERS actions
 * Contains generic fields for miscellaneous actions in addition to common fields
 */
export type OthersResponse = BaseFdActionResponse & {
  fdActionType: FdActionType.OTHERS;

  /** Description of the action */
  description: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Whether the action is resolved */
  isResolved: boolean;
};

/**
 * Union type representing all possible FdActionType responses
 * Use this type when you need to handle any FdActionType response
 */
export type ActivityResponse =
  | MigrationResponse
  | CryptoWithdrawalResponse
  | CardFundResponse
  | CardClosureResponse
  | CardShippingResponse
  | PlanUpdateResponse
  | TransactionComplainResponse
  | CardLimitUpdateResponse
  | CardWalletChangeResponse
  | OthersResponse;

export interface PaginatedActivityResponse {
  /** Array of activity responses */
  items: ActivityResponse[];

  /** Number of items returned in this response */
  count: number;

  /** Current offset */
  offset?: string;

  /** Limit used for this query */
  limit: number;

  /** Whether there are more items available */
  hasMore: boolean;
}
