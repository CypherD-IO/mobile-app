import { Chain } from '../constants/server';

interface TokenSendParams {
  onConfirm: () => void;
  onCancel: () => void;
  chain: Chain;
  amountInCrypto: string;
  amountInFiat: string;
  symbol: string;
  toAddress: string;
  gasFeeInCrypto: string;
  gasFeeInFiat: string;
  nativeTokenSymbol: string;
}

export interface TokenSendConfirmationParams {
  isModalVisible: boolean;
  tokenSendParams: TokenSendParams;
}
