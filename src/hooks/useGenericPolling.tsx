import { useEffect, useRef, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';

export interface GenericPollingConfig<T> {
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 30000ms = 30 seconds) */
  pollingInterval?: number;
  /** Function to fetch initial data when page is focused */
  fetchInitialData: () => Promise<T[]>;
  /** Function to fetch individual item status updates */
  fetchItemUpdate: (item: T) => Promise<T | null>;
  /** Function to get unique identifier for an item */
  getItemId: (item: T) => string | number;
  /** Function to check if an item is completed */
  isItemCompleted: (item: T) => boolean;
  /** Function to check if an item has failed (optional) */
  isItemFailed?: (item: T) => boolean;
  /** Function to check if an item is closed (optional) */
  isItemClosed?: (item: T) => boolean;
  /** Callback when data is updated */
  onDataUpdate: (data: T[]) => void;
  /** Callback when an item is completed */
  onItemCompleted?: (completedItem: T) => void;
  /** Callback when an item has failed */
  onItemFailed?: (failedItem: T) => void;
  /** Callback when an item is closed (optional) */
  onItemClosed?: (closedItem: T) => void;
  /** Function to merge new data with existing data (optional) */
  mergeData?: (existing: T[], newData: T[]) => T[];
  /** Current data array */
  currentData: T[];
  /** Custom logging prefix (optional) */
  logPrefix?: string;
}

export interface GenericPollingReturn {
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Whether currently fetching data */
  isFetching: boolean;
  /** Manually trigger a data fetch */
  fetchData: () => Promise<void>;
}

/**
 * Generic polling hook that can be used for any type of data
 *
 * Features:
 * - Configurable polling intervals
 * - Automatic focus-based data fetching
 * - Individual item status updates
 * - Completion handling
 * - Duplicate prevention
 * - Customizable merge strategies
 * - Generic type support
 *
 * @template T The type of data being polled
 * @param config Configuration object for the polling behavior
 * @returns Object with polling status and control functions
 */
