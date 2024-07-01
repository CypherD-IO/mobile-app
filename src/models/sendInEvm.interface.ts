import Web3 from 'web3';
import { ChainBackendNames } from '../constants/server';

export interface SendInEvmInterface {
  chain: ChainBackendNames;
  amountToSend: string;
  toAddress: string;
  contractAddress: string;
  contractDecimals: number;
  symbol: string;
  contractData?: any;
}

export interface SendNativeToken {
  web3: Web3;
  chain: ChainBackendNames;
  amountToSend: string;
  toAddress: string;
  contractAddress: string;
  contractDecimals: number;
  contractData?: any;
}
