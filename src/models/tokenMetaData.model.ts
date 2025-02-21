import { Chain } from '../constants/server';

export interface TokenMeta {
  about: string;
  balanceDecimal: string;
  balanceInteger: string;
  chainDetails: Chain;
  coinGeckoId: string;
  contractAddress: string;
  contractDecimals: number;
  denom: string;
  isVerified: boolean;
  logoUrl: string;
  name: string;
  price: string;
  price24h: number;
  symbol: string;
  totalValue: string;
  actualUnbondingBalance: number;
  unbondingBalanceTotalValue: number;
  isBridgeable: boolean;
  isSwapable: boolean;
  isZeroFeeCardFunding?: boolean;
  id?: number | string;
}
