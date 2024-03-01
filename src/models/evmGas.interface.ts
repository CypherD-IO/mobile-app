import Web3 from 'web3';
import { ChainBackendNames } from '../constants/server';

export interface EvmGasInterface {
  web3: Web3;
  chain: ChainBackendNames;
  fromAddress: string;
  toAddress: string;
  amountToSend: string;
  contractAddress: string;
  contractDecimals: number;
}
