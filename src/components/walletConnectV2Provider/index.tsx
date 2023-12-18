import WalletConnect from '@walletconnect/client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import {
  createWeb3Wallet,
  web3WalletPair,
} from '../../core/walletConnectV2Utils';
import useInitialIntentURL from '../../hooks/useInitialIntentURL';
import useWalletConnectEventsManager from '../../hooks/useWalletConnectV2EventsManager';
import { WalletConnectActions } from '../../reducers/wallet_connect_reducer';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';

const walletConnectInitialValue = {
  initialized: false,
};

export const WalletConnectContext = createContext(walletConnectInitialValue);

export const WalletConnectV2Provider: React.FC<any> = ({ children }) => {
  // Step 1 - Initialize wallets and wallet connect client
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { walletConnectDispatch } = useContext<any>(WalletConnectContext);
  const { getWithAuth } = useAxios();

  // Step 2 - Once initialized, set up wallet connect event manager

  const [isWeb3WalletInitialized, setIsWeb3WalletInitialized] =
    useState<boolean>(false);
  useWalletConnectEventsManager(isWeb3WalletInitialized);
  // const prevRelayerURLValue = useRef<string>('')

  // const { relayerRegionURL } = useSnapshot(SettingsStore.state)

  const onInitialize = useCallback(async () => {
    let projectId = Config.WALLET_CONNECT_PROJECTID;
    const resp = await getWithAuth('/v1/authentication/creds/wc');
    if (!resp.isError) {
      const { data } = resp;
      projectId = data.projectId;
      console.log(
        '🚀 ~ file: index.tsx:51 ~ onInitialize ~ projectId:',
        projectId,
      );
    }
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
    if (!isWeb3WalletInitialized && globalContext.globalState.token) {
      void onInitialize();
    }
    // if (prevRelayerURLValue.current !== relayerRegionURL) {
    //   setInitialized(false);
    //   onInitialize();
    // }
  }, [isWeb3WalletInitialized, globalContext.globalState.token]);

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
        } else if (uri.includes('bridge')) {
          const connector = new WalletConnect({ uri });
          portfolioState.dispatchPortfolio({
            value: { walletConnectURI: uri },
          });
          walletConnectDispatch({
            type: WalletConnectActions.ADD_CONNECTOR,
            value: connector,
          });
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
    <WalletConnectContext.Provider
      value={{ initialized: isWeb3WalletInitialized }}>
      {children}
    </WalletConnectContext.Provider>
  );
};
