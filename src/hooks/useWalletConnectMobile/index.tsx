import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import { useContext, useEffect, useMemo } from 'react';
import useAxios from '../../core/HttpRequest';
import { ethers } from 'ethers';
import { utf8ToHex } from 'web3-utils';
import { GlobalContextType } from '../../constants/enum';
import { GlobalContext } from '../../core/globalContext';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import { ethToEvmos } from '@tharsis/address-converter';
import axios from '../../core/Http';
import { hostWorker } from '../../global';

export default function useWalletConnectMobile() {
  const { open, isConnected, provider, address } = useWalletConnectModal();
  const { getWithoutAuth, postWithoutAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');

  useEffect(() => {
    if (isConnected && address) {
      void signMessage();
    }
  }, [isConnected, address]);

  const web3Provider = useMemo(
    () => (provider ? new ethers.providers.Web3Provider(provider) : undefined),
    [provider],
  );

  const signMessage = async () => {
    if (!web3Provider) {
      throw new Error('web3Provider not connected');
    }
    const response = await getWithoutAuth(
      `/v1/authentication/sign-message/${String(address)}`,
    );
    if (!response.isError) {
      const msg = response.data.message;
      const hexMsg = utf8ToHex(msg);
      const signature = await web3Provider.send('personal_sign', [
        hexMsg,
        address?.toLowerCase(),
      ]);
      const verifyMessageResponse = await axios.post(
        `${ARCH_HOST}/v1/authentication/verify-message/${address?.toLowerCase()}`,
        {
          signature,
        },
      );
      if (verifyMessageResponse?.data.token) {
        const token = verifyMessageResponse.data.token;
        globalContext.globalDispatch({
          type: GlobalContextType.SIGN_IN,
          sessionToken: token,
        });
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
      }
    }
  };

  const openWalletConnectModal = async () => {
    if (isConnected) {
      try {
        await provider?.disconnect();
      } catch (e) {
        console.log(e);
      }
    } else {
      void open();
    }
  };

  return { openWalletConnectModal };
}
