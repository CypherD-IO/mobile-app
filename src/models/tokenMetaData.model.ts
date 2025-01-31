import { Chain } from '../constants/server';

export interface TokenMeta {
  about: string;
  actualBalance: number;
  balanceDecimal: string;
  balanceInInteger: number;
  balanceInteger: string;
  actualStakedBalance: number;
  balance: number;
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
  stakedBalance: string;
  stakedBalanceTotalValue: string;
  symbol: string;
  totalValue: string;
  actualUnbondingBalance: number;
  unbondingBalanceTotalValue: number;
  isBridgeable: boolean;
  isSwapable: boolean;
  isStakeable?: boolean;
  isZeroFeeCardFunding?: boolean;
  id?: number | string;
}
