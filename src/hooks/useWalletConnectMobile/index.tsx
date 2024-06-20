import { useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi-react-native';
// import { disconnect, getAccount } from '@wagmi/core';
import { useAccount, useDisconnect } from 'wagmi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import RNRestart from 'react-native-restart';

export default function useWalletConnectMobile() {
  const { open } = useWeb3Modal();
  const { isConnected, connector, address } = useAccount();
  const { disconnect } = useDisconnect();

  const openWalletConnectModal = async () => {
    console.log('open wallet connect modal');
    // const provider = await connector?.getProvider();
    // console.log('provider : ', provider);
    // if (provider?.close) {
    //   await provider.close();
    // }
    console.log('isConnected inside openwalletconnectwallet : ', isConnected);
    // console.log('address : ', address);
    if (isConnected) {
      try {
        await disconnect();
        // console.log('disconnecting : ', provider?.disconnect);
        // await provider?.disconnect();
        console.log('disconnected');
      } catch (e) {
        console.log('error while disconnection : ', e);
      }
    }
    void open({ view: 'Connect' });
  };
  const disconnectWalletConnect = async () => {
    const provider = await connector?.getProvider();
    console.log('🚀 ~ disconnectWalletConnect ~ provider:', provider);
    if (isConnected) {
      try {
        await disconnect();
        // console.log('disconnecting : ', provider?.disconnect);
        // if (provider?.disconnect) {
        //   await provider?.disconnect();
        //   console.log('disconnected with provider');
        // }
      } catch (e) {
        console.log('error while disconnecedtion : ', e);
      }
    }
  };

  return { openWalletConnectModal, disconnectWalletConnect };
}
