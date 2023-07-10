import axios from './Http';
import {
  COSMOS_STAKING_LOADING,
  COSMOS_STAKING_NOT_EMPTY,
  IAllValidators, IReward,
  IUnboundings
} from '../reducers/cosmosStakingReducer';
import { Dispatch } from 'react';
import { GlobalStateDef } from './globalContext';
import * as Sentry from '@sentry/react-native';
import { cosmosConfig, Denom } from '../constants/cosmosConfig';
import Toast from 'react-native-toast-message';
import analytics from '@react-native-firebase/analytics';
import { hostWorker } from '../global';
import { find } from 'lodash';

const parseAllValidators = (validators: any, aprData: any): Map<string, IAllValidators> => {
  const data = validators.data.validators;
  const { apr } = aprData.data;
  const val: Map<string, IAllValidators> = new Map<string, IAllValidators>();
  data.forEach((item) => {
    const temp = {
      commissionRate: item.commission.commission_rates.rate,
      description: item.description.details,
      name: item.description.moniker,
      jailed: item.jailed,
      tokens: item.tokens,
      balance: '0',
      address: item.operator_address,
      apr: (parseFloat(apr) - (parseFloat(apr) * item.commission.commission_rates.rate)).toFixed(2)
    };
    val.set(item.operator_address, temp);
  });
  return val;
};

const parseUserDelegations = (validators: any, allValidators: Map<string, IAllValidators>): [Map<string, IAllValidators>, bigint] => {
  const data = validators.data.delegation_responses;
  let balance = BigInt(0);
  const val = new Map<string, IAllValidators>();
  data.forEach(item => {
    const validatorAddressObject = allValidators.get(item.delegation.validator_address);
    if (validatorAddressObject) { val.set(item.delegation.validator_address, validatorAddressObject); }
    const newValidatorObject = val.get(item.delegation.validator_address);
    if (newValidatorObject && item.balance.amount) {
      newValidatorObject.balance = BigInt(item.balance.amount);
      val.set(item.delegation.validator_address, newValidatorObject);
      balance += BigInt(item.balance.amount);
    }
  });
  return [val, balance];
};

const parseBalance = (balance: any, denom: string): string => {
  const data = balance.data;
  let balanceAmount: string = '0';
  if (data.balances.length > 0) {
    data.balances.forEach(item => {
      if (item.denom === denom) {
        balanceAmount = item.amount;
      }
    });
  }
  return balanceAmount;
};

const parseReward = (reward: any, denom: string): [string, IReward[]] => {
  const rewardList: IReward[] = [];
  reward.data.rewards.forEach((item) => {
    if (item) {
      const { validator_address, reward } = item;
      if (reward.length > 0) {
        const [firstReward] = reward;
        const { amount } = firstReward;
        if (amount) {
          const temp: IReward = {
            validatorAddress: validator_address,
            amount
          };
          rewardList.push(temp);
        }
      }
    }
  });
  const total = reward.data.total;
  const denomTotal = total.length > 0 ? find(total, { denom }) : undefined;
  const totalReward = denomTotal ? denomTotal.amount.split('.')[0] : '0';
  return [totalReward, rewardList];
};

const parseUnBoundings = (unboundings: any): [Map<string, IUnboundings>, bigint] => {
  const unbound: Map<string, IUnboundings> = new Map<string, IUnboundings>();
  let unboundingTotal: bigint = BigInt(0);
  unboundings.data.unbonding_responses.forEach(item => {
    unboundingTotal += BigInt(item.entries[0].balance);
    const temp = {
      balance: item.entries[0].balance,
      completionTime: item.entries[0].completion_time
    };
    unbound.set(item.validator_address, temp);
  });
  return [unbound, unboundingTotal];
};

export const getCosmosStakingData = async (cosmosStakingDispatch: Dispatch<any>, globalState: GlobalStateDef, chain: string, address: string, denom: string): Promise<void> => {
  cosmosStakingDispatch({ status: COSMOS_STAKING_LOADING });
  const rpc = globalState.rpcEndpoints[chain].otherUrls;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const aprEndpoint = `${ARCH_HOST}/v1/configuration/apr/${chain}`;
  const endPoints = [
    rpc.validators.replace('address', address),
    rpc.balance.replace('address', address),
    rpc.delegations.replace('address', address),
    rpc.rewards.replace('address', address),
    rpc.unBoundings.replace('address', address)
  ];

  try {
    const [allValidators, balance, delegations, rewards, unboundings] = await Promise.all(endPoints.map(async (endpoint) => {
      const t = await axios.get(endpoint);
      return t;
    }));
    let apr;
    try {
      apr = await axios.get(aprEndpoint);
    } catch (error) {
      apr = { data: { apr: '0' } };
      Sentry.captureException('failed to fetch APR' + error.message);
    }

    const allVal = parseAllValidators(allValidators, apr);
    const [userVal, stakedBal] = parseUserDelegations(delegations, allVal);
    const bal = parseBalance(balance, denom);
    const [totalReward, rewardList] = parseReward(rewards, denom);
    const [unbound, unboundingTotal] = parseUnBoundings(unboundings);

    cosmosStakingDispatch({
      status: COSMOS_STAKING_NOT_EMPTY,
      stakedBalance: BigInt(stakedBal),
      reward: BigInt(totalReward),
      balance: BigInt(bal),
      allValidators: allVal,
      allValidatorsListState: COSMOS_STAKING_NOT_EMPTY,
      userValidators: userVal,
      unBoundings: unbound,
      rewardList,
      unBoundingBalance: unboundingTotal
    });
  } catch (error: any) {
    Sentry.captureException(error);
    Toast.show({
      type: 'error',
      text1: 'Transaction failed',
      text2: error.message,
      position: 'bottom'
    });
    await analytics().logEvent(`${chain}_fetch_failed`);
  }
};
