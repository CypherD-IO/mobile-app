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
import {
  BackHandler,
  Keyboard,
  Linking,
  LogBox,
  StatusBar,
} from 'react-native';
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
import { ThemeProvider, useTheme, Theme } from './src/reducers/themeReducer';
import { CyDView } from './src/styles/tailwindComponents';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CardProviders } from './src/constants/enum';
import { get } from 'lodash';
import { useColorScheme } from 'nativewind';

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

// Initialize routing instrumentation before Sentry.init
const routingInstrumentation = Sentry.reactNavigationIntegration();

// Data scrubbing utility for sensitive information
const SENSITIVE_DATA_KEYS = ['password', 'seed', 'creditCardNumber'];
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

// Always initialize Sentry early to prevent the warning, regardless of mode
Sentry.init({
  dsn: Config.SENTRY_DSN,
  enabled: !isTesting, // Only enable in production
  environment: Config.ENVIRONMENT ?? 'staging',
  debug: false, // Keep debug off to avoid console spam
  tracesSampleRate: isTesting ? 0 : 1.0,
  enableAutoPerformanceTracing: !isTesting,
  enableNativeCrashHandling: !isTesting,
  enableAutoSessionTracking: !isTesting,
  tracePropagationTargets: ['127.0.0.1', 'api.cypherd.io'],
  beforeSend: isTesting
    ? () => null
    : (event, hint) => {
        // Scrub sensitive data from events
        if (event?.extra && typeof event.extra === 'object') {
          for (const [key, value] of Object.entries(event.extra)) {
            event.extra[key] = scrubData(key, value);
          }
        }
        if (event?.request && typeof event.request === 'object') {
          event.request.data = scrubData('requestBody', event.request.data);
        }
        if (event?.contexts?.app && typeof event.contexts.app === 'object') {
          for (const [key, value] of Object.entries(event.contexts.app)) {
            event.contexts.app[key] = scrubData(key, value);
          }
        }
        if (event?.tags && typeof event.tags === 'object') {
          for (const [key, value] of Object.entries(event.tags)) {
            event.tags[key] = scrubData(key, value);
          }
        }
        if (
          event?.exception?.values &&
          typeof event.exception.values === 'object'
        ) {
          for (const valueObj of event.exception.values) {
            if (valueObj.type && SENSITIVE_DATA_KEYS.includes(valueObj.type)) {
              valueObj.value = '********';
            }
          }
        }
        return event;
      },
  beforeBreadcrumb: isTesting
    ? () => null
    : (breadcrumb, hint) => {
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
  integrations: [
    // Initialize the ReactNavigation integration here
    routingInstrumentation,
    // Initialize React Native tracing integration
    Sentry.reactNativeTracingIntegration(),
  ],
});

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

/**
 * Determines the appropriate StatusBar style based on the current theme context.
 * This function handles the theme resolution logic to ensure proper contrast
 * between the status bar content and the background.
 *
 * @param theme - The current theme setting (SYSTEM, LIGHT, or DARK)
 * @param colorScheme - The device's color scheme preference (light/dark)
 * @returns Object containing barStyle and backgroundColor for StatusBar
 */
const getStatusBarStyle = (
  theme: Theme,
  colorScheme: string | null | undefined,
) => {
  // Resolve the actual theme to use (SYSTEM theme resolves to device preference)
  const resolvedTheme =
    theme === Theme.SYSTEM
      ? colorScheme === 'dark'
        ? Theme.DARK
        : Theme.LIGHT
      : theme;

  // Return appropriate StatusBar configuration based on resolved theme
  if (resolvedTheme === Theme.DARK) {
    return {
      barStyle: 'light-content' as const, // Light text/icons for dark backgrounds
      backgroundColor: 'transparent', // Maintain transparency for proper SafeArea behavior
    };
  } else {
    return {
      barStyle: 'dark-content' as const, // Dark text/icons for light backgrounds
      backgroundColor: 'transparent', // Maintain transparency for proper SafeArea behavior
    };
  }
};

/**
 * StatusBar component that dynamically adjusts based on theme context.
 * This component must be rendered inside the ThemeProvider to access theme state.
 */
const ThemedStatusBar = () => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  // Get the appropriate StatusBar configuration based on current theme
  const statusBarConfig = getStatusBarStyle(theme, colorScheme);

  return (
    <StatusBar
      barStyle={statusBarConfig.barStyle}
      backgroundColor={statusBarConfig.backgroundColor}
      translucent={true}
    />
  );
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
    <SafeAreaProvider>
      <ThemeProvider>
        <CyDView style={{ flex: 1, backgroundColor: 'white' }} className=''>
          {/* Configure StatusBar dynamically based on theme context for proper contrast and SafeArea behavior */}
          <ThemedStatusBar />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Sentry.TouchEventBoundary>
              <NavigationContainer /* theme={scheme === 'dark' ? darkTheme : lightTheme} */
                ref={navigationRef}
                linking={linking}
                onReady={() => {
                  routeNameRef.current =
                    navigationRef?.current?.getCurrentRoute()?.name;
                  // Register navigation container with Sentry for performance tracking
                  // In Sentry v7, the navigation integration is automatically registered
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
                  <GlobalContext.Provider
                    value={{ globalState, globalDispatch }}>
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
                                    walletConnectDispatch={
                                      walletConnectDispatch
                                    }
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
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
