import { AnalyticsType } from '../constants/enum';

interface BaseAnalytics {
  type: AnalyticsType;
  chain: string;
  address?: string;
  contractData?: string;
  quoteId?: string;
  connectionType?: string;
  other?: Record<string, unknown>;
}

export interface SuccessAnalytics extends BaseAnalytics {
  txnHash?: string;
  category?: string;
}

export interface ErrorAnalytics extends BaseAnalytics {
  message?: string;
  screen?: string;
}
