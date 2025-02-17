import { ChainBackendNames } from '../constants/server';
import { Address, PublicClient } from 'viem';

export interface SendInEvmInterface {
  chain: ChainBackendNames;
  amountToSend: string;
  toAddress: Address;
  contractAddress: Address;
  contractDecimals: number;
  symbol: string;
  // contractData?: `0x${string}`;
}

export interface SendNativeToken {
  publicClient: PublicClient;
  chain: ChainBackendNames;
  amountToSend: string;
  toAddress: Address;
  contractAddress: Address;
  contractDecimals: number;
  // contractData?: `0x${string}`;
}
