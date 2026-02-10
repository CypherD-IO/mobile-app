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

  /**
   * Wait for session to become available in storage.
   * This handles the race condition where a dApp sends a request immediately
   * after session approval, before the session is fully persisted.
   */
  const waitForSession = async (
    topic: string,
    maxRetries = 5,
    delayMs = 300,
  ): Promise<any | null> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const session = web3wallet?.engine?.signClient?.session?.get(topic);
        if (session?.peer?.metadata) {
          return session;
        }
      } catch {
        // Session not found yet, will retry
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return null;
  };

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

      // Wait for session to be available with retry logic
      // This handles the race condition where dApp sends request before session is persisted
      const session = await waitForSession(topic);

      if (!session) {
        console.warn(
          '[WalletConnect] Session not found after retries for topic:',
          topic,
        );
        Sentry.captureMessage(
          `WalletConnect session not found after retries: ${String(topic)}`,
          'warning',
        );
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
   * 
   * IMPORTANT: We use refs for callbacks to avoid the cleanup/re-register cycle
   * that was causing "No listener for session_proposal event" errors.
   * The listeners are registered once and use refs to always call the latest callback.
   *****************************************************************************/
  const onSessionProposalRef = useRef(onSessionProposal);
  const onSessionRequestRef = useRef(onSessionRequest);
  const onSessionRemovalRef = useRef(onSessionRemoval);

  // Keep a reference to handlers for cleanup
  const handlersRef = useRef<{
    proposal?: (p: any) => void;
    request?: (r: any) => void;
    removal?: (e: any) => void;
  }>({});

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onSessionProposalRef.current = onSessionProposal;
    onSessionRequestRef.current = onSessionRequest;
    onSessionRemovalRef.current = onSessionRemoval;
  }, [onSessionProposal, onSessionRequest, onSessionRemoval]);

  // Register listeners once when initialized
  useEffect(() => {
    if (initialized && web3wallet && !listenersRegistered.current) {
      // Store handler references for cleanup
      handlersRef.current.proposal = (proposal: any) => {
        onSessionProposalRef.current?.(proposal);
      };
      handlersRef.current.request = (request: any) => {
        void onSessionRequestRef.current?.(request);
      };
      handlersRef.current.removal = (event: any) => {
        void onSessionRemovalRef.current?.(event);
      };

      try {
        // Register listeners
        web3wallet.on('session_proposal', handlersRef.current.proposal);
        web3wallet.on('session_request', handlersRef.current.request);
        web3wallet.on('session_delete', handlersRef.current.removal);

        listenersRegistered.current = true;
      } catch (e) {
        console.error('[WalletConnect] Error registering event listeners:', e);
        Sentry.captureException(e);
      }
    }
  }, [initialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (web3wallet && listenersRegistered.current) {
        try {
          if (handlersRef.current.proposal) {
            web3wallet.off('session_proposal', handlersRef.current.proposal);
          }
          if (handlersRef.current.request) {
            web3wallet.off('session_request', handlersRef.current.request);
          }
          if (handlersRef.current.removal) {
            web3wallet.off('session_delete', handlersRef.current.removal);
          }
          listenersRegistered.current = false;
        } catch (e) {
          console.error(
            '[WalletConnect] Error cleaning up event listeners:',
            e,
          );
        }
      }
    };
  }, []);
}
