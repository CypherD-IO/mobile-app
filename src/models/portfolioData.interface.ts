import { WalletHoldings } from '../core/portfolio';

export interface IPortfolioData {
  portfolio?: WalletHoldings;
  isError: boolean;
  isPortfolioEmpty: boolean;
  lastUpdatedAt: string;
}
