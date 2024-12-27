import { createContext, Dispatch } from 'react';

export const ModalContext = createContext<any>(null);

export interface ModalParams {
  visible: boolean;
  payload: null | {
    params: any;
    resolve: any;
    reject: any;
  };
}

export interface ModalContextDef {
  modalState: Record<string, ModalParams>;
  modalDispatch: Dispatch<any>;
}

export enum BrowserModal {
  PushPermissionMoal = 'PushPermissionModal',
  SignTransactionModal = 'SignTransactionModal',
  SendTransactionModal = 'SendTransactionModal',
  ChooseChainModal = 'ChooseChainModal',
  SignTransactionCosmos = 'SignTransactionCosmos',
}

export const modalContextInitialState: Record<string, ModalParams> = {
  PushPermissionModal: {
    visible: false,
    payload: null,
  },
  SignTransactionModal: {
    visible: false,
    payload: null,
  },
  SendTransactionModal: {
    visible: false,
    payload: null,
  },
  ChooseChainModal: {
    visible: false,
    payload: null,
  },
  SignTransactionCosmos: {
    visible: false,
    payload: null,
  },
};

export enum ModalReducerAction {
  UPDATE_PARAMS = 'update_params',
  UPDATE_VISIBILITY = 'update_visibility',
}

export const modalReducer = (state: any, action: any) => {
  switch (action.type) {
    case ModalReducerAction.UPDATE_PARAMS: {
      const {
        value: { payload, visible, modal },
      } = action;
      return {
        ...state,
        [modal]: {
          visible,
          payload,
        },
      };
    }
    case ModalReducerAction.UPDATE_VISIBILITY: {
      const {
        value: { modal },
      } = action;
      return {
        ...state,
        [modal]: {
          visible: false,
          payload: null,
        },
      };
    }
  }
};
