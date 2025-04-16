import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  BackHandler,
  Linking,
  StyleSheet,
  ToastAndroid,
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

const Tab = createBottomTabNavigator();

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

  let backPressCount = 0;

  // Use useNavigationContainerRef to get access to the navigation ref
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = React.useRef<string | undefined>(undefined);

  const handleBackButton = () => {
    if (backPressCount === 0) {
      backPressCount++;
      setTimeout(() => {
        backPressCount = 0;
      }, 2000);
      ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
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

  // Extract common deep link navigation logic into a reusable function
  const handleNavigation = useCallback(
    (data: { screenToNavigate?: string; params?: any }) => {
      if (!data?.screenToNavigate) return false;

      let tabName;
      let navigationParams: any;

      switch (data.screenToNavigate) {
        case screenTitle.I_HAVE_REFERRAL_CODE_SCREEN:
          tabName = screenTitle.CARD;
          navigationParams = {
            screenToNavigate: data.screenToNavigate,
            ...data.params,
          };
          break;
        case screenTitle.TELEGRAM_PIN_SETUP:
          tabName = screenTitle.CARD;
          navigationParams = {
            screenToNavigate: data.screenToNavigate,
          };
          break;
        case screenTitle.TELEGRAM_SETUP:
          tabName = screenTitle.CARD;
          navigationParams = {
            screen: data.screenToNavigate,
            params: {
              navigateTo: screenTitle.TELEGRAM_PIN_SETUP,
              showSetupLaterOption: false,
              enableBackButton: true,
            },
          };
          break;
        case screenTitle.CARD_CONTROLS:
          tabName = screenTitle.CARD;
          navigationParams = {
            screen: data.screenToNavigate,
            params: data.params,
          };
          break;
        default:
          tabName = screenTitle.PORTFOLIO_SCREEN;
      }

      if (tabName && navigationRef.current) {
        navigationRef.current.navigate(
          tabName,
          navigationParams || {
            screenToNavigate: data.screenToNavigate,
          },
        );
        return true;
      }
      return false;
    },
    [],
  );

  // Handle deep links that arrive while app is running
  useEffect(() => {
    const deepLinkListener = ({ url }: { url: string }) => {
      void handleDeepLink(url).then(linkData => {
        if (linkData) {
          // Try to navigate immediately if possible
          const navigated = handleNavigation(linkData);
          // If navigation isn't ready, store the data for later
          if (!navigated) {
            setDeepLinkData(linkData);
          }
        }
      });
    };

    const subscription = Linking.addEventListener('url', deepLinkListener);
    return () => subscription.remove();
  }, [handleNavigation, setDeepLinkData]);

  // Handle deepLinkData changes (from initial URL or when navigation wasn't ready)
  useEffect(() => {
    if (deepLinkData?.screenToNavigate) {
      const navigated = handleNavigation(deepLinkData);
      if (navigated) {
        setDeepLinkData(null);
      }
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
      position: 'absolute',
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
      setShowTabBar(screensToHaveNavBar.includes(currentRouteName ?? ''));
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
            let iconSource;
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
                name={iconSource}
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
        initialRouteName={screenTitle.PORTFOLIO}>
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
