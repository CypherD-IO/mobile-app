export interface BridgeDataCosmosInterface {
  fromAddress: string
  toAddress: string
  fromChainName: string
  fromTokenName: string
  fromTokenContractDecimal: number
  toChainName: string
  toTokenName: string
  toTokenContractDecimal: number
  transferAmount: string
  transactionHash: string
  quoteId: string
  ethereumAddress: string
}
