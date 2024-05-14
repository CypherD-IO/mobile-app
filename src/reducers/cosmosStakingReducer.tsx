import React, { Dispatch } from 'react';

export enum CosmosActionType {
  DELEGATE = 'Delegate',
  UNDELEGATE = 'Undelegate',
  REDELEGATE = 'Redelegate',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  RESTAKE = 'restake',
  SIMULATION = 'simulation',
  TRANSACTION = 'transaction',
  CLAIM = 'claim',
}
export interface IAllValidators {
  commissionRate: string;
  description: string;
  name: string;
  jailed: boolean;
  tokens: bigint;
  balance: bigint;
  address: string;
  apr: string;
}

export interface IUnboundings {
  balance: bigint;
  completionTime: string;
}

export interface IReward {
  amount: string;
  validatorAddress: string;
}

export const COSMOS_STAKING_EMPTY = 'EMPTY';
export const COSMOS_STAKING_NOT_EMPTY = 'NOT_EMPTY';
export const COSMOS_STAKING_LOADING = 'LOADING';
export const COSMOS_STAKING_ERROR = 'ERROR';

export interface CosmosStakingDef {
  status: string;
  stakedBalance: bigint;
  reward: bigint;
  balance: bigint;
  allValidators: Map<string, IAllValidators>;
  allValidatorsListState: string;
  userValidators: Map<string, IAllValidators>;
  unBoundings: Map<string, IUnboundings>;
  rewardList: IReward[];
  unBoundingBalance: bigint;
}

export const cosmosStakingInitialState: CosmosStakingDef = {
  status: COSMOS_STAKING_LOADING,
  stakedBalance: BigInt(0),
  reward: BigInt(0),
  balance: BigInt(0),
  allValidators: new Map<string, IAllValidators>(),
  allValidatorsListState: COSMOS_STAKING_EMPTY,
  userValidators: new Map<string, IAllValidators>(),
  unBoundings: new Map<string, IUnboundings>(),
  rewardList: [],
  unBoundingBalance: BigInt(0),
};
export interface cosmosStakingContextDef {
  cosmosStakingState: CosmosStakingDef;
  cosmosStakingDispatch: Dispatch<any>;
}
export const CosmosStakingContext = React.createContext(null);

export const cosmosStakingReducer = (state, value) => {
  return { ...state, ...value };
};
