import WalletConnect from '@walletconnect/client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';
import '@walletconnect/react-native-compat';
import { mainnet, polygon, arbitrum } from 'viem/chains';
import {
  createWeb3Modal,
  defaultWagmiConfig,
} from '@web3modal/wagmi-react-native';
import {
  WalletConnectModal,
  useWalletConnectModal,
} from '@walletconnect/modal-react-native';
import { ethers } from 'ethers';
import axios from '../../core/Http';
import { GlobalContextType } from '../../constants/enum';
import { setAuthToken, setRefreshToken } from '../../core/asyncStorage';
import { ethToEvmos } from '@tharsis/address-converter';
import { hostWorker } from '../../global';
import useValidSessionToken from '../../hooks/useValidSessionToken';
import { utf8ToHex } from 'web3-utils';

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
  const isInitializationInProgress = useRef<boolean>(false);
  const projectId = String(Config.WALLET_CONNECT_PROJECTID);
  const { isConnected, provider, address } = useWalletConnectModal();
  const { getWithoutAuth } = useAxios();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { verifySessionToken } = useValidSessionToken();

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

  const chains = [mainnet, polygon, arbitrum];

  const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

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
    console.log(isConnected, address);
    if (isConnected && address) {
      void verifySessionTokenAndSign();
    }
  }, [isConnected, address]);

  const loadHdWallet = () => {
    hdWalletContext.dispatch({
      type: 'LOAD_WALLET',
      value: {
        address,
        privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
        chain: 'ethereum',
        publicKey: '',
        rawAddress: '',
        algo: '',
      },
    });
    hdWalletContext.dispatch({
      type: 'LOAD_WALLET',
      value: {
        address: ethToEvmos(String(address)),
        privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
        chain: 'evmos',
        publicKey: '',
        rawAddress: '',
        algo: '',
      },
    });
  };

  const verifySessionTokenAndSign = async () => {
    const isSessionTokenValid = await verifySessionToken();
    console.log(
      '🚀 ~ file: index.tsx:58 ~ verifySessionTokenAndSign ~ isSessionTokenValid:',
      isSessionTokenValid,
    );
    if (!isSessionTokenValid) {
      void signMessage();
    } else {
      void loadHdWallet();
    }
  };

  const web3Provider = useMemo(
    () => (provider ? new ethers.providers.Web3Provider(provider) : undefined),
    [provider],
  );

  const signMessage = async () => {
    if (!web3Provider) {
      throw new Error('web3Provider not connected');
    }
    const response = await getWithoutAuth(
      `/v1/authentication/sign-message/${String(address)}`,
    );
    if (!response.isError) {
      const msg = response.data.message;
      const hexMsg = utf8ToHex(msg);
      const signature = await web3Provider.send('personal_sign', [
        hexMsg,
        address?.toLowerCase(),
      ]);
      const verifyMessageResponse = await axios.post(
        `${ARCH_HOST}/v1/authentication/verify-message/${address?.toLowerCase()}`,
        {
          signature,
        },
      );
      if (verifyMessageResponse?.data.token) {
        const { token, refreshToken } = verifyMessageResponse.data;
        globalContext.globalDispatch({
          type: GlobalContextType.SIGN_IN,
          sessionToken: token,
        });
        void setAuthToken(token);
        void setRefreshToken(refreshToken);
        void loadHdWallet();
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
      {/* <WagmiConfig config={wagmiConfig}> */}
      {children}
      {/* <Web3Modal /> */}
      <WalletConnectModal projectId={projectId} providerMetadata={metadata} />
      {/* </WagmiConfig> */}
    </WalletConnectContext.Provider>
  );
};
