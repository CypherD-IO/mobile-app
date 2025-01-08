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
  getPlatform,
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
import DeviceInfo from 'react-native-device-info';
import analytics from '@react-native-firebase/analytics';
import { getToken } from '../../notification/pushNotification';
import { useGlobalModalContext } from '../v2/GlobalModal';
import { t } from 'i18next';
import { useIntegrityService } from '../../hooks/useIntegrityService';
import RNExitApp from 'react-native-exit-app';
import { IIntegrity } from '../../models/integrity.interface';
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
  const { showModal, hideModal } = useGlobalModalContext();
  const { getIntegrityToken } = useIntegrityService();

  useEffect(() => {
    setLoading(connectionType === ConnectionTypes.WALLET_CONNECT);
  }, [connectionType]);

  const { signMessageAsync } = useSignMessage({
    mutation: {
      async onSuccess(data, variables) {
        const verifyMessageResponse = await axios.post(
          `${ARCH_HOST}/v1/authentication/verify-message/integrity/${address?.toLowerCase()}?format=ERC-4361`,
          {
            signature: data,
            ...(variables?.integrityObj
              ? { integrity: variables?.integrityObj }
              : {}),
          },
        );
        if (verifyMessageResponse?.data.token) {
          const { token, refreshToken } = verifyMessageResponse.data;
          globalContext.globalDispatch({
            type: GlobalContextType.SIGN_IN,
            sessionToken: token,
          });
          globalContext.globalDispatch({
            type: GlobalContextType.IS_APP_AUTHENTICATED,
            isAuthenticated: true,
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

  const MAX_RETRY_ATTEMPTS = 3;

  const verifySessionTokenAndSign = async (retryCount = 0) => {
    try {
      setLoading(true);
      const token = await getToken(String(address));
      void setConnectionType(ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN);
      const integrityObj = await getIntegrityToken();

      if (integrityObj) {
        const isSessionTokenValid = await verifySessionToken(integrityObj);
        if (!isSessionTokenValid) {
          await signConnectionMessage(integrityObj);
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
      }
    } catch (error) {
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        showModal('state', {
          type: 'error',
          title: t('UNABLE_TO_VERIFY_APP'),
          description: `<p style="color: #000000; font-size: 14px; font-weight: 500; text-align: center;">${t('MAX_RETRIES_REACHED')}<a href="https://cypherhq.io/support" style="color: #007AFF; text-decoration: underline;">https://cypherhq.io/support</a></p>`,
          onSuccess: () => {
            hideModal();
            RNExitApp.exitApp();
          },
          onFailure: () => {
            hideModal();
            RNExitApp.exitApp();
          },
        });
      } else {
        showModal('state', {
          type: 'warning',
          title: t('UNABLE_TO_VERIFY_APP'),
          description:
            getPlatform() === 'android'
              ? t('APP_INTEGRITY_CHECK_FAILED_ANDROID')
              : t('APP_INTEGRITY_CHECK_FAILED_IOS'),
          onSuccess: async () => {
            hideModal();
            // Retry with incremented counter
            await verifySessionTokenAndSign(retryCount + 1);
          },
          onFailure: hideModal,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const signConnectionMessage = async (integrityObj: IIntegrity) => {
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
      const signMsgResponse = await signMessageAsync({
        message: msg,
        integrityObj,
      });
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
