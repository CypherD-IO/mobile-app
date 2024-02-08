import React, { useReducer } from 'react';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
import JailMonkey from 'jail-monkey';
import RNExitApp from 'react-native-exit-app';
import { GlobalContextType, RPCPreference } from '../../constants/enum';
import { hostWorker } from '../../global';
import { getRpcEndpoints, setRpcEndpoints } from '../../core/asyncStorage';
import {
  RpcResponseDetail,
  initialGlobalState,
} from '../../core/globalContext';
import { get } from 'lodash';
import useAxios from '../../core/HttpRequest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityReducerAction,
  ActivityStateReducer,
  initialActivityState,
} from '../../reducers/activity_reducer';

export default function useInitializer() {
  const SENSITIVE_DATA_KEYS = ['password', 'seed', 'creditCardNumber'];
  const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
  const { getWithoutAuth } = useAxios();
  const [stateActivity, dispatchActivity] = useReducer(
    ActivityStateReducer,
    initialActivityState,
  );

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

  return {
    initializeSentry,
    exitIfJailBroken,
    fetchRPCEndpointsFromServer,
    loadActivitiesFromAsyncStorage,
  };
}
