import { Chain } from '../constants/server';
import { OdosSwapQuoteResponse } from './osdoQuote.interface';

export interface SwapMetaData {
  quoteData: OdosSwapQuoteResponse;
  // {
  //   blockNumber?: number | undefined;
  //   chainId: number;
  //   data: {
  //     chainId: number;
  //     data: string;
  //     gas: number;
  //     gasPrice: number;
  //     nonce: number;
  //     to: string;
  //     value: string;
  //   };
  //   executor: string;
  //   fromToken: Array<{
  //     amount: string;
  //     tokenAddress: string;
  //   }>;
  //   gasEstimate: number;
  //   gasEstimateValue: number;
  //   gasInfo: {
  //     baseFee: number;
  //     chainId: string;
  //     enforceFactor: boolean;
  //     factor: number;
  //     gasPrice: number;
  //     isEIP1599Supported: boolean;
  //     maxFee: number;
  //     priorityFee: number;
  //     tokenPrice: number;
  //   };
  //   router: string;
  //   toToken: {
  //     amount: string;
  //     tokenAddress: string;
  //   };
  //   value: string;
  // };
  chainDetails: Chain;
}
