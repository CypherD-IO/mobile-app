import { Chain } from '../constants/server';
import { BridgeTokenDataInterface } from './bridgeTokenData.interface';

export interface BridgeStatusPropsInterface {
  navigation: any
  fromChain: Chain
  toChain: Chain
  sentAmount: string
  sentAmountUsd: string
  receivedAmount: string
  fromToken: BridgeTokenDataInterface
  toToken: BridgeTokenDataInterface
  quoteId: string
}
