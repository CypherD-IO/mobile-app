/**
 * Voting Power API Response Interfaces
 * Used for /v1/cypher-protocol/user/voting-power endpoint
 */

/**
 * Current vote allocation for a veNFT
 */
export interface ICurrentVote {
  candidateId: string;
  merchantGroupId: string;
  canonicalName: string;
  voteAmount: string;
  votePercentage: number;
}

/**
 * Detailed veNFT information
 */
export interface IVeNFTDetails {
  tokenId: string;
  lockedAmount: string;
  lockedUntil: number;
  votingPower: string;
  isIndefinite: boolean;
  currentVotes?: ICurrentVote[];

  // Enhanced veNFT information
  depositedOn: number; // Timestamp when veNFT was created
  lastModifiedOn?: number; // Timestamp of last lock modification
  duration: number; // Duration in seconds from deposit to unlock
  endTimestamp: number; // Same as lockedUntil but more explicit naming

  // Voting power at end of current epoch
  endOfCurrentEpochVotingPower: string;
}

/**
 * Summary veNFT information (lightweight)
 */
export interface IVeNFTSummary {
  tokenId: string;
  votingPower: string;
  endOfCurrentEpochVotingPower: string;
}

/**
 * Core voting power summary (without epoch information)
 */
export interface IVotingPowerSummaryCore<T = IVeNFTDetails> {
  totalVotingPower: string;
  totalLockedAmount: string;
  veNFTs: T[];
}

/**
 * Base voting power summary (with epoch information)
 */
export interface IVotingPowerSummaryBase<T = IVeNFTDetails>
  extends IVotingPowerSummaryCore<T> {
  endOfCurrentEpochTotalVotingPower: string;
  currentEpochEndTimestamp: number;
}

/**
 * Type aliases for different variations
 */
export type IVotingPowerSummaryFull = IVotingPowerSummaryBase<IVeNFTDetails>;
export type IVotingPowerSummaryLight = IVotingPowerSummaryBase<IVeNFTSummary>;
export type IVotingPowerSummaryCore_Full =
  IVotingPowerSummaryCore<IVeNFTDetails>;
export type IVotingPowerSummaryCore_Light =
  IVotingPowerSummaryCore<IVeNFTSummary>;

/**
 * Voting power response (supports multiple variations)
 * Main endpoint: GET /v1/cypher-protocol/user/:address/voting-power
 * Query params: includeEndOfEpoch, includeVeNFTDetails
 */
export interface IVotingPowerResponse {
  votingPower:
    | IVotingPowerSummaryFull
    | IVotingPowerSummaryLight
    | IVotingPowerSummaryCore_Full
    | IVotingPowerSummaryCore_Light;
}

/**
 * API Response wrapper for voting power data
 */
export interface VotingPowerApiResponse {
  isError: boolean;
  data?: IVotingPowerResponse;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Enriched Voting Power Data
 * Extends base voting power with calculated fields for backwards compatibility
 */
export interface IEnrichedVotingPowerData {
  totalVotingPower: string;
  totalLockedAmount: string;
  veNFTs: IVeNFTDetails[];
  endOfCurrentEpochTotalVotingPower?: string;
  currentEpochEndTimestamp?: number;
  // Calculated fields
  usedVotingPower: string;
  freeVotingPower: string;
}

