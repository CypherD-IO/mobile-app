import { useContext, useEffect, useState } from 'react';
import {
  clearAllData,
  getConnectionType,
  getReadOnlyWalletData,
} from '../../core/asyncStorage';
import { ConnectionTypes, GlobalModalType } from '../../constants/enum';
import {
  isPinAuthenticated,
  loadFromKeyChain,
  removeCredentialsFromKeychain,
} from '../../core/Keychain';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import {
  AUTHORIZE_WALLET_DELETION,
  ActivityContext,
  HdWalletContext,
  PortfolioContext,
} from '../../core/util';
import { screenTitle } from '../../constants';
import { GlobalContext } from '../../core/globalContext';
import useAxios from '../../core/HttpRequest';
import axios from '../../core/Http';
import { DELETE_WALLET_TIMEOUT } from '../../constants/timeOuts';
import { hostWorker } from '../../global';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import useWalletConnectMobile from '../useWalletConnectMobile';

export default function useConnectionManager() {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { t } = useTranslation();
  const { openWalletConnectModal, disconnectWalletConnect } =
    useWalletConnectMobile();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const portfolioContext = useContext<any>(PortfolioContext);
  const globalContext = useContext<any>(GlobalContext);
  const cosmosAddress =
    hdWalletContext.state.wallet.cosmos?.wallets[0]?.address;
  const osmosisAddress =
    hdWalletContext.state.wallet.osmosis?.wallets[0]?.address;
  const junoAddress = hdWalletContext.state.wallet.juno?.wallets[0]?.address;
  const [connectionType, setConnectionType] = useState<ConnectionTypes>();
  const { showModal, hideModal } = useGlobalModalContext();
  const { deleteWithoutAuth } = useAxios();
  const getConnectedType = async () => {
    const connectedType = await getConnectionType();
    setConnectionType(connectedType as ConnectionTypes);
  };

  const deletAndResetReducers = async () => {
    if (connectionType === ConnectionTypes.WALLET_CONNECT) {
      await disconnectWalletConnect();
    } else {
      await removeCredentialsFromKeychain();
    }
    await clearAllData();
    hdWalletContext.dispatch({ type: 'FORGET_WALLET' });
    activityContext.dispatch({ type: ActivityReducerAction.RESET });
    portfolioContext.dispatchPortfolio({ type: 'RESET' });
    return true;
  };

  const deleteWalletConfig = async () => {
    const { isReadOnlyWallet } = hdWalletContext.state;
    const { ethereum } = hdWalletContext.state.wallet;
    if (!isReadOnlyWallet) {
      const config = {
        headers: {
          Authorization: `Bearer ${String(globalContext.globalState.token)}`,
        },
        data: {
          cosmosAddress,
          osmosisAddress,
          junoAddress,
        },
      };
      axios
        .delete(`${ARCH_HOST}/v1/configuration/device`, config)
        .catch(error => {
          Sentry.captureException(error);
        });
    } else {
      const data = await getReadOnlyWalletData();
      if (data) {
        const readOnlyWalletData = JSON.parse(data);
        await deleteWithoutAuth(
          `/v1/configuration/address/${String(
            ethereum.address,
          )}/observer/${String(readOnlyWalletData.observerId)}`,
        );
      }
    }
    setTimeout(() => {
      void deletAndResetReducers();
    }, DELETE_WALLET_TIMEOUT);
  };

  const authorizeWalletDeletion = async ({
    navigation,
  }: {
    navigation: any;
  }) => {
    if (connectionType !== ConnectionTypes.WALLET_CONNECT) {
      const isPinSet = await isPinAuthenticated();
      if (!isPinSet) {
        const authorization = await loadFromKeyChain(AUTHORIZE_WALLET_DELETION);
        if (authorization) {
          await deleteWalletConfig();
        }
      } else {
        navigation.navigate(screenTitle.PIN, {
          title: `${t<string>('ENTER_PIN_TO_DELETE')}`,
          callback: deleteWalletConfig,
        });
      }
    } else {
      await deleteWalletConfig();
    }
  };

  const deleteWallet = async ({
    navigation,
    importNewWallet,
  }: {
    navigation: any;
    importNewWallet?: boolean;
  }) => {
    showModal(GlobalModalType.REMOVE_WALLET, {
      connectionType,
      onSuccess: () => {
        hideModal();
        void authorizeWalletDeletion({ navigation });
      },
      onFailure: hideModal,
    });
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
