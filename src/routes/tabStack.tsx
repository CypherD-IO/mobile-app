import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, BackHandler, StyleSheet, ToastAndroid } from 'react-native';
import AppImages from '../../assets/images/appImages';
import { screenTitle } from '../constants';
import ShortcutsModal from '../containers/Shortcuts';
import { isIOS } from '../misc/checkers';
import { CyDFastImage, CyDView } from '../styles/tailwindStyles';
import {
  DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen,
  SwapStackScreen,
} from './auth';

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

const screensToHaveNavBar = [
  screenTitle.PORTFOLIO,
  screenTitle.OPTIONS,
  screenTitle.PORTFOLIO_SCREEN,
  screenTitle.DEBIT_CARD_SCREEN,
  screenTitle.OPTIONS_SCREEN,
  screenTitle.SWAP,
  screenTitle.BRIDGE_SKIP_API_SCREEN,
  screenTitle.DEBIT_CARD_SCREEN,
  screenTitle.BRIDGE_CARD_SCREEN,
  screenTitle.SELECT_PLAN,
  screenTitle.ON_META,
  screenTitle.SEND_INVITE_CODE_SCREEN,
];

function TabStack(props: TabStackProps) {
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
          tabName = screenTitle.DEBIT_CARD_SCREEN;
          break;
        case screenTitle.TELEGRAM_PIN_SETUP:
          tabName = screenTitle.DEBIT_CARD_SCREEN;
          break;
        case screenTitle.TELEGRAM_SETUP:
          tabName = screenTitle.DEBIT_CARD_SCREEN;
          console.log(
            'deepLinkData.screenToNavigate : ',
            deepLinkData.screenToNavigate,
          );
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
        console.log(
          'navigationParams : ',
          navigationParams || {
            screenToNavigate: deepLinkData.screenToNavigate,
          },
        );
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
      backgroundColor: 'white',
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
              iconSource = focused
                ? AppImages.PORTFOLIO_SEL
                : AppImages.PORTFOLIO_UNSEL;
            } else if (route.name === screenTitle.DEBIT_CARD_SCREEN) {
              iconSource = focused ? AppImages.CARD_SEL : AppImages.CARD_UNSEL;
            } else if (route.name === screenTitle.SWAP) {
              iconSource = focused ? AppImages.SWAP_SEL : AppImages.SWAP_UNSEL;
            } else if (route.name === screenTitle.OPTIONS) {
              iconSource = focused
                ? AppImages.OPTION_SEL
                : AppImages.OPTION_UNSEL;
            }
            return (
              <CyDFastImage
                source={iconSource}
                className={'w-[32px] h-[32px]'}
              />
            );
          },
          tabBarHideOnKeyboard: true,
          tabBarInactiveTintColor: '#7A8699',
          tabBarActiveTintColor: '#000000',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '400' as const,
            fontFamily: 'Manrope',
          },
          tabBarStyle,
          tabBarBackground: () => (
            <CyDView className='absolute inset-0 bg-n0 rounded-t-[22px] shadow-xl shadow-gray-400' />
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
          name={screenTitle.DEBIT_CARD_SCREEN}
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
    borderWidth: 1,
    borderColor: '#EBEDF0',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    elevation: 24, // For Android
  },
});
