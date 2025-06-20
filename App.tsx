/* eslint-disable @typescript-eslint/no-misused-promises */

/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import './global.css';
import '@walletconnect/react-native-compat';
import 'fast-text-encoding';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useReducer, useState } from 'react';
import Toast from 'react-native-toast-message';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import './src/i18n';
import { BackHandler, Keyboard, Linking, LogBox } from 'react-native';
import {
  HdWalletContext,
  ActivityContext,
  referralLinkAnalytics,
  extractAddressFromURI,
} from './src/core/util';
import { hdWalletStateReducer, initialHdWalletState } from './src/reducers';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { Config } from 'react-native-config';
import {
  gloabalContextReducer,
  GlobalContext,
  initialGlobalState,
} from './src/core/globalContext';
import TabStack from './src/routes/tabStack';
import 'fastestsmallesttextencoderdecoder';
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
import {
  BridgeContext,
  bridgeContextInitialState,
  bridgeReducer,
} from './src/reducers/bridge.reducer';
import { screenTitle } from './src/constants';
import { ThreeDSecureProvider } from './src/components/v2/threeDSecureApprovalModalContext';
import { ThemeProvider } from './src/reducers/themeReducer';
import { CyDView } from './src/styles/tailwindComponents';
import { CardProviders } from './src/constants/enum';
import { get } from 'lodash';

// Early Sentry initialization to prevent "Sentry.wrap called before Sentry.init" warning

// Check multiple sources for testing flag
const isTestingFromConfig = String(Config.IS_TESTING) === 'true';
const isTestingFromEnv =
  process.env.NODE_ENV === 'test' || process.env.CI === 'true';
const isTesting = isTestingFromConfig || isTestingFromEnv;

// Comprehensive warning suppression - especially critical during testing
// This configuration suppresses common warnings that appear during E2E testing
// Add new warning patterns here as needed
LogBox.ignoreLogs([
  // Sentry warnings
  'App Start Span could not be finished',
  'Sentry.wrap was called before Sentry.init',
  'App Start Span could not be finished. `Sentry.wrap` was called before `Sentry.init`',
  /App Start Span.*Sentry/,
  /Sentry\.wrap.*before.*Sentry\.init/,

  // Navigation warnings (React Navigation) - specifically for serialization warnings
  'Non-serializable values were found in the',
  /Non-serializable values were found/,
  'Serializable values only',
  /Serializable values/,
  /Non-serializable.*values/,
  /serializable.*values/i,

  // Promise rejection warnings
  'Possible Unhandled Promise Rejection',
  /Possible Unhandled Promise Rejection/,

  // General testing warning suppression when in test mode
  ...(isTesting
    ? [
        // Additional warnings to suppress during testing
        'Warning:',
        /Warning:/,
        'VirtualizedLists should never be nested',
        'Setting a timer for a long period',
      ]
    : []),
]);

// Always initialize Sentry early to prevent the warning, regardless of mode
Sentry.init({
  dsn: Config.SENTRY_DSN,
  enabled: !isTesting, // Only enable in production
  tracesSampleRate: isTesting ? 0 : 1.0,
  enableAutoPerformanceTracing: !isTesting,
  enableNativeCrashHandling: !isTesting,
  autoSessionTracking: !isTesting,
  beforeSend: isTesting ? () => null : undefined, // Drop all events in test mode
});

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

interface DeepLinkData {
  screenToNavigate: string;
  params?: {
    cardId?: string;
    currentCardProvider?: string;
    referralCode?: string;
    referralCodeFromLink?: string;
    sendAddress?: string;
    fromDeepLink?: boolean;
  };
}

// Export this utility function for handling deep links
export const handleDeepLink = async (url: string | null) => {
  if (!url) return null;

  // Handle ethereum: URI scheme
  if (url.startsWith('ethereum:')) {
    // Extract address from ethereum:0x... format
    const regEx = url.match(/(\b0x[a-fA-F0-9]{40}\b)/g);
    const address = regEx && regEx.length > 0 ? regEx[0] : null;

    if (address) {
      return {
        screenToNavigate: screenTitle.ENTER_AMOUNT,
        params: {
          sendAddress: address,
          fromDeepLink: true,
        },
      };
    }
  }

  // Handle solana: URI scheme using utility function
  if (url.startsWith('solana:')) {
    const address = extractAddressFromURI(url);

    if (address) {
      return {
        screenToNavigate: screenTitle.ENTER_AMOUNT,
        params: {
          sendAddress: address,
          fromDeepLink: true,
        },
      };
    }
  }

  if (url.includes('/card/referral/')) {
    const referralCode = url.split('/card/referral/')[1];
    await setReferralCodeAsync(referralCode);
    void referralLinkAnalytics(referralCode);
    return {
      screenToNavigate: screenTitle.ENTER_REFERRAL_CODE,
      params: { referralCodeFromLink: referralCode },
    };
  } else if (url.includes('/card/telegramPinSetup')) {
    return {
      screenToNavigate: screenTitle.TELEGRAM_PIN_SETUP,
    };
  } else if (url.includes('/card/telegramSetup')) {
    return {
      screenToNavigate: screenTitle.TELEGRAM_SETUP,
    };
  } else if (url.includes('/card?')) {
    const urlObj = new URL(url);
    const decline = urlObj.searchParams.get('decline');
    const cardId = urlObj.searchParams.get('cardId');

    if (decline === 'true' && cardId) {
      return {
        screenToNavigate: screenTitle.CARD_CONTROLS,
        params: {
          cardId,
          currentCardProvider: CardProviders.REAP_CARD,
        },
      };
    }
  }
  return null;
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
  const [stateActivity, dispatchActivity] = useReducer(
    ActivityStateReducer,
    initialActivityState,
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

  const ethereumAddress = get(state, 'wallet.ethereum.address', '');
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

  const [deepLinkData, setDeepLinkData] = useState<DeepLinkData | null>(null);

  let params = {};
  let renderContent: any = {};

  const linking: LinkingOptions<ReactNavigation.RootParamList> = {
    prefixes: [
      'https://app.cypherhq.io',
      'cypherwallet://',
      'ethereum://',
      'solana://',
    ],
    config: {
      screens: {
        [screenTitle.PORTFOLIO]: '*',
      },
    },
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      if (url != null) {
        const linkData = await handleDeepLink(url);
        if (linkData) {
          setDeepLinkData(linkData);
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
        address: state.wallet?.ethereum?.wallets[0]?.address,
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
      const data = await getConnectWalletData(ethereumAddress);
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
  }, [ethereumAddress]);

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
    <ThemeProvider>
      <CyDView style={{ flex: 1, backgroundColor: 'white' }} className=''>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Sentry.TouchEventBoundary>
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
                              <InitializeAppProvider>
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
                  </HdWalletContext.Provider>
                </GlobalContext.Provider>
              </WalletConnectContext.Provider>
            </NavigationContainer>
          </Sentry.TouchEventBoundary>
        </GestureHandlerRootView>
      </CyDView>
    </ThemeProvider>
  );
}

export default Sentry.wrap(App);
