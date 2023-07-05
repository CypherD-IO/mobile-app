import { ALL_CHAINS_TYPE } from '../constants/type';
import { NFTHolding } from './NFTHolding.interface';

export type AllNFTHoldings = {
  [chain in ALL_CHAINS_TYPE]: NFTHolding[];
};
