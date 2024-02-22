import { Dispatch, SetStateAction, useContext } from 'react';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
import JailMonkey from 'jail-monkey';
import RNExitApp from 'react-native-exit-app';
import {
  GlobalContextType,
  PinPresentStates,
  RPCPreference,
  SignMessageValidationType,
} from '../../constants/enum';
import { hostWorker, initializeHostsFromAsync } from '../../global';
import {
  getAuthToken,
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
  signIn,
} from '../../core/globalContext';
import { get, has, set } from 'lodash';
import useAxios from '../../core/HttpRequest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import {
  isBiometricEnabled,
  isPinAuthenticated,
  loadCyRootData,
  loadFromKeyChain,
} from '../../core/Keychain';
import { initialHdWalletState } from '../../reducers';
import {
  ActivityContext,
  DUMMY_AUTH,
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  getPlatform,
  getPlatformVersion,
} from '../../core/util';
import { getToken } from '../../core/push';
import { ethToEvmos } from '@tharsis/address-converter';
import Intercom from '@intercom/intercom-react-native';
import analytics from '@react-native-firebase/analytics';
import DeviceInfo, { getVersion } from 'react-native-device-info';
import { getWalletProfile } from '../../core/card';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import useValidSessionToken from '../useValidSessionToken';

export default function useInitializer() {
  const SENSITIVE_DATA_KEYS = ['password', 'seed', 'creditCardNumber'];
  const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
  const { getWithoutAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const inAppUpdates = new SpInAppUpdates(
    false, // isDebug
  );
  const { verifySessionToken } = useValidSessionToken();

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
    Sentry.init({
      dsn: Config.SENTRY_DSN,
      // environment: 'staging',
      environment: Config.ENVIROINMENT ?? 'staging',
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

  async function registerIntercomUser(walletAddresses: {
    [key: string]: string;
  }) {
    const devMode = await getDeveloperMode();
    if (
      !devMode &&
      walletAddresses.ethereumAddress !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      Intercom.registerIdentifiedUser({
        userId: walletAddresses.ethereumAddress,
      }).catch(error => {
        Sentry.captureException(error);
      });
      Intercom.updateUser({
        userId: walletAddresses.ethereumAddress,
        customAttributes: {
          ...walletAddresses,
          version: DeviceInfo.getVersion(),
        },
      }).catch(error => {
        Sentry.captureException(error);
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
    await AsyncStorage.getItem('activities', (_err, data) => {
      if (data) {
        activityContext.dispatch({
          type: ActivityReducerAction.LOAD,
          value: JSON.parse(data),
        });
      }
    });
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
        await loadCyRootData(hdWallet.state.pinValue);
        // await loadCyRootDataFromKeyChain(
        //   hdWallet.state,
        //   () => {
        //     setShowDefaultAuthRemoveModal(true);
        //   },
        //   false,
        // );
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
          // privateKey: any;
          publicKey: any;
          algo: any;
          rawAddress: Uint8Array | undefined;
        };
      }): void;
    },
    state = initialHdWalletState,
  ) => {
    // const cyRootData = await loadCyRootDataFromKeyChain(state);
    const cyRootData = await loadCyRootData(state.pinValue);
    if (cyRootData) {
      const { accounts } = cyRootData;
      if (!accounts) {
        void Sentry.captureMessage('app load error for load existing wallet');
      } else if (
        accounts.ethereum[0].address !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
      ) {
        const attributes = {};
        Object.keys(accounts).forEach((chainName: string) => {
          const chainAccountList = accounts[chainName];
          chainAccountList.forEach(
            (addressDetail: {
              address: any;
              // privateKey: any;
              publicKey: any;
              algo: any;
              rawAddress: { [s: string]: number } | ArrayLike<number>;
            }) => {
              dispatch({
                type: 'ADD_ADDRESS',
                value: {
                  chain: chainName,
                  address: addressDetail.address,
                  // privateKey: addressDetail.privateKey,
                  publicKey: addressDetail.publicKey,
                  algo: addressDetail.algo,
                  rawAddress: addressDetail.rawAddress
                    ? new Uint8Array(Object.values(addressDetail.rawAddress))
                    : undefined,
                },
              });
              set(attributes, `${chainName}Address`, addressDetail.address);
            },
          );
        });
        await getToken(
          get(attributes, 'ethereumAddress'),
          get(attributes, 'cosmosAddress'),
          get(attributes, 'osmosisAddress'),
          get(attributes, 'junoAddress'),
          get(attributes, 'stargazeAddress'),
          get(attributes, 'nobleAddress'),
        );
        void registerIntercomUser(attributes);
      } else {
        void getReadOnlyWalletData().then(data => {
          if (data) {
            const ethereum = JSON.parse(data);
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                chain: 'ethereum',
                address: ethereum.address,
                // privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
                publicKey: '',
                algo: '',
                rawAddress: undefined,
              },
            });
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                address: ethToEvmos(ethereum.address),
                // privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
                chain: 'evmos',
                publicKey: '',
                rawAddress: undefined,
                algo: '',
              },
            });
            dispatch({
              type: 'SET_READ_ONLY_WALLET',
              value: {
                isReadOnlyWallet: true,
              },
            });
            Intercom.registerIdentifiedUser({
              userId: ethereum.observerId,
            }).catch(error => {
              Sentry.captureException(error);
            });
          } else {
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                chain: 'ethereum',
                address: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
                // privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
                publicKey: '',
                algo: '',
                rawAddress: undefined,
              },
            });
          }
        });
      }
    }
  };

  const getProfile = async (token: string) => {
    const data = await getWalletProfile(token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const getAuthTokenData = async (
    setForcedUpdate: Dispatch<SetStateAction<boolean>>,
    setTamperedSignMessageModal: Dispatch<SetStateAction<boolean>>,
    setUpdateModal: Dispatch<SetStateAction<boolean>>,
    setShowDefaultAuthRemoveModal: Dispatch<SetStateAction<boolean>> = () => {},
  ) => {
    if (
      ethereum?.address
      // && ethereum?.privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      const isSessionTokenValid = await verifySessionToken();
      if (!isSessionTokenValid) {
        const signInResponse = await signIn(
          ethereum,
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
        await loadFromKeyChain(DUMMY_AUTH, true, () =>
          setShowDefaultAuthRemoveModal(true),
        );
        authToken = JSON.parse(String(authToken));
        void getProfile(authToken);
        globalContext.globalDispatch({
          type: GlobalContextType.SIGN_IN,
          sessionToken: authToken,
        });
      }
    }
  };

  const getHosts = async (
    setForcedUpdate: Dispatch<SetStateAction<boolean>>,
    setTamperedSignMessageModal: Dispatch<SetStateAction<boolean>>,
    setUpdateModal: Dispatch<SetStateAction<boolean>>,
    setShowDefaultAuthRemoveModal: Dispatch<SetStateAction<boolean>> = () => {},
  ) => {
    const hosts = await initializeHostsFromAsync();
    if (hosts) {
      if (
        ethereum?.address &&
        ethereum?.address !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
        // && ethereum?.privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
      ) {
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
  };
}
