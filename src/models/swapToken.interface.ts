export interface SwapToken {
  address: string;
  decimals: number;
  isNative: boolean;
  isVerified: boolean;
  name: string;
  symbol: string;
  logo: string;
  tokenPrice: number;
}
