import { useAppKit } from '@reown/appkit-react-native';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect } from 'react';
import { wcDebug, wcWarn } from '../../core/walletConnectDebug';

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

  useEffect(() => {
    wcDebug('AppKit', 'useAccount() state changed', {
      isConnected,
      isConnecting,
      address: address ? `${address.slice(0, 6)}…${address.slice(-4)}` : undefined,
    });
  }, [isConnected, isConnecting, address]);

  /**
   * Opens the Reown/AppKit WalletConnect sheet.
   * If there is an existing connection we explicitly disconnect first so
   * the user always sees a clean connection flow.
   */
  const openWalletConnectModal = async (): Promise<void> => {
    if (isConnected) {
      try {
        wcDebug('AppKit', 'Disconnecting existing session before opening Connect view');
        await disconnectAsync();
      } catch (error) {
        wcWarn('AppKit', 'Failed disconnect before open()', error as any);
      }
    }

    try {
      wcDebug('AppKit', 'Opening AppKit modal', { view: 'Connect' });
      void open({ view: 'Connect' });
    } catch (error) {
      wcWarn('AppKit', 'Failed to open AppKit modal', error as any);
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
      wcDebug('AppKit', 'Disconnecting AppKit session');
      await disconnectAsync();
    } catch (error) {
      wcWarn('AppKit', 'Failed disconnectAsync()', error as any);
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
