/* eslint-disable @typescript-eslint/no-misused-promises */
import { SignClientTypes } from '@walletconnect/types';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { deleteTopic, web3wallet } from '../../core/walletConnectV2Utils';
import {
  COSMOS_SIGNING_METHODS,
  EIP155_SIGNING_METHODS,
  EIP5792_METHODS,
} from '../../constants/EIP155Data';
import { formatJsonRpcResult } from '@json-rpc-tools/utils';
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

      const { topic, params } = requestEvent;
      const { request } = params;

      // Validate the session exists before processing the request
      // This prevents race conditions where the session is deleted before the modal opens
      try {
        const session = web3wallet?.engine?.signClient?.session?.get(topic);
        if (!session?.peer?.metadata) {
          console.warn(
            '[WalletConnect] Session not found or invalid for topic:',
            topic,
          );
          return showModal('state', {
            type: 'error',
            title: t('WC_SESSION_EXPIRED'),
            description: t('WC_SESSION_EXPIRED_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } catch (sessionError) {
        // Session was deleted or is invalid - this is expected in race conditions
        // Log as warning since we handle this gracefully with an error UI
        console.warn(
          '[WalletConnect] Session expired or disconnected - showing error UI to user',
          sessionError,
        );
        Sentry.captureException(sessionError);
        return showModal('state', {
          type: 'error',
          title: t('WC_SESSION_EXPIRED'),
          description: t('WC_SESSION_EXPIRED_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }

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

          // EIP-5792: wallet_getCapabilities - Returns wallet capabilities for each chain
          // This is a query-only method that doesn't require user interaction
          // We return empty capabilities indicating we don't support advanced features
          // like batch transactions, paymasters, or session keys
          case EIP5792_METHODS.WALLET_GET_CAPABILITIES: {
            const { id } = requestEvent;
            const [, chainIds] = request.params; // [address, chainIds[]]

            // Build capabilities response - empty object for each chain ID
            // Format: { "0x1": {}, "0x89": {} } - no capabilities supported
            const capabilities: Record<string, Record<string, unknown>> = {};
            if (Array.isArray(chainIds)) {
              chainIds.forEach((chainId: string) => {
                capabilities[chainId] = {};
              });
            }

            // Respond directly without UI - this is just a capability query
            const response = formatJsonRpcResult(id, capabilities);
            await web3wallet?.respondSessionRequest({
              topic,
              response,
            });
            return;
          }

          default:
            console.error(
              '[WalletConnect] Unsupported method:',
              request.method,
              request,
            );
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
