import React, { type Dispatch } from 'react';
import Web3 from 'web3';
import * as Sentry from '@sentry/react-native';
import {
  ChainBackendNames
} from '../constants/server';
import axios from './Http';
import { CardProfile } from '../models/cardProfile.model';
import { GlobalContextType } from '../constants/enum';
import { hostWorker } from '../global';

export type RpcResponseDetail = {
  [key in ChainBackendNames]: RPCDetail;
};
export interface GlobalStateDef {
  rpcEndpoints?: RpcResponseDetail
  token?: string
  cardProfile?: CardProfile
  ibc?: boolean
}

export interface RPCDetail {
  primary: string
  otherUrls?: Record<string, string>
}

export const initialGlobalState: GlobalStateDef = {
  rpcEndpoints: {
    ARBITRUM: {
      primary: 'https://arb1.arbitrum.io/rpc'
    },
    AVALANCHE: {
      primary: 'https://rpc.ankr.com/avalanche'
    },
    BSC: {
      primary: 'https://rpc.ankr.com/bsc'
    },
    COSMOS: {
      otherUrls: {
        balance: 'https://lcd-cosmoshub.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations: 'https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards: 'https://lcd-cosmoshub.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings: 'https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators: 'https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED'
      },
      primary: 'https://rpc-cosmoshub-ia.cosmosia.notional.ventures/'
    },
    ETH: {
      primary: 'https://rpc.ankr.com/eth'
    },
    EVMOS: {
      otherUrls: {
        accountDetails: 'https://lcd-evmos.keplr.app/cosmos/auth/v1beta1/accounts/address',
        allValidators: 'https://lcd-evmos.keplr.app/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=1000',
        balance: 'https://rest.bd.evmos.org:1317/cosmos/bank/v1beta1/balances/address',
        delegatedValidatorInformation: 'https://goapi.evmos.org/ValidatorsByAddress/EVMOS/address',
        delegationInformation: 'https://lcd-evmos.keplr.app/cosmos/staking/v1beta1/delegations/address',
        reward: 'https://lcd-evmos.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        simulate: 'https://lcd-evmos.keplr.app/cosmos/tx/v1beta1/simulate',
        transact: 'https://lcd-evmos.keplr.app/cosmos/tx/v1beta1/txs',
        unboundings: 'https://lcd-evmos.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations'
      },
      primary: 'https://evmos-json-rpc.stakely.io'
    },
    FANTOM: {
      primary: 'https://rpc.ankr.com/fantom'
    },
    JUNO: {
      otherUrls: {
        balance: 'https://lcd-juno.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations: 'https://lcd-juno.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards: 'https://lcd-juno.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings: 'https://lcd-juno.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators: 'https://lcd-juno.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED'
      },
      primary: 'https://rpc-juno-ia.cosmosia.notional.ventures/'
    },
    OPTIMISM: {
      primary: 'https://opt-mainnet.g.alchemy.com/v2/_xYARKGN55iQpuX94lySfkcZ7GTW-a4C'
    },
    OSMOSIS: {
      otherUrls: {
        balance: 'https://lcd-osmosis.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations: 'https://lcd-osmosis.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards: 'https://lcd-osmosis.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings: 'https://lcd-osmosis.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators: 'https://lcd-osmosis.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED'
      },
      primary: 'https://rpc-osmosis.ecostake.com'
    },
    POLYGON: {
      primary: 'https://rpc.ankr.com/polygon'
    },
    STARGAZE: {
      otherUrls: {
        balance: 'https://lcd-stargaze.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations: 'https://lcd-stargaze.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards: 'https://lcd-stargaze.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings: 'https://lcd-stargaze.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators: 'https://lcd-stargaze.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED'
      },
      primary: 'https://rpc-stargaze-ia.cosmosia.notional.ventures/'
    }
  }
};

interface GlobalReducerInput {
  type: GlobalContextType.RPC_UPDATE | GlobalContextType.SIGN_IN | GlobalContextType.CARD_PROFILE | GlobalContextType.IBC
  rpc?: RpcResponseDetail
  sessionToken?: string
  cardProfile?: CardProfile
  ibc?: boolean
}

export const gloabalContextReducer = (state: GlobalStateDef, input: GlobalReducerInput): GlobalStateDef => {
  if (input) {
    const { type, rpc, sessionToken, cardProfile, ibc } = input;

    if (type === GlobalContextType.RPC_UPDATE && rpc) {
      return { ...state, rpcEndpoints: rpc };
    } else if (type === GlobalContextType.SIGN_IN) {
      return { ...state, token: sessionToken };
    } else if (type === GlobalContextType.CARD_PROFILE) {
      return { ...state, cardProfile };
    } else if (type === GlobalContextType.IBC) {
      return { ...state, ibc };
    }
  }
  return state;
};

export interface GlobalContextDef {
  globalState: GlobalStateDef
  globalDispatch: Dispatch<any>
}

export const GlobalContext = React.createContext<GlobalContextDef | null>(null);

export async function fetchRPCEndpointsFromServer (globalDispatch: Function) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const resultFromEndpoint = await axios.get<RpcResponseDetail>(`${ARCH_HOST}/v1/configuration/rpcEndpoints`);
  const result = resultFromEndpoint.data;
  globalDispatch({ type: GlobalContextType.RPC_UPDATE, rpc: result });
  return result;
}

export async function signIn (ethereum: { address: string, privateKey: string }) {
  const web3 = new Web3();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  try {
    const { data } = await axios.get(`${ARCH_HOST}/v1/authentication/sign-message/${ethereum.address}`);
    const verifyMessage = data.message;
    const { signature } = web3.eth.accounts.sign(verifyMessage, ethereum.privateKey);
    const result = await axios.post(`${ARCH_HOST}/v1/authentication/verify-message/${ethereum.address}`, {
      signature
    });
    return result.data.token;
  } catch (error) {
    Sentry.captureException(error);
  }
}
