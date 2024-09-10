import React, { Dispatch } from 'react';
import { SkipApiChainInterface } from '../models/skipApiChains.interface';
import { SkipApiToken } from '../models/skipApiTokens.interface';
import { OdosToken } from '../models/odosTokens.interface';

export enum BridgeStatus {
  FETCHING = 'FETCHING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum BridgeReducerAction {
  FETCHING = 'FETCHING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

type BridgeAction =
  | {
      type: BridgeReducerAction.SUCCESS;
      payload: {
        odosChainData: number[];
        odosTokenData: Record<string, OdosToken[]>;
        skipApiChaindata: SkipApiChainInterface[];
        skipApiTokenData: Record<string, SkipApiToken[]>;
      };
    }
  | { type: BridgeReducerAction.FETCHING; payload: null | undefined }
  | { type: BridgeReducerAction.ERROR; payload: null | undefined };

export interface BridgeState {
  status: BridgeStatus;
  odosChainData: number[];
  odosTokenData: Record<string, OdosToken[]>;
  skipApiChaindata: SkipApiChainInterface[];
  skipApiTokenData: Record<string, SkipApiToken[]>;
}

export interface BridgeContextDef {
  state: BridgeState;
  dispatch: Dispatch<any>;
}

export const bridgeContextInitialState = {
  status: BridgeStatus.FETCHING,
  odosChainData: [],
  odosTokenData: {},
  skipApiChaindata: [],
  skipApiTokenData: {},
};

export function bridgeReducer(
  state: BridgeState,
  action: BridgeAction,
): BridgeState {
  switch (action.type) {
    case BridgeReducerAction.SUCCESS: {
      return {
        ...state,
        status: BridgeStatus.SUCCESS,
        odosChainData: action.payload.odosChainData,
        odosTokenData: action.payload.odosTokenData,
        skipApiChaindata: action.payload.skipApiChaindata,
        skipApiTokenData: action.payload.skipApiTokenData,
      };
    }
    case BridgeReducerAction.FETCHING: {
      return {
        ...state,
        status: BridgeStatus.FETCHING,
      };
    }
    case BridgeReducerAction.ERROR: {
      return {
        ...state,
        status: BridgeStatus.ERROR,
        odosChainData: bridgeContextInitialState.odosChainData,
        odosTokenData: bridgeContextInitialState.odosTokenData,
        skipApiChaindata: bridgeContextInitialState.skipApiChaindata,
        skipApiTokenData: bridgeContextInitialState.skipApiTokenData,
      };
    }
    default:
      return state;
  }
}

export const BridgeContext = React.createContext<BridgeContextDef | null>(null);
