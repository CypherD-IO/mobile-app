/**
 * Bribes Claim API Response Interfaces
 * Used for /v1/cypher-protocol/bribes/claim endpoint
 * 
 * This interface represents the structure of bribe rewards that can be claimed
 * from the Election contract on Base chain.
 */

/**
 * Status of a bribe claim
 */
export enum BribeClaimStatus {
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
  FAILED = 'FAILED',
}

/**
 * Epoch range for bribe claims
 */
export interface IEpochRange {
  /**
   * Start timestamp of the epoch range (Unix timestamp in seconds)
   */
  from: number;
  
  /**
   * End timestamp of the epoch range (Unix timestamp in seconds)
   */
  until: number;
}

/**
 * Per-token bribe detail for display (matches the dApp /bribes/claim shape).
 */
export interface IBribeTokenDetail {
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
  /** Raw on-chain amount. */
  amount: string;
  /** Human-readable amount provided by the API. */
  amountFormatted: string;
  valueUSD?: string;
  logo?: string;
  claimStatus: {
    isClaimed: boolean;
    claimableAmount?: string;
    claimTxHash?: string;
  };
  bribeId?: string;
  epochRange?: IEpochRange;
}

/**
 * Bribes grouped per veNFT for a candidate/merchant.
 */
export interface IVeNFTBribeGroup {
  veNFTId: string;
  epochNumber?: number;
  epochStartTime?: number;
  epochEndTime?: number;
  votingPower?: string;
  bribes: IBribeTokenDetail[];
}

/**
 * Individual candidate/merchant bribe data (display shape).
 */
export interface ICandidateBribe {
  /** Candidate/Merchant ID (bytes32 format) */
  candidateId: string;
  /** Human-readable merchant name */
  merchantName: string;
  parentMerchantId?: string;
  logoUrl?: string;
  /** Bribes grouped per veNFT. */
  veNFTBribes: IVeNFTBribeGroup[];
}

/**
 * Merged bribe data for efficient batch claiming
 * Groups all bribes for a specific veNFT across all candidates
 */
export interface IMergedBribe {
  /**
   * The veNFT token ID
   */
  veNFTId: string;
  
  /**
   * Array of bribe token contract addresses (unique)
   */
  bribeTokens: string[];
  
  /**
   * Array of candidate/merchant IDs (bytes32 format)
   */
  candidates: string[];
  
  /**
   * Human-readable candidate/merchant names
   */
  candidateNames: string[];
  
  /**
   * Total amounts for each unique bribe token across all candidates
   */
  totalBribeAmounts: string[];
  
  /**
   * Epoch range covering all bribes for this veNFT
   */
  epochRange: IEpochRange;
  
  /**
   * Overall claim status for this merged bribe
   */
  claimStatus: BribeClaimStatus;
}

/**
 * Summary of all bribe claims
 */
export interface IBribeSummary {
  /**
   * Total number of unique veNFTs with claimable bribes
   */
  totalVeNFTs: number;
  
  /**
   * Total number of unique candidates with bribes
   */
  totalCandidates: number;
  
  /**
   * Total number of unique bribe tokens
   */
  totalBribeTokens: number;
  
  /**
   * Total claimable bribes value (sum across all tokens, in USD if available)
   */
  totalClaimableBribes: number;
  
  /**
   * Map of token address to total claimable amount
   */
  tokenBreakdown: Record<string, string>;
}

/**
 * Main response from the bribes claim API
 * GET /v1/cypher-protocol/bribes/claim
 */
export interface IBribeClaimResponse {
  /**
   * Current epoch number
   */
  currentEpoch: number;
  
  /**
   * Whether the user has any claimable bribes
   */
  hasClaimableBribes: boolean;
  
  /**
   * Array of individual candidate bribes (detailed view)
   */
  candidateBribes?: ICandidateBribe[];
  
  /**
   * Array of merged bribes (optimized for batch claiming)
   * Recommended for use with the Election.claimBribes function
   */
  mergedBribes?: IMergedBribe[];
  
  /**
   * Summary of all bribe claims
   */
  summary?: IBribeSummary;
  
  /**
   * Last time the bribes data was updated
   */
  lastUpdated?: number;
}

/**
 * API Response wrapper for bribes claim data
 */
export interface BribesClaimApiResponse {
  isError: boolean;
  data?: IBribeClaimResponse;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Parameters for claiming bribes via the Election contract
 */
export interface ClaimBribesParams {
  /**
   * The veNFT token ID
   */
  tokenId: number;
  
  /**
   * Array of bribe token contract addresses
   */
  bribeTokens: string[];
  
  /**
   * Array of candidate IDs (bytes32 format)
   */
  candidates: string[];
  
  /**
   * Start timestamp for the claim period
   */
  fromTimestamp: number;
  
  /**
   * End timestamp for the claim period
   */
  untilTimestamp: number;
  
  /**
   * Optional callback for status updates during claiming
   */
  onStatusUpdate?: (message: string) => void;
}

/**
 * Result of a bribe claim transaction
 */
export interface ClaimBribesResult {
  /**
   * Transaction hash
   */
  hash?: string;
  
  /**
   * Whether the transaction was successful
   */
  isError: boolean;
  
  /**
   * Array of claimed amounts per token
   */
  claimedAmounts?: Array<{
    token: string;
    amount: string;
  }>;
  
  /**
   * Error message or object if transaction failed
   */
  error?: string | Error | unknown;
}

