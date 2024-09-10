import jwt_decode, { JwtPayload } from 'jwt-decode';
import React, { type Dispatch } from 'react';
import { GlobalContextType } from '../constants/enum';
import { ChainBackendNames } from '../constants/server';
import { CardProfile } from '../models/cardProfile.model';
import { IPlanData } from '../models/planData.interface';

export type RpcResponseDetail = {
  [key in ChainBackendNames]: RPCDetail;
};
export interface GlobalStateDef {
  rpcEndpoints?: RpcResponseDetail;
  token: string;
  cardProfile?: CardProfile;
  ibc?: boolean;
  isAuthenticated?: boolean;
  planInfo: IPlanData;
}

export interface RPCDetail {
  primary: string;
  secondaryList?: string;
  otherUrls?: Record<string, string>;
}

export const initialGlobalState: GlobalStateDef = {
  rpcEndpoints: {
    ALL: {
      primary: '',
    },
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
      primary: 'https://cosmos-rpc.polkachu.com/',
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
          'https://evmos-api.lavenderfive.com:443/cosmos/bank/v1beta1/balances/address',
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
    AURORA: {
      primary: 'https://1rpc.io/aurora',
    },
    MOONBEAM: {
      primary: 'https://rpc.ankr.com/moonbeam',
    },
    MOONRIVER: {
      primary: 'https://moonriver.publicnode.com',
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
    COREUM: {
      primary: 'https://coreum-rpc.publicnode.com:443',
      secondaryList: 'https://rpc.m.core.solonation.io',
    },
    INJECTIVE: {
      primary: 'https://rpc-injective.keplr.app',
      secondaryList: 'https://rpc-injective.keplr.app',
    },
    KUJIRA: {
      primary: 'https://rpc-kujira-ia.cosmosia.notional.ventures/',
      secondaryList: 'https://rpc-kujira.whispernode.com:443',
    },
    SOLANA: {
      primary: 'https://api.mainnet-beta.solana.com',
      secondaryList: 'https://api.mainnet-beta.solana.com',
    },
  },
  token: '',
  isAuthenticated: false,
  planInfo: {
    default: {
      basic_plan_v1: {
        usdcFee: 0.5,
        nonUsdcFee: 0.5,
        fxFeePc: 1.4,
        physicalCardFee: 50,
        chargeBackLimit: 0,
        cost: 0,
      },
      pro_plan_v1: {
        usdcFee: 0,
        nonUsdcFee: 0.25,
        fxFeePc: 0.5,
        physicalCardFee: 0,
        chargeBackLimit: 300,
        cost: 200,
      },
    },
    custom: {},
  },
};

interface GlobalReducerInput {
  type:
    | GlobalContextType.RPC_UPDATE
    | GlobalContextType.SIGN_IN
    | GlobalContextType.CARD_PROFILE
    | GlobalContextType.IS_APP_AUTHENTICATED
    | GlobalContextType.PLAN_INFO
    | GlobalContextType.IBC;
  rpc?: RpcResponseDetail;
  sessionToken?: string;
  cardProfile?: CardProfile;
  ibc?: boolean;
  isAuthenticated?: boolean;
  planInfo?: IPlanData;
}

export const gloabalContextReducer = (
  state: GlobalStateDef,
  input: GlobalReducerInput,
): GlobalStateDef => {
  if (input) {
    const {
      type,
      rpc,
      sessionToken,
      cardProfile,
      ibc,
      isAuthenticated,
      planInfo,
    } = input;

    if (type === GlobalContextType.RPC_UPDATE && rpc) {
      return { ...state, rpcEndpoints: rpc };
    } else if (type === GlobalContextType.SIGN_IN) {
      return { ...state, token: sessionToken ?? '' };
    } else if (type === GlobalContextType.CARD_PROFILE) {
      return { ...state, cardProfile };
    } else if (type === GlobalContextType.IBC) {
      return { ...state, ibc };
    } else if (type === GlobalContextType.IS_APP_AUTHENTICATED) {
      return { ...state, isAuthenticated };
    } else if (type === GlobalContextType.PLAN_INFO) {
      return { ...state, planInfo: planInfo ?? initialGlobalState.planInfo };
    }
  }
  return state;
};

export interface GlobalContextDef {
  globalState: GlobalStateDef;
  globalDispatch: Dispatch<any>;
}

export const GlobalContext = React.createContext<GlobalContextDef | null>(null);

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
