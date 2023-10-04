import Web3 from 'web3';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { TokenMeta } from './tokenMetaData.model';

export interface SwapMetaData {
  web3: Web3;
  fromToken?: TokenMeta;
  toToken?: TokenMeta;
  amount?: string | number;
  routerAddress?: string;
  quoteData?: any;
  hdWallet: HdWalletContextDef;
  gasLimit?: number | string;
  gasFeeResponse?: any;
  fromTokenContractAddress?: string;
  contractData?: any;
}

export interface AllowanceParams {
  web3: Web3;
  fromTokenContractAddress: string;
  ethereum: any;
  routerAddress: string;
  isNative: boolean;
  quoteData: any;
  gasFeeETH: number | string;
  gasFeeDollar: number | string;
  isApprovalModalVisible: boolean;
  isAllowance: boolean;
  gasLimit: string;
  gasFeeResponse: any;
  contractData: any;
}
