import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { HdWalletContext } from '../../core/util';
import {
  createWeb3Wallet,
  web3WalletPair,
} from '../../core/walletConnectV2Utils';
import useInitialIntentURL from '../../hooks/useInitialIntentURL';
import useWalletConnectEventsManager from '../../hooks/useWalletConnectV2EventsManager';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
import { WagmiConfigBuilder } from '../wagmiConfigBuilder';
import { get } from 'lodash';
import { wcDebug, redactWcUri, wcError } from '../../core/walletConnectDebug';

export const WalletConnectV2Provider: React.FC<any> = ({ children }) => {
  // Step 1 - Initialize wallets and wallet connect client
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = get(hdWalletContext, 'state.wallet.ethereum', undefined);
  const ethereumAddress = get(ethereum, 'address', '');
  const isInitializationInProgress = useRef<boolean>(false);
  // Use dedicated WalletKit project ID for receiving dApp connections
  const projectId = String(Config.MOBILE_WALLETKIT_PROJECTID);

  // Step 2 - Once initialized, set up wallet connect event manager

  const [isWeb3WalletInitialized, setIsWeb3WalletInitialized] =
    useState<boolean>(false);

  useWalletConnectEventsManager(isWeb3WalletInitialized);

  const onInitialize = useCallback(async () => {
    try {
      if (projectId) {
        wcDebug('WalletKit', 'Provider initializing WalletKit', {
          projectIdSuffix: projectId.slice(-6),
          hasEthereumAddress: Boolean(ethereumAddress),
        });
        await createWeb3Wallet(projectId);
        setIsWeb3WalletInitialized(true);
        wcDebug('WalletKit', 'Provider WalletKit initialized');
      } else {
        console.error('[WalletConnectV2Provider] Missing projectId');
        wcError(
          'WalletKit',
          'Missing WalletKit projectId (MOBILE_WALLETKIT_PROJECTID)',
        );
      }
    } catch (err: unknown) {
      console.error(
        '[WalletConnectV2Provider] Error during wallet initialization:',
        err,
      );
      wcError('WalletKit', 'Provider init failed', err as any);
      Sentry.captureException(err);
    }
  }, [projectId]);

  useEffect(() => {
    if (
      !isWeb3WalletInitialized &&
      !isInitializationInProgress.current &&
      ethereumAddress
    ) {
      isInitializationInProgress.current = true;
      void onInitialize();
    }
  }, [isWeb3WalletInitialized, ethereumAddress, onInitialize]);

  const { url: initialUrl } = useInitialIntentURL();

  const initiateWalletConnection = async () => {
    if (initialUrl) {
      let uri = initialUrl;
      wcDebug('WalletKit', 'Initial URL received for pairing', {
        initialUrl: redactWcUri(initialUrl),
      });
      if (uri?.includes('cypherwallet://')) {
        uri = uri?.replace('cypherwallet://', '');
      }
      if (uri?.includes('wc?uri')) {
        uri = uri?.replace('wc?uri=', '');
      }
      if (
        uri?.startsWith('wc') &&
        (uri.includes('bridge') || uri.includes('relay-protocol'))
      ) {
        if (uri.includes('relay-protocol')) {
          // Small delay to ensure event listeners are registered
          // This addresses the race condition where pairing completes
          // before useEffect has a chance to register listeners
          await new Promise(resolve => setTimeout(resolve, 100));
          wcDebug('WalletKit', 'Pairing from deep link', {
            uri: redactWcUri(uri),
          });
          await web3WalletPair({ uri: decodeURIComponent(uri) });
        }
      }
    }
  };

  useEffect(() => {
    if (
      isWeb3WalletInitialized &&
      ethereum?.wallets[ethereum?.currentIndex]?.address
    ) {
      // Additional delay to ensure listener registration useEffect has run
      const timer = setTimeout(() => {
        void initiateWalletConnection();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [initialUrl, isWeb3WalletInitialized, ethereum?.wallets]);

  return <WagmiConfigBuilder>{children}</WagmiConfigBuilder>;
};
