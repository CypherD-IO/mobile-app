export interface TokenMeta {
  about: string
  actualBalance: number
  actualStakedBalance: number
  balance: number
  chainDetails: {
    backendName: string
    chainIdNumber: number
    chainName: string
    chain_id: string
    logo_url: number
    name: string
    native_token_address: string
    secondaryAddress: string
    symbol: string
  }
  coinGeckoId: string
  contractAddress: string
  contractDecimals: number
  denom: string
  isVerified: boolean
  logoUrl: string
  name: string
  price: string
  price24h: number
  stakedBalance: string
  stakedBalanceTotalValue: string
  symbol: string
  totalValue: string
}
