/* eslint-disable array-callback-return */
import React, { type Dispatch } from 'react';
import Web3 from 'web3';
import * as Sentry from '@sentry/react-native';
import { ChainBackendNames } from '../constants/server';
import axios from './Http';
import { CardProfile } from '../models/cardProfile.model';
import {
  GlobalContextType,
  RPCPreference,
  SignMessageValidationType,
} from '../constants/enum';
import { hostWorker } from '../global';
import {
  getRpcEndpoints,
  getRpcPreference,
  setRpcEndpoints,
} from './asyncStorage';
import { get } from 'lodash';
import jwt_decode, { JwtPayload } from 'jwt-decode';

export type RpcResponseDetail = {
  [key in ChainBackendNames]: RPCDetail;
};
export interface GlobalStateDef {
  rpcEndpoints?: RpcResponseDetail;
  token?: string;
  cardProfile?: CardProfile;
  ibc?: boolean;
}

export interface RPCDetail {
  primary: string;
  otherUrls?: Record<string, string>;
}

export const initialGlobalState: GlobalStateDef = {
  rpcEndpoints: {
    ARBITRUM: {
      primary: 'https://arb1.arbitrum.io/rpc',
    },
    AVALANCHE: {
      primary: 'https://rpc.ankr.com/avalanche',
    },
    BSC: {
      primary: 'https://rpc.ankr.com/bsc',
    },
    COSMOS: {
      otherUrls: {
        balance:
          'https://lcd-cosmoshub.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations:
          'https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards:
          'https://lcd-cosmoshub.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings:
          'https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators:
          'https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED',
      },
      primary: 'https://rpc-cosmoshub-ia.cosmosia.notional.ventures/',
    },
    ETH: {
      primary: 'https://rpc.ankr.com/eth',
    },
    EVMOS: {
      otherUrls: {
        accountDetails:
          'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/auth/v1beta1/accounts/address',
        allValidators:
          'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=1000',
        balance:
          'https://rest.bd.evmos.org:1317/cosmos/bank/v1beta1/balances/address',
        delegationInformation:
          'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/staking/v1beta1/delegations/address',
        reward:
          'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/distribution/v1beta1/delegators/address/rewards',
        simulate:
          'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/tx/v1beta1/simulate',
        transact:
          'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/tx/v1beta1/txs',
        unboundings:
          'https://api-evmos-ia.cosmosia.notional.ventures/cosmos/staking/v1beta1/delegators/address/unbonding_delegations',
      },
      primary: 'https://evmos-json-rpc.stakely.io',
    },
    FANTOM: {
      primary: 'https://rpc.ankr.com/fantom',
    },
    JUNO: {
      otherUrls: {
        balance:
          'https://lcd-juno.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations:
          'https://lcd-juno.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards:
          'https://lcd-juno.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings:
          'https://lcd-juno.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators:
          'https://lcd-juno.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED',
      },
      primary: 'https://rpc-juno-ia.cosmosia.notional.ventures/',
    },
    OPTIMISM: {
      primary:
        'https://opt-mainnet.g.alchemy.com/v2/_xYARKGN55iQpuX94lySfkcZ7GTW-a4C',
    },
    OSMOSIS: {
      otherUrls: {
        balance:
          'https://lcd-osmosis.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations:
          'https://lcd-osmosis.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards:
          'https://lcd-osmosis.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings:
          'https://lcd-osmosis.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators:
          'https://lcd-osmosis.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED',
      },
      primary: 'https://rpc-osmosis.ecostake.com',
    },
    POLYGON: {
      primary: 'https://rpc.ankr.com/polygon',
    },
    SHARDEUM: {
      primary: 'https://dapps.shardeum.org/',
    },
    SHARDEUM_SPHINX: {
      primary: 'https://sphinx.shardeum.org/',
    },
    ZKSYNC_ERA: {
      primary: 'https://mainnet.era.zksync.io',
    },
    BASE: {
      primary: 'https://1rpc.io/base',
    },
    POLYGON_ZKEVM: {
      primary: 'https://rpc.ankr.com/polygon_zkevm',
    },
    STARGAZE: {
      otherUrls: {
        balance:
          'https://lcd-stargaze.keplr.app/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations:
          'https://lcd-stargaze.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards:
          'https://lcd-stargaze.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings:
          'https://lcd-stargaze.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators:
          'https://lcd-stargaze.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED',
      },
      primary: 'https://rpc-stargaze-ia.cosmosia.notional.ventures/',
    },
    NOBLE: {
      otherUrls: {
        balance:
          'https://lcd-noble.cosmostation.io/cosmos/bank/v1beta1/balances/address?pagination.limit=1000',
        delegations:
          'https://lcd-noble.keplr.app/cosmos/staking/v1beta1/delegations/address?pagination.limit=1000',
        rewards:
          'https://lcd-noble.keplr.app/cosmos/distribution/v1beta1/delegators/address/rewards',
        unBoundings:
          'https://lcd-noble.keplr.app/cosmos/staking/v1beta1/delegators/address/unbonding_delegations?pagination.limit=1000',
        validators:
          'https://lcd-noble.keplr.app/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED',
      },
      primary: 'https://noble-rpc.polkachu.com',
    },
  },
};

