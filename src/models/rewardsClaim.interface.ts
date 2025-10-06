// Shared interfaces for claim reward API

export enum ClaimStatus {
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
  FAILED = 'FAILED',
}

export interface ClaimRewardResponse {
  epochNumber: number;
  isEligible: boolean;
  claimInfo?: {
    claimAddress?: string;
    amount: string[]; // amounts in wei as strings for contract claim
    proof: string[][]; // merkle proofs
    claimStatus: ClaimStatus;
    rootId: number[];
  };
  rewardInfo?: {
    totalRewardsInToken: number; // total rewards (human readable token units)
    baseSpendAmount: number;
    boostedSpendSplit: Array<{
      parentMerchantId: string;
      canonicalName: string;
      logoUrl?: string;
      spend: number;
    }>;
    boostedSpend: number;
    boostedReferralAmount: number;
  };
  totalRewardsEarned: {
    baseSpend: number;
    boostedSpend: number;
    boostedReferral: number;
    total: number; // total in token units
  };
}
