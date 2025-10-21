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
 * Individual candidate bribe data
 */
export interface ICandidateBribe {
  /**
   * The veNFT token ID associated with this bribe
   */
  veNFTId: string;
  
  /**
   * Candidate/Merchant ID (bytes32 format)
   */
  candidateId: string;
  
  /**
   * Human-readable candidate/merchant name
   */
  candidateName: string;
  
  /**
   * Array of bribe token contract addresses
   */
  bribeTokens: string[];
  
  /**
   * Array of amounts for each bribe token (in wei/native units)
   */
  bribeAmounts: string[];
  
  /**
   * Epoch range for this bribe claim
   */
  epochRange: IEpochRange;
  
  /**
   * Status of this bribe claim
   */
  claimStatus: BribeClaimStatus;
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

