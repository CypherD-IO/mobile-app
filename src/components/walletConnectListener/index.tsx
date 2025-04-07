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
import Intercom from '@intercom/intercom-react-native';
import DeviceInfo from 'react-native-device-info';
import analytics from '@react-native-firebase/analytics';
import { getToken } from '../../notification/pushNotification';
import { get } from 'lodash';

export const WalletConnectListener: React.FC = ({ children }) => {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  const { isConnected, address, connector } = useAccount();
  const { disconnectAsync } = useDisconnect();
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
    if (isConnected && address && !ethereumAddress) {
      void verifySessionTokenAndSign();
    } else if (
      connectionType === ConnectionTypes.WALLET_CONNECT &&
      !isConnected &&
      !address
    ) {
      void handleDisconnect();
    }
  }, [isConnected, address, ethereumAddress, connectionType, isInitializing]);

  const dispatchProfileData = async (token: string) => {
    const profileData = await getWalletProfile(token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: profileData,
    });
  };

  const registerIntercomUser = () => {
    Intercom.loginUserWithUserAttributes({
      userId: address,
    }).catch(() => {
      // throws error if user is already registered
    });
    Intercom.updateUser({
      userId: address,
      customAttributes: {
        version: DeviceInfo.getVersion(),
      },
    }).catch(() => {
      // throws error if user is already registered
    });
  };

  const loadHdWallet = async () => {
    void setConnectionType(ConnectionTypes.WALLET_CONNECT);
    hdWalletContext.dispatch({
      type: 'LOAD_WALLET',
      value: {
        address,
        chain: 'ethereum',
        publicKey: '',
        rawAddress: '',
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

  const validateStaleConnection = async () => {
    const connectionType = await getConnectionType();
    if (
      connectionType === ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN &&
      isConnected
    ) {
      await disconnectAsync();
      void setConnectionType('');
    } else {
      void verifySessionTokenAndSign();
    }
  };

  const verifySessionTokenAndSign = async () => {
    setLoading(true);
    const token = await getToken(String(address));
    void setConnectionType(ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN);
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
      const signMsgResponse = await signMessageAsync({ message: msg });
      void analytics().logEvent('sign_wallet_connect_msg', {
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
