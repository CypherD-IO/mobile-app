import React, { useContext, useEffect, useState, useCallback } from 'react';
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
import * as ethers from 'ethers';

export const WalletConnectListener: React.FC = ({ children }) => {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { isConnected, address, connector, isConnecting } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { verifySessionToken } = useValidSessionToken();
  const { getWithoutAuth } = useAxios();
  const { connectionType } = useConnectionManager();
  const [loading, setLoading] = useState<boolean>(
    connectionType === ConnectionTypes.WALLET_CONNECT,
  );
  const { walletInfo } = useWalletInfo();
  const { getWalletProfile } = useCardUtilities();

  useEffect(() => {
    console.log('connectionType in walletConnectListener : ', connectionType);
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
    if (
      isConnected &&
      address &&
      ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      void verifySessionTokenAndSign();
    }
  }, [isConnected, address, ethereum.address]);

  // useEffect(() => {
  //   console.log(
  //     'loading in walletConnectListener :::::::::::::::::::::: ',
  //     loading,
  //   );
  // }, [loading]);

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
    // console.log('in signConnectionMessage function');
    const provider = await connector?.getProvider();
    // console.log('... provider in signConnectionMessage : ', provider);
    // console.log('... address in signConnectionMessage : ', address);
    if (!provider) {
      throw new Error('web3Provider not connected');
    }
    const response = await getWithoutAuth(
      `/v1/authentication/sign-message/${String(address)}`,
      { format: 'ERC-4361' },
    );
    // console.log('response in signConnectionMessage : ', response);
    if (!response.isError) {
      const msg = response?.data?.message;
      // console.log('Message to be signed:', msg);
      const signMsgResponse = await signMessageAsync({ message: msg });
      // console.log('signMsgResponse:', signMsgResponse);
      void analytics().logEvent('sign_wallet_connect_msg', {
        from: walletInfo?.name,
      });
    }
  };

  return (
    <CyDView className='flex-1'>
      {loading ? <Loading loadingText='Loading Wallet Connect' /> : children}
      <AppKit />
    </CyDView>
  );
};
