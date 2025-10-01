/**
 * User Rewards Profile API Response Interfaces
 * Used for /v1/cypher-protocol/user/:address/profile endpoint
 */

/**
 * Plan information for the user
 */
export interface PlanInfo {
  planId: string;
  tierLevel?: number;
  tierName?: string;
  tierMultiplier: number;
  activeSince?: number;
  expiresAt?: number;
  expiresOn?: number;
  autoRenewal?: boolean;
  planHistory?: any[];
  schedulerTaskIds?: any;
  updatedOn?: number;
}

/**
 * Breakdown of rewards by type
 * All amounts are in wei (18 decimals) except bribes which are in native token units
 */
export interface IRewardTypeBreakdown {
  baseSpend: string; // In wei (18 decimals)
  boostedSpend: string; // In wei (18 decimals)
  baseReferral: string; // In wei (18 decimals)
  boostedReferral: string; // In wei (18 decimals)
  bribes: string; // Native token amounts (not included in total)
  total: string; // Sum of spend + referral rewards only; excludes bribes - In wei (18 decimals)
}

/**
 * Referral information for the user
 */
export interface IReferralInfo {
  referralCode?: string;
  totalReferees: number;
  activeReferees: number;
  lifetimeReferralRewards: string; // In wei (18 decimals)
}

/**
 * Core user profile response (fast & essential)
 * Main endpoint: GET /v1/cypher-protocol/user/:address/profile
 */
export interface IUserProfileResponse {
  rcAccountId: string;
  lastUpdated: number;
  planInfo: PlanInfo;
  allTime: {
    totalEarned: IRewardTypeBreakdown;
    totalClaimed: IRewardTypeBreakdown;
    totalUnclaimed: IRewardTypeBreakdown;
    epochsParticipated: number;
    firstInteraction?: number;
    lastActivity?: number;
  };
  referralInfo?: IReferralInfo;
}

/**
 * API Response wrapper for user profile data
 */
export interface UserProfileApiResponse {
  isError: boolean;
  data?: IUserProfileResponse;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

