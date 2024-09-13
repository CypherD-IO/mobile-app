import Web3 from 'web3';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { TokenMeta } from './tokenMetaData.model';
import { Chain } from '../constants/server';
import { SwapBridgeTokenData } from '../containers/BridgeV2';

export interface SwapMetaData {
  web3: Web3;
  fromToken?: SwapBridgeTokenData;
  toToken?: SwapBridgeTokenData;
  amount?: string | number;
  routerAddress?: string;
  quoteData?: any;
  hdWallet: HdWalletContextDef;
  gasLimit?: number | string;
  gasFeeResponse?: any;
  fromTokenContractAddress?: string;
  contractData?: any;
  overrideAllowanceCheck?: boolean;
  overrideAmountCheck?: boolean;
  chainDetails: Chain;
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
