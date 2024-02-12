/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import '@walletconnect/react-native-compat';
import 'fast-text-encoding';
import { useEffect, useReducer, useState } from 'react';
import Toast from 'react-native-toast-message';
import { NavigationContainer } from '@react-navigation/native';
import './src/i18n';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  HdWalletContext,
  PortfolioContext,
  StakingContext,
  ActivityContext,
} from './src/core/util';
import {
  hdWalletStateReducer,
  initialHdWalletState,
  initialPortfolioState,
  initialValidatorState,
  portfolioStateReducer,
  ValidatorsListReducer,
} from './src/reducers';
import { Colors } from './src/constants/theme';
import * as C from './src/constants/index';
import AppImages from './assets/images/appImages';
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
import { getConnectWalletData } from './src/core/asyncStorage';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ConfirmationModals from './src/containers/Browser/ConfirmationModals';
import {
  ModalContext,
  modalContextInitialState,
  modalReducer,
} from './src/reducers/modalReducer';
import appsFlyer from 'react-native-appsflyer';
import { InitializeAppProvider } from './src/components/initializeAppProvider';

const { DynamicView, CText, DynamicImage } = require('./src/styles');

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

const toastConfig = {
  simpleToast: ({ text1, props }: { text1: string; props: any }) => (
    <DynamicView
      dynamic
      dynamicWidth
      dynamicHeightFix
      height={36}
      width={80}
      bR={13}
      aLIT={'center'}
      jC={'center'}
      bGC={Colors.toastColor}
      fD={'row'}
      style={{ opacity: 0.9 }}>
      {props.image && (
        <DynamicImage
          dynamic
          dynamicWidthFix
          dynamicHeightFix
          height={18}
          width={18}
          resizemode='cover'
          source={AppImages.CORRECT}
        />
      )}
      <CText
        dynamic
        fF={C.fontsName.FONT_REGULAR}
        mL={10}
        fS={15}
        color={Colors.secondaryTextColor}>
        {props.text}
      </CText>
    </DynamicView>
  ),
};

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
  const [statePortfolio, dispatchPortfolio] = useReducer(
    portfolioStateReducer,
    initialPortfolioState,
  );
  const [stateStaking, dispatchStaking] = useReducer(
    ValidatorsListReducer,
    initialValidatorState,
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

  let params = {};
  let renderContent: any = {};
  const linking = {
    prefixes: ['cypherwallet://', 'https://cypherwallet.com/'],
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

  // Kick off appsflyer SDK by setting the ethereum address.
  useEffect(() => {
    // Register app download with appsFlyer SDK
    appsFlyer.setCustomerUserId(ethereum.address);
    appsFlyer.startSdk();
  }, [ethereum.address]);

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Sentry.TouchEventBoundary>
          <WalletConnectContext.Provider
            value={{ walletConnectState, walletConnectDispatch }}>
            <GlobalContext.Provider value={{ globalState, globalDispatch }}>
              <HdWalletContext.Provider value={{ state, dispatch }}>
                <PortfolioContext.Provider
                  value={{ statePortfolio, dispatchPortfolio }}>
                  {Platform.OS == 'android' && (
                    <StatusBar
                      backgroundColor='white'
                      barStyle='dark-content'
                    />
                  )}

                  <StakingContext.Provider
                    value={{ stateStaking, dispatchStaking }}>
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
                          <NavigationContainer /* theme={scheme === 'dark' ? darkTheme : lightTheme} */
                            ref={navigationRef}
                            linking={linking}
                            onReady={() => {
                              routeNameRef.current =
                                navigationRef?.current?.getCurrentRoute()?.name;
                              routingInstrumentation.registerNavigationContainer(
                                navigationRef,
                              );
                            }}
                            onStateChange={async () => {
                              const previousRouteName = routeNameRef.current;
                              const currentRouteName =
                                navigationRef.current?.getCurrentRoute()?.name;
                              if (previousRouteName !== currentRouteName) {
                                // Keyboard.dismiss();
                                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                async () =>
                                  await analytics().logScreenView({
                                    screen_name: currentRouteName,
                                    screen_class: currentRouteName,
                                  });
                              }
                              routeNameRef.current = currentRouteName;
                            }}>
                            <GlobalModal>
                              <InitializeAppProvider>
                                {/* {ethereum.address === undefined ? (
                                    pinAuthentication ||
                                    pinPresent === PinPresentStates.NOTSET ? (
                                      <LoadingStack />
                                    ) : pinPresent === PinPresentStates.TRUE ? (
                                      <PinAuthRoute
                                        setPinAuthentication={
                                          setPinAuthentication
                                        }
                                        initialScreen={
                                          C.screenTitle.PIN_VALIDATION
                                        }
                                      />
                                    ) : (
                                      <PinAuthRoute
                                        setPinAuthentication={
                                          setPinAuthentication
                                        }
                                        initialScreen={C.screenTitle.SET_PIN}
                                      />
                                    )
                                  ) : ethereum.address ===
                                    _NO_CYPHERD_CREDENTIAL_AVAILABLE_ ? (
                                    state.reset ? (
                                      <OnBoardingStack
                                        initialScreen={C.screenTitle.ENTER_KEY}
                                      />
                                    ) : (
                                      <OnBoardingStack />
                                    )
                                  ) : (
                                    <TabStack />
                                  )} */}
                                {console.log('tabstack rendered')}
                                <TabStack />
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
                            </GlobalModal>
                          </NavigationContainer>
                        </ModalContext.Provider>
                      </ActivityContext.Provider>
                    </CosmosStakingContext.Provider>
                  </StakingContext.Provider>
                </PortfolioContext.Provider>
              </HdWalletContext.Provider>
            </GlobalContext.Provider>
          </WalletConnectContext.Provider>
        </Sentry.TouchEventBoundary>
      </GestureHandlerRootView>
    </KeyboardAvoidingView>
  );
}

export default Sentry.wrap(App);
