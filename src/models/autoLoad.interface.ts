import { CardProviders } from '../constants/enum';
import { ALL_CHAINS_TYPE } from '../constants/type';
import { Holding } from '../core/Portfolio';

export interface AutoLoad {
  threshold: string;
  amountToLoad: string;
  autoLoadExpiry: boolean;
  expiryDate: string;
  repeatFor: number;
  selectedToken: Holding;
}

export interface IAutoLoadConfig {
  chain: ALL_CHAINS_TYPE;
  assetId: string; // denom for cosmos and contractAddress fro evm
  tokenAddress?: string;
  granterAddress: string;
  granteeAddress: string;
  cardProvider: CardProviders;
  threshold: number;
  amountToBeLoaded: number;
  isPaused: boolean;
  expiry?: string;
  repeatFor: number;
  repetitionsLeft: number;
}
