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