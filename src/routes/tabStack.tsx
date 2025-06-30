import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
} from 'react';
import {
  Animated,
  BackHandler,
  Linking,
  StyleSheet,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import { screenTitle } from '../constants';
import ShortcutsModal from '../containers/Shortcuts';
import { isIOS } from '../misc/checkers';
import { CyDIcons, CyDView } from '../styles/tailwindComponents';
import {
  DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen,
  SwapStackScreen,
} from './auth';
import { Theme, useTheme } from '../reducers/themeReducer';
import clsx from 'clsx';
import { useColorScheme } from 'nativewind';
import { handleDeepLink } from '../../App';
import analytics from '@react-native-firebase/analytics';
import { useInstallReferrer } from '../hooks';
import {
  getProcessedReferrerCode,
  setProcessedReferrerCode,
} from '../core/asyncStorage';

const Tab = createBottomTabNavigator();
const NAVIGATION_DELAY = 50;
const DEEP_LINK_PROCESSING_DELAY = 100;

interface TabStackProps {
  deepLinkData: {
    screenToNavigate?: string;
    params?: any;
  } | null;
  setDeepLinkData: React.Dispatch<
    React.SetStateAction<{
      screenToNavigate?: string;
      params?: any;
    } | null>
  >;
}

interface NavigationParams {
  screen: string | undefined;
  params?: any;
}

const screensToHaveNavBar = [
  screenTitle.PORTFOLIO,
  screenTitle.PORTFOLIO_SCREEN,
  screenTitle.DEBIT_CARD_SCREEN,
  screenTitle.OPTIONS_SCREEN,
  screenTitle.SWAP_SCREEN,
  screenTitle.CARD_SCREEN,
  screenTitle.ON_META,
  screenTitle.SEND_INVITE_CODE_SCREEN,
];

function TabStack(props: TabStackProps) {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const { deepLinkData, setDeepLinkData } = props;
  const [showTabBar, setShowTabBar] = useState(true);
  const tabBarAnimation = useState(new Animated.Value(1))[0];
  const navigationReadyRef = useRef<boolean>(false);
  const pendingDeepLinkRef = useRef<typeof deepLinkData>(null);
  const { referrerData } = useInstallReferrer();

  let backPressCount = 0;

  // Use useNavigationContainerRef to get access to the navigation ref
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = React.useRef<string | undefined>(undefined);

  // Check for referral code from install referrer
  useEffect(() => {
    const checkReferralCode = async () => {
      if (Platform.OS === 'android' && referrerData?.referral) {
        // Android: We have a referral code from install referrer
        try {
          // Check if we've already processed this referral code
          const processedReferralCode = await getProcessedReferrerCode();

          if (processedReferralCode !== referrerData.referral) {
            // Navigate to referral code screen
            setDeepLinkData({
              screenToNavigate: screenTitle.I_HAVE_REFERRAL_CODE_SCREEN,
              params: {
                referralCodeFromLink: referrerData.referral,
                toPage: screenTitle.CARD_APPLICATION,
              },
            });

            // Mark as processed
            await setProcessedReferrerCode(referrerData.referral);
          }
        } catch (error) {
          console.error(
            'Error processing referral code from install referrer:',
            error,
          );
        }
      }
      // Note: For iOS, referral codes require server-side resolution of the attribution token
      // and subsequent server-to-app communication to trigger the referral screen
    };

    void checkReferralCode();
  }, [referrerData, setDeepLinkData]);

  const handleBackButton = () => {
    if (backPressCount === 0) {
      backPressCount++;
      setTimeout(() => {
        backPressCount = 0;
      }, 2000);

      if (Platform.OS === 'android') {
        // Only show toast on Android
        ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
      }
    } else if (backPressCount === 1) {
      backPressCount = 0;
      BackHandler.exitApp();
    }
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  /**
   * Navigate to a specific screen within a tab with proper two-step navigation
   * to ensure the tab stack is initialized correctly
   */
  const navigateToScreenInTab = useCallback(
    (tabName: string, navigationParams: NavigationParams) => {
      if (!navigationRef.current) return;

      // Step 1: Navigate to the parent tab first
      navigationRef.current.navigate(tabName);

      // Step 2: After a short delay, navigate to the specific screen within the tab
      setTimeout(() => {
        if (navigationRef.current) {
          navigationRef.current.navigate(tabName, navigationParams);
        }
      }, NAVIGATION_DELAY);
    },
    [],
  );

  // Extract common deep link navigation logic into a reusable function
  const handleNavigation = useCallback(
    (data: { screenToNavigate?: string; params?: any }) => {
      if (!data?.screenToNavigate) return false;
      if (!navigationRef.current || !navigationReadyRef.current) {
        // Store for later processing once navigation is ready
        pendingDeepLinkRef.current = data;
        return false;
      }

      switch (data.screenToNavigate) {
        case screenTitle.ENTER_REFERRAL_CODE:
          navigateToScreenInTab(screenTitle.CARD, {
            screen: data.screenToNavigate,
            params: data.params,
          });
          break;

        case screenTitle.TELEGRAM_PIN_SETUP:
          navigateToScreenInTab(screenTitle.CARD, {
            screen: data.screenToNavigate,
          });
          break;

        case screenTitle.TELEGRAM_SETUP:
          navigateToScreenInTab(screenTitle.CARD, {
            screen: data.screenToNavigate,
            params: {
              navigateTo: screenTitle.TELEGRAM_PIN_SETUP,
              showSetupLaterOption: false,
              enableBackButton: true,
            },
          });
          break;

        case screenTitle.CARD_CONTROLS:
          navigateToScreenInTab(screenTitle.CARD, {
            screen: data.screenToNavigate,
            params: data.params,
          });
          break;

        case screenTitle.ENTER_AMOUNT:
          navigateToScreenInTab(screenTitle.PORTFOLIO, {
            screen: data.screenToNavigate,
            params: data.params,
          });
          break;

        default:
          navigationRef.current.navigate(screenTitle.CARD);
      }
      return true;
    },
    [navigateToScreenInTab],
  );

  /**
   * Process any pending deep links that were received
   * before navigation was ready
   */
  const processPendingDeepLinks = useCallback(() => {
    if (pendingDeepLinkRef.current) {
      setTimeout(() => {
        handleNavigation(pendingDeepLinkRef.current!);
        pendingDeepLinkRef.current = null;
      }, DEEP_LINK_PROCESSING_DELAY);
    } else if (deepLinkData) {
      setTimeout(() => {
        handleNavigation(deepLinkData);
        setDeepLinkData(null);
      }, DEEP_LINK_PROCESSING_DELAY);
    }
  }, [deepLinkData, handleNavigation, setDeepLinkData]);

  // Handle navigation container becoming ready
  useEffect(() => {
    const unsubscribeReady = navigationRef.current?.addListener('state', () => {
      // Mark navigation as ready after the first state change
      if (!navigationReadyRef.current) {
        navigationReadyRef.current = true;
        processPendingDeepLinks();
      }
    });

    return () => {
      if (unsubscribeReady) {
        unsubscribeReady();
      }
    };
  }, [processPendingDeepLinks]);

  // Handle deep links that arrive while app is running
  useEffect(() => {
    const deepLinkListener = ({ url }: { url: string }) => {
      void handleDeepLink(url).then(linkData => {
        if (linkData) {
          // Process deep link immediately if navigation is ready
          if (navigationReadyRef.current) {
            handleNavigation(linkData);
          } else {
            // Otherwise store it for when navigation becomes ready
            pendingDeepLinkRef.current = linkData;
          }
        }
      });
    };

    const subscription = Linking.addEventListener('url', deepLinkListener);
    return () => subscription.remove();
  }, [handleNavigation]);

  // Handle deepLinkData changes from initial URL
  useEffect(() => {
    if (deepLinkData && navigationReadyRef.current) {
      handleNavigation(deepLinkData);
      setDeepLinkData(null);
    }
  }, [deepLinkData, handleNavigation, setDeepLinkData]);

  // Memoize the tab bar style
  useEffect(() => {
    Animated.timing(tabBarAnimation, {
      toValue: showTabBar ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showTabBar, tabBarAnimation]);

  const tabBarStyle = useMemo(
    () => ({
      ...styles.elevatedBackground,
      transform: [
        {
          translateY: tabBarAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [100, 0],
          }),
        },
      ],
      opacity: tabBarAnimation,
      borderTopWidth: 0,
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
    }),
    [tabBarAnimation],
  );

  const getActiveRouteName = useCallback((state: any): string => {
    const route = state.routes[state.index];
    if (!route.state) {
      return route.name;
    }

    // Dive into nested navigators
    return getActiveRouteName(route.state);
  }, []);

  const getCurrentRouteName = useCallback(() => {
    if (navigationRef.current) {
      const state = navigationRef.current.getRootState();
      return getActiveRouteName(state);
    }
    return undefined;
  }, [getActiveRouteName]);

  useEffect(() => {
    const unsubscribe = navigationRef.current?.addListener('state', () => {
      const currentRouteName = getCurrentRouteName();
      setShowTabBar(
        currentRouteName
          ? screensToHaveNavBar.includes(currentRouteName)
          : false,
      );
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [getCurrentRouteName]);

  const getTabBarTextColor = useCallback(() => {
    if (theme === Theme.SYSTEM) {
      return colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    }
    return theme === 'dark' ? '#FFFFFF' : '#000000';
  }, [theme, colorScheme]);

  return (
    <NavigationContainer
      independent={true}
      ref={navigationRef}
      onReady={() => {
        const currentRoute = navigationRef.current?.getCurrentRoute();
        routeNameRef.current = currentRoute?.name;
        navigationReadyRef.current = true;
        processPendingDeepLinks();
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRoute = navigationRef.current?.getCurrentRoute();
        const currentRouteName = currentRoute?.name;

        if (previousRouteName !== currentRouteName && currentRouteName) {
          void analytics().logScreenView({
            screen_name: currentRouteName,
            screen_class: currentRouteName,
          });
          routeNameRef.current = currentRouteName;
        }
      }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            let iconSource = '';
            if (route.name === screenTitle.PORTFOLIO) {
              iconSource = 'home-filled';
            } else if (route.name === screenTitle.CARD) {
              iconSource = 'card-filled';
            } else if (route.name === screenTitle.SWAP) {
              iconSource = 'swap-horizontal';
            } else if (route.name === screenTitle.OPTIONS) {
              iconSource = 'tools-wrench-screwdriver';
            }
            return (
              <CyDIcons
                name={iconSource as any}
                size={32}
                className={clsx('', {
                  'text-base400': focused,
                  'text-n200': !focused,
                })}
              />
            );
          },
          tabBarHideOnKeyboard: true,
          tabBarInactiveTintColor: '#7A8699',
          tabBarActiveTintColor: getTabBarTextColor(),
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700' as const,
            fontFamily: 'Manrope',
          },
          tabBarStyle,
          tabBarBackground: () => (
            <CyDView className='bg-n0 h-full rounded-t-[20px] shadow-xl shadow-n40' />
          ),
        })}
        initialRouteName={screenTitle.CARD}>
        <Tab.Screen
          name={screenTitle.PORTFOLIO}
          component={PortfolioStackScreen}
          options={{
            lazy: true,
          }}
        />
        <Tab.Screen
          name={screenTitle.CARD}
          component={DebitCardStackScreen}
          options={{
            lazy: true,
            headerShown: false,
          }}
        />
        <Tab.Screen
          name={screenTitle.SHORTCUTS}
          component={PortfolioStackScreen}
          options={({ route }) => ({
            tabBarButton: () => (
              <CyDView className={'scale-105'}>
                <ShortcutsModal />
              </CyDView>
            ),
          })}
        />
        <Tab.Screen
          name={screenTitle.SWAP}
          component={SwapStackScreen}
          options={{
            lazy: true,
            headerShown: false,
          }}
        />
        <Tab.Screen
          name={screenTitle.OPTIONS}
          component={OptionsStackScreen}
          options={{
            lazy: true,
            headerShown: false,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default TabStack;

const styles = StyleSheet.create({
  elevatedBackground: {
    height: isIOS() ? 88 : 76,
    paddingBottom: isIOS() ? 26 : 14,
    paddingTop: 10,
    paddingHorizontal: 21,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    elevation: 24, // For Android
  },
});
