/**
 * Rewards History API Response Interfaces
 * Used for /v1/cypher-protocol/user/rewards-history endpoint
 */

import { IRewardTypeBreakdown } from './rewardsProfile.interface';

/**
 * Merchant-specific reward details for an epoch
 */
export interface IMerchantRewardDetail {
  parentMerchantId: string;
  canonicalName: string;
  boostedSpend: string; // In wei (18 decimals)
  boostedReferral: string; // In wei (18 decimals)
  bribes: string; // Native token amounts summed - sum of all bribe tokens (in native token units). NOTE: Not converted or included in totalFromMerchant.
  totalFromMerchant: string; // In wei (18 decimals) - sum of boostedSpend + boostedReferral. NOTE: Excludes bribes due to lack of token metadata for conversion.
}

/**
 * Epoch-specific reward details
 */
export interface IEpochRewardDetails {
  epochNumber: number;
  epochStartTime: number;
  epochEndTime: number;

  // Earned rewards (calculated but not necessarily claimed)
  earned: {
    breakdown: IRewardTypeBreakdown;
    merchantDetails: IMerchantRewardDetail[];
    transactionCount: number;
    totalSpend: number;
  };

  // Claimed rewards
  claimed: {
    amount: string;
    claimedAt?: number;
    txHash?: string;
  };

  // Unclaimed rewards with claim data
  unclaimed: {
    amount: string;
    proof?: string[];
    index?: number;
    merkleRoot?: string;
    expiresAt?: number;
  };
}

/**
 * Pagination information for rewards history
 */
export interface IRewardsPagination {
  hasMore: boolean;
  nextEpoch?: number;
}

/**
 * Rewards history response with pagination
 * Main endpoint: GET /v1/cypher-protocol/user/rewards-history
 * Query params: limit, fromEpoch
 */
export interface IRewardsHistoryResponse {
  epochs: IEpochRewardDetails[];
  pagination: IRewardsPagination;
}

/**
 * API Response wrapper for rewards history data
 */
export interface RewardsHistoryApiResponse {
  isError: boolean;
  data?: IRewardsHistoryResponse;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

