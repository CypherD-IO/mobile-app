import { Dispatch, SetStateAction, useContext } from 'react';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
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
import { IPlanDetails } from '../../models/planDetails.interface';
import { CardProfile } from '../../models/cardProfile.model';
import { getToken } from '../../notification/pushNotification';
import useWeb3Auth from '../useWeb3Auth';
// import { web3AuthEvm, web3AuthSolana } from '../../constants/web3Auth';

export default function useInitializer() {
  const SENSITIVE_DATA_KEYS = ['password', 'seed', 'creditCardNumber'];
  const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
  const { getWithoutAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const solana = hdWallet.state.wallet.solana;
  const inAppUpdates = new SpInAppUpdates(
    false, // isDebug
  );
  const { verifySessionToken } = useValidSessionToken();
  const { getWalletProfile, getPlanData } = useCardUtilities();
  const { web3AuthEvm, web3AuthSolana } = useWeb3Auth();

  const scrubData = (key: string, value: any): any => {
    if (SENSITIVE_DATA_KEYS.includes(key)) {
      return '********'; // Replace with asterisks
    } else if (key === 'email') {
      const domain: string = value.slice(value.indexOf('@'));
      return `****${domain}`; // Replace with asterisks before domain name
    } else {
      return value; // Don't scrub other data
    }
  };

  const initializeSentry = () => {
    // Check if Sentry is already initialized (from App.tsx)
    const sentryHub = Sentry.getCurrentHub();
    const client = sentryHub.getClient();

    if (client) {
      return;
    }

    // Fallback initialization if somehow not done in App.tsx
    const isTesting = String(Config.IS_TESTING) === 'true';

    if (isTesting) {
      // Initialize Sentry but with all UI warnings and tracing disabled
      Sentry.init({
        dsn: Config.SENTRY_DSN,
        environment: Config.ENVIRONMENT ?? 'staging',
        debug: false, // Disable debug output to prevent console/UI warnings
        enabled: false, // Completely disable Sentry in test mode
        tracesSampleRate: 0, // Disable performance tracing (prevents "App Start Span" warnings)
        maxBreadcrumbs: 0, // Disable breadcrumbs
        attachStacktrace: false, // Disable stack trace attachment
        autoSessionTracking: false, // Disable session tracking
        enableAutoSessionTracking: false, // Disable auto session tracking
        enableNativeCrashHandling: false, // Disable native crash handling
        enableWatchdogTerminationTracking: false, // Disable watchdog tracking
        enableAutoPerformanceTracing: false, // Disable auto performance tracing
        beforeSend() {
          // Drop all events in test mode
          return null;
        },
        beforeBreadcrumb() {
          // Drop all breadcrumbs in test mode
          return null;
        },
        integrations: [], // No integrations in test mode
      });
      return;
    }

    // Production mode - always run full Sentry configuration
    Sentry.init({
      dsn: Config.SENTRY_DSN,
      environment: Config.ENVIRONMENT ?? 'staging',
      debug: false, // Keep debug off even in production to avoid console spam
      integrations: [
        new Sentry.ReactNativeTracing({
          routingInstrumentation,
          tracingOrigins: ['127.0.0.1', 'api.cypherd.io'],
        }),
      ],
      tracesSampleRate: 1.0,
      beforeSend(event, hint) {
        if (event?.extra && typeof event.extra === 'object') {
          // Scrub data in extra context
          for (const [key, value] of Object.entries(event.extra)) {
            event.extra[key] = scrubData(key, value);
          }
        }
        if (event?.request && typeof event.request === 'object') {
          // Scrub data in request body
          event.request.data = scrubData('requestBody', event.request.data);
        }
        if (event?.contexts?.app && typeof event.contexts.app === 'object') {
          // Scrub data in app info under contexts
          for (const [key, value] of Object.entries(event.contexts.app)) {
            event.contexts.app[key] = scrubData(key, value);
          }
        }
        if (event?.tags && typeof event.tags === 'object') {
          // Scrub data in tags
          for (const [key, value] of Object.entries(event.tags)) {
            event.tags[key] = scrubData(key, value);
          }
        }
        if (
          event?.exception?.values &&
          typeof event.exception.values === 'object'
        ) {
          // Scrub data in exceptions
          for (const valueObj of event.exception.values) {
            if (valueObj.type && SENSITIVE_DATA_KEYS.includes(valueObj.type)) {
              valueObj.value = '********';
            }
          }
        }
        return event;
      },
      beforeBreadcrumb: (breadcrumb, hint) => {
        if (breadcrumb.category === 'xhr') {
          const requestUrl = JSON.stringify(hint?.xhr.__sentry_xhr__.url);
          return {
            ...breadcrumb,
            data: {
              requestUrl,
            },
          };
        }
        return breadcrumb;
      },
    });
  };

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

  const setPinAuthenticationStateValue = async () => {
    const isBiometricPasscodeEnabled = await isBiometricEnabled();
    return isBiometricPasscodeEnabled && !(await isPinAuthenticated()); //  for devices with biometreics enabled the pinAuthentication will be set true
  };

  const setPinPresentStateValue = async () => {
    const pinAuthenticated = await isPinAuthenticated();

    const hasBiometricEnabled = await isBiometricEnabled();
    if (!hasBiometricEnabled) {
      if (pinAuthenticated) {
        return PinPresentStates.TRUE;
      } else {
        return PinPresentStates.FALSE;
      }
    } else {
      if (pinAuthenticated) {
        return PinPresentStates.TRUE;
      }
    }
    return PinPresentStates.NOTSET;
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
        await getToken(
          get(attributes, 'ethereumAddress', '') ??
            get(attributes, 'solanaAddress', ''),
          get(attributes, 'cosmosAddress'),
          get(attributes, 'osmosisAddress'),
          get(attributes, 'nobleAddress'),
          get(attributes, 'coreumAddress'),
        );
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
              },
            });
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                chain: 'solana',
                address: undefined,
                publicKey: '',
                algo: '',
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
      const address = ethereum?.address ?? solana?.address;
      if (address) {
        void getAuthTokenData(
          setForcedUpdate,
          setTamperedSignMessageModal,
          setUpdateModal,
          setShowDefaultAuthRemoveModal,
        );
      }
    }
  };

  return {
    initializeSentry,
    exitIfJailBroken,
    fetchRPCEndpointsFromServer,
    loadActivitiesFromAsyncStorage,
    setPinAuthenticationStateValue,
    setPinPresentStateValue,
    loadExistingWallet,
    getHosts,
    checkForUpdatesAndShowModal,
    checkAPIAccessibility,
  };
}
