interface TokenSendParams {
  onConfirm: () => void;
  onCancel: () => void;
  chain: string;
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
