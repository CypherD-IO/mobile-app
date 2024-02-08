import React, { useEffect } from 'react';
import useInitializer from '../../hooks/useInitializer';
import {
  gloabalContextReducer,
  initialGlobalState,
} from '../../core/globalContext';
import { Platform } from 'react-native';
import { onMessage, registerForRemoteMessages } from '../../core/push';

export const InitializeAppProvider = ({ children }: any) => {
  const {
    initializeSentry,
    exitIfJailBroken,
    fetchRPCEndpointsFromServer,
    loadActivitiesFromAsyncStorage,
  } = useInitializer();
  const [globalState, globalDispatch] = React.useReducer(
    gloabalContextReducer,
    initialGlobalState,
  );

  useEffect(() => {
    const initializeApp = async () => {
      initializeSentry();
      await exitIfJailBroken();
      await fetchRPCEndpointsFromServer(globalDispatch);
      await loadActivitiesFromAsyncStorage();

      if (Platform.OS === 'ios') {
        registerForRemoteMessages();
      } else {
        onMessage();
      }
    };

    void initializeApp();
  }, []);
};
