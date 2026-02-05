import jwt_decode, { JwtPayload } from 'jwt-decode';
import React, { type Dispatch } from 'react';
import { GlobalContextType } from '../constants/enum';
import { ChainBackendNames } from '../constants/server';
import { CardProfile } from '../models/cardProfile.model';

export type RpcResponseDetail = {
  [key in ChainBackendNames]: RPCDetail;
};
export interface GlobalStateDef {
  rpcEndpoints?: RpcResponseDetail;
  token: string;
  cardProfile?: CardProfile;
  ibc?: boolean;
  isAuthenticated?: boolean;
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
    SOLANA: {
      primary: 'https://api.mainnet-beta.solana.com',
      secondaryList: 'https://api.mainnet-beta.solana.com',
    },
    HYPERLIQUID: {
      primary: 'https://rpc.hyperliquid.xyz',
    },
    BASE_SEPOLIA: {
      primary: 'https://base-sepolia-rpc.publicnode.com',
    },
  },
  token: '',
  isAuthenticated: false,
  cardProfile: undefined,
};

interface GlobalReducerInput {
  type:
    | GlobalContextType.RPC_UPDATE
    | GlobalContextType.SIGN_IN
    | GlobalContextType.CARD_PROFILE
    | GlobalContextType.IS_APP_AUTHENTICATED
    | GlobalContextType.IBC
    | GlobalContextType.RESET_GLOBAL_STATE;
  rpc?: RpcResponseDetail;
  sessionToken?: string;
  cardProfile?: CardProfile;
  ibc?: boolean;
  isAuthenticated?: boolean;
}

export const gloabalContextReducer = (
  state: GlobalStateDef,
  input: GlobalReducerInput,
): GlobalStateDef => {
  if (input) {
    const { type, rpc, sessionToken, cardProfile, ibc, isAuthenticated } =
      input;

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
    try {
      const jwtInfo = jwt_decode<JwtPayload>(token);
      const isExpired = jwtInfo.exp && Date.now() >= jwtInfo.exp * 1000;

      if (isExpired) {
        return false;
      }
      return true;
    } catch (e: any) {
      console.error('isTokenValid: Error decoding token:', e?.message);
      return false;
    }
  }
  return false;
}
