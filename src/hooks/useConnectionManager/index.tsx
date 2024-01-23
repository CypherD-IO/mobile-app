import { useContext, useEffect, useState } from 'react';
import { clearAllData, getConnectionType } from '../../core/asyncStorage';
import useWalletConnectMobile from '../useWalletConnectMobile';
import { ConnectionTypes } from '../../constants/enum';
import { removeCredentialsFromKeychain } from '../../core/Keychain';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import {
  ActivityContext,
  HdWalletContext,
  PortfolioContext,
} from '../../core/util';

export default function useConnectionManager() {
  const { openWalletConnectModal, disconnectWalletConnect } =
    useWalletConnectMobile();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const portfolioContext = useContext<any>(PortfolioContext);
  const [connectionType, setConnectionType] = useState<ConnectionTypes>(
    ConnectionTypes.SEED_PHRASE,
  );
  const getConnectedType = async () => {
    const connectedType = await getConnectionType();
    setConnectionType(connectedType as ConnectionTypes);
  };

  const deleteWallet = async () => {
    if (connectionType === ConnectionTypes.WALLET_CONNECT) {
      await disconnectWalletConnect();
    } else {
      await removeCredentialsFromKeychain();
    }
    await clearAllData();
    hdWalletContext.dispatch({ type: 'FORGET_WALLET' });
    activityContext.dispatch({ type: ActivityReducerAction.RESET });
    portfolioContext.dispatchPortfolio({ type: 'RESET' });
  };

  useEffect(() => {
    void getConnectedType();
  }, []);

  return {
    connectionType,
    openWalletConnectModal,
    disconnectWalletConnect,
    deleteWallet,
  };
}
