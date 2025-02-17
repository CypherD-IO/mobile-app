import { ChainBackendNames } from '../constants/server';
import { Address } from 'viem';

export type EthTransactionPayload = {
  from?: Address;
  to: Address;
  value: bigint;
  gas: bigint;
  data?: `0x${string}`;
} & (
  | {
      gasPrice: bigint;
      maxPriorityFeePerGas?: never;
      maxFeePerGas?: never;
    }
  | {
      gasPrice?: never;
      maxPriorityFeePerGas: bigint;
      maxFeePerGas: bigint;
    }
);

export interface EthSingerParams {
  rpc: string;
  sendChain: ChainBackendNames;
  transactionToBeSigned: EthTransactionPayload;
  tokens?: bigint;
}
