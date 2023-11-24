/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import 'fast-text-encoding';
import { useEffect, useReducer, useState } from 'react';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { NavigationContainer } from '@react-navigation/native';
import './src/i18n';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import LoadingStack from './src/routes/loading';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  HdWalletContext,
  PortfolioContext,
  StakingContext,
  ActivityContext,
  getPlatform,
  getPlatformVersion,
} from './src/core/util';
import {
  hdWalletStateReducer,
  initialHdWalletState,
  initialPortfolioState,
  initialValidatorState,
  portfolioStateReducer,
  ValidatorsListReducer,
} from './src/reducers';
import {
  isBiometricEnabled,
  isPinAuthenticated,
  loadCyRootDataFromKeyChain,
} from './src/core/Keychain';
import { Colors } from './src/constants/theme';
import * as C from './src/constants/index';
import AppImages from './assets/images/appImages';
import analytics from '@react-native-firebase/analytics';
import Intercom from '@intercom/intercom-react-native';
import JailMonkey from 'jail-monkey';
import RNExitApp from 'react-native-exit-app';
import '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import {
  getToken,
  onMessage,
  registerForRemoteMessages,
} from './src/core/push';
import {
  fetchRPCEndpointsFromServer,
  gloabalContextReducer,
  signIn,
  GlobalContext,
  initialGlobalState,
} from './src/core/globalContext';
import TabStack from './src/routes/tabStack';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import Dialog, {
  DialogButton,
  DialogContent,
  DialogFooter,
} from 'react-native-popup-dialog';
import 'fastestsmallesttextencoderdecoder';
import {
  CosmosStakingContext,
  cosmosStakingInitialState,
  cosmosStakingReducer,
} from './src/reducers/cosmosStakingReducer';
import {
  ActivityReducerAction,
  ActivityStateReducer,
  initialActivityState,
} from './src/reducers/activity_reducer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDeveloperMode,
  getConnectWalletData,
  getReadOnlyWalletData,
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
import SplashScreen from 'react-native-lottie-splash-screen';
import DeviceInfo, { getVersion } from 'react-native-device-info';
import WalletConnect from '@walletconnect/client';
import WalletConnectModal from './src/components/WalletConnectModal';
import { GlobalModal } from './src/components/v2/GlobalModal';
import OnBoardingStack from './src/routes/onBoarding';
import {
  GlobalContextType,
  PinPresentStates,
  SignMessageValidationType,
} from './src/constants/enum';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getWalletProfile } from './src/core/card';
import ConfirmationModals from './src/containers/Browser/ConfirmationModals';
import {
  ModalContext,
  modalContextInitialState,
  modalReducer,
} from './src/reducers/modalReducer';
import { initializeHostsFromAsync } from './src/global';
import PinAuthRoute from './src/routes/pinAuthRoute';
import { get, has, set } from 'lodash';
import { SPLASH_SCREEN_TIMEOUT } from './src/constants/timeOuts';
import appsFlyer from 'react-native-appsflyer';
import { AppsFlyerConfiguration } from './src/constants/appsFlyer';
import { appsFlyerDeepLinkCallback } from './src/core/appsFlyerUtils';
import { CyDText } from './src/styles/tailwindStyles';
import { sendFirebaseEvent } from './src/containers/utilities/analyticsUtility';
import { ethToEvmos } from '@tharsis/address-converter';
import { WalletConnectV2Provider } from './src/components/walletConnectV2Provider';
import DefaultAuthRemoveModal from './src/components/v2/defaultAuthRemoveModal';
import { Config } from 'react-native-config';

const { DynamicView, CText, DynamicImage } = require('./src/styles');

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
const SENSITIVE_DATA_KEYS = ['password', 'seed', 'creditCardNumber'];
function scrubData(key: string, value: any): any {
  if (SENSITIVE_DATA_KEYS.includes(key)) {
    return '********'; // Replace with asterisks
  } else if (key === 'email') {
    const domain: string = value.slice(value.indexOf('@'));
    return `****${domain}`; // Replace with asterisks before domain name
  } else {
    return value; // Don't scrub other data
  }
}
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

