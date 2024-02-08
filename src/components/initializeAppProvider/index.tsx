import React, { useEffect, useReducer, useState } from 'react';
import useInitializer from '../../hooks/useInitializer';
import {
  gloabalContextReducer,
  initialGlobalState,
} from '../../core/globalContext';
import { Platform } from 'react-native';
import { onMessage, registerForRemoteMessages } from '../../core/push';
import { PinPresentStates } from '../../constants/enum';
import { hdWalletStateReducer, initialHdWalletState } from '../../reducers';
import LoadingStack from '../../routes/loading';
import PinAuthRoute from '../../routes/pinAuthRoute';
import * as C from '../../../src/constants/index';
import OnBoardingStack from '../../routes/onBoarding';
import { _NO_CYPHERD_CREDENTIAL_AVAILABLE_ } from '../../core/util';
import TabStack from '../../routes/tabStack';
import { WalletConnectV2Provider } from '../walletConnectV2Provider';
import { SPLASH_SCREEN_TIMEOUT } from '../../constants/timeOuts';
import SplashScreen from 'react-native-lottie-splash-screen';

export const InitializeAppProvider = ({ children }: any) => {
  const {
    initializeSentry,
    exitIfJailBroken,
    fetchRPCEndpointsFromServer,
    loadActivitiesFromAsyncStorage,
    setPinAuthenticationStateValue,
    setPinPresentStateValue,
    loadExistingWallet,
    getHosts,
  } = useInitializer();
  const [globalState, globalDispatch] = React.useReducer(
    gloabalContextReducer,
    initialGlobalState,
  );
  const [pinAuthentication, setPinAuthentication] = useState(false);
  const [pinPresent, setPinPresent] = useState(PinPresentStates.NOTSET);
  const [showDefaultAuthRemoveModal, setShowDefaultAuthRemoveModal] =
    useState<boolean>(false);
  const [state, dispatch] = useReducer(
    hdWalletStateReducer,
    initialHdWalletState,
  );
  const [updateModal, setUpdateModal] = useState<boolean>(false);
  const [forcedUpdate, setForcedUpdate] = useState<boolean>(false);
  const [tamperedSignMessageModal, setTamperedSignMessageModal] =
    useState<boolean>(false);
  const ethereum = state.wallet.ethereum;

  useEffect(() => {
    const initializeApp = async () => {
      initializeSentry();
      await exitIfJailBroken();
      console.log('here ::: globalDispatch');
      await fetchRPCEndpointsFromServer(globalDispatch);
      await loadActivitiesFromAsyncStorage();

      if (Platform.OS === 'ios') {
        registerForRemoteMessages();
      } else {
        onMessage();
      }

      setTimeout(() => {
        SplashScreen.hide();
      }, SPLASH_SCREEN_TIMEOUT);

      setPinAuthentication(await setPinAuthenticationStateValue());
      setPinPresent(
        await setPinPresentStateValue(setShowDefaultAuthRemoveModal),
      );
    };
    void initializeApp();
  }, []);

  useEffect(() => {
    if (ethereum.address === undefined && pinAuthentication) {
      console.log(
        'loading exisitng wallet,,, pinAuthentication : ',
        pinAuthentication,
      );
      void loadExistingWallet(dispatch, state);
      console.log('loaded existing wallet /////');
    }
  }, [pinAuthentication]);

  useEffect(() => {
    void getHosts(setForcedUpdate, setTamperedSignMessageModal, setUpdateModal);
    console.log('ethereum address : ', ethereum.address);
  }, [ethereum.address]);

  return (
    <>
      {ethereum.address === undefined ? (
        pinAuthentication || pinPresent === PinPresentStates.NOTSET ? (
          <LoadingStack />
        ) : pinPresent === PinPresentStates.TRUE ? (
          <PinAuthRoute
            setPinAuthentication={setPinAuthentication}
            initialScreen={C.screenTitle.PIN_VALIDATION}
          />
        ) : (
          <PinAuthRoute
            setPinAuthentication={setPinAuthentication}
            initialScreen={C.screenTitle.SET_PIN}
          />
        )
      ) : ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_ ? (
        state.reset ? (
          <OnBoardingStack initialScreen={C.screenTitle.ENTER_KEY} />
        ) : (
          <OnBoardingStack />
        )
      ) : (
        <WalletConnectV2Provider>
          <TabStack />
        </WalletConnectV2Provider>

        // children
      )}
    </>
  );
};