export const useGenericPolling = function <T>(
  config: GenericPollingConfig<T>,
): GenericPollingReturn {
  const {
    enabled = true,
    pollingInterval = 30000,
    fetchInitialData,
    fetchItemUpdate,
    getItemId,
    isItemCompleted,
    isItemFailed,
    isItemClosed,
    onDataUpdate,
    onItemCompleted,
    onItemFailed,
    onItemClosed,
    mergeData,
    currentData,
    logPrefix = 'Generic',
  } = config;

  const isFocused = useIsFocused();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const dataRef = useRef<T[]>(currentData);
  const lastFocusedRef = useRef<boolean>(false);
  const isPollingStartedRef = useRef<boolean>(false);

  // Create refs for functions to avoid stale closures
  const fetchItemUpdateRef = useRef(fetchItemUpdate);
  const isItemCompletedRef = useRef(isItemCompleted);
  const isItemFailedRef = useRef(isItemFailed);
  const isItemClosedRef = useRef(isItemClosed);
  const getItemIdRef = useRef(getItemId);
  const onDataUpdateRef = useRef(onDataUpdate);
  const onItemCompletedRef = useRef(onItemCompleted);
  const onItemFailedRef = useRef(onItemFailed);
  const onItemClosedRef = useRef(onItemClosed);
  const mergeDataRef = useRef(mergeData);
  const fetchInitialDataRef = useRef(fetchInitialData);

  // Keep refs in sync with latest values
  useEffect(() => {
    dataRef.current = currentData;
    fetchItemUpdateRef.current = fetchItemUpdate;
    isItemCompletedRef.current = isItemCompleted;
    isItemFailedRef.current = isItemFailed;
    isItemClosedRef.current = isItemClosed;
    getItemIdRef.current = getItemId;
    onDataUpdateRef.current = onDataUpdate;
    onItemCompletedRef.current = onItemCompleted;
    onItemFailedRef.current = onItemFailed;
    onItemClosedRef.current = onItemClosed;
    mergeDataRef.current = mergeData;
    fetchInitialDataRef.current = fetchInitialData;
  }, [
    currentData,
    fetchItemUpdate,
    isItemCompleted,
    isItemFailed,
    isItemClosed,
    getItemId,
    onDataUpdate,
    onItemCompleted,
    onItemFailed,
    onItemClosed,
    mergeData,
    fetchInitialData,
  ]);

  /**
   * Default merge function - replaces existing items with new ones, adds new items
   */
  const defaultMergeData = useCallback(
    (existing: T[], newData: T[]): T[] => {
      const merged = [...existing];

      newData.forEach(newItem => {
        const newItemId = getItemIdRef.current(newItem);
        const existingIndex = merged.findIndex(
          existingItem => getItemIdRef.current(existingItem) === newItemId,
        );

        if (existingIndex !== -1) {
          // Update existing item
          merged[existingIndex] = newItem;
        } else {
          // Add new item
          merged.push(newItem);
        }
      });

      return merged;
    },
    [], // No dependencies - uses refs instead
  );

  // Effect to fetch data when user comes to the page (only on focus change)
  useEffect(() => {
    if (isFocused && enabled && !lastFocusedRef.current) {
      lastFocusedRef.current = true;

      // Create a one-time fetch function to avoid dependency issues
      const fetchOnFocus = async (): Promise<void> => {
        if (isFetchingRef.current) {
          return;
        }

        isFetchingRef.current = true;

        try {
          const newData = await fetchInitialDataRef.current();

          const currentItems = dataRef.current;
          const mergeFunction = mergeDataRef.current ?? defaultMergeData;
          const mergedData =
            newData.length > 0 ? mergeFunction(currentItems, newData) : newData;
          onDataUpdateRef.current(mergedData);
        } catch (error) {
          console.error(`Error fetching ${logPrefix} data on focus:`, error);
        } finally {
          isFetchingRef.current = false;
        }
      };

      void fetchOnFocus();
    } else if (!isFocused) {
      lastFocusedRef.current = false;
    }
  }, [isFocused, enabled, logPrefix]);

  // Effect to start/stop polling based on focus and enabled state
  useEffect(() => {
    if (enabled && isFocused) {
      if (!isPollingStartedRef.current) {
        isPollingStartedRef.current = true;

        // Create stable polling function
        const doPoll = async (): Promise<void> => {
          const currentItems = dataRef.current;

          if (isPollingRef.current || currentItems.length === 0) {
            return;
          }

          isPollingRef.current = true;

          try {
            const updatePromises = currentItems.map(
              async item => await fetchItemUpdateRef.current(item),
            );

            const updatedResults = await Promise.allSettled(updatePromises);
            const stillActive: T[] = [];
            const completed: T[] = [];
            const failed: T[] = [];
            const closed: T[] = [];

            updatedResults.forEach((result, index) => {
              const originalItem = currentItems[index];

              if (result.status === 'fulfilled' && result.value) {
                const updatedItem = result.value;

                if (isItemCompletedRef.current(updatedItem)) {
                  completed.push(updatedItem);
                } else if (isItemFailedRef.current?.(updatedItem)) {
                  failed.push(updatedItem);
                } else if (isItemClosedRef.current?.(updatedItem)) {
                  closed.push(updatedItem);
                } else {
                  stillActive.push(updatedItem);
                }
              } else {
                // Keep original if fetch failed
                stillActive.push(originalItem);
              }
            });

            onDataUpdateRef.current(stillActive);

            if (completed.length > 0 && onItemCompletedRef.current) {
              completed.forEach(onItemCompletedRef.current);
            }

            if (failed.length > 0 && onItemFailedRef.current) {
              failed.forEach(onItemFailedRef.current);
            }

            if (closed.length > 0 && onItemClosedRef.current) {
              closed.forEach(onItemClosedRef.current);
            }
          } catch (error) {
            console.error(`Error polling ${logPrefix} statuses:`, error);
          } finally {
            isPollingRef.current = false;
          }
        };

        // Set up interval (don't poll immediately since focus effect handles initial fetch)
        intervalRef.current = setInterval(() => {
          void doPoll();
        }, pollingInterval);
      }
    } else {
      // Stop polling when not focused or disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isPollingStartedRef.current = false;
      }
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isPollingStartedRef.current = false;
      }
    };
  }, [enabled, isFocused, pollingInterval, logPrefix]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPollingRef.current = false;
      isFetchingRef.current = false;
      lastFocusedRef.current = false;
      isPollingStartedRef.current = false;
    };
  }, []);

  // Manual fetch data function
  const fetchData = useCallback(async (): Promise<void> => {
    if (!isFetchingRef.current) {
      isFetchingRef.current = true;
      try {
        const newData = await fetchInitialDataRef.current();
        const mergeFunction = mergeDataRef.current ?? defaultMergeData;
        const mergedData = mergeFunction(dataRef.current, newData);
        onDataUpdateRef.current(mergedData);
      } catch (error) {
        console.error(`Error manually fetching ${logPrefix} data:`, error);
      } finally {
        isFetchingRef.current = false;
      }
    }
  }, [logPrefix]);

  return {
    /** Whether polling is currently active */
    isPolling: intervalRef.current !== null,
    /** Whether currently fetching data */
    isFetching: isFetchingRef.current,
    /** Manually trigger a data fetch */
    fetchData,
  };
};

export default useGenericPolling;
