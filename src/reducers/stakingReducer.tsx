import { stakeValidators } from '../core/Staking';

export interface ValidatorsList {
  myValidators: Map<string, stakeValidators>
  myValidatorsListState: string
  allValidators: Map<string, stakeValidators>
  allValidatorsListState: string
  totalReward: bigint
  totalStakedBalance: bigint
  typeOfDelegation: string
  reValidator: {}
  unStakedBalance: bigint
  unBoundingTotal: bigint
  unBoundingsList: any[]
}

export const STAKING_EMPTY = 'EMPTY';
export const STAKING_NOT_EMPTY = 'NOT_EMPTY';
export const DELEGATE = 'Delegate';
export const UN_DELEGATE = 'Undelegate';
export const RE_DELEGATE = 'Redelegate';
export const RESET = 'RESET_VALUES';

export const initialValidatorState: ValidatorsList = {
  myValidators: new Map(),
  myValidatorsListState: STAKING_EMPTY,
  allValidators: new Map(),
  allValidatorsListState: STAKING_EMPTY,
  totalReward: BigInt(0),
  totalStakedBalance: BigInt(0),
  typeOfDelegation: DELEGATE,
  reValidator: { description: { name: '' } },
  unStakedBalance: BigInt(0),
  unBoundingTotal: BigInt(0),
  unBoundingsList: []
};

export function ValidatorsListReducer (state, action) {
  switch (action.type) {
    case RESET:
      return initialValidatorState;
    default:
      return { ...state, ...action.value };
  }
}
