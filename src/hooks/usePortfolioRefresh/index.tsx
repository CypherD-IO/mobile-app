import React, { useEffect, useState } from 'react';
import usePortfolio from '../usePortfolio';
import * as Sentry from '@sentry/react-native';

export function usePortfolioRefresh() {
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
    void refreshPortfolio();

    const intervalId = setInterval(() => {
      void refreshPortfolio();
    }, 120000); // 2 minutes

    return () => clearInterval(intervalId);
  }, []);

  return {
    isRefreshing,
    lastUpdatedAt,
    refreshPortfolio,
  };
}
