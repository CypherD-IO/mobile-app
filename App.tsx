/* eslint-disable @typescript-eslint/no-misused-promises */

/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import '@walletconnect/react-native-compat';
import 'fast-text-encoding';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useReducer, useState } from 'react';
import Toast from 'react-native-toast-message';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import './src/i18n';
import { BackHandler, Keyboard, Linking, Platform } from 'react-native';
import {
  HdWalletContext,
  ActivityContext,
  referralLinkAnalytics,
} from './src/core/util';
import { hdWalletStateReducer, initialHdWalletState } from './src/reducers';
import analytics from '@react-native-firebase/analytics';
import '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import {
  gloabalContextReducer,
  GlobalContext,
  initialGlobalState,
} from './src/core/globalContext';
import TabStack from './src/routes/tabStack';
import 'fastestsmallesttextencoderdecoder';
import {
  CosmosStakingContext,
  cosmosStakingInitialState,
  cosmosStakingReducer,
} from './src/reducers/cosmosStakingReducer';
import {
  ActivityStateReducer,
  initialActivityState,
} from './src/reducers/activity_reducer';
import {
  getConnectWalletData,
  setReferralCodeAsync,
} from './src/core/asyncStorage';
import {
  WalletConnectContext,
  walletConnectInitialState,
  walletConnectReducer,
  WalletConnectActions,
} from './src/reducers/wallet_connect_reducer';
import {
  subscribeToEvents,
  walletConnectApproveRequest,
  walletConnectRejectRequest,
  getRenderContent,
} from './src/containers/utilities/walletConnectUtilities';
import WalletConnectModal from './src/components/WalletConnectModal';
import { GlobalModal } from './src/components/v2/GlobalModal';
import ConfirmationModals from './src/containers/Browser/ConfirmationModals';
import {
  ModalContext,
  modalContextInitialState,
  modalReducer,
} from './src/reducers/modalReducer';
import { InitializeAppProvider } from './src/components/initializeAppProvider';
import { toastConfig } from './src/components/v2/toast';
import { CyDView } from './src/styles/tailwindStyles';
import {
  BridgeContext,
  bridgeContextInitialState,
  bridgeReducer,
} from './src/reducers/bridge.reducer';
import { screenTitle } from './src/constants';
import { ThreeDSecureProvider } from './src/components/v2/threeDSecureApprovalModalContext';

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

