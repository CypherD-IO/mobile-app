import { AnalyticsType } from '../constants/enum';

export interface SuccessAnalytics {
  type: AnalyticsType;
  chain: string;
  txnHash?: string;
  address?: string;
  contractData?: string;
  category?: string;
}

export interface ErrorAnalytics {
  type: AnalyticsType;
  chain: string;
  message?: string;
  screen?: string;
  address?: string;
  contractData?: string;
  quoteId?: string;
  connectionType?: string;
}
