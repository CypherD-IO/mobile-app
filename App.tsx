/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import { useEffect, useReducer, useState } from 'react';
import Config from "react-native-config";
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { NavigationContainer } from '@react-navigation/native';
import './src/i18n';
import { Linking, Platform, StatusBar } from 'react-native';
import LoadingStack from './src/routes/loading';
import { _NO_CYPHERD_CREDENTIAL_AVAILABLE_, HdWalletContext, PortfolioContext, StakingContext, ActivityContext } from './src/core/util';
import {
  hdWalletStateReducer,
  initialHdWalletState,
  initialPortfolioState,
  initialValidatorState,
  portfolioStateReducer,
  ValidatorsListReducer
} from './src/reducers';
import { isPinAuthenticated, loadCyRootDataFromKeyChain } from './src/core/Keychain';
import { Colors } from './src/constants/theme';
import * as C from './src/constants/index';
import AppImages from './assets/images/appImages';
import analytics from '@react-native-firebase/analytics';
import Intercom from '@intercom/intercom-react-native';
import JailMonkey from 'jail-monkey';
import RNExitApp from 'react-native-exit-app';
import '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import { getToken, onMessage, registerForRemoteMessages } from './src/core/push';
import {
  fetchRPCEndpointsFromServer,
  gloabalContextReducer,
  signIn,
  GlobalContext,
  initialGlobalState
} from './src/core/globalContext';
import TabStack from './src/routes/tabStack';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import Dialog, { DialogButton, DialogContent, DialogFooter } from 'react-native-popup-dialog';
import 'fastestsmallesttextencoderdecoder';
import {
  CosmosStakingContext,
  cosmosStakingInitialState,
  cosmosStakingReducer
} from './src/reducers/cosmosStakingReducer';
import { ActivityReducerAction, ActivityStateReducer, initialActivityState } from './src/reducers/activity_reducer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeveloperMode, getConnectWalletData } from './src/core/asyncStorage';
import { WalletConnectContext, walletConnectInitialState, walletConnectReducer, WalletConnectActions } from './src/reducers/wallet_connect_reducer';
import { subscribeToEvents, walletConnectApproveRequest, walletConnectRejectRequest, getRenderContent } from './src/containers/utilities/walletConnectUtilities';
import SplashScreen from 'react-native-lottie-splash-screen';
import DeviceInfo from 'react-native-device-info';
import WalletConnect from '@walletconnect/client';
import WalletConnectModal from './src/components/WalletConnectModal';
import { GlobalModal } from './src/components/v2/GlobalModal';
import OnBoardingStack from './src/routes/onBoarding';
import { GlobalContextType, PinPresentStates } from './src/constants/enum';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getCardProfile } from './src/core/card';
import ConfirmationModals from './src/containers/Browser/ConfirmationModals';
import { ModalContext, modalContextInitialState, modalReducer } from './src/reducers/modalReducer';
import { initializeHostsFromAsync } from './src/global';
import PinAuthRoute from './src/routes/pinAuthRoute';
import { isAndroid } from './src/misc/checkers';
import { getSupportedBiometryType } from 'react-native-keychain';
import { get, set } from 'lodash';
import { SPLASH_SCREEN_TIMEOUT } from './src/constants/timeOuts';
import appsFlyer from 'react-native-appsflyer';

const { DynamicView, CText, DynamicImage } = require('./src/styles');


const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
Sentry.init({
  dsn: Config.SENTRY_DSN,
  // environment: 'staging',
  environment: Config.ENVIROINMENT ?? 'staging',
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      tracingOrigins: ['127.0.0.1', 'api.cypherd.io']
    })
  ],
  enabled: false,
  tracesSampleRate: 1.0
});



