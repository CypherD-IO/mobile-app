export interface AirdropInfo {
  /**
   * Reward points breakdown by category.
   */
  rewardPoints: {
    cypherCardRewards: number;
    cypherOGRewards: number;
    influencerRewards: number;
    baseCommunityRewards: number;
    cypherCardRewardsBfMultiplier: number;
  };
  /**
   * Token allocation for each reward category, as [token, nft] pairs.
   */
  tokenAllocation: {
    cypherCardRewardsBfMultiplier: [number, number];
    cypherCardRewards: [number, number];
    cypherOGRewards: [number, number];
    influencerRewards: [number, number];
    baseCommunityRewards: [number, number];
  };
  /**
   * Optional Merkle tree data for claim verification.
   */
  merkleTree?: {
    rootId: number;
    leafTuple: [string, string, string];
    leafHash: string;
    merkleRoot: string;
    merkleProof: string[];
  };

  pksAssociated: string[];

  programWiseSplit: Array<{
    pk: string;
    programId: string;
    rewardPoints: {
      cypherCardRewards: number;
      cypherOGRewards: number;
      cypherCardRewardsBfMultiplier: number;
      influencerRewards: number;
      baseCommunityRewards: number;
    };
  }>;

  claimInfo: {
    contractAddress: string;
    isClaimed: boolean;
    isClaimActive: boolean;
    claimHash: string;
    isTestnet: boolean;
  };
}

export interface AirdropData {
  isEligible: boolean;
  airdrop?: AirdropInfo;
}
