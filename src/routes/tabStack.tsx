import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  getRootState,
  NavigationContainer,
  NavigationProp,
  ParamListBase,
  useNavigation,
  useNavigationContainerRef,
} from '@react-navigation/native';
import clsx from 'clsx';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BackHandler, StyleSheet, ToastAndroid, Animated } from 'react-native';
import AppImages from '../../assets/images/appImages';
import { screenTitle } from '../constants';
import ShortcutsModal from '../containers/Shortcuts';
import { HdWalletContext } from '../core/util';
import { isIOS } from '../misc/checkers';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
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
  screenTitle.CARD_SIGNUP_LANDING_SCREEN,
  screenTitle.CARD_SIGNUP_CONFIRMATION,
  screenTitle.CARD_SIGNUP_SCREEN,
  screenTitle.CARD_KYC_STATUS_SCREEN,
  screenTitle.DEBIT_CARD_SCREEN,
  screenTitle.BRIDGE_CARD_SCREEN,
  screenTitle.SELECT_PLAN,
  screenTitle.ON_META,
  screenTitle.SEND_INVITE_CODE_SCREEN,
];

function TabStack(props: TabStackProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { isReadOnlyWallet } = hdWalletContext.state;
  const { deepLinkData, setDeepLinkData } = props;
  const [showTabBar, setShowTabBar] = useState(true);
  const tabBarAnimation = useState(new Animated.Value(1))[0];

  let backPressCount = 0;

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
      switch (deepLinkData.screenToNavigate) {
        case screenTitle.I_HAVE_REFERRAL_CODE_SCREEN:
          tabName = screenTitle.DEBIT_CARD_SCREEN;
          break;
        // Add more cases here for other deep link scenarios
        default:
          console.warn(
            `Unable to find tab for screen: ${deepLinkData.screenToNavigate}`,
          );
      }

      if (tabName) {
        navigation.navigate(tabName, {
          screen: deepLinkData.screenToNavigate,
        });
      }

      setDeepLinkData(null);
    }
  }, [deepLinkData, navigation, setDeepLinkData]);

  // Use useNavigationContainerRef to get access to the navigation ref
  const navigationRef = useNavigationContainerRef();
  // Determine if the tab bar should be shown

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
                className={clsx('w-[32px] h-[32px]', {
                  'opacity-30':
                    isReadOnlyWallet &&
                    (route.name === screenTitle.DEBIT_CARD_SCREEN ||
                      route.name === screenTitle.SWAP),
                })}
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
          listeners={{
            tabPress: e => {
              if (isReadOnlyWallet) {
                e.preventDefault();
              }
            },
          }}
        />
        <Tab.Screen
          name={screenTitle.SHORTCUTS}
          component={PortfolioStackScreen}
          options={({ route }) => ({
            tabBarButton: () => (
              <CyDView
                className={clsx('scale-110 shadow shadow-yellow-200', {})}>
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
          listeners={{
            tabPress: e => {
              if (isReadOnlyWallet) {
                e.preventDefault();
              }
            },
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
