import { useContext, useEffect, useState } from 'react';
import {
  clearAllData,
  getConnectionType,
  getReadOnlyWalletData,
} from '../../core/asyncStorage';
import {
  ConnectionTypes,
  GlobalContextType,
  GlobalModalType,
} from '../../constants/enum';
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
// import { web3AuthEvm, web3AuthSolana } from '../../constants/web3Auth';
import Web3Auth from '@web3auth/react-native-sdk/dist/types/Web3Auth';
import useWeb3Auth from '../useWeb3Auth';

export default function useConnectionManager() {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { t } = useTranslation();
  const { openWalletConnectModal, disconnectWalletConnect } =
    useWalletConnectMobile();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const globalContext = useContext<any>(GlobalContext);
  const cosmosAddress =
    hdWalletContext.state.wallet.cosmos?.wallets[0]?.address;
  const osmosisAddress =
    hdWalletContext.state.wallet.osmosis?.wallets[0]?.address;
  const [connectionType, setConnectionType] = useState<ConnectionTypes>();
  const { showModal, hideModal } = useGlobalModalContext();
  const { deleteWithoutAuth } = useAxios();
  const getConnectedType = async () => {
    const connectedType = await getConnectionType();
    setConnectionType(connectedType);
    return connectedType;
  };
  const { web3AuthEvm, web3AuthSolana } = useWeb3Auth();

  const deletAndResetReducers = async () => {
    if (connectionType === ConnectionTypes.WALLET_CONNECT) {
      await disconnectWalletConnect();
    } else {
      await removeCredentialsFromKeychain();
    }
    await clearAllData();
    await hdWalletContext.dispatch({ type: 'RESET_WALLET' });
    await activityContext.dispatch({ type: ActivityReducerAction.RESET });
    await globalContext.globalDispatch({
      type: GlobalContextType.RESET_GLOBAL_STATE,
    });
    return true;
  };

  const deleteWalletConfig = async () => {
    const { isReadOnlyWallet } = hdWalletContext.state;
    const { ethereum, solana } = hdWalletContext.state.wallet;
    const address = ethereum?.address ?? solana?.address;
    if (!isReadOnlyWallet) {
      const config = {
        headers: {
          Authorization: `Bearer ${String(globalContext.globalState.token)}`,
        },
        data: {
          cosmosAddress,
          osmosisAddress,
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
            address,
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

  const deleteWallet = async ({ navigation }: { navigation: any }) => {
    showModal(GlobalModalType.REMOVE_WALLET, {
      connectionType,
      onSuccess: () => {
        hideModal();
        void authorizeWalletDeletion({ navigation });
      },
      onFailure: hideModal,
    });
  };

  const getSocialAuthProvider = async (): Promise<Web3Auth | null> => {
    if (
      connectionType &&
      [
        ConnectionTypes.SOCIAL_LOGIN_EVM,
        ConnectionTypes.SOCIAL_LOGIN_SOLANA,
      ].includes(connectionType)
    ) {
      let web3Auth;
      switch (connectionType) {
        case ConnectionTypes.SOCIAL_LOGIN_EVM:
          web3Auth = web3AuthEvm;
          break;
        case ConnectionTypes.SOCIAL_LOGIN_SOLANA:
          web3Auth = web3AuthSolana;
          break;
      }
      if (web3Auth) {
        await web3Auth.init();
        return web3Auth;
      }
    }
    return null;
  };

  const deleteSocialAuthWalletIfSessionExpired = async () => {
    const socialAuthProvider = await getSocialAuthProvider();
    if (socialAuthProvider && !socialAuthProvider.connected) {
      showModal(GlobalModalType.REMOVE_SOCIAL_AUTH_WALLET, {
        onSuccess: () => {
          hideModal();
          void deleteWalletConfig();
        },
        onFailure: hideModal,
      });
    }
  };

  useEffect(() => {
    void getConnectedType();
  }, []);

  return {
    connectionType,
    openWalletConnectModal,
    disconnectWalletConnect,
    deleteWallet,
    getConnectedType,
    deleteWalletConfig,
    getSocialAuthProvider,
    deleteSocialAuthWalletIfSessionExpired,
  };
}
