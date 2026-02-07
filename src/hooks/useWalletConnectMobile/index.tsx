import { useAppKit } from '@reown/appkit-react-native';
import { useAccount, useDisconnect } from 'wagmi';

interface UseWalletConnectMobileResult {
  openWalletConnectModal: () => Promise<void>;
  disconnectWalletConnect: () => Promise<void>;
  /**
   * True when a WalletConnect session is fully established.
   * Useful for driving UI states like "Wallet connected".
   */
  isConnected: boolean;
  /**
   * True while the underlying WalletConnect/AppKit flow is in the process
   * of establishing a session.
   */
  isConnecting: boolean;
  /**
   * Currently connected EVM address (if any).
   */
  address?: string;
}

export default function useWalletConnectMobile(): UseWalletConnectMobileResult {
  const { open } = useAppKit();
  const { isConnected, isConnecting, address } = useAccount();
  const { disconnectAsync } = useDisconnect();

  /**
   * Opens the Reown/AppKit WalletConnect sheet.
   * If there is an existing connection we explicitly disconnect first so
   * the user always sees a clean connection flow.
   */
  const openWalletConnectModal = async (): Promise<void> => {
    if (isConnected) {
      try {
        await disconnectAsync();
      } catch {
        // Ignore disconnect errors before opening modal
      }
    }

    try {
      void open({ view: 'Connect' });
    } catch {
      // Ignore open errors
    }
  };

  /**
   * Explicitly tears down the current WalletConnect/AppKit session (if any).
   * This is used when the user backs out of the flow from our UI.
   */
  const disconnectWalletConnect = async (): Promise<void> => {
    if (!isConnected) {
      return;
    }

    try {
      await disconnectAsync();
    } catch {
      // Ignore disconnect errors
    }
  };

  return {
    openWalletConnectModal,
    disconnectWalletConnect,
    isConnected,
    isConnecting,
    address,
  };
}
