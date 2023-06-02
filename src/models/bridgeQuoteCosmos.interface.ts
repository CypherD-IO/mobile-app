export interface bridgeQuoteCosmosInterface {
  fromAmount: number
  fromAmountUsd: number
  receiverAddress: string
  toAmount: number
  quoteId: string
  toAmountUsd: number
  minimumAmountReceived: string
  cypherdBridgeFee: string
  gasFee: string
  reasons: string[]
}
