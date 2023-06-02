import axios from '../core/Http';
import { STAKING_NOT_EMPTY } from '../reducers/stakingReducer';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { hostWorker } from '../global';

export interface validatorDescription {
  details: string
  id: string
  website: string
  name: string
}

export interface stakeValidators {
  commission: number
  balance: bigint
  tokens: bigint
  address: string
  status: string
  jailed: boolean
  description: validatorDescription
  apr: string
}

const getValidatorsInfoFromGet = (resp1, resp2, resp3, resp4, resp5) => {
  const userStakedValidatorsDetails = resp1.data.validators;
  const userStakedValidatorsBalance = resp2.data.delegation_responses;
  const userStakedValidatorsRewardBalance = resp3.data;
  const { apr } = resp5.data;

  const validators: Map<string, stakeValidators> = new Map();
  let totalReward: bigint = BigInt(0);
  let totalStakedBalance: bigint = BigInt(0);
  let unBoundingTotal: bigint = BigInt(0);
  const unBoundingsList: any[] = [];

  userStakedValidatorsDetails.forEach((item) => {
    const description: validatorDescription = {
      details: item.description.details,
      id: item.description.identity,
      website: item.description.website,
      name: item.description.moniker
    };

    const singleValidator: stakeValidators = {
      commission: parseFloat(item.commission.commission_rates.rate),
      tokens: item.tokens,
      address: item.operator_address,
      status: item.status,
      jailed: item.jailed,
      description,
      balance: BigInt(0),
      apr: (parseFloat(apr) - (parseFloat(apr) * item.commission.commission_rates.rate)).toFixed(2)
    };
    validators.set(item.operator_address, singleValidator);
  });

  if (userStakedValidatorsBalance.length > 0) {
    userStakedValidatorsBalance.forEach(item => {
      if (validators.has(item.delegation.validator_address)) {
        totalStakedBalance += BigInt(item.balance.amount);
        validators.get(item.delegation.validator_address).balance = BigInt(item.balance.amount);
      }
    });
  }
  if (userStakedValidatorsRewardBalance.total != null) {
    if (userStakedValidatorsRewardBalance.total.length > 0) {
      totalReward = BigInt(userStakedValidatorsRewardBalance.total[0].amount.split('.')[0]);
    }
  }

  if (JSON.stringify(resp4) !== '{}') {
    const userUnboundings = resp4.data.unbonding_responses;

    userUnboundings.forEach(item => {
      item.entries.forEach(entry => {
        unBoundingsList.push(entry);
        unBoundingTotal += BigInt(entry.balance);
      });
    });
  }

  return { vList: validators, totalReward, totalStakedBalance, unBoundingTotal, unBoundingsList };
};

export default async function getValidatorsForUSer (address, stakingValidators, globalStateContext) {
  const urlRecord = globalStateContext.globalState.rpcEndpoints.EVMOS.otherUrls;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const aprEndpoint = `${ARCH_HOST}/v1/configuration/apr/EVMOS`;
  const endpoints = [
    urlRecord.delegatedValidatorInformation.replace('address', address),
    urlRecord.delegationInformation.replace('address', address),
    urlRecord.reward.replace('address', address),
    urlRecord.allValidators.replace('address', address),
    urlRecord.balance.replace('address', `${address}/by_denom?denom=aevmos`),
    urlRecord.unboundings.replace('address', address)
  ];

  Promise.all(endpoints.map(async (endpoint) => await axios.get(endpoint)))
    .then(
      axios.spread(async (...allData) => {
        let apr;
        try {
          apr = await axios.get(aprEndpoint);
        } catch (error: any) {
          apr = { data: { apr: '0' } };
          Sentry.captureException(`failed to fetch APR ${error.message}`);
        }
        const {
          vList,
          totalReward,
          totalStakedBalance,
          unBoundingTotal,
          unBoundingsList
        } = getValidatorsInfoFromGet(allData[0], allData[1], allData[2], allData[5], apr);
        const allVList = getValidatorsInfoFromGet(allData[3], allData[1], allData[2], {}, apr).vList;

        const unStakedBalance = BigInt(allData[4].data?.balance?.amount ? allData[4].data.balance.amount : 0);

        if (allVList.size > 0) {
          stakingValidators.dispatchStaking({
            value: {
              allValidatorsListState: STAKING_NOT_EMPTY,
              allValidators: allVList
            }
          });

          stakingValidators.dispatchStaking({ value: { unStakedBalance } });
          stakingValidators.dispatchStaking({ value: { unBoundingsList } });
        }

        if (vList.size > 0) {
          stakingValidators.dispatchStaking(
            {
              value: {
                myValidators: vList,
                myValidatorsListState: STAKING_NOT_EMPTY,
                totalReward,
                totalStakedBalance
              }
            });
        }

        if (unBoundingTotal > BigInt(0)) {
          stakingValidators.dispatchStaking({ value: { unBoundingTotal } });
        }
      }))
    .catch(error => {
      Sentry.captureException(error);
      void analytics().logEvent('portfolio_error', { from: 'getting information for regarding staking' });
    });
}
