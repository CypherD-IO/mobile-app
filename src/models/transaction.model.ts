export interface TokenTransaction {
  address: string
  date: string
  direction: string
  gasFeeValue: number
  operation: string
  status: boolean
  tokenQuantity: number
  tokenSymbol: string
  tokenUrl: string
  totalValue: number
  txnHash: string
}

export interface TransactionTransfer {
  direction: 'in' | 'out' | 'self'
  tokenSymbol: string
  tokenName: string
  tokenAddress: string
  tokenIcon: string | null
  tokenDecimals: number
  amount: number
  valueUsd: number | null
  price: number | null
  from: string
  to: string
  isVerified: boolean
}

export interface TransactionFee {
  tokenSymbol: string
  amount: number
  valueUsd: number | null
}

export interface TransactionProtocol {
  id: string
  name: string
  icon: string | null
  url: string | null
}

export interface TransactionApproval {
  tokenSymbol: string
  tokenName: string
  tokenAddress: string
  tokenIcon: string | null
  tokenDecimals: number
  amount: number
  spender: string
  isVerified: boolean
}

export interface TransactionObj {
  hash: string
  chain: string
  status: string
  timestamp: number
  operationType: string
  from: string
  to: string
  fee: TransactionFee
  transfers: TransactionTransfer[]
  approvals?: TransactionApproval[]
  protocol: TransactionProtocol | null
  nonce: number
  blockNumber: string
}
