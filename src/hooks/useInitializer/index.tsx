import { Dispatch, SetStateAction, useContext } from 'react';
import * as Sentry from '@sentry/react-native';
import JailMonkey from 'jail-monkey';
import RNExitApp from 'react-native-exit-app';
import {
  ConnectionTypes,
  AllChainsEnum,
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
  getDeviceLoginUsageReported,
  getDeveloperMode,
  getReadOnlyWalletData,
  getRpcEndpoints,
  setAuthToken,
  setDeviceLoginUsageReported,
  setRefreshToken,
  setRpcEndpoints,
  getUpdateReminderSnoozeUntil,
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
import { Platform } from 'react-native';
import semver from 'semver';
import useCardUtilities from '../useCardUtilities';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import useValidSessionToken from '../useValidSessionToken';
import { CardProfile } from '../../models/cardProfile.model';
import { getToken } from '../../notification/pushNotification';
import useWeb3Auth from '../useWeb3Auth';

export default function useInitializer() {
  const { getWithoutAuth, postWithAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const { ethereum, solana } = hdWallet.state.wallet;
  const inAppUpdates = new SpInAppUpdates(!!__DEV__);
  const { verifySessionToken } = useValidSessionToken();
  const { getWalletProfile } = useCardUtilities();
  const { web3AuthEvm, web3AuthSolana } = useWeb3Auth();

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
      // Respect snooze if the user tapped "Later" within the last 24 hours
      const snoozeUntil = await getUpdateReminderSnoozeUntil();
      if (snoozeUntil && Date.now() < snoozeUntil) {
        return;
      }
      // Build options explicitly to avoid any null version comparisons inside the library
      const options: any = {
        curVersion: String(getVersion()).trim(),
        customVersionComparator: (
          storeVersion: string,
          currentVersion: string,
        ) => {
          // Defensive comparator: coerce both sides and gracefully handle nulls
          try {
            const store = semver.coerce(storeVersion);
            const current = semver.coerce(currentVersion);
            if (store && current) return semver.compare(store, current);
            if (store && !current) return 1; // if current unparsable, assume update available
            if (!store && current) return -1; // if store unparsable, assume no update
            return 0;
          } catch {
            return 0;
          }
        },
      };
      // For iOS, provide the App Store application id to make the lookup deterministic
      if (Platform.OS === 'ios') {
        // Cypherd Wallet iOS App Store ID (used elsewhere in the app for store links)
        options.appId = '1604120414';
      }

      const res = await inAppUpdates.checkNeedsUpdate(options);
      if (res?.shouldUpdate) {
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

  const getLoginMethod = (connectionType?: ConnectionTypes | null): string => {
    switch (connectionType) {
      case ConnectionTypes.SOCIAL_LOGIN_EVM:
        return 'socialLoginEvm';
      case ConnectionTypes.SOCIAL_LOGIN_SOLANA:
        return 'socialLoginSolana';
      case ConnectionTypes.SEED_PHRASE:
        return 'seedPhrase';
      case ConnectionTypes.PRIVATE_KEY:
        return 'privateKey';
      case ConnectionTypes.WALLET_CONNECT:
      case ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN:
        return 'walletConnect';
      default:
        return 'unknown';
    }
  };

  const getSocialInfo = async (
    connectionType?: ConnectionTypes | null,
  ): Promise<{ email?: string; method?: 'email' | 'google' | 'apple' }> => {
    try {
      const parseMethod = (rawMethod?: string) => {
        const normalized = (rawMethod ?? '').toLowerCase();
        if (normalized.includes('google')) return 'google';
        if (normalized.includes('apple')) return 'apple';
        if (normalized.includes('email') || normalized.includes('passwordless'))
          return 'email';
        return undefined;
      };

      if (connectionType === ConnectionTypes.SOCIAL_LOGIN_EVM) {
        await web3AuthEvm.init();
        const userInfo = web3AuthEvm.userInfo();
        const email = userInfo?.email?.trim().toLowerCase();
        const method = parseMethod(
          String(
            userInfo?.typeOfLogin ??
              userInfo?.verifier ??
              userInfo?.aggregateVerifier ??
              '',
          ),
        );
        return { email, method };
      }
      if (connectionType === ConnectionTypes.SOCIAL_LOGIN_SOLANA) {
        await web3AuthSolana.init();
        const userInfo = web3AuthSolana.userInfo();
        const email = userInfo?.email?.trim().toLowerCase();
        const method = parseMethod(
          String(
            userInfo?.typeOfLogin ??
              userInfo?.verifier ??
              userInfo?.aggregateVerifier ??
              '',
          ),
        );
        return { email, method };
      }
    } catch (e) {
      Sentry.captureException(e);
    }
    return {};
  };

  const reportDeviceLoginUsage = async (authToken?: string) => {
    try {
      const alreadyReported = await getDeviceLoginUsageReported();
      if (alreadyReported) {
        return;
      }

      const connectionType = await getConnectionType();
      const address = ethereum.address ?? solana.address ?? '';
      if (!address) {
        return;
      }
      const chain =
        connectionType === ConnectionTypes.SOCIAL_LOGIN_SOLANA ||
        (!ethereum.address && solana.address)
          ? AllChainsEnum.SOLANA
          : AllChainsEnum.ETH;
      const defaultMethod = getLoginMethod(connectionType);
      const socialInfo = await getSocialInfo(connectionType);
      const isSocialConnection =
        connectionType === ConnectionTypes.SOCIAL_LOGIN_EVM ||
        connectionType === ConnectionTypes.SOCIAL_LOGIN_SOLANA;
      const resolvedMethod =
        isSocialConnection && socialInfo.method
          ? `${socialInfo.method}:${defaultMethod}`
          : defaultMethod;

      const payload: {
        method: string;
        chain: AllChainsEnum;
        email?: string;
      } = {
        method: resolvedMethod,
        chain,
      };

      if (socialInfo.email) {
        payload.email = socialInfo.email;
      }

      const response = await postWithAuth(
        '/v1/configuration/device/wallet-info',
        payload,
        undefined,
        authToken
          ? {
              headers: {
                Authorization: `Bearer ${String(authToken)}`,
              },
            }
          : undefined,
      );
      if (!response?.isError) {
        await setDeviceLoginUsageReported(true);
      }
    } catch (e) {
      Sentry.captureException(e);
    }
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
            void reportDeviceLoginUsage(signInResponse.token);
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
        void reportDeviceLoginUsage(authToken ?? '');
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
