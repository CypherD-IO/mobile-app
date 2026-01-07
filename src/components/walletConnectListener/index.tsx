import React, { useContext, useEffect, useState, useRef } from 'react';
import { HdWalletContext } from '../../core/util';
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';
import { AppKit, useWalletInfo } from '@reown/appkit-wagmi-react-native';
import axios from '../../core/Http';
import { ConnectionTypes, GlobalContextType } from '../../constants/enum';
import {
  getAuthToken,
  getConnectionType,
  removeConnectionType,
  setAuthToken,
  setConnectionType,
  setRefreshToken,
} from '../../core/asyncStorage';
import { hostWorker } from '../../global';
import useValidSessionToken from '../../hooks/useValidSessionToken';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import useCardUtilities from '../../hooks/useCardUtilities';
import Loading from '../../containers/Loading';
import { CyDView } from '../../styles/tailwindComponents';
import useConnectionManager from '../../hooks/useConnectionManager';
import DeviceInfo from 'react-native-device-info';
import { getToken } from '../../notification/pushNotification';
import { get } from 'lodash';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  intercomLoginUserWithUserId,
  intercomUpdateUser,
} from '../../core/intercom';

/**
 * AsyncStorage key to check if we're in onboarding WalletConnect flow
 * If this key is set, we should NOT automatically load the wallet on connection
 */
const WALLET_CONNECT_FLOW_KEY = 'ONBOARDING_WALLET_CONNECT_FLOW_ACTIVE';

export const WalletConnectListener: React.FC = ({ children }) => {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  const { isConnected, address, connector } = useAccount();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { verifySessionToken } = useValidSessionToken();
  const { getWithoutAuth } = useAxios();
  const { connectionType, deleteWalletConfig } = useConnectionManager();
  const [loading, setLoading] = useState<boolean>(
    connectionType === ConnectionTypes.WALLET_CONNECT,
  );
  const { walletInfo } = useWalletInfo();
  const { getWalletProfile } = useCardUtilities();
  const [isInitializing, setIsInitializing] = useState(true);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(connectionType === ConnectionTypes.WALLET_CONNECT);
  }, [connectionType]);

  const { signMessageAsync } = useSignMessage({
    mutation: {
      async onSuccess(data) {
        const verifyMessageResponse = await axios.post(
          `${ARCH_HOST}/v1/authentication/verify-message/${address?.toLowerCase()}?format=ERC-4361`,
          {
            signature: data,
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
          await dispatchProfileData(String(token));
          void loadHdWallet();
        }
      },
    },
  });

  useEffect(() => {
    // Set a timeout to allow for connection initialization
    initTimeoutRef.current = setTimeout(() => {
      setIsInitializing(false);
    }, 3000); // Adjust this timeout as needed

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isInitializing) {
      return; // Don't perform any checks while initializing
    }

    /**
     * Check if we're in the onboarding WalletConnect flow
     * If so, skip automatic wallet loading - the onboarding flow will handle it
     */
    const checkAndHandleConnection = async () => {
      const isOnboardingFlow = await AsyncStorage.getItem(
        WALLET_CONNECT_FLOW_KEY,
      );

      if (isConnected && address && !ethereumAddress) {
        if (isOnboardingFlow === 'true') {
          // Don't automatically load wallet during onboarding
          // The onboarding screens will handle the wallet creation
          return;
        }
        // Normal flow: not in onboarding, proceed with wallet loading
        void verifySessionTokenAndSign();
      } else if (
        connectionType === ConnectionTypes.WALLET_CONNECT &&
        !isConnected &&
        !address
      ) {
        void handleDisconnect();
      }
    };

    void checkAndHandleConnection();
  }, [isConnected, address, ethereumAddress, connectionType, isInitializing]);

  const dispatchProfileData = async (token: string) => {
    const profileData = await getWalletProfile(token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: profileData,
    });
  };

  const registerIntercomUser = () => {
    // Intercom is best-effort; never allow it to crash wallet-connect flows on RN upgrades.
    void intercomLoginUserWithUserId(address);
    void intercomUpdateUser(address, {
      version: DeviceInfo.getVersion(),
    });
  };

  const loadHdWallet = async () => {
    void setConnectionType(ConnectionTypes.WALLET_CONNECT);
    hdWalletContext.dispatch({
      type: 'LOAD_WALLET',
      value: {
        address: String(address).toLowerCase(),
        chain: 'ethereum',
        publicKey: '',
        algo: '',
      },
    });
    registerIntercomUser();
  };

  const handleDisconnect = async () => {
    void deleteWalletConfig();
    await removeConnectionType();
    setLoading(false);
  };

  const verifySessionTokenAndSign = async () => {
    setLoading(true);
    void setConnectionType(ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN);
    await getToken(String(address).toLowerCase());
    const isSessionTokenValid = await verifySessionToken();
    if (!isSessionTokenValid) {
      void signConnectionMessage();
    } else {
      let authToken = await getAuthToken();
      authToken = JSON.parse(String(authToken));
      const profileData = await getWalletProfile(authToken);
      globalContext.globalDispatch({
        type: GlobalContextType.SIGN_IN,
        sessionToken: authToken,
      });
      globalContext.globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: profileData,
      });
      void loadHdWallet();
    }
    setLoading(false);
  };

  const signConnectionMessage = async () => {
    const provider = await connector?.getProvider();
    if (!provider) {
      throw new Error('web3Provider not connected');
    }
    const response = await getWithoutAuth(
      `/v1/authentication/sign-message/${String(address)}`,
      { format: 'ERC-4361' },
    );
    if (!response.isError) {
      const msg = response?.data?.message;
      await signMessageAsync({ message: msg });
      void logAnalyticsToFirebase(AnalyticEvent.SIGN_WALLET_CONNECT_MSG, {
        from: walletInfo?.name,
      });
    }
  };

  return (
    <CyDView className='flex-1'>
      {loading ? (
        <Loading loadingText='Loading Connected Wallet ...' />
      ) : (
        children
      )}
      <AppKit />
    </CyDView>
  );
};
