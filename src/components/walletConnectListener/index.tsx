import React, { useContext, useEffect, useMemo } from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';
import '@walletconnect/react-native-compat';
import { createWeb3Modal, Web3Modal } from '@web3modal/wagmi-react-native';
import { WalletConnectModal } from '@walletconnect/modal-react-native';
import { ethers } from 'ethers';
import axios from '../../core/Http';
import { ConnectionTypes, GlobalContextType } from '../../constants/enum';
import {
  getAuthToken,
  setAuthToken,
  setConnectionType,
  setRefreshToken,
} from '../../core/asyncStorage';
import { ethToEvmos } from '@tharsis/address-converter';
import { hostWorker } from '../../global';
import useValidSessionToken from '../../hooks/useValidSessionToken';
import { utf8ToHex } from 'web3-utils';
import { useAccount, useConnect } from 'wagmi';
import { getWalletProfile } from '../../core/card';

export default function WalletConnectListener() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { isConnected, address, connector } = useAccount();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { verifySessionToken } = useValidSessionToken();
  const { getWithoutAuth } = useAxios();
  const { connectAsync } = useConnect();

  useEffect(() => {
    console.log(
      'WalletConnect Listener isConnected:',
      isConnected,
      address,
      ethereum.address,
    );
    if (
      isConnected &&
      address &&
      ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      void verifySessionTokenAndSign();
    }
  }, [isConnected, address]);

  const dispatchProfileData = async (token: string) => {
    const profileData = await getWalletProfile(token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: profileData,
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
  };

  const verifySessionTokenAndSign = async () => {
    const isSessionTokenValid = await verifySessionToken();
    if (!isSessionTokenValid) {
      void signMessage();
    } else {
      let authToken = await getAuthToken();
      authToken = JSON.parse(String(authToken));
      console.log('authToken', authToken);
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
      console.log('loadHdWallet');
      void loadHdWallet();
    }
  };

  const web3Provider = useMemo(async () => {
    const provider = await connector?.getProvider();
    return provider ? new ethers.providers.Web3Provider(provider) : undefined;
  }, [connector]);

  const signMessage = async () => {
    console.log('signMessage');
    const provider = await connector?.getProvider();
    console.log(provider, provider);
    if (!provider) {
      throw new Error('web3Provider not connected');
    }
    const response = await getWithoutAuth(
      `/v1/authentication/sign-message/${String(address)}`,
      { format: 'ERC-4361' },
    );
    console.log(response);
    if (!response.isError) {
      const msg = response.data.message;
      const hexMsg = utf8ToHex(msg);
      const msgParams = [hexMsg, address?.toLowerCase()];
      let signature;
      if (provider?.connector) {
        signature = await provider?.connector.signPersonalMessage(msgParams);
      } else {
        console.log('signature');
        signature = await provider?.request({
          method: 'personal_sign',
          params: msgParams,
        });
      }
      // const signature = await web3Provider.send('personal_sign', [
      //   hexMsg,
      //   address?.toLowerCase(),
      // ]);
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
        console.log('loadHdWallet');
        void loadHdWallet();
      }
    }
  };

  return <Web3Modal />;
}