// AppsFlyer SDK initialization
const NoOpFunction = () => { };
appsFlyer.initSdk(
  {
    devKey: Config.AF_DEVKEY ?? '',
    // TODO: make this based on ENV
    isDebug: Config.ENVIROINMENT !== 'production',
    appId: Config.AF_APPID ?? '',
    // to begin we are not recieving any raw data on Cypher side.
    onInstallConversionDataListener: false,
    onDeepLinkListener: false,
    // Deferring the SDK start launch event to later.
    manualStart: true
  },
  () => {
    appsFlyer.setOneLinkCustomDomains(['getapp.cypherwallet.io'], NoOpFunction, NoOpFunction);
  },
  NoOpFunction
);

async function registerIntercomUser(walletAddresses: { [key: string]: string }) {
  const devMode = await getDeveloperMode();
  if (!devMode && walletAddresses.ethereumAddress !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
    Intercom.registerIdentifiedUser({ userId: walletAddresses.ethereumAddress }).catch(error => {
      Sentry.captureException(error);
    });
    Intercom.updateUser({
      userId: walletAddresses.ethereumAddress,
      customAttributes: { ...walletAddresses, version: DeviceInfo.getVersion() }
    }).catch(error => {
      Sentry.captureException(error);
    });
  }
  void analytics().setAnalyticsCollectionEnabled(!devMode);
}

function _loadExistingWallet(dispatch: { (value: any): void, (arg0: { type: string, value: { chain: string, address: any, privateKey: any, publicKey: any, algo: any, rawAddress: Uint8Array | undefined } }): void }, state = initialHdWalletState) {
  loadCyRootDataFromKeyChain(state)
    .then((cyRootData) => {
      const { accounts } = cyRootData;
      if (!accounts) {
        void Sentry.captureMessage('app load error for load existing wallet');
      }

      const attributes = {};
      Object.keys(accounts).forEach((chainName: string) => {
        const chainAccountList = accounts[chainName];
        chainAccountList.forEach((addressDetail: { address: any, privateKey: any, publicKey: any, algo: any, rawAddress: { [s: string]: number } | ArrayLike<number> }) => {
          dispatch({
            type: 'ADD_ADDRESS',
            value: {
              chain: chainName,
              address: addressDetail.address,
              privateKey: addressDetail.privateKey,
              publicKey: addressDetail.publicKey,
              algo: addressDetail.algo,
              rawAddress: addressDetail.rawAddress ? new Uint8Array(Object.values(addressDetail.rawAddress)) : undefined
            }
          });
          set(attributes, `${chainName}Address`, addressDetail.address);
        });
      });
      getToken(
        get(attributes, 'ethereumAddress'),
        get(attributes, 'cosmosAddress'),
        get(attributes, 'osmosisAddress'),
        get(attributes, 'junoAddress'),
        get(attributes, 'stargazeAddress')
      );
      void registerIntercomUser(attributes);
    })
    .catch(Sentry.captureException);
}

const toastConfig = {
  simpleToast: ({ text1, props }: { text1: string, props: any }) => (
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
      style={{ opacity: 0.9 }}
    >
      {props.image && (
        <DynamicImage
          dynamic
          dynamicWidthFix
          dynamicHeightFix
          height={18}
          width={18}
          resizemode="cover"
          source={AppImages.CORRECT}
        />
      )}
      <CText
        dynamic
        fF={C.fontsName.FONT_REGULAR}
        mL={10}
        fS={15}
        color={Colors.secondaryTextColor}
      >
        {props.text}
      </CText>
    </DynamicView>
  )
};

const checkUpdateNeeded = async () => {
  try {
    if (JailMonkey.isJailBroken()) {
      // Alternative behaviour for jail-broken/rooted devices.
      RNExitApp.exitApp();
    }
  } catch (error) {
    Sentry.captureException(error);
  }
};

