import { AnalyticsType } from '../constants/enum';

export interface SuccessAnalytics {
  type: AnalyticsType;
  chain: string;
  txnHash?: string;
  address?: string;
}

export interface ErrorAnalytics {
  type: AnalyticsType;
  chain: string;
  message?: string;
  screen?: string;
  address?: string;
}
