import { ChainBackendNames } from '../constants/server';
import { PublicClient, Address } from 'viem';

export interface EvmGasInterface {
  publicClient: PublicClient;
  chain: ChainBackendNames;
  fromAddress: Address;
  toAddress: Address;
  amountToSend: string;
  contractAddress: Address;
  contractDecimals: number;
  contractData?: any;
  isErc20?: boolean;
}
