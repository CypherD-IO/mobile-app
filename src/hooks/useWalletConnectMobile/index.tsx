import { useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi-react-native';
import { disconnect, getAccount } from '@wagmi/core';
import { useAccount, useDisconnect } from 'wagmi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import RNRestart from 'react-native-restart';

export default function useWalletConnectMobile() {
  const { open } = useWeb3Modal();
  const { isConnected, connector, address } = useAccount();

  useEffect(() => {
    console.log('isConnected:', isConnected, address);
  }, [isConnected]);

  const openWalletConnectModal = async () => {
    console.log(isConnected);
    console.log('connector:', connector);
    const provider = await connector?.getProvider();
    if (provider?.close) {
      await provider.close();
    }
    if (isConnected) {
      try {
        await disconnect();
        await provider?.disconnect();
      } catch (e) {
        console.log(e);
      }
    }
    void open({ view: 'Connect' });
  };
  const disconnectWalletConnect = async () => {
    try {
      const provider = await connector?.getProvider();
      await provider?.disconnect();
      await connector?.disconnect();
      const result = await disconnect();
      const account = getAccount();
      const tempProvider = await account.connector?.getProvider();
      await tempProvider?.disconnect();
      RNRestart.Restart();
      console.log('result:', result);
      return result;
    } catch (e) {
      console.log('error:', e);
    }
  };

  return { openWalletConnectModal, disconnectWalletConnect };
}