// AppsFlyer SDK initialization
const NoOpFunction = () => {};
appsFlyer.initSdk(
  {
    devKey: Config.AF_DEVKEY ?? '',
    // TODO: make this based on ENV
    isDebug: Config.ENVIROINMENT !== 'production',
    appId: Config.AF_APPID ?? '',
    // to begin we are not recieving any raw data on Cypher side.
    onInstallConversionDataListener: false,
    onDeepLinkListener: true,
    // Deferring the SDK start launch event to later.
    manualStart: true,
  },
  () => {
    appsFlyer.onDeepLink(appsFlyerDeepLinkCallback);
    appsFlyer.setOneLinkCustomDomains(
      AppsFlyerConfiguration.brandedDomains,
      () => {
        appsFlyer.setAppInviteOneLinkID(
          AppsFlyerConfiguration.oneLinkId,
          NoOpFunction,
        );
      },
      NoOpFunction,
    );
  },
  NoOpFunction,
);

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

function _loadExistingWallet(
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
) {
  loadCyRootDataFromKeyChain(state)
    .then(cyRootData => {
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
        getToken(
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
    })
    .catch(Sentry.captureException);
}

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
  const inAppUpdates = new SpInAppUpdates(
    false, // isDebug
  );
  const [updateModal, setUpdateModal] = useState<boolean>(false);
  const [forcedUpdate, setForcedUpdate] = useState<boolean>(false);
  const [tamperedSignMessageModal, setTamperedSignMessageModal] =
    useState<boolean>(false);
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
  const [pinAuthentication, setPinAuthentication] = useState(false);
  const [pinPresent, setPinPresent] = useState(PinPresentStates.NOTSET);
  const [showDefaultAuthRemoveModal, setShowDefaultAuthRemoveModal] =
    useState<boolean>(false);

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

  // Don't change, its meant for one time operation
  useEffect(() => {
    void checkUpdateNeeded();
    fetchRPCEndpointsFromServer(globalDispatch).catch(e => {
      Sentry.captureException(e.message);
    });

    const checkForUpdatesAndShowModal = async () => {
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

    void checkForUpdatesAndShowModal();

    AsyncStorage.getItem('activities', (_err, data) => {
      data &&
        dispatchActivity({
          type: ActivityReducerAction.LOAD,
          value: JSON.parse(data),
        });
    }).catch(Sentry.captureException);

    if (Platform.OS === 'ios') {
      registerForRemoteMessages();
    } else {
      onMessage();
    }
  }, []);

  const getProfile = async (token: string) => {
    const data = await getWalletProfile(token);
    globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: data });
  };

  useEffect(() => {
    const biometricType = async () => {
      // if (isAndroid()) {
      const isBiometricPasscodeEnabled = await isBiometricEnabled();
      setPinAuthentication(
        isBiometricPasscodeEnabled && !(await isPinAuthenticated()),
      ); //  for android devices with biometreics enabled the pinAuthentication will be set true
      // }
    };
    setTimeout(() => {
      SplashScreen.hide();
      void biometricType();
    }, SPLASH_SCREEN_TIMEOUT);
  }, []);

  useEffect(() => {
    const getPinValue = async () => {
      const pinAuthenticated = await isPinAuthenticated();
      const hasBiometricEnabled = await isBiometricEnabled();
      if (!hasBiometricEnabled) {
        if (pinAuthenticated) {
          setPinPresent(PinPresentStates.TRUE);
        } else {
          await loadCyRootDataFromKeyChain(state, () =>
            setShowDefaultAuthRemoveModal(true),
          );
          setPinPresent(PinPresentStates.FALSE);
        }
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

  const getAuthTokenData = async () => {
    if (
      ethereum?.address &&
      ethereum?.privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
    ) {
      signIn(ethereum)
        .then(signInResponse => {
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
        })
        .catch(e => {
          Sentry.captureException(e.message);
        });
    }
  };

  useEffect(() => {
    const getHosts = async () => {
      await initializeHostsFromAsync().then(resp => {
        if (
          ethereum?.address &&
          ethereum?.privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_
        ) {
          void getAuthTokenData();
        }
      });
    };
    void getHosts();
  }, [ethereum.address]);

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
            let connector: any;
            if (
              !(
                has(connectionObject, 'version') &&
                connectionObject.version === 'v2'
              )
            ) {
              connector = new WalletConnect({ session: connectionObject });
              void subscribeToEvents(
                connector,
                setWalletConnectModalVisible,
                setRequest,
                walletConnectDispatch,
                state,
                { state: modalState, dispatch: modalDispatch },
              );
            } else {
              connector = connectionObject;
            }
            return connector;
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
                  <Dialog
                    visible={updateModal}
                    footer={
                      <DialogFooter>
                        <DialogButton
                          text={t('UPDATE')}
                          onPress={() => {
                            analytics()
                              .logEvent('update_now', {})
                              .catch(Sentry.captureException);
                            setUpdateModal(false);
                            if (Platform.OS === 'android') {
                              void Linking.openURL(
                                'market://details?id=com.cypherd.androidwallet',
                              );
                            } else {
                              const link =
                                'itms-apps://apps.apple.com/app/cypherd-wallet/id1604120414';
                              Linking.canOpenURL(link).then(
                                supported => {
                                  supported && Linking.openURL(link);
                                },
                                err => Sentry.captureException(err),
                              );
                            }
                          }}
                        />
                        <DialogButton
                          text={t('LATER')}
                          disabled={forcedUpdate}
                          onPress={() => {
                            setUpdateModal(false);
                            void analytics().logEvent('update_later', {});
                          }}
                        />
                      </DialogFooter>
                    }
                    width={0.8}
                    onTouchOutside={() => {
                      !forcedUpdate && setUpdateModal(false);
                    }}>
                    <DialogContent>
                      <CyDText
                        className={
                          'font-bold text-[16px] text-primaryTextColor mt-[20px] text-center'
                        }>
                        {t<string>('NEW_UPDATE')}
                      </CyDText>
                      <CyDText
                        className={
                          'font-bold text-[13px] text-primaryTextColor mt-[20px] text-center'
                        }>
                        {!forcedUpdate
                          ? t('NEW_UPDATE_MSG')
                          : t('NEW_MUST_UPDATE_MSG')}
                      </CyDText>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    visible={tamperedSignMessageModal}
                    footer={
                      <DialogFooter>
                        <DialogButton
                          text={t('CLOSE')}
                          onPress={() => {
                            RNExitApp.exitApp();
                          }}
                        />
                        <DialogButton
                          text={t('CONTACT_TEXT')}
                          onPress={async () => {
                            await Intercom.displayMessenger();
                            sendFirebaseEvent(state, 'support');
                          }}
                        />
                      </DialogFooter>
                    }
                    width={0.8}>
                    <DialogContent>
                      <CyDText
                        className={
                          'font-bold text-[16px] text-primaryTextColor mt-[20px] text-center'
                        }>
                        {t<string>('SOMETHING_WENT_WRONG')}
                      </CyDText>
                      <CyDText
                        className={
                          'font-bold text-[13px] text-primaryTextColor mt-[20px] text-center'
                        }>
                        {t<string>('CONTACT_CYPHERD_SUPPORT')}
                      </CyDText>
                    </DialogContent>
                  </Dialog>

                  <DefaultAuthRemoveModal
                    isModalVisible={showDefaultAuthRemoveModal}
                  />

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
                              <WalletConnectV2Provider>
                                {ethereum.address === undefined ? (
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
                                )}
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
                              </WalletConnectV2Provider>
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
