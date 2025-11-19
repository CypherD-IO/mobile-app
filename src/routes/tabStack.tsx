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
} from 'react';
import {
  Animated,
  BackHandler,
  Linking,
  StyleSheet,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTitle } from '../constants';
import ShortcutsModal from '../containers/Shortcuts';
import { isIOS } from '../misc/checkers';
import { CyDIcons, CyDView } from '../styles/tailwindComponents';
import {
  DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen,
  RewardsStackScreen,
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
  getFirstLaunchAfterWalletCreation,
  setFirstLaunchAfterWalletCreation,
} from '../core/asyncStorage';
import Toast from 'react-native-toast-message';
import { parseErrorMessage } from '../core/util';

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
  screenTitle.REWARDS_SCREEN,
  screenTitle.CARD_SCREEN,
  screenTitle.ON_META,
  screenTitle.SEND_INVITE_CODE_SCREEN,
  screenTitle.SWAP_SCREEN,
];

const TabStack = React.memo(
  function TabStack(props: TabStackProps) {
    const { theme } = useTheme();
    const { colorScheme } = useColorScheme();
    const { deepLinkData, setDeepLinkData } = props;
    const [showTabBar, setShowTabBar] = useState(true);
    const tabBarAnimation = useState(new Animated.Value(1))[0];
    const navigationReadyRef = useRef<boolean>(false);
    const pendingDeepLinkRef = useRef<typeof deepLinkData>(null);
    const { referrerData } = useInstallReferrer();
    const insets = useSafeAreaInsets();

    let backPressCount = 0;

    // Use useNavigationContainerRef to get access to the navigation ref
    const navigationRef = useNavigationContainerRef();
    const routeNameRef = React.useRef<string | undefined>(undefined);

    // Decide landing tab based on first-launch flag
    const [initialTab, setInitialTab] = useState<string | null>(null);

    useEffect(() => {
      const decideLandingTab = async () => {
        try {
          const isFirstLaunch = await getFirstLaunchAfterWalletCreation();
          if (isFirstLaunch) {
            setInitialTab(screenTitle.CARD);
            // Reset the flag so subsequent launches open Portfolio
            await setFirstLaunchAfterWalletCreation(false);
          } else {
            setInitialTab(screenTitle.PORTFOLIO);
          }
        } catch (e) {
          // On error default to Portfolio to avoid blocking app load
          setInitialTab(screenTitle.PORTFOLIO);
        }
      };

      void decideLandingTab();
    }, []);

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
                screenToNavigate: screenTitle.ENTER_REFERRAL_CODE,
                params: {
                  referralCodeFromLink: referrerData.referral,
                  toPage: screenTitle.CARD_APPLICATION,
                },
              });

              // Mark as processed
              await setProcessedReferrerCode(referrerData.referral);
            }
          } catch (error) {
            Toast.show({
              type: 'error',
              text2: parseErrorMessage(error),
            });
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
        if (!data?.screenToNavigate) {
          return false;
        }

        if (!navigationRef.current || !navigationReadyRef.current) {
          // Store for later processing once navigation is ready so we never drop a deep link intent
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
              params: data.params,
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

          case screenTitle.DEBIT_CARD_SCREEN:
            // Deep link to the main Debit Card screen (default card landing page)
            navigateToScreenInTab(screenTitle.CARD, {
              screen: data.screenToNavigate,
              params: data.params,
            });
            break;

          case screenTitle.MERCHANT_REWARD_LIST:
            // Deep link to the Merchant Reward List screen (boost merchants entry point)
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
          // Do not navigate to CARD for unmatched deep link data
          // This prevents double navigation issues during wallet creation
          // Only navigate to CARD if there's a specific reason in the cases above
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
      const unsubscribeReady = navigationRef.current?.addListener(
        'state',
        () => {
          // Mark navigation as ready after the first state change
          if (!navigationReadyRef.current) {
            navigationReadyRef.current = true;
            processPendingDeepLinks();
          }
        },
      );

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
        height: 50,
        paddingHorizontal: 20,
        borderTopWidth: 0,
        elevation: 24, // For Android
        paddingBottom: 0,
        paddingVertical: 6,
        transform: [
          {
            translateY: tabBarAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            }),
          },
        ],
        opacity: tabBarAnimation,
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
      }),
      [tabBarAnimation, insets.bottom],
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
        const previousRouteName = routeNameRef.current;
        const currentRouteName = getCurrentRouteName();

        if (previousRouteName !== currentRouteName && currentRouteName) {
          void analytics().logScreenView({
            screen_name: currentRouteName,
            screen_class: currentRouteName,
          });
          routeNameRef.current = currentRouteName;
        }

        // Update tab bar visibility based on the active route
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
      return theme === Theme.DARK ? '#FFFFFF' : '#000000';
    }, [theme, colorScheme]);

    if (!initialTab) {
      return <CyDView />;
    }

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
          const currentRouteName = getCurrentRouteName();

          if (previousRouteName !== currentRouteName && currentRouteName) {
            void analytics().logScreenView({
              screen_name: currentRouteName,
              screen_class: currentRouteName,
            });
            routeNameRef.current = currentRouteName;
          }

          // Update tab bar visibility based on the active route
          setShowTabBar(
            currentRouteName
              ? screensToHaveNavBar.includes(currentRouteName)
              : false,
          );
        }}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused }) => {
              // Do not render an icon for the hidden Swap tab
              if (route.name === screenTitle.SWAP) {
                return null;
              }

              let iconSource = '';
              if (route.name === screenTitle.PORTFOLIO) {
                iconSource = 'portfolio';
              } else if (route.name === screenTitle.CARD) {
                iconSource = 'card-filled';
              } else if (route.name === screenTitle.REWARDS) {
                iconSource = 'rewards-icon';
              } else if (route.name === screenTitle.OPTIONS) {
                iconSource = 'options';
              }

              return (
                <CyDIcons
                  name={iconSource as any}
                  size={36}
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
              fontSize: 10,
              fontWeight: '600' as const,
              fontFamily: 'Manrope',
            },
            tabBarStyle,
            tabBarBackground: () => (
              <CyDView className='bg-n0 h-full border-t-[0.5px] border-n40' />
            ),
          })}
          initialRouteName={initialTab}>
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
            options={{
              tabBarButton: () => (
                <CyDView className={'flex items-center justify-center'}>
                  <ShortcutsModal />
                </CyDView>
              ),
            }}
          />
          <Tab.Screen
            name={screenTitle.REWARDS}
            component={RewardsStackScreen}
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

          {/* Hidden Tab for Swap functionality */}
          <Tab.Screen
            name={screenTitle.SWAP}
            component={SwapStackScreen}
            options={{
              // Hide this tab from the tab bar – it will be accessed programmatically
              tabBarButton: () => null,
              lazy: true,
              headerShown: false,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only re-render if deepLinkData actually changes in a meaningful way
    return prevProps.deepLinkData === nextProps.deepLinkData;
  },
);

export default TabStack;
