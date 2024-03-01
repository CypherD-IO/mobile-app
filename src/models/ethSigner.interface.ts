import Web3 from 'web3';
import { ChainBackendNames } from '../constants/server';

export interface EthTransaction {
  from: string;
  to: string;
  gasPrice: number;
  value: string | number;
  gas: string | number;
}

export interface RawTransaction {
  web3: Web3;
  chain: ChainBackendNames;
  transactionToBeSigned: EthTransaction;
}
