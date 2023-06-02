import { BrowserModal, ModalReducerAction } from '../../reducers/modalReducer';

const DispatchFunc = async (Cxt: any, params: any, modal: BrowserModal): Promise<any> => {
  const re = await new Promise((resolve, reject) => {
    Cxt.dispatch({
      type: ModalReducerAction.UPDATE_PARAMS,
      value: {
        modal,
        visible: true,
        payload: {
          params,
          resolve,
          reject
        }
      }
    });
  });

  Cxt.dispatch({
    type: ModalReducerAction.UPDATE_VISIBILITY,
    value: { modal }
  });

  return re;
};

export const ChooseChainModalFunc = async (Cxt: any, params: any) => {
  return await DispatchFunc(Cxt, params, BrowserModal.ChooseChainModal);
};

export const SignTransactionModalFunc = async (Cxt: any, params: any) => {
  return await DispatchFunc(Cxt, params, BrowserModal.SignTransactionModal);
};

export const PushModalFunc = async (Cxt: any, params: any) => {
  return await DispatchFunc(Cxt, params, BrowserModal.PushPermissionMoal);
};

export const SendTransactionModalFunc = async (Cxt: any, params: any) => {
  return await DispatchFunc(Cxt, params, BrowserModal.SendTransactionModal);
};

export const SendTransactionCosmosFunc = async (Cxt: any, params: any) => {
  return await DispatchFunc(Cxt, params, BrowserModal.SignTransactionCosmos);
};
