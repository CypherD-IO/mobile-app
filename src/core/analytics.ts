import analytics from '@react-native-firebase/analytics';

export const AnalyticEvent = {
  TRANSACTION_RECEIPT_RECEIVED: 'transaction_receipt',
  COSMOS_SIGNAMINO: 'cosmos_provider_signAmino',
  COSMOS_SIGNDIRECT: 'cosmos_provider_signAmino',
  COSMOS_METHOD_NOTFOUND: 'cosmos_provider_methodNotFound_error',
  COSMOS_PROVIDER_ERROR: 'cosmos_provider_error',
  JSON_RPC_ERROR: 'internal_JSON_RPC_error',
  WEB3_METHOD_NOTFOUND: 'web3_method_not_supported',
  SKIP_API_BRIDGE_ERROR: 'bridge_falied',
  SKIP_API_BRIDGE_SUCESS: 'bridge_sucess',
  SKIP_API_BRIDGE_QUOTE: 'bridge_quote',
};

export const logAnalytics = (event: string, data: any): void => {
  void analytics().logEvent(event, data);
};