function App() {
  const routeNameRef = React.useRef();
  const navigationRef = React.useRef();
  const [globalState, globalDispatch] = React.useReducer(
    gloabalContextReducer,
    initialGlobalState,
  );
  const [state, dispatch] = useReducer(
    hdWalletStateReducer,
    initialHdWalletState,
  );
  const [stateActivity, dispatchActivity] = useReducer(
    ActivityStateReducer,
    initialActivityState,
  );
  const [cosmosStakingState, cosmosStakingDispatch] = useReducer(
    cosmosStakingReducer,
    cosmosStakingInitialState,
  );
  const [walletConnectState, walletConnectDispatch] = useReducer(
    walletConnectReducer,
    walletConnectInitialState,
  );

  const [modalState, modalDispatch] = useReducer(
    modalReducer,
    modalContextInitialState,
  );

  const [bridgeState, bridgeDispatch] = useReducer(
    bridgeReducer,
    bridgeContextInitialState,
  );

  const ethereum = state.wallet.ethereum;
  const [walletConnectModalVisible, setWalletConnectModalVisible] =
    useState<boolean>(false);
  const [walletConnectModalData, setWalletConnectModalData] = useState({
    params: {},
    renderContent: {},
    displayWalletConnectModal: false,
  });
  const [request, setRequest] = useState({
    payload: {},
    connector: null,
    event: '',
  });

  const [deepLinkData, setDeepLinkData] = useState(null);
  const [discordToken, setDiscordToken] = useState<string>('');

  let params = {};
  let renderContent: any = {};

  const linking: LinkingOptions<ReactNavigation.RootParamList> = {
    prefixes: ['https://app.cypherhq.io', 'cypherwallet://'],
    config: {
      screens: {
        [screenTitle.PORTFOLIO]: '*',
      },
    },
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      console.log('url for deeplinking : ', url);
      if (url != null) {
        if (url.includes('/card/referral/')) {
          const referralCode = url.split('/card/referral/')[1];
          await setReferralCodeAsync(referralCode);
          setDeepLinkData({
            screenToNavigate: screenTitle.I_HAVE_REFERRAL_CODE_SCREEN,
          });
          void referralLinkAnalytics(referralCode);
        } else if (url.includes('/card/telegramPinSetup')) {
          setDeepLinkData({
            screenToNavigate: screenTitle.TELEGRAM_PIN_SETUP,
          });
        } else if (url.includes('/card/telegramSetup')) {
          console.log('telegram setup : ', url);
          setDeepLinkData({
            screenToNavigate: screenTitle.TELEGRAM_SETUP,
          });
        } else if (url.includes('discordToken')) {
          setDiscordToken(url.split('discordToken=')[1]);
          console.log('discordToken set in app.tsx : ', discordToken);
        }
      }
      return null;
    },
  };

  useEffect(() => {
    if (walletConnectModalVisible) {
      params = {
        connector: request.connector,
        dAppInfo:
          walletConnectState?.connectors?.length ===
          walletConnectState?.dAppInfo?.length
            ? walletConnectState?.dAppInfo[
                walletConnectState.connectors.indexOf(request.connector)
              ]
            : {},
        address: ethereum?.wallets[0]?.address,
        payload: request.payload,
        dispatchFn: walletConnectDispatch,
        HdWalletContext: { state },
      };
      renderContent = getRenderContent(
        request,
        state.wallet?.ethereum?.wallets[0]?.address,
        walletConnectState,
      );
      setWalletConnectModalData({
        params,
        renderContent,
        displayWalletConnectModal: walletConnectModalVisible,
      });
    } else {
      setWalletConnectModalData({
        ...walletConnectModalData,
        displayWalletConnectModal: walletConnectModalVisible,
      });
    }
  }, [walletConnectModalVisible]);

  useEffect(() => {
    if (walletConnectState?.itemsAdded) {
      void subscribeToEvents(
        walletConnectState.connectors[walletConnectState.connectors.length - 1],
        setWalletConnectModalVisible,
        setRequest,
        walletConnectDispatch,
        state,
        { state: modalState, dispatch: modalDispatch },
      );
    }
  }, [walletConnectState?.connectors]);

  useEffect(() => {
    const getData = async () => {
      const data = await getConnectWalletData(ethereum.address);
      if (data && data.data?.connectors?.length !== 0) {
        const { connectors, dAppInfo } = data.data;
        if (connectors && dAppInfo) {
          const connectorList = connectors.map((connectionObject: any) => {
            return connectionObject;
          });
          walletConnectDispatch({
            type: WalletConnectActions.RESTORE_SESSION,
            value: { connectors: connectorList, dAppInfo },
          });
        } else {
          walletConnectDispatch({
            type: WalletConnectActions.RESTORE_INITIAL_STATE,
          });
        }
      } else {
        walletConnectDispatch({
          type: WalletConnectActions.RESTORE_INITIAL_STATE,
        });
      }
    };
    void getData();
  }, [ethereum.address]);

  const handleBackButton = (): boolean => {
    Keyboard.dismiss();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  return (
    <CyDView style={{ flex: 1, backgroundColor: 'white' }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Sentry.TouchEventBoundary>
          <NavigationContainer /* theme={scheme === 'dark' ? darkTheme : lightTheme} */
            ref={navigationRef}
            linking={linking}
            onReady={() => {
              routeNameRef.current =
                navigationRef?.current?.getCurrentRoute()?.name;
              routingInstrumentation.registerNavigationContainer(navigationRef);
            }}
            onStateChange={async () => {
              const previousRouteName = routeNameRef.current;
              const currentRouteName =
                navigationRef.current?.getCurrentRoute()?.name;
              if (previousRouteName !== currentRouteName) {
                // Keyboard.dismiss();
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                void analytics().logScreenView({
                  screen_name: currentRouteName,
                  screen_class: currentRouteName,
                });
              }
              routeNameRef.current = currentRouteName;
            }}>
            <WalletConnectContext.Provider
              value={{ walletConnectState, walletConnectDispatch }}>
              <GlobalContext.Provider value={{ globalState, globalDispatch }}>
                <HdWalletContext.Provider value={{ state, dispatch }}>
                  <CosmosStakingContext.Provider
                    value={{ cosmosStakingState, cosmosStakingDispatch }}>
                    <ActivityContext.Provider
                      value={{
                        state: stateActivity,
                        dispatch: dispatchActivity,
                      }}>
                      <ModalContext.Provider
                        value={{
                          state: modalState,
                          dispatch: modalDispatch,
                        }}>
                        <BridgeContext.Provider
                          value={{
                            state: bridgeState,
                            dispatch: bridgeDispatch,
                          }}>
                          <GlobalModal>
                            <ThreeDSecureProvider>
                              <InitializeAppProvider
                                discordToken={discordToken}>
                                <TabStack
                                  deepLinkData={deepLinkData}
                                  setDeepLinkData={setDeepLinkData}
                                />
                                <Toast
                                  config={toastConfig}
                                  position={'bottom'}
                                  bottomOffset={140}
                                />
                                {<ConfirmationModals />}
                                <WalletConnectModal
                                  walletConnectModalVisible={
                                    walletConnectModalData.displayWalletConnectModal
                                  }
                                  setWalletConnectModalVisible={
                                    setWalletConnectModalVisible
                                  }
                                  renderContent={
                                    walletConnectModalData.renderContent
                                  }
                                  walletConnectApproveRequest={
                                    walletConnectApproveRequest
                                  }
                                  walletConnectRejectRequest={
                                    walletConnectRejectRequest
                                  }
                                  dispatchActivity={dispatchActivity}
                                  params={walletConnectModalData.params}
                                  request={request}
                                  walletConnectDispatch={walletConnectDispatch}
                                />
                              </InitializeAppProvider>
                            </ThreeDSecureProvider>
                          </GlobalModal>
                        </BridgeContext.Provider>
                      </ModalContext.Provider>
                    </ActivityContext.Provider>
                  </CosmosStakingContext.Provider>
                </HdWalletContext.Provider>
              </GlobalContext.Provider>
            </WalletConnectContext.Provider>
          </NavigationContainer>
        </Sentry.TouchEventBoundary>
      </GestureHandlerRootView>
    </CyDView>
  );
}

export default Sentry.wrap(App);