function App() {
  const { t } = useTranslation();
  const routeNameRef = React.useRef();
  const navigationRef = React.useRef();
  const [globalState, globalDispatch] = React.useReducer(
    gloabalContextReducer,
    initialGlobalState
  );
  const [state, dispatch] = useReducer(
    hdWalletStateReducer,
    initialHdWalletState
  );
  const [statePortfolio, dispatchPortfolio] = useReducer(
    portfolioStateReducer,
    initialPortfolioState
  );
  const [stateStaking, dispatchStaking] = useReducer(
    ValidatorsListReducer,
    initialValidatorState
  );
  const [stateActivity, dispatchActivity] = useReducer(
    ActivityStateReducer,
    initialActivityState
  );
  const [cosmosStakingState, cosmosStakingDispatch] = useReducer(
    cosmosStakingReducer,
    cosmosStakingInitialState
  );
  const [walletConnectState, walletConnectDispatch] = useReducer(
    walletConnectReducer
    , walletConnectInitialState
  );

  const [modalState, modalDispatch] = useReducer(
    modalReducer,
    modalContextInitialState
  );

  const ethereum = state.wallet.ethereum;
  const inAppUpdates = new SpInAppUpdates(
    false // isDebug
  );
  const [updateModal, setUpdateModal] = useState<Boolean>(false);
  const [walletConnectModalVisible, setWalletConnectModalVisible] = useState<boolean>(false);
  const [walletConnectModalData, setWalletConnectModalData] = useState({
    params: {},
    renderContent: {},
    displaWalletConnectModal: false
  });
  const [request, setRequest] = useState({ payload: {}, connector: null, event: '' });
  const [pinAuthentication, setPinAuthentication] = useState(!isAndroid());
  const [pinPresent, setPinPresent] = useState(PinPresentStates.NOTSET);

  let params = {};
  let renderContent: any = {};

  useEffect(() => {
    if (walletConnectModalVisible) {
      params = {
        connector: request.connector,
        dAppInfo: (walletConnectState?.connectors?.length === walletConnectState?.dAppInfo?.length) ? walletConnectState?.dAppInfo[walletConnectState.connectors.indexOf(request.connector)] : {},
        address: ethereum?.wallets[0]?.address,
        payload: request.payload,
        dispatchFn: walletConnectDispatch,
        HdWalletContext: { state }
      };
      renderContent = getRenderContent(request, state.wallet?.ethereum?.wallets[0]?.address, walletConnectState);
      setWalletConnectModalData({ params, renderContent, displaWalletConnectModal: walletConnectModalVisible });
    } else {
      setWalletConnectModalData({ ...walletConnectModalData, displaWalletConnectModal: walletConnectModalVisible });
    }
  }, [walletConnectModalVisible]);

  // renderContent = { buttonMessage: 'CONNECT WALLET', chainInfo: { address: '0x14d59b....490b87', image: 38 }, dAppInfo: { image: 'https://app.1inch.io/assets/images/logo.png', name: '1inch dApp' }, title: 'Wallet Permissions' };

  // Don't change, its meant for one time operation
  useEffect(() => {
    void checkUpdateNeeded();
    fetchRPCEndpointsFromServer(globalDispatch).catch((e) => {
      Sentry.captureException(e.message);
    });
    inAppUpdates.checkNeedsUpdate().then((result) => {
      if (result.shouldUpdate) {
        setUpdateModal(true);
      }
    }).catch(Sentry.captureException);

    AsyncStorage.getItem('activities', (_err, data) => {
      data && dispatchActivity({ type: ActivityReducerAction.LOAD, value: JSON.parse(data) });
    }).catch(Sentry.captureException);

    if (Platform.OS === 'ios') {
      registerForRemoteMessages();
    } else {
      onMessage();
    }

    // Register app download with appsFlyer

    appsFlyer.startSdk();
  }, []);

  const getProfile = async (token: string) => {
    const data = await getCardProfile(token);
    globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: data });
  };

  useEffect(() => {
    const biometricType = async () => {
      if (isAndroid()) {
        const type = await getSupportedBiometryType();
        setPinAuthentication(pinAuthentication || (type !== null && !(await isPinAuthenticated()))); //  for android devices with biometreics enabled the pinAuthentication will be set true
      }
    };
    setTimeout(() => {
      SplashScreen.hide();
      void biometricType();
    }, SPLASH_SCREEN_TIMEOUT);
  }, []);

  useEffect(() => {
    const getPinValue = async () => {
      const pinAuthenticated = await isPinAuthenticated();
      const isBiometricEnabled = await getSupportedBiometryType();
      if (isBiometricEnabled === null) {
        if (pinAuthenticated) {
          setPinPresent(PinPresentStates.TRUE);
        } else {
          setPinPresent(PinPresentStates.FALSE);
        };
      } else {
        if (pinAuthenticated) {
          setPinPresent(PinPresentStates.TRUE);
        }
      }
    };
    void getPinValue();
  }, []);

  useEffect(() => {
    if (ethereum.address === undefined && pinAuthentication) {
      _loadExistingWallet(dispatch, state);
    }
  }, [pinAuthentication]);

  useEffect(() => {
    const getHosts = async () => {
      await initializeHostsFromAsync().then(resp => {
        if (ethereum?.address && ethereum?.privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          signIn(ethereum).then((signInResponse) => {
            if (signInResponse) {
              globalDispatch({ type: GlobalContextType.SIGN_IN, sessionToken: signInResponse });
              void getProfile(signInResponse);
            }
          }).catch((e) => {
            Sentry.captureException(e.message);
          });
        }
      });
    };
    void getHosts();
  }, [ethereum.address]);

  useEffect(() => {
    if (walletConnectState?.itemsAdded) {
      void subscribeToEvents(walletConnectState.connectors[walletConnectState.connectors.length - 1], setWalletConnectModalVisible, setRequest, walletConnectDispatch, state, { state: modalState, dispatch: modalDispatch });
    }
  }, [walletConnectState?.connectors]);

  useEffect(() => {
    const getData = async () => {
      const data = await getConnectWalletData(ethereum.address);
      if (data && data.data.connectors.length !== 0) {
        const { connectors, dAppInfo } = data.data;
        const connectorList = connectors.map((session: any) => {
          const connector = new WalletConnect({ session });
          void subscribeToEvents(connector, setWalletConnectModalVisible, setRequest, walletConnectDispatch, { state: modalState, dispatch: modalDispatch });
          return connector;
        });
        walletConnectDispatch({ type: WalletConnectActions.RESTORE_SESSION, value: { connectors: connectorList, dAppInfo } });
      } else {
        walletConnectDispatch({ type: WalletConnectActions.RESTORE_INITIAL_STATE });
      }
    };
    void getData();
  }, [ethereum.address]);

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GlobalModal>
          <Sentry.TouchEventBoundary>
            <WalletConnectContext.Provider value={{ walletConnectState, walletConnectDispatch }}>
              <GlobalContext.Provider
                value={{ globalState, globalDispatch }}
              >
                <HdWalletContext.Provider value={{ state, dispatch }}>
                  <PortfolioContext.Provider
                    value={{ statePortfolio, dispatchPortfolio }}
                  >
                    {Platform.OS == 'android' && (
                      <StatusBar backgroundColor="white" barStyle="dark-content" />
                    )}
                    <Dialog
                      visible={updateModal}
                      footer={
                        <DialogFooter>
                          <DialogButton
                            text={t('UPDATE')}
                            onPress={() => {
                              analytics().logEvent('update_now', {})
                                .catch(Sentry.captureException);
                              setUpdateModal(false);
                              if (Platform.OS === 'android') {
                                void Linking.openURL(
                                  'market://details?id=com.cypherd.androidwallet'
                                );
                              } else {
                                const link =
                                  'itms-apps://apps.apple.com/app/cypherd-wallet/id1604120414';
                                Linking.canOpenURL(link).then(
                                  (supported) => {
                                    supported && Linking.openURL(link);
                                  },
                                  (err) => Sentry.captureException(err)
                                );
                              }
                            }}
                          />
                          <DialogButton
                            text={t('LATER')}
                            onPress={() => {
                              setUpdateModal(false);
                              void analytics().logEvent('update_later', {});
                            }}
                          />
                        </DialogFooter>
                      }
                      width={0.8}
                      onTouchOutside={() => {
                        setUpdateModal(false);
                      }}
                    >
                      <DialogContent>
                        <CText
                          dynamic
                          fF={C.fontsName.FONT_BOLD}
                          fS={16}
                          color={Colors.primaryTextColor}
                          style={{ marginTop: 20 }}
                        >
                          {t('NEW_UPDATE')}
                        </CText>
                        <CText
                          dynamic
                          fF={C.fontsName.FONT_BOLD}
                          fS={12}
                          color={Colors.primaryTextColor}
                          style={{ marginTop: 20 }}
                        >
                          {t('NEW_UPDATE_MSG')}
                        </CText>
                      </DialogContent>
                    </Dialog>
                    <StakingContext.Provider
                      value={{ stateStaking, dispatchStaking }}
                    >
                      <CosmosStakingContext.Provider value={{ cosmosStakingState, cosmosStakingDispatch }} >
                        <ActivityContext.Provider
                          value={{ state: stateActivity, dispatch: dispatchActivity }} >
                          <ModalContext.Provider
                            value={{ state: modalState, dispatch: modalDispatch }} >
                            <NavigationContainer /* theme={scheme === 'dark' ? darkTheme : lightTheme} */
                              ref={navigationRef}
                              onReady={() => {
                                routeNameRef.current =
                                  navigationRef?.current?.getCurrentRoute()?.name;
                                routingInstrumentation.registerNavigationContainer(
                                  navigationRef
                                );
                              }}
                              // eslint-disable-next-line @typescript-eslint/no-misused-promises
                              onStateChange={async () => {
                                const previousRouteName = routeNameRef.current;
                                const currentRouteName =
                                  navigationRef.current?.getCurrentRoute()?.name;
                                if (previousRouteName !== currentRouteName) {
                                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                  async () =>
                                    await analytics().logScreenView({
                                      screen_name: currentRouteName,
                                      screen_class: currentRouteName
                                    });
                                }
                                routeNameRef.current = currentRouteName;
                              }}
                            >
                              {ethereum.address === undefined
                                ? pinAuthentication || pinPresent === PinPresentStates.NOTSET
                                  ? (
                                    <LoadingStack />
                                  )
                                  : pinPresent === PinPresentStates.TRUE
                                    ? (
                                      <PinAuthRoute setPinAuthentication={setPinAuthentication} initialScreen={C.screenTitle.PIN_VALIDATION} />
                                    )
                                    : (
                                      <PinAuthRoute setPinAuthentication={setPinAuthentication} initialScreen={C.screenTitle.SET_PIN} />
                                    )
                                : ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_
                                  ? state.reset
                                    ? (
                                      <OnBoardingStack initialScreen={C.screenTitle.ENTER_KEY} />
                                    )
                                    : (
                                      <OnBoardingStack />
                                    )
                                  : (
                                    <TabStack />
                                  )}
                              <Toast
                                config={toastConfig}
                                position={'bottom'}
                                bottomOffset={140}
                              />
                              {<ConfirmationModals />}
                              <WalletConnectModal
                                walletConnectModalVisible={walletConnectModalData.displaWalletConnectModal}
                                setWalletConnectModalVisible={setWalletConnectModalVisible}
                                renderContent={walletConnectModalData.renderContent}
                                walletConnectApproveRequest={walletConnectApproveRequest}
                                walletConnectRejectRequest={walletConnectRejectRequest}
                                dispatchActivity={dispatchActivity}
                                params={walletConnectModalData.params}
                                request={request}
                                walletConnectDispatch={walletConnectDispatch}
                              />
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
        </GlobalModal>
      </GestureHandlerRootView>
    </>
  );
}

export default Sentry.wrap(App);
