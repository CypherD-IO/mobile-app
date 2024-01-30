/* eslint-disable quote-props */
export const Web3Method = {
  WALLET_PUSH_PERRMISSION: 'wallet_pushPermission',
  SEND_TRANSACTION: 'eth_sendTransaction',
  BLOCK_NUMBER: 'eth_blockNumber',
  BLOCK_BY_NUMBER: 'eth_getBlockByNumber',
  BLOCK_BY_HASH: 'eth_getBlockByHash',
  ACCOUNTS: 'eth_accounts',
  REQUEST_ACCOUNTS: 'eth_requestAccounts',
  GET_BALANCE: 'eth_getBalance',
  GAS_PRICE: 'eth_gasPrice',
  NET_VERSION: 'net_version',
  GET_LOGS: 'eth_getLogs',
  ETH_CALL: 'eth_call',
  SIGN_TRANSACTION: 'eth_signTransaction',
  GET_TRANSACTION_BY_HASH: 'eth_getTransactionByHash',
  GET_TRANSACTION_RECEIPT: 'eth_getTransactionReceipt',
  GET_TRANSACTION_COUNT: 'eth_getTransactionCount',
  PERSONAL_SIGN: 'personal_sign',
  ESTIMATE_GAS: 'eth_estimateGas',
  FEE_HISTORY: 'eth_feeHistory',
  SIGN_TYPED_DATA: 'eth_signTypedData',
  SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
  SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
  ADD_ETHEREUM_CHAIN: 'wallet_addEthereumChain',
  SWITCH_ETHEREUM_CHAIN: 'wallet_switchEthereumChain',
  CHAIN_ID: 'eth_chainId',
  CHAINID: 'eth_chainid',
  GET_CODE: 'eth_getCode',
  ETH_SIGN: 'eth_sign',
  PERSONAL_ECRECOVER: 'personal_ecRecover',
};

export const CosmosWeb3Method = {
  GETKEY: 'getKey',
  SIGN_AMINO: 'signAmino',
  SEND_TX: 'sendTx',
  SIGN_DIRECT: 'signDirect',
  ENABLE: 'enable',
};

export const WEB3METHODS = Web3Method;

export const errorCodes = {
  rpc: {
    invalidInput: -32000,
    resourceNotFound: -32001,
    resourceUnavailable: -32002,
    transactionRejected: -32003,
    methodNotSupported: -32004,
    limitExceeded: -32005,
    parse: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
    internal: -32603,
  },
  provider: {
    userRejectedRequest: 4001,
    unauthorized: 4100,
    unsupportedMethod: 4200,
    disconnected: 4900,
    chainDisconnected: 4901,
  },
};

export const ProviderError: Record<
  string,
  {
    standard: string;
    message: string;
  }
> = {
  '-32700': {
    standard: 'JSON RPC 2.0',
    message:
      'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
  },
  '-32600': {
    standard: 'JSON RPC 2.0',
    message: 'The JSON sent is not a valid Request object.',
  },
  '-32601': {
    standard: 'JSON RPC 2.0',
    message: 'The method does not exist / is not available.',
  },
  '-32602': {
    standard: 'JSON RPC 2.0',
    message: 'Invalid method parameter(s).',
  },
  '-32603': {
    standard: 'JSON RPC 2.0',
    message: 'Internal JSON-RPC error.',
  },
  '-32000': {
    standard: 'EIP-1474',
    message: 'Invalid input.',
  },
  '-32001': {
    standard: 'EIP-1474',
    message: 'Resource not found.',
  },
  '-32002': {
    standard: 'EIP-1474',
    message: 'Resource unavailable.',
  },
  '-32003': {
    standard: 'EIP-1474',
    message: 'Transaction rejected.',
  },
  '-32004': {
    standard: 'EIP-1474',
    message: 'Method not supported.',
  },
  '-32005': {
    standard: 'EIP-1474',
    message: 'Request limit exceeded.',
  },
  '4001': {
    standard: 'EIP-1193',
    message: 'User rejected the request.',
  },
  '4100': {
    standard: 'EIP-1193',
    message:
      'The requested account and/or method has not been authorized by the user.',
  },
  '4200': {
    standard: 'EIP-1193',
    message: 'The requested method is not supported by this Ethereum provider.',
  },
  '4900': {
    standard: 'EIP-1193',
    message: 'The provider is disconnected from all chains.',
  },
  '4901': {
    standard: 'EIP-1193',
    message: 'The provider is disconnected from the specified chain.',
  },
};

export const OSMOSIS_WALLET_CONNECT_METHODS = {
  ENABLE_WALLET_CONNECT: 'keplr_enable_wallet_connect_v1',
  GET_KEY_WALLET_CONNECT: 'keplr_get_key_wallet_connect_v1',
  SIGN_AMINO: 'keplr_sign_amino_wallet_connect_v1',
};

export const WALLET_PERMISSIONS = {
  NO_DATA: 'NO_DATA',
  DENY: 'DENY',
  ALLOW: 'ALLOW',
};

export const EVENTS = {
  SESSION_REQUEST: 'session_request',
  CONNECT: 'connect',
  CALL_REQUEST: 'call_request',
  DISCONNECT: 'disconnect',
  REJECT_REQUEST: 'reject_request',
  REJECT_SESSION: 'reject_session',
};

export enum CommunicationEvents {
  MESSAGE = 'message',
  ANALYTICS = 'analytics',
  WEB3 = 'web3',
  WEBINFO = 'webinfo',
  WEB3COSMOS = 'proxy-request',
}
