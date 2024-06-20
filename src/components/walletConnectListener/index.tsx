import React, { useContext, useEffect, useState } from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';
import { Web3Modal } from '@web3modal/wagmi-react-native';
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
import { utf8ToHex } from 'web3-utils';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { getWalletProfile } from '../../core/card';
import Loading from '../../containers/Loading';
import { CyDView } from '../../styles/tailwindStyles';
import useConnectionManager from '../../hooks/useConnectionManager';
import Intercom from '@intercom/intercom-react-native';
import * as Sentry from '@sentry/react-native';
import DeviceInfo from 'react-native-device-info';
import { getToken } from '../../core/push';

export const WalletConnectListener: React.FC = ({ children }) => {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { isConnected, address, connector, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { verifySessionToken } = useValidSessionToken();
  const { getWithoutAuth } = useAxios();
  const { connectionType } = useConnectionManager();
  const [loading, setLoading] = useState<boolean>(
    connectionType === ConnectionTypes.WALLET_CONNECT,
  );
  const { signMessage } = useSignMessage({
    mutation: {
      async onSuccess(data) {
        console.log('Signature:', data);
        const verifyMessageResponse = await axios.post(
          `${ARCH_HOST}/v1/authentication/verify-message/${address?.toLowerCase()}?format=ERC-4361`,
          {
            signature: data,
          },
        );
        console.log(
          '🚀 ~ signMessage ~ verifyMessageResponse:',
          verifyMessageResponse,
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
    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
    console.log({ isConnected });
  }, [isConnected]);

  useEffect(() => {
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

    console.log({ address });
  }, [address]);

  useEffect(() => {
    if (isConnecting) {
      console.log('>>>>>>>>>>>>>>>>> C O N N E C T I N G <<<<<<<<<<<<<<<<<<<<');
    }
  }, [isConnecting]);

  useEffect(() => {
    if (
      isConnected &&
      address &&
      ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      console.log({ isConnected, address, ethereumAddress: ethereum.address });

      // void validateStaleConnection();
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
      console.log('disconnect called inside validate stale connection');
      disconnect();
      void setConnectionType('');
    } else {
      void verifySessionTokenAndSign();
    }
  };

  const verifySessionTokenAndSign = async () => {
    setLoading(true);
    await getToken(String(address));
    void setConnectionType(ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN);
    const isSessionTokenValid = await verifySessionToken();
    console.log(
      '🚀 ~ verifySessionTokenAndSign ~ isSessionTokenValid:',
      isSessionTokenValid,
    );
    if (!isSessionTokenValid) {
      void signMessages();
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

  const signMessages = async () => {
    const provider = await connector?.getProvider();
    console.log('🚀 ~ signMessage ~ provider:', provider);
    if (!provider) {
      throw new Error('web3Provider not connected');
    }
    const response = await getWithoutAuth(
      `/v1/authentication/sign-message/${String(address)}`,
      { format: 'ERC-4361' },
    );
    console.log('🚀 ~ signMessages ~ response:', response);
    if (!response.isError) {
      const msg = response.data.message;
      const hexMsg = utf8ToHex(msg);
      const msgParams = [hexMsg, address?.toLowerCase()];
      // let signature;
      // if (provider?.connector) {
      //   signature = await provider?.connector.signPersonalMessage(msgParams);
      // } else {
      //   signature = await provider?.request({
      //     method: 'personal_sign',
      //     params: msgParams,
      //   });
      // }
      console.log('message : ', msgParams);
      console.log('msg : ', msg);
      signMessage({ message: msg });
      // console.log('🚀 ~ signMessages ~ signature:', signature);
    }
  };

  return (
    <CyDView className='flex-1'>
      {loading ? <Loading /> : children}
      <Web3Modal />
    </CyDView>
  );
};
