import { ALL_CHAINS_TYPE } from '../constants/type';

export interface NFTHolding {
  blockchain: ALL_CHAINS_TYPE
  name: string
  tokenId: string
  tokenUrl: string
  imageUrl: string
  animationUrl?: string | null
  collectionName: string
  symbol: string
  contractAddress: string
  quantity?: string
  description?: string
}
