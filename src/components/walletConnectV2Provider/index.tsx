import WalletConnect from '@walletconnect/client';
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
  PortfolioContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import {
  createWeb3Wallet,
  web3WalletPair,
} from '../../core/walletConnectV2Utils';
import useInitialIntentURL from '../../hooks/useInitialIntentURL';
import useWalletConnectEventsManager from '../../hooks/useWalletConnectV2EventsManager';
import { WalletConnectActions } from '../../reducers/wallet_connect_reducer';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
import '@walletconnect/react-native-compat';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  avalanche,
  fantom,
  bsc,
  evmos,
  zkSync,
  base,
  polygonZkEvm,
  aurora,
  moonbeam,
  moonriver,
} from 'viem/chains';
import {
  createWeb3Modal,
  defaultWagmiConfig,
} from '@web3modal/wagmi-react-native';
import { WagmiConfig } from 'wagmi';
import WalletConnectListener from '../walletConnectListener';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { configureChains, createConfig, type Chain } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { CoinbaseWagmiConnector } from '@web3modal/coinbase-react-native';
import { walletConnectProvider } from '../../core/walletConnectProvider';

const walletConnectInitialValue = {
  initialized: false,
};

export const WalletConnectContext = createContext(walletConnectInitialValue);

export const WalletConnectV2Provider: React.FC<any> = ({ children }) => {
  // Step 1 - Initialize wallets and wallet connect client
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { walletConnectDispatch } = useContext<any>(WalletConnectContext);
  const isInitializationInProgress = useRef<boolean>(false);
  const projectId = String(Config.WALLET_CONNECT_PROJECTID);
  // const { isConnected, provider, address } = useWalletConnectModal()

  // Step 2 - Once initialized, set up wallet connect event manager

  const [isWeb3WalletInitialized, setIsWeb3WalletInitialized] =
    useState<boolean>(false);
  useWalletConnectEventsManager(isWeb3WalletInitialized);
  // const prevRelayerURLValue = useRef<string>('')

  // const { relayerRegionURL } = useSnapshot(SettingsStore.state)

  const onInitialize = useCallback(async () => {
    if (
      ethereum.address &&
      ethereum.address !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
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
    }
  }, []);

  const metadata = {
    name: 'Cypher Wallet',
    description: 'Cypher Wallet',
    url: 'https://cypherwallet.io',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
    redirect: {
      native: 'cypherwallet://',
      universal: 'YOUR_APP_UNIVERSAL_LINK.com',
    },
  };

  const chains = [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    avalanche,
    fantom,
    bsc,
    evmos,
    zkSync,
    base,
    polygonZkEvm,
    aurora,
    moonbeam,
    moonriver,
  ];

  // const walletConnectConnector = new WalletConnectConnector({
  //   chains,
  //   options: { projectId, showQrModal: false, metadata },
  // });

  // const { publicClient } = configureChains(chains, [
  //   walletConnectProvider({ projectId }),
  //   publicProvider(),
  // ]);

  // const coinbaseConnector = new CoinbaseWagmiConnector({
  //   chains,
  //   options: {
  //     redirect: 'cypherwallet://',
  //   },
  // });

  const wagmiConfig = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
  });

  // const wagmiConfig = createConfig({
  //   autoConnect: true,
  //   connectors: [walletConnectConnector, coinbaseConnector],
  //   publicClient,
  // });

  // 3. Create modal
  createWeb3Modal({
    projectId,
    chains,
    wagmiConfig,
  });

  useEffect(() => {
    if (
      !isWeb3WalletInitialized &&
      !isInitializationInProgress.current &&
      ethereum.address
    ) {
      isInitializationInProgress.current = true;
      void onInitialize();
    }
    // if (prevRelayerURLValue.current !== relayerRegionURL) {
    //   setInitialized(false);
    //   onInitialize();
    // }
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
      <WagmiConfig config={wagmiConfig}>
        {children}
        <WalletConnectListener />
        {/* <WalletConnectModal projectId={projectId} providerMetadata={metadata} /> */}
      </WagmiConfig>
    </WalletConnectContext.Provider>
  );
};
