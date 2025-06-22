/* eslint-disable @typescript-eslint/no-misused-promises */
import { SignClientTypes } from '@walletconnect/types';
import { useCallback, useContext, useEffect, useRef } from 'react';
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
  const walletConnectContextValue = useContext<any>(WalletConnectContext);
  const globalModalContext = useGlobalModalContext();
  const listenersRegistered = useRef<boolean>(false);

  // Ensure we have all required context values
  const ethereum = hdWalletContext?.state?.wallet?.ethereum;
  const walletConnectDispatch =
    walletConnectContextValue?.walletConnectDispatch;
  const { showModal, hideModal } = globalModalContext || {};

  const onSessionProposal = useCallback(
    (proposal: any) => {
      if (!showModal || !ethereum?.wallets?.[ethereum?.currentIndex]?.address) {
        console.error(
          '[WalletConnect] Missing dependencies for session proposal',
        );
        return;
      }

      showModal(GlobalModalType.WALLET_CONNECT_V2_PAIRING, {
        currentProposal: proposal,
        hideModal,
        currentETHAddress: ethereum.wallets[ethereum.currentIndex].address,
      });
    },
    [showModal, hideModal, ethereum],
  );

  const onSessionRequest = useCallback(
    async (requestEvent: any) => {
      if (!showModal || !hideModal) {
        console.error(
          '[WalletConnect] Missing modal context for session request',
        );
        return;
      }

      const { params } = requestEvent;
      const { request } = params;

      try {
        switch (request.method) {
          case EIP155_SIGNING_METHODS.ETH_SIGN:
          case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
          case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
          case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
          case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
          case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION: {
            const currentETHAddress =
              ethereum?.wallets?.[ethereum?.currentIndex]?.address;
            if (!currentETHAddress) {
              console.error(
                '[WalletConnect] No ETH address available for signing',
              );
              return;
            }

            return showModal(GlobalModalType.WALLET_CONNECT_V2_SIGNING, {
              requestEvent,
              hideModal,
              currentETHAddress,
            });
          }

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
      } catch (error) {
        console.error('[WalletConnect] Error handling session request:', error);
        Sentry.captureException(error);
        return showModal('state', {
          type: 'error',
          title: 'WalletConnect Error',
          description: 'Failed to process signing request. Please try again.',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    },
    [showModal, hideModal, ethereum],
  );

  const onSessionRemoval = useCallback(
    async ({ topic }: any) => {
      if (!walletConnectDispatch) {
        console.error(
          '[WalletConnect] Missing walletConnectDispatch for session removal',
        );
        return;
      }

      walletConnectDispatch({
        type: WalletConnectActions.REMOVE_WALLETCONNECT_2_CONNECTION,
        value: { topic },
      });
    },
    [walletConnectDispatch],
  );

  /******************************************************************************
   * Set up WalletConnect event listeners
   *****************************************************************************/
  useEffect(() => {
    if (
      initialized &&
      web3wallet &&
      !listenersRegistered.current &&
      onSessionProposal &&
      onSessionRequest &&
      onSessionRemoval
    ) {
      try {
        // Register listeners
        web3wallet.on('session_proposal', onSessionProposal);
        web3wallet.on('session_request', onSessionRequest);
        web3wallet.on('session_delete', onSessionRemoval);

        listenersRegistered.current = true;
      } catch (e) {
        console.error('[WalletConnect] Error registering event listeners:', e);
        Sentry.captureException(e);
      }
    }

    // Cleanup function
    return () => {
      if (web3wallet && listenersRegistered.current) {
        try {
          web3wallet.off('session_proposal', onSessionProposal);
          web3wallet.off('session_request', onSessionRequest);
          web3wallet.off('session_delete', onSessionRemoval);
          listenersRegistered.current = false;
        } catch (e) {
          console.error(
            '[WalletConnect] Error cleaning up event listeners:',
            e,
          );
        }
      }
    };
  }, [initialized, onSessionProposal, onSessionRequest, onSessionRemoval]);

  // Additional effect to handle web3wallet changes
  useEffect(() => {
    if (!web3wallet && listenersRegistered.current) {
      listenersRegistered.current = false;
    }
  }, [web3wallet]);
}
