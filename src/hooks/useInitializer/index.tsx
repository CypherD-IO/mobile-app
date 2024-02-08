import React, { Dispatch, SetStateAction, useReducer, useState } from 'react';
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
  getDeveloperMode,
  getReadOnlyWalletData,
  getRpcEndpoints,
  setRpcEndpoints,
} from '../../core/asyncStorage';
import {
  RpcResponseDetail,
  gloabalContextReducer,
  initialGlobalState,
  signIn,
} from '../../core/globalContext';
import { get, has, set } from 'lodash';
import useAxios from '../../core/HttpRequest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityReducerAction,
  ActivityStateReducer,
  initialActivityState,
} from '../../reducers/activity_reducer';
import {
  isBiometricEnabled,
  isPinAuthenticated,
  loadCyRootDataFromKeyChain,
} from '../../core/Keychain';
import { hdWalletStateReducer, initialHdWalletState } from '../../reducers';
import { _NO_CYPHERD_CREDENTIAL_AVAILABLE_ } from '../../core/util';
import { getToken } from '../../core/push';
import { ethToEvmos } from '@tharsis/address-converter';
import Intercom from '@intercom/intercom-react-native';
import analytics from '@react-native-firebase/analytics';
import DeviceInfo, { getVersion } from 'react-native-device-info';
import { getWalletProfile } from '../../core/card';

export default function useInitializer() {
  const SENSITIVE_DATA_KEYS = ['password', 'seed', 'creditCardNumber'];
  const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
  const { getWithoutAuth } = useAxios();
  const [stateActivity, dispatchActivity] = useReducer(
    ActivityStateReducer,
    initialActivityState,
  );
  const [state, dispatch] = useReducer(
    hdWalletStateReducer,
    initialHdWalletState,
  );
  const [globalState, globalDispatch] = React.useReducer(
    gloabalContextReducer,
    initialGlobalState,
  );
  const ethereum = state.wallet.ethereum;

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
    const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
    const resultFromEndpoint = await getWithoutAuth(
      `${ARCH_HOST}/v1/configuration/rpcEndpoints`,
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
    const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
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
        `${ARCH_HOST}/v1/configuration/rpcEndpoints`,
      );
      result = resultFromEndpoint.data;
    }
    globalDispatch({ type: GlobalContextType.RPC_UPDATE, rpc: result });
    return result;
  };

  const loadActivitiesFromAsyncStorage = async () => {
    await AsyncStorage.getItem('activities', (_err, data) => {
      data &&
        dispatchActivity({
          type: ActivityReducerAction.LOAD,
          value: JSON.parse(data),
        });
    });
  };

  const setPinAuthenticationStateValue = async () => {
    const isBiometricPasscodeEnabled = await isBiometricEnabled();
    return isBiometricPasscodeEnabled && !(await isPinAuthenticated()); //  for devices with biometreics enabled the pinAuthentication will be set true
  };

  const setPinPresentStateValue = async (
    setShowDefaultAuthRemoveModal: Dispatch<SetStateAction<boolean>>,
  ) => {
    const pinAuthenticated = await isPinAuthenticated();
    const hasBiometricEnabled = await isBiometricEnabled();
    if (!hasBiometricEnabled) {
      if (pinAuthenticated) {
        return PinPresentStates.TRUE;
      } else {
        await loadCyRootDataFromKeyChain(state, () =>
          setShowDefaultAuthRemoveModal(true),
        );
        return PinPresentStates.FALSE;
      }
    } else {
      if (pinAuthenticated) {
        return PinPresentStates.TRUE;
      }
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
          privateKey: any;
          publicKey: any;
          algo: any;
          rawAddress: Uint8Array | undefined;
        };
      }): void;
    },
    state = initialHdWalletState,
  ) => {
    const cyRootData = await loadCyRootDataFromKeyChain(state);
    console.log('loadCyRootDataFromKeyChain : ', cyRootData);
    if (cyRootData) {
      console.log('cyRoot data loaded from keychain : ', cyRootData);
      const { accounts } = cyRootData;
      console.log('accounts : ', accounts);
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
              privateKey: any;
              publicKey: any;
              algo: any;
              rawAddress: { [s: string]: number } | ArrayLike<number>;
            }) => {
              dispatch({
                type: 'ADD_ADDRESS',
                value: {
                  chain: chainName,
                  address: addressDetail.address,
                  privateKey: addressDetail.privateKey,
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
                privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
                publicKey: '',
                algo: '',
                rawAddress: undefined,
              },
            });
            dispatch({
              type: 'ADD_ADDRESS',
              value: {
                address: ethToEvmos(ethereum.address),
                privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
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
                privateKey: _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
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
    globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: data });
  };

  const getAuthTokenData = async (
    setForcedUpdate,
    setTamperedSignMessageModal,
    setUpdateModal,
  ) => {
    if (
      ethereum?.address &&
      ethereum?.privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      const signInResponse = await signIn(ethereum);
      if (signInResponse) {
        if (
          signInResponse?.message === SignMessageValidationType.VALID &&
          has(signInResponse, 'token')
        ) {
          setForcedUpdate(false);
          setTamperedSignMessageModal(false);
          globalDispatch({
            type: GlobalContextType.SIGN_IN,
            sessionToken: signInResponse?.token,
          });
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
    }
  };

  const getHosts = async (
    setForcedUpdate,
    setTamperedSignMessageModal,
    setUpdateModal,
  ) => {
    const hosts = await initializeHostsFromAsync();
    console.log('hosts : ', hosts, 'ethereum address: ', ethereum?.address);
    if (hosts) {
      if (
        ethereum?.address &&
        ethereum?.address !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_ &&
        ethereum?.privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
      ) {
        void getAuthTokenData(
          setForcedUpdate,
          setTamperedSignMessageModal,
          setUpdateModal,
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
  };
}
