import { Dispatch, SetStateAction, useContext } from 'react';
import * as Sentry from '@sentry/react-native';
import JailMonkey from 'jail-monkey';
import RNExitApp from 'react-native-exit-app';
import {
  ConnectionTypes,
  GlobalContextType,
  PinPresentStates,
  RPCPreference,
  SignMessageValidationType,
} from '../../constants/enum';
import { initializeHostsFromAsync } from '../../global';
import {
  getActivities,
  getAuthToken,
  getConnectionType,
  getDeveloperMode,
  getReadOnlyWalletData,
  getRpcEndpoints,
  setAuthToken,
  setRefreshToken,
  setRpcEndpoints,
} from '../../core/asyncStorage';
import {
  GlobalContext,
  RpcResponseDetail,
  initialGlobalState,
} from '../../core/globalContext';
import { get, has, set } from 'lodash';
import useAxios from '../../core/HttpRequest';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import {
  isBiometricEnabled,
  isPinAuthenticated,
  loadCyRootData,
  loadFromKeyChain,
  signIn,
} from '../../core/Keychain';
import { initialHdWalletState } from '../../reducers';
import {
  ActivityContext,
  DUMMY_AUTH,
  HdWalletContext,
  getPlatform,
  getPlatformVersion,
} from '../../core/util';
import Intercom from '@intercom/intercom-react-native';
import analytics from '@react-native-firebase/analytics';
import DeviceInfo, { getVersion } from 'react-native-device-info';
import useCardUtilities from '../useCardUtilities';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import useValidSessionToken from '../useValidSessionToken';
import { CardProfile } from '../../models/cardProfile.model';
import { getToken } from '../../notification/pushNotification';

