
/**
 * Types
 */
export type TEIP155Chain = keyof typeof EIP155_CHAINS

/**
 * Chains
 */

export const EIP155_CHAIN_IDS = ['eip155:1', 'eip155:137', 'eip155:10', 'eip155:42161', 'eip155:43114', 'eip155:250', 'eip155:56', 'eip155:9001'];

export const EIP155_MAINNET_CHAINS = {
  'eip155:1': {
    chainId: 1,
    name: 'Ethereum',
    logo: '/chain-logos/eip155-1.png',
    rgb: '99, 125, 234',
    rpc: 'https://cloudflare-eth.com/'
  },
  'eip155:43114': {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    logo: '/chain-logos/eip155-43113.png',
    rgb: '232, 65, 66',
    rpc: 'https://api.avax.network/ext/bc/C/rpc'
  },
  'eip155:137': {
    chainId: 137,
    name: 'Polygon',
    logo: '/chain-logos/eip155-137.png',
    rgb: '130, 71, 229',
    rpc: 'https://polygon-rpc.com/'
  }
};

export const EIP155_CHAINS = { ...EIP155_MAINNET_CHAINS };

/**
 * Methods
 */
export const EIP155_SIGNING_METHODS = {
  PERSONAL_SIGN: 'personal_sign',
  ETH_SIGN: 'eth_sign',
  ETH_SIGN_TRANSACTION: 'eth_signTransaction',
  ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V1: 'eth_signTypedData_v1',
  ETH_SIGN_TYPED_DATA_V2: 'eth_signTypedData_v2',
  ETH_SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
  ETH_SEND_RAW_TRANSACTION: 'eth_sendRawTransaction',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction',
  WALLET_GET_PERMISSIONS: 'wallet_getPermissions',
  WALLET_REQUEST_PERMISSIONS: 'wallet_requestPermissions'
};

export const COSMOS_SIGNING_METHODS = {
  COSMOS_SIGN_DIRECT: 'cosmos_signDirect',
  COSMOS_SIGN_AMINO: 'cosmos_signAmino'
};
