import { useWalletConnectModal } from '@walletconnect/modal-react-native';

export default function useWalletConnectMobile() {
  const { open, isConnected, provider } = useWalletConnectModal();

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