interface GlobalReducerInput {
  type:
    | GlobalContextType.RPC_UPDATE
    | GlobalContextType.SIGN_IN
    | GlobalContextType.CARD_PROFILE
    | GlobalContextType.IBC;
  rpc?: RpcResponseDetail;
  sessionToken?: string;
  cardProfile?: CardProfile;
  ibc?: boolean;
}

export const gloabalContextReducer = (
  state: GlobalStateDef,
  input: GlobalReducerInput,
): GlobalStateDef => {
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
  globalState: GlobalStateDef;
  globalDispatch: Dispatch<any>;
}

export const GlobalContext = React.createContext<GlobalContextDef | null>(null);

const checkAndMaintainUpdatedRPCEndpointsInAsync = async (
  rpcEndpoints: RpcResponseDetail,
) => {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const resultFromEndpoint = await axios.get<RpcResponseDetail>(
    `${ARCH_HOST}/v1/configuration/rpcEndpoints`,
  );
  const updatedEndpoints = {};
  const availableChains = Object.keys(resultFromEndpoint.data);
  availableChains.map(async (chain) => {
    if (get(resultFromEndpoint.data, chain) && get(rpcEndpoints, chain)) {
      Object.assign(updatedEndpoints, { [chain]: get(rpcEndpoints, chain) });
    } else if (
      get(resultFromEndpoint.data, chain) &&
      !get(rpcEndpoints, chain) &&
      initialGlobalState?.rpcEndpoints &&
      get(initialGlobalState.rpcEndpoints, chain)
    ) {
      Object.assign(updatedEndpoints, {
        [chain]: get(initialGlobalState.rpcEndpoints, chain),
      });
    }
    await setRpcEndpoints(JSON.stringify(updatedEndpoints));
  });
  return updatedEndpoints;
};

export async function fetchRPCEndpointsFromServer(globalDispatch: Function) {
  const rpcPreference: string = RPCPreference.DEFAULT;
  // const rpcPreferenceFromAsync = await getRpcPreference();
  // if (rpcPreferenceFromAsync && rpcPreferenceFromAsync !== '') {
  //   rpcPreference = rpcPreferenceFromAsync;
  // }
  let result;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const RPCFromAsync = await getRpcEndpoints();
  if (
    RPCFromAsync &&
    RPCFromAsync !== '' &&
    rpcPreference === RPCPreference.OVERIDDEN
  ) {
    const updatedRPCFromAsync =
      await checkAndMaintainUpdatedRPCEndpointsInAsync(
        JSON.parse(RPCFromAsync),
      );
    result = updatedRPCFromAsync;
  } else {
    const resultFromEndpoint = await axios.get<RpcResponseDetail>(
      `${ARCH_HOST}/v1/configuration/rpcEndpoints`,
    );
    result = resultFromEndpoint.data;
  }

  globalDispatch({ type: GlobalContextType.RPC_UPDATE, rpc: result });
  return result;
}

const isValidMessage = (address: string, messageToBeValidated: string) => {
  const messageToBeValidatedWith =
    /^Cypher Wallet wants you to sign in with your Ethereum account: \nAddress: 0x[a-fA-F0-9]{40} \n\nBy signing this transaction you are allowing Cypher Wallet to see the following: \n\nYour wallet address: 0x[a-fA-F0-9]{40} \nSessionId: [0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12} \nVersion: 1.0 \n\nPlease sign this message to authenticate. \nThis is a proof that you own this account. \nThis will not consume any gas.$/i;
  const currentVersion = '1.0';
  const versionSubstring = messageToBeValidated
    .match(/Version: (.*)[^\\n]/g)
    ?.join('');
  const expectedVersion = versionSubstring
    ?.match(/[^Version: ](.*)[^\\n]/g)
    ?.join('')
    .trim();
  if (messageToBeValidatedWith.test(messageToBeValidated)) {
    return { message: SignMessageValidationType.VALID };
  } else {
    if (currentVersion !== expectedVersion) {
      return { message: SignMessageValidationType.NEEDS_UPDATE };
    } else {
      return { message: SignMessageValidationType.INVALID };
    }
  }
};

export function isTokenValid(token: any) {
  if (token) {
    const jwtInfo = jwt_decode<JwtPayload>(token);
    if (jwtInfo.exp && Date.now() >= jwtInfo.exp * 1000) {
      return false;
    }
    return true;
  }
  return false;
}
export async function signIn(ethereum: {
  address: string;
  privateKey: string;
}) {
  const web3 = new Web3();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  try {
    const { data } = await axios.get(
      `${ARCH_HOST}/v1/authentication/sign-message/${ethereum.address}`,
    );
    const verifyMessage = data.message;
    const validationResponse = isValidMessage(ethereum.address, verifyMessage);
    if (validationResponse.message === SignMessageValidationType.VALID) {
      const { signature } = web3.eth.accounts.sign(
        verifyMessage,
        ethereum.privateKey,
      );
      const result = await axios.post(
        `${ARCH_HOST}/v1/authentication/verify-message/${ethereum.address}`,
        {
          signature,
        },
      );
      return { ...validationResponse, token: result.data.token };
    }
    return validationResponse;
  } catch (error) {
    Sentry.captureException(error);
  }
}
