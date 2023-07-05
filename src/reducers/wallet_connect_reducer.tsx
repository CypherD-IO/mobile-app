/* eslint-disable no-case-declarations */
import WalletConnect from '@walletconnect/client';
import { isEqual } from 'lodash';
import { createContext, Dispatch } from 'react';

export interface IdAppInfo{
  version?: string
  topic?: any
  chainId: number
  description: string
  name: string
  icons: string[]
  url: string
  sessionTopic?: string
}

export interface IWalletConnect{
  connectors: WalletConnect[]
  dAppInfo: IdAppInfo[]
  itemsAdded: boolean
}

export interface walletConnectContextDef {
  walletConnectState: IWalletConnect
  walletConnectDispatch: Dispatch<any>
}

export const walletConnectInitialState: IWalletConnect = { connectors: [], dAppInfo: [], itemsAdded: false };

export const WalletConnectContext = createContext(null);

export const WalletConnectActions = {
  ADD_CONNECTOR: 'ADD_CONNECTOR',
  ADD_DAPP_INFO: 'ADD_DAPP_INFO',
  DELETE_CONNECTOR: 'DELETE_CONNECTOR',
  UPDATE_DAPP_INFO: 'UPDATE_DAPP_INFO',
  DELETE_DAPP_INFO: 'DELETE_DAPP_INFO',
  WALLET_CONNECT_TRIGGER_REFRESH: 'WALLET_CONNECT_TRIGGER_REFRESH',
  RESTORE_SESSION: 'RESTORE_SESSION',
  REMOVE_WALLETCONNECT_2_CONNECTION: 'REMOVE_WALLETCONNECT_2_CONNECTION',
  RESTORE_INITIAL_STATE: 'RESTORE_INITIAL_STATE'
};

export const walletConnectReducer = (state, action) => {
  switch (action.type) {
    case WalletConnectActions.ADD_CONNECTOR:
      const connectors = [...state.connectors, action.value];
      return { ...state, connectors, itemsAdded: true };
    case WalletConnectActions.ADD_DAPP_INFO:
      const dAppInfo = [...state.dAppInfo, action.value];
      return { ...state, dAppInfo, itemsAdded: true };
    case WalletConnectActions.DELETE_CONNECTOR:
      const noOfConnectors = state.connectors.length;
      const newConnectors = state.connectors.filter((element, key) => {
        if (key !== noOfConnectors - 1) {
          return element;
        }
      });
      return { ...state, connectors: newConnectors, itemsAdded: false };
    case WalletConnectActions.DELETE_DAPP_INFO:
      const key = state.connectors.findIndex((connector) => isEqual(connector, action.value.connector));
      const nConnectors = state.connectors.filter((element, index) => {
        if (index !== key) {
          return element;
        }
      });
      const ndAppInfo = state.dAppInfo.filter((element, index) => {
        if (index !== key) {
          return element;
        }
      });
      return { ...state, dAppInfo: ndAppInfo, connectors: nConnectors, itemsAdded: false };

    case WalletConnectActions.REMOVE_WALLETCONNECT_2_CONNECTION:
      if (state.dAppInfo?.length > 0) {
        const [connection] = state?.dAppInfo.filter((connectionObj) => connectionObj?.sessionTopic === action.value.topic);
        if (connection) {
          const key = state.connectors.findIndex((connector) => isEqual(connector, connection));
          const nConnectors = state.connectors.filter((element, index) => {
            if (index !== key) {
              return element;
            }
          });
          const ndAppInfo = state.dAppInfo.filter((element, index) => {
            if (index !== key) {
              return element;
            }
          });
          return { ...state, dAppInfo: ndAppInfo, connectors: nConnectors, itemsAdded: false };
        }
      }
      return { ...state, dAppInfo: ndAppInfo, connectors: nConnectors, itemsAdded: false };

    case WalletConnectActions.UPDATE_DAPP_INFO:
      const idKey = state.dAppInfo.indexOf(action.value.oldInfo);
      const newDAppInfo = state.dAppInfo.map((element, index) => {
        if (index !== idKey) {
          return element;
        } else {
          return action.value.newInfo;
        }
      });
      return { ...state, dAppInfo: newDAppInfo, itemsAdded: false };

    case WalletConnectActions.RESTORE_SESSION:
      return { ...state, dAppInfo: action.value.dAppInfo, connectors: action.value.connectors, itemsAdded: true };

    case WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH:
      return { ...state };

    case WalletConnectActions.RESTORE_INITIAL_STATE:
      return walletConnectInitialState;
  }
};
