import { useContext } from 'react';
import { Web3Origin } from '../../constants/enum';
import { Web3Method } from '../../constants/web3';
import { AnalyticEvent, logAnalytics } from '../../core/analytics';
import { ActivityContext } from '../../core/util';
import { ActivityContextDef, ActivityReducerAction, BrowserTransaction, WalletConnectTransaction } from '../../reducers/activity_reducer';

export default function useWeb3Callbacks (origin: Web3Origin) {
  const activityContext = useContext(ActivityContext) as ActivityContextDef;

  const browserCallbacks = (callbackData: any) => {
    const { method } = callbackData.payload;
    switch (method) {
      case Web3Method.SEND_TRANSACTION: {
        const { activityData, receipt } = callbackData;
        activityContext.dispatch({ type: ActivityReducerAction.POST, value: activityData as BrowserTransaction });
        logAnalytics(AnalyticEvent.TRANSACTION_RECEIPT_RECEIVED, {
          origin,
          ...receipt
        });
        break;
      }
    }
  };

  const walletConnectCallbacks = (callbackData: any) => {
    const { method } = callbackData.payload;
    switch (method) {
      case Web3Method.SEND_TRANSACTION: {
        const { activityData, receipt } = callbackData;
        activityContext.dispatch({ type: ActivityReducerAction.POST, value: activityData as WalletConnectTransaction });
        logAnalytics(AnalyticEvent.TRANSACTION_RECEIPT_RECEIVED, {
          origin,
          ...receipt
        });
        break;
      }
    }
  };

  const onMetaCallbacks = (callbackData: any) => {};

  switch (origin) {
    case Web3Origin.BROWSER:
      return browserCallbacks;
    case Web3Origin.WALLETCONNECT:
      return walletConnectCallbacks;
    case Web3Origin.ONMETA:
      return onMetaCallbacks;
    default:
      return browserCallbacks;
  }
}
