import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import {
  createWeb3Wallet,
  web3WalletPair,
} from '../../core/walletConnectV2Utils';
import useInitialIntentURL from '../../hooks/useInitialIntentURL';
import useWalletConnectEventsManager from '../../hooks/useWalletConnectV2EventsManager';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
import { WagmiConfigBuilder } from '../wagmiConfigBuilder';

const walletConnectInitialValue = {
  initialized: false,
};

// export const WalletConnectContext = createContext(walletConnectInitialValue);

export const WalletConnectV2Provider: React.FC<any> = ({ children }) => {
  // Step 1 - Initialize wallets and wallet connect client
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const isInitializationInProgress = useRef<boolean>(false);
  const projectId = String(Config.WALLET_CONNECT_PROJECTID);

  // Step 2 - Once initialized, set up wallet connect event manager

  const [isWeb3WalletInitialized, setIsWeb3WalletInitialized] =
    useState<boolean>(false);
  useWalletConnectEventsManager(isWeb3WalletInitialized);

  const onInitialize = useCallback(async () => {
    // const resp = await getWithAuth('/v1/authentication/creds/wc'); //TO DO Eliminate sign message race condition (axios intercept)
    // if (!resp.isError) {
    //   const { data } = resp;
    //   projectId = data.projectId;
    // }
    try {
      if (projectId) {
        await createWeb3Wallet(projectId);
        setIsWeb3WalletInitialized(true);
      }
    } catch (err: unknown) {
      Sentry.captureException(err);
    }
  }, []);

  useEffect(() => {
    if (
      !isWeb3WalletInitialized &&
      !isInitializationInProgress.current &&
      ethereum.address &&
      ethereum.address !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      isInitializationInProgress.current = true;
      void onInitialize();
    }
  }, [isWeb3WalletInitialized, ethereum.address]);

  const { url: initialUrl } = useInitialIntentURL();

  const initiateWalletConnection = async () => {
    if (initialUrl) {
      let uri = initialUrl?.url ?? initialUrl;
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
      void initiateWalletConnection();
    }
  }, [initialUrl, isWeb3WalletInitialized, ethereum.wallets.length]);

  return (
    // <WalletConnectContext.Provider
    //   value={{ initialized: isWeb3WalletInitialized }}>
    <WagmiConfigBuilder>{children}</WagmiConfigBuilder>
    // </WalletConnectContext.Provider>
  );
};
