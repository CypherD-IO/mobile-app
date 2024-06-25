import Web3 from 'web3';
import { ChainBackendNames } from '../constants/server';

export interface EthTransaction {
  from: string;
  to: string;
  gasPrice?: number;
  value: string | number;
  gas: string | number;
  maxPriorityFeePerGas?: string | number;
  maxFeePerGas?: string | number;
}

export interface RawTransaction {
  web3: Web3;
  sendChain: ChainBackendNames;
  transactionToBeSigned: EthTransaction;
}
