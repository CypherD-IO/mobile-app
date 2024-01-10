import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import { useEffect } from 'react';
import useWalletConnectMobile from '../useWalletConnectMobile';

export default function useConnectionManager() {
  const { openWalletConnectModal } = useWalletConnectMobile();

  return { openWalletConnectModal };
}
