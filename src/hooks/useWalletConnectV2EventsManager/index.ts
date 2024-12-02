/* eslint-disable @typescript-eslint/no-misused-promises */
import { SignClientTypes } from '@walletconnect/types';
import { useCallback, useContext, useEffect } from 'react';
import { deleteTopic, web3wallet } from '../../core/walletConnectV2Utils';
import {
  COSMOS_SIGNING_METHODS,
  EIP155_SIGNING_METHODS,
} from '../../constants/EIP155Data';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { GlobalModalType } from '../../constants/enum';
import { HdWalletContext } from '../../core/util';
import {
  WalletConnectActions,
  WalletConnectContext,
} from '../../reducers/wallet_connect_reducer';
import * as Sentry from '@sentry/react-native';
import { t } from 'i18next';

export default function useWalletConnectEventsManager(initialized: boolean) {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { walletConnectDispatch } = useContext<any>(WalletConnectContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { showModal, hideModal } = useGlobalModalContext();
  const onSessionProposal = useCallback(
    (proposal: SignClientTypes.EventArguments['session_proposal']) => {
      showModal(GlobalModalType.WALLET_CONNECT_V2_PAIRING, {
        currentProposal: proposal,
        hideModal,
        currentETHAddress: ethereum.wallets[ethereum.currentIndex].address,
      });
    },
    [ethereum],
  );

  const onSessionRequest = useCallback(
    async (requestEvent: SignClientTypes.EventArguments['session_request']) => {
      
      console.log('$$$$$$$$$$$$$$ requestEvent : ', requestEvent);
      
      const { params } = requestEvent;
      const { request } = params;

      switch (request.method) {
        case EIP155_SIGNING_METHODS.ETH_SIGN:
        case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
        case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
          return showModal(GlobalModalType.WALLET_CONNECT_V2_SIGNING, {
            requestEvent,
            hideModal,
            currentETHAddress: ethereum.wallets[ethereum.currentIndex].address,
          });

        case COSMOS_SIGNING_METHODS.COSMOS_SIGN_DIRECT:
        case COSMOS_SIGNING_METHODS.COSMOS_SIGN_AMINO:
          return showModal(GlobalModalType.WALLET_CONNECT_V2_COSMOS_SIGNING, {
            requestEvent,
            hideModal,
          });
        default:
          return showModal('state', {
            type: 'error',
            title: t('UNSUPPORTED_METHOD'),
            description: t('UNSUPPORTED_METHOD_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
      }
    },
    [],
  );

  const onSessionRemoval = useCallback(async ({ topic }) => {
    walletConnectDispatch({
      type: WalletConnectActions.REMOVE_WALLETCONNECT_2_CONNECTION,
      value: { topic },
    });
  }, []);

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (initialized) {
      // sign
      try {
        web3wallet?.on('session_proposal', onSessionProposal);
        web3wallet?.on('session_request', onSessionRequest);
        web3wallet?.on('session_delete', onSessionRemoval);
      } catch (e) {
        Sentry.captureException(e);
      }
      // TODOs
      // signClient.on('session_ping', data => console.log('ping', data))
      // signClient.on('session_event', data => console.log('event', data))
      // signClient.on('session_update', data => console.log('update', data))
      // signClient.on('session_delete', data => console.log('delete', data))
    }
  }, [initialized, onSessionProposal, onSessionRequest, onSessionRemoval]);
}
