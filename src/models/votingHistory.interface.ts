/**
 * Voting History API Response Interfaces
 * Used for /v1/cypher-protocol/user/voting-history endpoint
 */

/**
 * Individual vote within an epoch
 */
export interface IVoteRecord {
  candidateId: string;
  merchantName: string;
  voteAmount: string;
  votePercentage: number;
  timestamp?: number;
}

/**
 * Grouped voting history by epoch
 */
export interface IEpochVotingHistory {
  epochNumber: number;
  epochStartTime: number;
  epochEndTime: number;
  totalVotingPower: string; // User's total voting power in this epoch
  totalVotesUsed: string; // Total votes cast in this epoch
  utilizationRate: number; // Percentage of voting power used (0-100)
  votes: IVoteRecord[]; // All votes cast in this epoch
}

/**
 * Pagination information for voting history
 */
export interface IVotingPagination {
  hasMore: boolean;
  nextEpoch?: number;
}

/**
 * Summary statistics for voting history
 */
export interface IVotingHistorySummary {
  totalEpochsVoted: number;
  averageUtilizationRate: number;
  totalVotesCast: number;
}

/**
 * Voting history response with pagination (grouped by epoch)
 * Main endpoint: GET /v1/cypher-protocol/user/voting-history
 * Query params: limit, fromEpoch
 */
export interface IVotingHistoryResponse {
  epochHistory: IEpochVotingHistory[];
  pagination: IVotingPagination;
  summary: IVotingHistorySummary;
}

/**
 * API Response wrapper for voting history data
 */
export interface VotingHistoryApiResponse {
  isError: boolean;
  data?: IVotingHistoryResponse;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}


