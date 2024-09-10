import { NavigationProp, ParamListBase } from '@react-navigation/native';

export type EVM_ONLY_CHAINS_TYPE =
  | 'ETH'
  | 'POLYGON'
  | 'AVALANCHE'
  | 'ARBITRUM'
  | 'OPTIMISM'
  | 'BSC'
  | 'SHARDEUM'
  | 'SHARDEUM_SPHINX';

export type EVM_CHAINS_TYPE = EVM_ONLY_CHAINS_TYPE;

export type COSMOS_CHAINS_TYPE =
  | 'COSMOS'
  | 'OSMOSIS'
  | 'JUNO'
  | 'STARGAZE'
  | 'NOBLE';

export type ALL_CHAINS_TYPE = EVM_CHAINS_TYPE | COSMOS_CHAINS_TYPE;

export interface NavigationProps {
  navigation: NavigationProp<ParamListBase>;
}
