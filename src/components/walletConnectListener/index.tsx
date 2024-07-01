import React, { useContext, useEffect, useState } from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';
import { Web3Modal, useWalletInfo } from '@web3modal/wagmi-react-native';
import axios from '../../core/Http';
import { ConnectionTypes, GlobalContextType } from '../../constants/enum';
import {
  getAuthToken,
  getConnectionType,
  setAuthToken,
  setConnectionType,
  setRefreshToken,
} from '../../core/asyncStorage';
import { ethToEvmos } from '@tharsis/address-converter';
import { hostWorker } from '../../global';
import useValidSessionToken from '../../hooks/useValidSessionToken';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { getWalletProfile } from '../../core/card';
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
    hdWalletContext.dispatch({
      type: 'LOAD_WALLET',
      value: {
        address: ethToEvmos(String(address)),
        // privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
        chain: 'evmos',
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
        from: walletInfo.name,
      });
    }
  };

  return (
    <CyDView className='flex-1'>
      {loading ? <Loading /> : children}
      <Web3Modal />
    </CyDView>
  );
};
