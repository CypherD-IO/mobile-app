import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit-wagmi-react-native';

export default function useWalletConnectMobile() {
  const { open } = useAppKit();
  const { isConnected, connector, address } = useAccount();
  const { disconnectAsync } = useDisconnect();

  const openWalletConnectModal = async () => {
    if (isConnected) {
      try {
        await disconnectAsync();
      } catch (e) {}
    }
    open({ view: 'Connect' });
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
