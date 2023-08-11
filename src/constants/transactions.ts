export enum TransactionType {
  SEND = 'send',
  SWAP = 'swap',
  RECEIVE = 'receive',
  APPROVE = 'approve',
  REVOKE = 'revoke',
  OTHERS = 'others',
  SELF = 'self'
}

export interface TransactionObj {
  from: string
  to: string
  timestamp: number
  hash: string
  blockchain: string
  value: string
  token: string | null
  tokenIcon: string | null
  gas: string
  type: string
  status: string
  isVerified: boolean
  tokenAddress: string
  additionalData: {
    recipient?: string
    amount?: string
    fromTokenAddress?: string
    fromToken?: string
    fromTokenIcon?: string
    fromTokenValue?: string
    toTokenAddress?: string
    toToken?: string
    toTokenIcon?: string
  }
}

export enum ApplicationName {
  SQUID = 'Squid',
  ODOS = 'Odos',
  SUSHISWAP = 'SushiSwap',
  UNISWAP = 'UniSwap',
  GMX = 'GMX',
  AAVE = 'Aave',
  POOL_TOGETHER = 'PoolTogether',
  PARA_SWAP = 'ParaSwap',
  OPEN_SEA = 'OpenSea',
  ENS = 'ENS',
  PANCAKE_SWAP = 'PancakeSwap',
  POLYGON_BRIDGE = 'Polygon Bridge',
  METAMASK = 'METAMASK',
  SYNAPSE = 'Synapse',
  _1_INCH = '1inch',
  SPOOKY_SWAP = 'SpookySwap',
  _0X_EXCHANGE = '0x Exchange',
  QUICK_SWAP = 'QuickSwap',
  LIFI = 'Lifi',
  WRAPPED_EVMOS = 'Wrapped Evmos',
  WRAPPED_MATIC = 'Wrapped Matic',
  SPIRIT_SWAP = 'SpiritSwap',
  DIFFUSION = 'Diffusion',
  TRADER_JOE = 'Trader Joe',
  SOCKET = 'Socket',
  APE_SWAP = 'ApeSwap',
  ARB_SWAP = 'ArbSwap',
  CBRIDGE = 'cBridge',
  HOP = 'Hop',
  WORM_HOLE = 'WormHole',
}
