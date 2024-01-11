import { getConnectionType } from '../../core/asyncStorage';
import useWalletConnectMobile from '../useWalletConnectMobile';

export default function useConnectionManager() {
  const { openWalletConnectModal } = useWalletConnectMobile();

  const getConnectedType = async () => {
    const connectionType = await getConnectionType();
    return connectionType;
  };

  return { getConnectedType, openWalletConnectModal };
}
