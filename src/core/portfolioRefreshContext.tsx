import React, { createContext, useContext, useEffect, useState } from 'react';
import moment from 'moment';
import usePortfolio from '../hooks/usePortfolio';
import * as Sentry from '@sentry/react-native';

interface PortfolioRefreshContextType {
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  refreshPortfolio: () => Promise<void>;
}

const PortfolioRefreshContext =
  createContext<PortfolioRefreshContextType | null>(null);

export function PortfolioRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const { fetchPortfolio } = usePortfolio();

  const refreshPortfolio = async () => {
    if (isRefreshing) return;

    // const twoMinutesHasPassed = lastUpdatedAt
    //   ? moment().diff(moment(lastUpdatedAt), 'minutes') >= 2
    //   : true;

    // console.log('2 mins passed cehck : ', twoMinutesHasPassed);

    // if (twoMinutesHasPassed) {
    try {
      setIsRefreshing(true);
      const response = await fetchPortfolio();
      if (response && !response.isError) {
        setLastUpdatedAt(new Date().toISOString());
      }
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setIsRefreshing(false);
    }
    // }
  };

  useEffect(() => {
    void refreshPortfolio();

    const intervalId = setInterval(() => {
      void refreshPortfolio();
    }, 120000); // 2 minutes

    return () => clearInterval(intervalId);
  }, []);

  return (
    <PortfolioRefreshContext.Provider
      value={{ isRefreshing, lastUpdatedAt, refreshPortfolio }}>
      {children}
    </PortfolioRefreshContext.Provider>
  );
}

export function usePortfolioRefresh() {
  const context = useContext(PortfolioRefreshContext);
  if (!context) {
    throw new Error(
      'usePortfolioRefresh must be used within a PortfolioRefreshProvider',
    );
  }
  return context;
}
