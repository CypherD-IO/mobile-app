import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';
import { Web3Modal } from '@web3modal/wagmi-react-native';
import { ethers } from 'ethers';
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
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { getWalletProfile } from '../../core/card';
import Loading from '../../containers/Loading';
import { CyDView } from '../../styles/tailwindStyles';
import useConnectionManager from '../../hooks/useConnectionManager';
import Intercom from '@intercom/intercom-react-native';
import * as Sentry from '@sentry/react-native';
import DeviceInfo from 'react-native-device-info';

export default function WalletConnectListener({ children }) {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { isConnected, address, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { verifySessionToken } = useValidSessionToken();
  const { getWithoutAuth } = useAxios();
  const { connectAsync } = useConnect();
  const { connectionType } = useConnectionManager();
  const [loading, setLoading] = useState<boolean>(
    connectionType === ConnectionTypes.WALLET_CONNECT,
  );

  useEffect(() => {
    if (
      isConnected &&
      address &&
      ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      void validateStaleConnection();
    }
  }, [isConnected, address]);

  const dispatchProfileData = async (token: string) => {
    const profileData = await getWalletProfile(token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: profileData,
    });
  };

  const registerIntercomUser = () => {
    Intercom.registerIdentifiedUser({
      userId: address,
    }).catch(error => {
      Sentry.captureException(error);
    });
    Intercom.updateUser({
      userId: address,
      customAttributes: {
        version: DeviceInfo.getVersion(),
      },
    }).catch(error => {
      Sentry.captureException(error);
    });
  };

  const loadHdWallet = async () => {
    void setConnectionType(ConnectionTypes.WALLET_CONNECT);
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
    registerIntercomUser();
  };

  const validateStaleConnection = async () => {
    const connectionType = await getConnectionType();
    if (
      connectionType === ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN &&
      isConnected
    ) {
      disconnect();
      void setConnectionType('');
    } else {
      void verifySessionTokenAndSign();
    }
  };

  const verifySessionTokenAndSign = async () => {
    setLoading(true);
    void setConnectionType(ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN);
    const isSessionTokenValid = await verifySessionToken();
    if (!isSessionTokenValid) {
      void signMessage();
    } else {
      let authToken = await getAuthToken();
      authToken = JSON.parse(String(authToken));
      // await dispatchProfileData(String(authToken));
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

  const web3Provider = useMemo(async () => {
    const provider = await connector?.getProvider();
    return provider ? new ethers.providers.Web3Provider(provider) : undefined;
  }, [connector]);

  const signMessage = async () => {
    const provider = await connector?.getProvider();
    if (!provider) {
      throw new Error('web3Provider not connected');
    }
    const response = await getWithoutAuth(
      `/v1/authentication/sign-message/${String(address)}`,
      { format: 'ERC-4361' },
    );
    if (!response.isError) {
      const msg = response.data.message;
      const hexMsg = utf8ToHex(msg);
      const msgParams = [hexMsg, address?.toLowerCase()];
      let signature;
      if (provider?.connector) {
        signature = await provider?.connector.signPersonalMessage(msgParams);
      } else {
        signature = await provider?.request({
          method: 'personal_sign',
          params: msgParams,
        });
      }
      const verifyMessageResponse = await axios.post(
        `${ARCH_HOST}/v1/authentication/verify-message/${address?.toLowerCase()}?format=ERC-4361`,
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
        await dispatchProfileData(String(token));
        void loadHdWallet();
      }
    }
  };

  return (
    <CyDView className='flex-1'>
      {loading ? <Loading /> : children}
      <Web3Modal />
    </CyDView>
  );
}
