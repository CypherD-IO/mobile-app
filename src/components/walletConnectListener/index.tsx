import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
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
import { CyDView } from '../../styles/tailwindStyles';
import useConnectionManager from '../../hooks/useConnectionManager';
import Intercom from '@intercom/intercom-react-native';
import * as Sentry from '@sentry/react-native';
import DeviceInfo from 'react-native-device-info';
import { getToken } from '../../core/push';
import analytics from '@react-native-firebase/analytics';

export const WalletConnectListener: React.FC = ({ children }) => {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
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
        console.log('use sign message success : ', data);
        const verifyMessageResponse = await axios.post(
          `${ARCH_HOST}/v1/authentication/verify-message/${address?.toLowerCase()}?format=ERC-4361`,
          {
            signature: data,
          },
        );
        console.log('verifyMessageResponse : ', verifyMessageResponse);
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
    console.log('isConnected : ', isConnected);
    console.log('address : ', address);
    console.log('ethereum.address : ', ethereum.address);
    console.log('connectionType : ', connectionType);
    console.log('isInitializing : ', isInitializing);
    if (isInitializing) {
      return; // Don't perform any checks while initializing
    }
    if (
      isConnected &&
      address &&
      (!ethereum.address ||
        ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_)
    ) {
      void verifySessionTokenAndSign();
    } else if (
      connectionType === ConnectionTypes.WALLET_CONNECT &&
      !isConnected &&
      !address
    ) {
      void handleDisconnect();
    }
  }, [isConnected, address, ethereum.address, connectionType, isInitializing]);

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
    console.log('loadHdWallet in wallet connect listener : ', address);
    void setConnectionType(ConnectionTypes.WALLET_CONNECT);
    hdWalletContext.dispatch({
      type: 'LOAD_WALLET',
      value: {
        address,
        // privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
        chain: 'ethereum',
        publicKey: '',
        rawAddress: '',
        algo: '',
      },
    });
    registerIntercomUser();
  };

  const handleDisconnect = async () => {
    console.log('handleDisconnect in wallet connect listener : ', address);
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
