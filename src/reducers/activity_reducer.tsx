import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { Dispatch } from 'react';
import { WebsiteInfo } from '../types/Browser';

export enum ActivityStatus {
  SUCCESS,
  PENDING,
  FAILED,
  INPROCESS,
  DELAYED
}

export enum ActivityType {
  SEND = 'send',
  BRIDGE = 'bridge',
  SWAP = 'swap',
  STAKE = 'stake',
  CARD = 'card',
  IBC = 'ibc',
  BROWSER = 'browser',
  WALLETCONNECT = 'walletconnect',
  SARDINEPAY = 'sardinepay',
  ONMETA = 'onmeta',
}

export interface BrowserTransaction {
  id: string
  status: ActivityStatus
  type: ActivityType
  transactionHash: string
  fromAddress: string
  toAddress: string
  websiteInfo: WebsiteInfo
  chainName: string
  symbol: string
  datetime: Date
  amount: string
  reason?: string
}
export interface WalletConnectTransaction {
  id: string
  status: ActivityStatus
  type: ActivityType
  transactionHash: string
  fromAddress: string
  toAddress: string
  websiteInfo: WebsiteInfo
  chainName: string
  symbol: string
  datetime: Date
  amount: string
  reason?: string
}
export interface SendTransactionActivity {
  id: string
  status: ActivityStatus
  type: ActivityType
  transactionHash: string
  fromAddress: string
  toAddress: string
  amount: string
  chainName: string
  symbol: string
  logoUrl: number
  datetime: Date
  gasAmount?: string
  tokenName: string
  tokenLogo: string
  reason?: string
}

export interface BridgeTransaction {
  id: string
  status: ActivityStatus
  type: ActivityType
  transactionHash: string
  quoteId: string
  fromChain: string
  toChain: string
  fromToken: string
  toToken: string
  fromSymbol: string
  toSymbol: string
  fromTokenLogoUrl: string
  toTokenLogoUrl: string
  fromTokenAmount: string
  toTokenAmount: string
  datetime: Date
  quoteData?: any
  reason?: string
  delayDuration?: string
}

export interface DebitCardTransaction {
  id: string
  status: ActivityStatus
  type: ActivityType
  transactionHash: string
  quoteId: string
  chainName: string
  tokenSymbol: any
  tokenName: any
  amount: any
  amountInUsd: any
  datetime: Date
  gasAmount?: any
  reason?: string
}

export interface SardinePayTransaction {
  id: string
  status: ActivityStatus
  type: ActivityType
  orderId?: string
  quoteId?: string
  tradeId?: string
  chainName: string
  tokenSymbol: any
  tokenName: any
  amount: any
  amountInUsd: any
  datetime: Date
  gasAmount?: any
  reason?: string
}

export interface OnmetaTransaction {
  id: string
  status: ActivityStatus
  type: ActivityType
  transactionHash: string
  fromAddress: string
  toAddress: string
  onmetaType: string
  chainName: string
  symbol: string
  datetime: Date
  amount: string
  reason?: string
}

export interface IBCTransaction {
  id: string
  status: ActivityStatus
  type: ActivityType
  transactionHash: string
  receiverAddress: string
  token: string
  fromChain: string
  toChain: string
  symbol: string
  fromChainLogoUrl: string
  toChainLogoUrl: string
  tokenLogoUrl: string
  amount: string
  datetime: Date
  reason?: string
}

export type ActivityAny = SendTransactionActivity | BridgeTransaction | DebitCardTransaction | IBCTransaction | BrowserTransaction | SardinePayTransaction | OnmetaTransaction;

export interface ActivityState {
  activityObjects: [ActivityAny?]
  lastVisited: Date
}

export interface ActivityContextDef {
  state: ActivityState
  dispatch: Dispatch<any>
}

export const initialActivityState: ActivityState = {
  activityObjects: [],
  lastVisited: new Date()
};

function synchronizeStorage (state: ActivityState) {
  AsyncStorage.setItem('activities', JSON.stringify(state))
    .catch(e => Sentry.captureException(e));
}

export enum ActivityReducerAction {
  LOAD,
  POST,
  PATCH,
  DELETE,
  UPDATEVISITED,
  RESET
}

// reducers
export function ActivityStateReducer (state: any, action: any): any {
  switch (action.type) {
    case ActivityReducerAction.LOAD : {
      const re = action.value;
      synchronizeStorage(re);
      return re;
    }
    case ActivityReducerAction.POST : {
      const re = { ...state, activityObjects: [...state.activityObjects, action.value] };
      synchronizeStorage(re);
      return re;
    }
    case ActivityReducerAction.PATCH : {
      const { id, status, quoteId, transactionHash, gasAmount, reason, delayDuration, quoteData } = action.value;
      const re = {
        ...state,
        activityObjects: state.activityObjects.map((activity: ActivityAny) => activity.id === id
          ? {
              ...activity,
              status: status ?? activity.status,
              quoteId: quoteId ?? activity.quoteId,
              transactionHash: transactionHash ?? activity.transactionHash,
              gasAmount: gasAmount ?? activity.gasAmount,
              reason: reason ?? activity.reason,
              delayDuration: delayDuration ?? activity.delayDuration,
              quoteData: quoteData
                ? { ...quoteData }
                : {
                    ...activity
                      .quoteData
                  }
            }
          : activity
        )
      };
      synchronizeStorage(re);
      return re;
    }
    case ActivityReducerAction.DELETE: {
      const { id } = action.value;
      const res = {
        ...state,
        activityObjects: state.activityObjects.filter((activity: ActivityAny) => activity.id !== id)
      };
      synchronizeStorage(res);
      return res;
    }
    case ActivityReducerAction.UPDATEVISITED: {
      const res = {
        ...state,
        lastVisited: action.value.lastVisited
      };
      synchronizeStorage(res);
      return res;
    }
    case ActivityReducerAction.RESET: {
      return { ...initialActivityState };
    }
    default:
      return { activityObjects: [...state.activityObjects, action.value] };
  }
}
