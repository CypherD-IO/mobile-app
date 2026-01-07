import type { ChainBackendNames } from '../constants/chainBackendNames';

export type DeFiPositionTypes =
  | 'liqudity'
  | 'staking'
  | 'lending'
  | 'farming'
  | 'levraged-farming'
  | 'yeild'
  | 'rewards'
  | 'deposit'
  | 'vesting'
  | 'locked'
  | 'others'
  | 'nft-staking'
  | 'airdrop';

export enum DefiPositonTypes {
  LIQUIDITY = 'liqudity',
  STAKING = 'staking',
  YEILD = 'yeild',
  FARMING = 'farming',
  LENDING = 'lending',
  DEPOSIT = 'deposit',
  LEVRAGED_FARMING = 'levraged-farming',
  OTHERS = 'others',
  LOCKED = 'locked',
  REWARDS = 'rewards',
  VESTING = 'vesting',
  NFT_STAKING = 'nft-staking',
  AIRDROP = 'airdrop',
}
export enum AllocationTypes {
  PROTOCOL = 'Protocol',
  CHAIN = 'Chain',
  TYPE = 'Type',
}
export interface Details {
  supply: PositionDetail[];
  rewards: PositionDetail[];
  borrow: PositionDetail[];
  lpToken: null;
  poolApy: null;
}
export interface Total {
  supply: number;
  debt: number;
  value: number;
  isActive: boolean;
}
export interface Position {
  total: Total;
  details: Details;
  type: DeFiPositionTypes;
}

export interface Protocol {
  chain: string;
  appId: string;
  name: string;
  url: string;
  logo: string;
  positions: Position[];
}

export interface DefiResponse {
  address: string;
  ist: Date;
  protocols: Protocol[];
}

export interface PositionDetail {
  id: string;
  tokenAddress: string;
  tokenDecimals: number;
  tokenName: string;
  tokenSymbol: string;
  usdRate: number;
  balance: number;
  balanceUSD: number;
  logo: string;
  reserve: null;
  apy: null;
  balanceDecimal: number;
}

export interface defiPosition {
  liquidity?: {
    type: DefiPositonTypes.LIQUIDITY;
    total: Total;
    supply: PositionDetail[][];
  };
  staking?: {
    type: DefiPositonTypes.STAKING;
    total: Total;
    suppifly: PositionDetail[];
    rewards: PositionDetail[];
  };
  yeild?: {
    type: DefiPositonTypes.YEILD;
    total: Total;
    details: Details[];
  };
  farming?: {
    type: DefiPositonTypes.FARMING;
    total: Total;
    details: Details[];
  };
  lending?: {
    type: DefiPositonTypes.LENDING;
    total: Total;
    details: Details[];
  };
  // clear
  deposit?: {
    type: DefiPositonTypes.DEPOSIT;
    total: Total;
    details: Details[];
  };
}
export interface ChainPositionData {
  value: string;
  chainName: string;
  chainLogo: string;
  total: {
    value: number;
    debt: number;
    supply: number;
    claimable: number;
  };
  positions: Record<string, ProtocolPositionTypeData>;
}
export interface holdingsData extends Position {
  chain: ChainBackendNames;
  chainLogo: string;
}
export interface PositionTypeData {
  value: DeFiPositionTypes;
  type: string;
  typeLogo: { uri: string };
  total: {
    value: number;
    debt: number;
    supply: number;
  };
  holdings: holdingsData[];
}

export interface defiProtocolData {
  chains: ChainBackendNames[];
  protocolName: string;
  protocolURL: string;
  protocolLogo: { uri: string };
  total: {
    supply: number;
    debt: number;
    value: number;
    claimable: number;
  };
  types: Record<DefiPositonTypes, PositionTypeData>;
}

export interface DefiData {
  total: {
    supply: number;
    debt: number;
    value: number;
    claimable: number;
  };
  TotalLending: number;
  totalStaked: number;
  totalYield: number;
  totalLiquidity: number;
  totalFarming: number;
  protocols: Record<string, defiProtocolData>;
}

export interface DeFiFilter {
  chain: ChainBackendNames;
  positionTypes: DeFiPositionTypes[];
  protocols: string[];
  activePositionsOnly: string;
}

export interface protocolOptionType {
  logo: { uri: string };
  label: string;
  value: string;
}

export interface ProtocolPositionTypeData {
  total: {
    supply: number;
    debt: number;
    value: number;
  };
  type: DeFiPositionTypes;
  positions: Position[];
}

export interface DefiAllocation {
  name: string;
  balance: number;
  value: number;
  logo: { uri: string };
  length?: number;
  chainLogo?: string;
}

export interface DeFiContextDef {
  state: {
    iat: string;
    filteredData: DefiData;
    chainAllocation: DefiAllocation[];
    typeAllocation: DefiAllocation[];
  };
  dispatch: any;
}
// export interface DeFiRefreshFilterBar {

// }
