import { useEffect, useState } from 'react';
import { Config } from 'react-native-config';
import usePortfolio from '../usePortfolio';
import * as Sentry from '@sentry/react-native';

export function usePortfolioRefresh(enabled = true) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const { fetchPortfolio } = usePortfolio();

  const refreshPortfolio = async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      const response = await fetchPortfolio();
      if (response && !response.isError) {
        setLastUpdatedAt(new Date().toISOString());
      }
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          error: 'Error refreshing portfolio',
          screen: 'usePortfolioRefresh',
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    void refreshPortfolio();

    // Skip the 2-minute background refresh under E2E tests. Detox treats the
    // recurring network request as an "app is busy" signal and stalls tests
    // waiting for an idle state that never arrives. One-shot initial fetch
    // above is fine; tests rely on the data being fetched once on mount.
    if (Config.IS_TESTING === 'true') {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshPortfolio();
    }, 120000); // 2 minutes

    return () => clearInterval(intervalId);
  }, [enabled]);

  return {
    isRefreshing,
    lastUpdatedAt,
    refreshPortfolio,
  };
}
