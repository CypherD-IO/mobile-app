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
  restEndpoint?: string;
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
      primary: 'https://cosmos-rpc.polkachu.com/',
      restEndpoint: 'https://cosmos-lcd.quickapi.com:443',
    },
    ETH: {
      primary: 'https://rpc.ankr.com/eth',
    },
    OPTIMISM: {
      primary:
        'https://opt-mainnet.g.alchemy.com/v2/_xYARKGN55iQpuX94lySfkcZ7GTW-a4C',
    },
    OSMOSIS: {
      primary: 'https://rpc-osmosis.ecostake.com',
      restEndpoint: 'https://lcd.osmosis.zone/',
    },
    POLYGON: {
      primary: 'https://rpc.ankr.com/polygon',
    },
    ZKSYNC_ERA: {
      primary: 'https://mainnet.era.zksync.io',
    },
    BASE: {
      primary: 'https://1rpc.io/base',
    },
    NOBLE: {
      primary: 'https://noble-rpc.polkachu.com',
      restEndpoint: 'https://noble-api.polkachu.com',
    },
    COREUM: {
      primary: 'https://coreum-rpc.publicnode.com:443',
      secondaryList: 'https://rpc.m.core.solonation.io',
      restEndpoint: 'https://coreum-rest.publicnode.com',
    },
    INJECTIVE: {
      primary: 'https://rpc-injective.keplr.app',
      secondaryList: 'https://rpc-injective.keplr.app',
      restEndpoint:
        'https://injective-1-public-rest.mesa.ec1-prod.newmetric.xyz',
    },
    KUJIRA: {
      primary: 'https://rpc-kujira-ia.cosmosia.notional.ventures/',
      secondaryList: 'https://rpc-kujira.whispernode.com:443',
      restEndpoint: 'https://lcd-kujira.whispernode.com:443',
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
        nonUsdcFee: 1,
        fxFeePc: 1.5,
        physicalCardFee: 50,
        chargeBackLimit: 0,
        cost: 0,
        dailyLimit: 2000,
        monthlyLimit: 7000,
        atmFee: 3,
        maxPhysicalCards: 1,
        extraPhysicalCardFee: 50,
        extraVirtualCardFee: 10,
      },
      pro_plan_v1: {
        usdcFee: 0,
        nonUsdcFee: 0.5,
        fxFeePc: 0.5,
        physicalCardFee: 0,
        chargeBackLimit: 300,
        cost: 199,
        dailyLimit: 5000,
        monthlyLimit: 20000,
        atmFee: 3,
        maxPhysicalCards: 4, // 1 + 3 physical cards
        extraPhysicalCardFee: 50, // fee for any kind of extra physical card
        extraVirtualCardFee: 10, // fee for any kind of extra virtual card
      },
    },
    custom: {},
  },
  cardProfile: undefined,
};

interface GlobalReducerInput {
  type:
    | GlobalContextType.RPC_UPDATE
    | GlobalContextType.SIGN_IN
    | GlobalContextType.CARD_PROFILE
    | GlobalContextType.IS_APP_AUTHENTICATED
    | GlobalContextType.PLAN_INFO
    | GlobalContextType.IBC
    | GlobalContextType.RESET_GLOBAL_STATE;
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
    } else if (type === GlobalContextType.RESET_GLOBAL_STATE) {
      return initialGlobalState;
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
