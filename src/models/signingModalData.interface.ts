import { SignClientTypes } from '@walletconnect/types';
import { IDecodedTransactionResponse } from './txnDecode.interface';
import { SigningModalPayloadFrom } from '../constants/enum';

export interface DecodeTxnRequestBody {
  chainId: number;
  from: string;
  to: string;
  gas?: string;
  gasPrice?: string;
  gasLimit?: string;
  value?: string;
  data?: string;
  nonce?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface IModalPayload {
  resolve: (value: boolean) => void;
  reject: (value: boolean) => void;
  visible: boolean;
  params: {
    chainIdNumber: number;
    gasFeeDollar: string;
    gasFeeETH: string; // is actually gasFeeNative
    networkName: string;
    networkCurrency: string;
    valueETH: string;
    valueDollar: number;
    totalDollar: number;
    totalETH: string;
    appImage: number;
    finalGasPrice: string;
    gasLimit: string;
    gasPrice: {
      chainId: string;
      gasPrice: number;
      tokenPrice: number;
      cached: boolean;
    };
    payload: {
      method: string;
      params: DecodeTxnRequestBody[];
      id: string;
    };
  };
}
export interface SessionSigningModalProps {
  payloadFrom: SigningModalPayloadFrom;
  modalPayload?: IModalPayload;
  requestEvent?: SignClientTypes.EventArguments['session_request'] | undefined;
  isModalVisible: boolean;
  hideModal: () => void;
}

export interface IExtendedDecodedTxnResponse
  extends IDecodedTransactionResponse {
  from_addr: string;
}

export interface ISendTxnData {
  chainLogo: number;
  token: {
    logo: string;
    name: string;
    amount: number;
    valueInUSD: number;
  };
  toAddress: string;
  fromAddress: string;
  gasAndUSDAppx: string;
  availableBalance: string;
}

export interface ISwapTxnData {
  sendToken: {
    logo: string;
    name: string;
  };
  receiveToken: {
    logo: string;
    name: string;
  };
  chain: {
    logo: number;
    name: string;
  };
  sentAmount: {
    inTokensWithSymbol: string;
    inUSDWithSymbol: string;
  };
  receivedAmount: {
    inTokensWithSymbol: string;
    inUSDWithSymbol: string;
  };
  gas: {
    inTokensWithSymbol: string;
    inUSDWithSymbol: string;
  };
}

export interface IApproveTokenData {
  approvalTokenLogo: string;
  chainLogo: number;
  amount: {
    inTokensWithSymbol: string;
    inUSDWithSymbol: string;
  };
  spender: {
    address: string;
    protocol: {
      name: string;
      logo: string;
    };
  };
  gasWithUSDAppx: string;
  availableBalance: string;
}

export interface IDAppInfo {
  name: string;
  url: string;
  logo: string;
}