export default function useInitializer() {
  const { getWithoutAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const { ethereum, solana } = hdWallet.state.wallet;
  const inAppUpdates = new SpInAppUpdates(
    false, // isDebug
  );
  const { verifySessionToken } = useValidSessionToken();
  const { getWalletProfile } = useCardUtilities();

  // Data scrubbing is now handled in App.tsx Sentry initialization

  // Sentry initialization is now handled in App.tsx for v7 compatibility

  const checkAPIAccessibility = async () => {
    const response = await getWithoutAuth('/health');
    return !response.isError;
  };

  async function registerIntercomUser(walletAddresses: {
    [key: string]: string;
  }) {
    const devMode = await getDeveloperMode();
    if (!devMode && walletAddresses.ethereumAddress) {
      Intercom.loginUserWithUserAttributes({
        userId: walletAddresses.ethereumAddress,
      }).catch(() => {
        // throws error if user is already registered
      });
      Intercom.updateUser({
        userId: walletAddresses.ethereumAddress,
        customAttributes: {
          ...walletAddresses,
          version: DeviceInfo.getVersion(),
        },
      }).catch(() => {
        // throws error if user is already registered
      });
    }
    void analytics().setAnalyticsCollectionEnabled(!devMode);
  }

  const exitIfJailBroken = async () => {
    try {
      if (JailMonkey.isJailBroken()) {
        // Alternative behaviour for jail-broken/rooted devices.
        RNExitApp.exitApp();
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const checkAndMaintainUpdatedRPCEndpointsInAsync = async (
    rpcEndpoints: RpcResponseDetail,
  ) => {
    const resultFromEndpoint = await getWithoutAuth(
      `/v1/configuration/rpcEndpoints`,
    );
    const updatedEndpoints = {};
    const availableChains = Object.keys(resultFromEndpoint.data);
    availableChains.map(async chain => {
      if (get(resultFromEndpoint.data, chain) && get(rpcEndpoints, chain)) {
        Object.assign(updatedEndpoints, { [chain]: get(rpcEndpoints, chain) });
      } else if (
        get(resultFromEndpoint.data, chain) &&
        !get(rpcEndpoints, chain) &&
        initialGlobalState?.rpcEndpoints &&
        get(initialGlobalState.rpcEndpoints, chain)
      ) {
        Object.assign(updatedEndpoints, {
          [chain]: get(initialGlobalState.rpcEndpoints, chain),
        });
      }
      await setRpcEndpoints(JSON.stringify(updatedEndpoints));
    });
    return updatedEndpoints;
  };

  const fetchRPCEndpointsFromServer = async (globalDispatch: any) => {
    const rpcPreference: string = RPCPreference.DEFAULT;
    // const rpcPreferenceFromAsync = await getRpcPreference();
    // if (rpcPreferenceFromAsync && rpcPreferenceFromAsync !== '') {
    //   rpcPreference = rpcPreferenceFromAsync;
    // }
    let result;
    const RPCFromAsync = await getRpcEndpoints();
    if (
      RPCFromAsync &&
      RPCFromAsync !== '' &&
      rpcPreference === RPCPreference.OVERIDDEN
    ) {
      const updatedRPCFromAsync =
        await checkAndMaintainUpdatedRPCEndpointsInAsync(
          JSON.parse(RPCFromAsync),
        );
      result = updatedRPCFromAsync;
    } else {
      const resultFromEndpoint = await getWithoutAuth(
        `/v1/configuration/rpcEndpoints`,
      );
      result = resultFromEndpoint.data;
    }
    globalDispatch({ type: GlobalContextType.RPC_UPDATE, rpc: result });
    return result;
  };

  const checkForUpdatesAndShowModal = async (
    setUpdateModal: Dispatch<SetStateAction<boolean>>,
  ) => {
    try {
      const res = await inAppUpdates.checkNeedsUpdate();
      if (res.shouldUpdate) {
        setUpdateModal(true);
      }
    } catch (e) {
      const errorObject = {
        e,
        platform: getPlatform(),
        platformVersion: getPlatformVersion(),
        appVersion: getVersion(),
      };
      Sentry.captureException(errorObject);
    }
  };

  const loadActivitiesFromAsyncStorage = async () => {
    const activities = await getActivities();
    if (activities) {
      activityContext.dispatch({
        type: ActivityReducerAction.LOAD,
        value: JSON.parse(activities),
      });
    }
  };

  const isDeviceBiometricEnabled = async (): Promise<boolean> => {
    const isBiometricPasscodeEnabled = await isBiometricEnabled();
    return isBiometricPasscodeEnabled;
  };

  const pinAlreadySetStatus = async (): Promise<PinPresentStates> => {
    const pinAuthenticated = await isPinAuthenticated();
    if (pinAuthenticated) {
      return PinPresentStates.TRUE;
    } else {
      return PinPresentStates.FALSE;
    }
  };

  const loadExistingWallet = async (
    dispatch: {
      (value: any): void;
      (arg0: {
        type: string;
        value: {
          chain: string;
          address: any;
          publicKey: any;
          algo: any;
        };
      }): void;
    },
    state = initialHdWalletState,
  ) => {
    const cyRootData = await loadCyRootData(state);
    if (cyRootData) {
      const { accounts } = cyRootData;
      if (!accounts) {
        Sentry.captureMessage('app load error for load existing wallet');
      } else if (
        accounts.ethereum?.[0]?.address ||
        accounts.solana?.[0]?.address
      ) {
        const attributes = {};
        Object.keys(accounts).forEach((chainName: string) => {
          const chainAccountList = accounts[chainName];
          chainAccountList.forEach(
            (addressDetail: {
              address: string;
              publicKey: string;
              algo: string;
              path: string;
            }) => {
              dispatch({
                type: 'ADD_ADDRESS',
                value: {
                  chain: chainName,
                  address: addressDetail.address,
                  publicKey: addressDetail.publicKey,
                  algo: addressDetail.algo,
                  path: addressDetail.path,
                },
              });
              set(attributes, `${chainName}Address`, addressDetail.address);
            },
          );
        });
        void registerIntercomUser(attributes);
      } else {
        void getReadOnlyWalletData().then(data => {
          if (data) {
            const _ethereum = JSON.parse(data);
            dispatch({
              type: 'SET_READ_ONLY_WALLET',
              value: {
                isReadOnlyWallet: true,
              },
            });
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                chain: 'ethereum',
                address: get(_ethereum, 'address', ''),
                publicKey: '',
                algo: '',
              },
            });
            Intercom.loginUserWithUserAttributes({
              userId: _ethereum.observerId,
            }).catch(() => {
              // throws error if user is already registered
            });
          } else {
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                chain: 'ethereum',
                address: undefined,
                publicKey: '',
                algo: '',
                path: '',
              },
            });
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                chain: 'solana',
                address: undefined,
                publicKey: '',
                algo: '',
                path: '',
              },
            });
          }
        });
      }
    }
  };

  const getProfile = async (token: string) => {
    const data = (await getWalletProfile(token)) as CardProfile;
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const getAuthTokenData = async (
    setForcedUpdate: Dispatch<SetStateAction<boolean>>,
    setTamperedSignMessageModal: Dispatch<SetStateAction<boolean>>,
    setUpdateModal: Dispatch<SetStateAction<boolean>>,
    setShowDefaultAuthRemoveModal: Dispatch<SetStateAction<boolean>>,
  ) => {
    try {
      const isSessionTokenValid = await verifySessionToken();
      if (!isSessionTokenValid) {
        const signInResponse = await signIn(
          hdWallet,
          setShowDefaultAuthRemoveModal,
        );
        if (signInResponse) {
          if (
            signInResponse?.message === SignMessageValidationType.VALID &&
            has(signInResponse, 'token')
          ) {
            setForcedUpdate(false);
            setTamperedSignMessageModal(false);
            globalContext.globalDispatch({
              type: GlobalContextType.SIGN_IN,
              sessionToken: signInResponse?.token,
            });
            globalContext.globalDispatch({
              type: GlobalContextType.IS_APP_AUTHENTICATED,
              isAuthenticated: true,
            });
            await setAuthToken(signInResponse?.token);
            if (has(signInResponse, 'refreshToken')) {
              await setRefreshToken(signInResponse?.refreshToken);
            }
            void getProfile(signInResponse.token);
          } else if (
            signInResponse?.message === SignMessageValidationType.INVALID
          ) {
            setUpdateModal(false);
            setTamperedSignMessageModal(true);
          } else if (
            signInResponse?.message === SignMessageValidationType.NEEDS_UPDATE
          ) {
            setUpdateModal(true);
            setForcedUpdate(true);
          }
        }
      } else {
        let authToken = await getAuthToken();
        const connectionType = await getConnectionType();
        // don't ask for authentication in case of wallet connect
        if (!(connectionType === ConnectionTypes.WALLET_CONNECT)) {
          await loadFromKeyChain(DUMMY_AUTH, true, () =>
            setShowDefaultAuthRemoveModal(true),
          );
        }
        authToken = JSON.parse(String(authToken));
        void getProfile(authToken ?? '');
        globalContext.globalDispatch({
          type: GlobalContextType.IS_APP_AUTHENTICATED,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const getHosts = async (
    setForcedUpdate: Dispatch<SetStateAction<boolean>>,
    setTamperedSignMessageModal: Dispatch<SetStateAction<boolean>>,
    setUpdateModal: Dispatch<SetStateAction<boolean>>,
    setShowDefaultAuthRemoveModal: Dispatch<SetStateAction<boolean>>,
  ) => {
    const hosts = await initializeHostsFromAsync();
    if (hosts) {
      if (ethereum.address || solana.address) {
        void getAuthTokenData(
          setForcedUpdate,
          setTamperedSignMessageModal,
          setUpdateModal,
          setShowDefaultAuthRemoveModal,
        );
      }
      if (ethereum.address || solana.address) {
        await getToken(ethereum.address ?? solana.address ?? '');
      }
    }
  };

  return {
    exitIfJailBroken,
    fetchRPCEndpointsFromServer,
    loadActivitiesFromAsyncStorage,
    isDeviceBiometricEnabled,
    pinAlreadySetStatus,
    loadExistingWallet,
    getHosts,
    checkForUpdatesAndShowModal,
    checkAPIAccessibility,
  };
}
