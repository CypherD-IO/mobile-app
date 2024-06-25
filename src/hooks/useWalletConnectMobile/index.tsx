import { useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi-react-native';
import { useAccount, useDisconnect } from 'wagmi';

export default function useWalletConnectMobile() {
  const { open } = useWeb3Modal();
  const { isConnected, connector, address } = useAccount();
  const { disconnectAsync } = useDisconnect();

  const openWalletConnectModal = async () => {
    if (isConnected) {
      try {
        await disconnectAsync();
      } catch (e) {}
    }
    void open({ view: 'Connect' });
  };
  const disconnectWalletConnect = async () => {
    if (isConnected) {
      try {
        await disconnectAsync();
      } catch (e) {}
    }
  };

  return { openWalletConnectModal, disconnectWalletConnect };
}