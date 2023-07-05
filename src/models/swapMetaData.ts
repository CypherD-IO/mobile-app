import Web3 from 'web3';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { TokenMeta } from './tokenMetaData.model';

export interface SwapMetaData{
  web3: Web3
  fromToken: TokenMeta
  toToken?: any
  amount?: string | number
  routerAddress?: string
  quoteData?: any
  hdWallet: HdWalletContextDef
  gasLimit?: number | string
  gasFeeResponse?: any
  fromTokenContractAddress?: string
  contractData?: any
}
