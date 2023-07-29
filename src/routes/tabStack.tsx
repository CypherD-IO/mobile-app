import { screenTitle } from '../constants';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import * as React from 'react';
import {
  BrowserStackScreen, DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen
} from './auth';
import { BottomTabBar, BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AppImages from '../../assets/images/appImages';
import ShortcutsModal from '../containers/Shortcuts';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useContext, useEffect, useState } from 'react';
import { ActivityContext, HdWalletContext } from '../core/util';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import { CyDAnimatedView, CyDImage, CyDText, CyDView } from '../styles/tailwindStyles';
import { t } from 'i18next';
import clsx from 'clsx';
import { isIOS } from '../misc/checkers';
import { Layout, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import * as Animatable from 'react-native-animatable';

const Tab = createBottomTabNavigator();

function TabStack () {
  const navigationRef = useNavigationContainerRef();
  const activityContext = useContext<any>(ActivityContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { isReadOnlyWallet } = hdWalletContext.state;
  const inAppUpdates = new SpInAppUpdates(
    false // isDebug
  );
  const screensToHaveNavBar = [
    screenTitle.PORTFOLIO_SCREEN,
    screenTitle.BROWSER_SCREEN,
    screenTitle.OPTIONS_SCREEN,
    screenTitle.CARD_SIGNUP_LANDING_SCREEN,
    screenTitle.CARD_SIGNUP_SCREEN,
    screenTitle.APTO_CARD_SCREEN,
    screenTitle.BRIDGE_CARD_SCREEN
  ];

  const [badgedTabBarOptions, setBadgedTabBarOptions] = useState<any>({});

  const paddingBottomTabBarStyles = isIOS() ? 15 : 10;

  let backPressCount = 0;
  const handleBackButton = () => {
    if (backPressCount === 0) {
      backPressCount++;
      setTimeout(() => { backPressCount = 0; }, 2000);
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

  const latestDate = (activities: any, lastVisited: Date) => {
    if (activities.length === 0) return false;
    const sortedAsc = activities.sort(
      (objA: any, objB: any) => Number(objA.datetime) - Number(objB.datetime)
    );
    return sortedAsc[sortedAsc.length - 1].datetime > lastVisited;
  };

  useEffect(() => {
    const isBadgeAvailable = async () => {
      let showBadge: boolean = false;
      const updateResp = await inAppUpdates.checkNeedsUpdate();
      showBadge = updateResp.shouldUpdate || latestDate(activityContext.state.activityObjects, activityContext.state.lastVisited);
      if (showBadge) {
        setBadgedTabBarOptions({
          tabBarBadge: '',
          tabBarBadgeStyle: { fontSize: 0, paddingHorizontal: 0, lineHeight: 0, height: 10, width: 10, minWidth: 0, borderRadius: 6, top: 12, left: 4 }
        });
      } else setBadgedTabBarOptions({});
    };

    void isBadgeAvailable();
  }, [activityContext.state]);

  return (
    <NavigationContainer independent={true} ref={navigationRef}>
      <Tab.Navigator
        initialRouteName={screenTitle.PORTFOLIO}
        tabBar={(props: BottomTabBarProps) => {
          const currentRouteStack = props.state.routes[props.state.index].state?.routes.map(item => item.name);
          const showTabBar = (currentRouteStack === undefined) || screensToHaveNavBar.includes(currentRouteStack[currentRouteStack.length - 1]);
          return (
            <Animatable.View animation={showTabBar ? 'slideInUp' : 'slideOutDown'}
            duration={isIOS() ? 200 : 0} className={clsx('w-full', { 'mb-[-70px]': !showTabBar, '': showTabBar && !isReadOnlyWallet, 'bg-white': !isIOS() })}>
            {isReadOnlyWallet && <CyDView className={clsx('flex flex-row justify-center items-center bg-ternaryBackgroundColor py-[5px] mb-[-15px] pb-[20px] rounded-t-[24px] shadow shadow-gray-400', { hidden: !showTabBar })}>
            <CyDImage source={AppImages.EYE_OPEN} className='h-[18px] w-[18px]' resizeMode='contain'/>
            <CyDText className='font-bold mt-[2px] ml-[5px]'>{t('READ_ONLY_MODE')}</CyDText>
            </CyDView>}
            <BottomTabBar {...props}/>
          </Animatable.View>
          );
        }}
        screenOptions={({ navigation, route }) => ({
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: 70,
            paddingBottom: paddingBottomTabBarStyles,
            borderTopLeftRadius: 24,
            borderTopWidth: 0,
            borderTopRightRadius: 24,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.3,
                shadowRadius: 4
              },
              android: {
                // borderWidth: 1,
                // borderColor: '#000'
              }
            })
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === screenTitle.PORTFOLIO) {
              iconName = focused
                ? AppImages.PORTFOLIO_SEL
                : AppImages.PORTFOLIO_UNSEL;
            } else if (route.name === screenTitle.BROWSER) {
              iconName = focused
                ? AppImages.BROWSER_SEL
                : AppImages.BROWSER_UNSEL;
            } else if (route.name === screenTitle.OPTIONS) {
              iconName = focused ? AppImages.OPTION_SEL : AppImages.OPTION_UNSEL;
            } else if (route.name === screenTitle.DEBIT_CARD) {
              iconName = focused ? AppImages.CARD_SEL : AppImages.CARD_UNSEL;
            }

            // You can return any component that you like here!
            return (
              <CyDImage
                source={iconName}
                className='h-[35px] mt-[5px] self-center'
                resizeMode='contain'
              />
            );
          },
          tabBarLabelStyle: {
            fontFamily: 'Nunito'
          },
          tabBarActiveTintColor: 'black',
          tabBarInactiveTintColor: 'gray',
          headerShown: false
        })}
      >
        <Tab.Screen
          name={screenTitle.PORTFOLIO}
          component={PortfolioStackScreen}
        />
        <Tab.Screen
          name={screenTitle.BROWSER}
          component={BrowserStackScreen}
        />
        <Tab.Screen
          name={screenTitle.SHORTCUTS} component={PortfolioStackScreen}
          options={({ route }) => ({
            tabBarButton: () => <CyDView className={clsx('mt-[5px] scale-110 shadow shadow-yellow-200')}><ShortcutsModal navigationRef={navigationRef}/></CyDView>
          })}
        />
        <Tab.Screen
          name={screenTitle.DEBIT_CARD}
          component={DebitCardStackScreen}
        />
        <Tab.Screen
          name={screenTitle.OPTIONS}
          component={OptionsStackScreen}
          options={({ route }) => ({
            ...badgedTabBarOptions
          })}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default TabStack;
