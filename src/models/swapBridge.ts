export interface SwapBridgeChainData {
  chainName: string;
  chainId: string;
  logoUrl: string;
  prettyName: string;
  chainType: 'evm' | 'cosmos' | 'svm';
  bech32Prefix: string;
  isOdos: boolean;
  isSkip: boolean;
}

export interface SwapBridgeTokenData {
  denom: string;
  chainId: string;
  isNative: boolean;
  isEvm: boolean;
  isSvm: boolean;
  symbol: string;
  name: string;
  logoUrl: string;
  tokenContract: string;
  decimals: number;
  coingeckoId: string;
  recommendedSymbol: string;
  isOdos: boolean;
  isSkip: boolean;
  price: number;
  balance: number;
  balanceInNumbers: number;
  balanceDecimal: string;
}
