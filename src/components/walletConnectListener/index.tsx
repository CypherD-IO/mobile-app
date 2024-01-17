import React, { useContext, useEffect, useMemo } from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import useAxios from '../../core/HttpRequest';
import { GlobalContext } from '../../core/globalContext';
import '@walletconnect/react-native-compat';
import { Web3Modal } from '@web3modal/wagmi-react-native';
import { WalletConnectModal } from '@walletconnect/modal-react-native';
import { ethers } from 'ethers';
import axios from '../../core/Http';
import { ConnectionTypes, GlobalContextType } from '../../constants/enum';
import {
  setAuthToken,
  setConnectionType,
  setRefreshToken,
} from '../../core/asyncStorage';
import { ethToEvmos } from '@tharsis/address-converter';
import { hostWorker } from '../../global';
import useValidSessionToken from '../../hooks/useValidSessionToken';
import { utf8ToHex } from 'web3-utils';
import { useAccount } from 'wagmi';

export default function WalletConnectListener() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { isConnected, address, connector } = useAccount();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { verifySessionToken } = useValidSessionToken();
  const { getWithoutAuth } = useAxios();

  useEffect(() => {
    console.log(isConnected, address);
    if (
      isConnected &&
      address &&
      (!ethereum.address ||
        ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_)
    ) {
      void verifySessionTokenAndSign();
    }
  }, [isConnected, address]);

  const loadHdWallet = () => {
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
      // const signature = await web3Provider.send('personal_sign', [
      //   hexMsg,
      //   address?.toLowerCase(),
      // ]);
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

  return <Web3Modal />;
}
