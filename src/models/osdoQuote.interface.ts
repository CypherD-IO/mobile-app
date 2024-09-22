import { EVM_CHAINS_TYPE } from '../constants/type';

export interface OdosInputToken {
  tokenAddress: string;
  amount: string;
}

export interface EvmGasFeeInterface {
  chainId: EVM_CHAINS_TYPE;
  isEIP1599Supported: boolean;
  gasPrice: number;
  tokenPrice: number;
  maxFee?: number;
  priorityFee?: number;
  baseFee?: number;
  factor?: number;
  enforceFactor?: boolean;
}

export interface OdosSwapQuoteResponse {
  fromToken: OdosInputToken[];
  toToken: OdosInputToken;
  expiry?: string;
  chainId: number;
  router: string;
  executor: string;
  data: any;
  value: string | number;
  blockNumber?: number;
  gasEstimate: number;
  gasEstimateValue: number;
  gasInfo?: EvmGasFeeInterface;
}
