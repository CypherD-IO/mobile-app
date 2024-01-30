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
    const provider = await connector?.getProvider();
    if (provider?.close) {
      await provider.close();
    }
    if (isConnected) {
      try {
        await disconnect();
        await provider?.disconnect();
      } catch (e) {}
    }
    void open({ view: 'Connect' });
  };
  const disconnectWalletConnect = async () => {
    try {
      // const provider = await connector?.getProvider();
      const result = await disconnect();
      // const result = await disconnect();
      // await provider?.disconnect();
      // await connector?.disconnect();
      // RNRestart.Restart();
      return result;
    } catch (e) {}
  };

  return { openWalletConnectModal, disconnectWalletConnect };
}
