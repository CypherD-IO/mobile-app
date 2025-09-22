import { useCallback } from 'react';
import useAxios from '../core/HttpRequest';
import { ActivityStatus, FdActionType } from '../constants/enum';
import {
  CardFundResponse,
  PaginatedActivityResponse,
} from '../models/activities.interface';
import { useGenericPolling, GenericPollingReturn } from './useGenericPolling';
import moment from 'moment';

// Strict TypeScript interfaces for activity polling
export interface ActivityPollingConfig {
  /** Current ongoing activities */
  ongoingActivities: CardFundResponse[];
  /** Callback to update ongoing activities */
  setOngoingActivities: (activities: CardFundResponse[]) => void;
  /** Callback to move completed activities to completed list */
  onActivityCompleted?: (completedActivity: CardFundResponse) => void;
  /** Callback to move failed activities to failed list */
  onActivityFailed?: (failedActivity: CardFundResponse) => void;
  /** Polling interval in milliseconds (default: 30000ms = 30 seconds) */
  pollingInterval?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
}

export interface ActivityPollingReturn extends GenericPollingReturn {
  /** Fetch single quote status - useful for checking specific activities */
  fetchQuoteStatus: (quoteId: string) => Promise<CardFundResponse | null>;
  /** Manually trigger activities fetch - useful for pull-to-refresh, retry, user actions */
  fetchActivities: () => Promise<void>;
}

export interface QuoteStatusResponse {
  data?: CardFundResponse;
  isError: boolean;
  message?: string;
}

export interface OngoingActivitiesResponse {
  data?: PaginatedActivityResponse;
  isError: boolean;
  message?: string;
}

export interface ActivityMergeOptions {
  /** Whether to sort activities by creation date */
  sortByDate?: boolean;
  /** Whether to remove duplicates by freshdeskId */
  removeDuplicates?: boolean;
}

/**
 * Activity-specific polling hook built on top of useGenericPolling
 *
 * Features:
 * - Polls ongoing activities every 30 seconds (configurable)
 * - Automatically stops polling when screen is not focused
 * - Fetches individual quote details for status updates
 * - Moves completed activities to completed list
 * - Handles cleanup on unmount
 * - Optimized to only poll when there are ongoing activities
 * - Strict TypeScript typing for all operations
 */
export const useActivityPolling = (
  config: ActivityPollingConfig,
): ActivityPollingReturn => {
  const {
    ongoingActivities,
    setOngoingActivities,
    onActivityCompleted,
    onActivityFailed,
    pollingInterval = 30000, // 30 seconds
    enabled = true,
  } = config;

  const { getWithAuth, postWithAuth } = useAxios();

  /**
   * Fetches updated status for a single quote
   * @param quoteId - The unique quote identifier
   * @returns Promise resolving to updated CardFundResponse or null if failed
   */
  const fetchQuoteStatus = useCallback(
    async (quoteId: string): Promise<CardFundResponse | null> => {
      try {
        const response: QuoteStatusResponse = await getWithAuth(
          `/v1/activities/status-v2/${FdActionType.CARD_FUND}/${quoteId}`,
        );

        if (!response.isError && response.data) {
          return response.data;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    [getWithAuth],
  );

  /**
   * Fetches all ongoing activities from the backend
   * @returns Promise resolving to array of ongoing CardFundResponse items
   */
  const fetchOngoingActivities = useCallback(async (): Promise<
    CardFundResponse[]
  > => {
    try {
      const response = (await postWithAuth('/v1/activities/status-v2', {
        activityType: FdActionType.CARD_FUND,
        status: [ActivityStatus.IN_PROGRESS],
        startDate: moment().subtract(1, 'day').toISOString(),
      })) as OngoingActivitiesResponse;

      if (!response.isError && response.data) {
        const data = response.data;
        return (data.items as CardFundResponse[]) || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [postWithAuth]);

  /**
   * Fetches individual activity update
   * @param activity - The activity to update
   * @returns Promise resolving to updated activity or null if failed
   */
  const fetchActivityUpdate = useCallback(
    async (activity: CardFundResponse): Promise<CardFundResponse | null> => {
      return await fetchQuoteStatus(activity.quoteId);
    },
    [fetchQuoteStatus],
  );

  /**
   * Gets unique identifier for an activity
   * @param activity - The activity to get ID for
   * @returns String representation of the activity's unique identifier
   */
  const getActivityId = useCallback((activity: CardFundResponse): string => {
    return activity.quoteId.toString();
  }, []);

  /**
   * Checks if an activity is completed
   * @param activity - The activity to check
   * @returns True if the activity is completed, false otherwise
   */
  const isActivityCompleted = useCallback(
    (activity: CardFundResponse): boolean => {
      return activity.activityStatus === ActivityStatus.COMPLETED;
    },
    [],
  );

  /**
   * Checks if an activity has failed
   * @param activity - The activity to check
   * @returns True if the activity has failed, false otherwise
   */
  const isActivityFailed = useCallback(
    (activity: CardFundResponse): boolean => {
      return activity.activityStatus === ActivityStatus.FAILED;
    },
    [],
  );

  /**
   * Checks if an activity is closed
   * @param activity - The activity to check
   * @returns True if the activity is closed, false otherwise
   */
  const isActivityClosed = useCallback(
    (activity: CardFundResponse): boolean => {
      return activity.activityStatus === ActivityStatus.CLOSED;
    },
    [],
  );

  // Use the generic polling hook with activity-specific configuration
  const pollingResult = useGenericPolling<CardFundResponse>({
    enabled,
    pollingInterval,
    fetchInitialData: fetchOngoingActivities,
    fetchItemUpdate: fetchActivityUpdate,
    getItemId: getActivityId,
    isItemCompleted: isActivityCompleted,
    isItemFailed: isActivityFailed,
    isItemClosed: isActivityClosed,
    onDataUpdate: setOngoingActivities,
    onItemCompleted: onActivityCompleted,
    onItemFailed: onActivityFailed,
    onItemClosed: (_closedActivity: CardFundResponse) => {
      // CLOSED activities are simply removed from ongoing activities - no additional action needed
    },
    currentData: ongoingActivities,
    logPrefix: 'Activities',
  });

  return {
    /** Whether polling is currently active */
    isPolling: pollingResult.isPolling,
    /** Whether currently fetching data */
    isFetching: pollingResult.isFetching,
    /** Manually trigger a data fetch */
    fetchData: pollingResult.fetchData,
    /** Fetch single quote status */
    fetchQuoteStatus,
    /** Manually trigger activities fetch */
    fetchActivities: pollingResult.fetchData,
  };
};

export default useActivityPolling;
