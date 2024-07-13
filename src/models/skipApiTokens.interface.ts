import { Chain } from '../constants/server';
import { SkipApiChainInterface } from './skipApiChains.interface';

export interface SkipApiToken {
  denom: string;
  chain_id: string;
  origin_denom: string;
  origin_chain_id: string;
  trace: string;
  is_cw20: boolean;
  is_evm: boolean;
  is_svm: boolean;
  symbol: string;
  name: string;
  logo_uri: string;
  decimals: number;
  coingecko_id: string;
  token_contract: string;
  recommended_symbol: string;
  balanceInNumbers: number | null;
  totalValue: number | null;
  chainDetails: Chain | null;
  price: string | null;
  actualBalance: number | null;

  // added isNative for swap to main a single interface
  isNative?: boolean;

  // chainDetails: any;
  skipApiChain: SkipApiChainInterface;
}
