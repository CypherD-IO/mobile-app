import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  BackHandler,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import AppImages from '../../assets/images/appImages';
import { screenTitle } from '../constants';
import ShortcutsModal from '../containers/Shortcuts';
import { isIOS } from '../misc/checkers';
import { CydMaterialDesignIcons, CyDView } from '../styles/tailwindStyles';
import {
  DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen,
  SwapStackScreen,
} from './auth';
import { useTheme } from '../reducers/themeReducer';
import clsx from 'clsx';

const Tab = createBottomTabNavigator();

interface TabStackProps {
  deepLinkData: {
    screenToNavigate?: string;
  } | null;
  setDeepLinkData: React.Dispatch<
    React.SetStateAction<{
      screenToNavigate?: string;
    } | null>
  >;
}

const getActiveTintColor = (theme: string) => {
  return theme === 'dark' ? 'var(--color-p150)' : 'var(--color-blue20)';
};

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

  const { deepLinkData, setDeepLinkData } = props;
  const [showTabBar, setShowTabBar] = useState(true);
  const tabBarAnimation = useState(new Animated.Value(1))[0];

  let backPressCount = 0;

  // Use useNavigationContainerRef to get access to the navigation ref
  const navigationRef = useNavigationContainerRef();
  // Determine if the tab bar should be shown

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

  useEffect(() => {
    if (deepLinkData?.screenToNavigate) {
      let tabName;
      let navigationParams: any;
      switch (deepLinkData.screenToNavigate) {
        case screenTitle.I_HAVE_REFERRAL_CODE_SCREEN:
          tabName = screenTitle.CARD;
          break;
        case screenTitle.TELEGRAM_PIN_SETUP:
          tabName = screenTitle.CARD;
          break;
        case screenTitle.TELEGRAM_SETUP:
          tabName = screenTitle.CARD;
          navigationParams = {
            screen: deepLinkData.screenToNavigate,
            params: {
              navigateTo: screenTitle.TELEGRAM_PIN_SETUP,
              showSetupLaterOption: false,
              enableBackButton: true,
            },
          };
          break;
        default:
          tabName = screenTitle.PORTFOLIO_SCREEN;
      }
      if (tabName) {
        navigationRef.current?.navigate(
          tabName,
          navigationParams || {
            screenToNavigate: deepLinkData.screenToNavigate,
          },
        );
      }

      setDeepLinkData(null);
    }
  }, [deepLinkData, setDeepLinkData]);

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

  return (
    <NavigationContainer independent={true} ref={navigationRef}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            let iconSource;
            if (route.name === screenTitle.PORTFOLIO) {
              iconSource = focused ? 'chart-arc' : 'chart-donut';
            } else if (route.name === screenTitle.CARD) {
              iconSource = focused ? 'credit-card' : 'credit-card-outline';
            } else if (route.name === screenTitle.SWAP) {
              iconSource = focused
                ? 'swap-horizontal-circle'
                : 'swap-horizontal-circle-outline';
            } else if (route.name === screenTitle.OPTIONS) {
              iconSource = focused
                ? 'dots-vertical-circle'
                : 'dots-vertical-circle-outline';
            }
            return (
              <CydMaterialDesignIcons
                name={iconSource}
                size={24}
                className={clsx('', {
                  'text-p50': focused,
                  'text-base400': !focused,
                })}
              />
            );
          },
          tabBarHideOnKeyboard: true,
          tabBarInactiveTintColor: '#7A8699',
          tabBarActiveTintColor: theme === 'dark' ? '#FFFFFF' : '#000000',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700' as const,
            fontFamily: 'Manrope',
          },
          tabBarStyle,
          tabBarBackground: () => (
            <CyDView className='bg-n0 h-full rounded-[20px] shadow-xl' />
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
              <CyDView className={'scale-110 shadow shadow-yellow-200'}>
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
    // borderWidth: 1,
    // borderColor: '#EBEDF0',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    elevation: 24, // For Android
  },
});
