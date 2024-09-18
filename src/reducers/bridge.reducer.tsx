import React, { Dispatch } from 'react';
import { SwapBridgeChainData, SwapBridgeTokenData } from '../containers/Bridge';

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
        tokenData?: Record<string, SwapBridgeTokenData[]>;
        chainData?: SwapBridgeChainData[];
      };
    }
  | { type: BridgeReducerAction.FETCHING; payload: null | undefined }
  | { type: BridgeReducerAction.ERROR; payload: null | undefined };

export interface BridgeState {
  status: BridgeStatus;
  tokenData: Record<string, SwapBridgeTokenData[]>;
  chainData: SwapBridgeChainData[];
}

export interface BridgeContextDef {
  state: BridgeState;
  dispatch: Dispatch<any>;
}

export const bridgeContextInitialState = {
  status: BridgeStatus.FETCHING,
  tokenData: {},
  chainData: [],
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
        chainData: action.payload.chainData,
        tokenData: action.payload.tokenData,
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
        chainData: bridgeContextInitialState.chainData,
        tokenData: bridgeContextInitialState.tokenData,
      };
    }
    default:
      return state;
  }
}

export const BridgeContext = React.createContext<BridgeContextDef | null>(null);
