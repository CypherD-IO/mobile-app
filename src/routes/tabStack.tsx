import { screenTitle } from '../constants';
import { BackHandler, ToastAndroid } from 'react-native';
import * as React from 'react';
import {
  BrowserStackScreen, DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen
} from './auth';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
        tabBar={(props) => {
          const currentRouteStack = props.state.routes[props.state.index].state?.routes.map(item => item.name);
          const showTabBar = (currentRouteStack === undefined) || screensToHaveNavBar.includes(currentRouteStack[currentRouteStack?.length - 1]);
          return (
          <CyDAnimatedView entering={SlideInUp} exiting={SlideOutDown} layout={Layout.duration(200)} className={clsx('w-full', { 'mb-[-70px]': !showTabBar, 'h-[115px] absolute bottom-0': showTabBar && isReadOnlyWallet })}>
            {isReadOnlyWallet && <CyDView className='flex flex-row justify-center items-center bg-ternaryBackgroundColor py-[5px]'>
            <CyDImage source={AppImages.EYE_OPEN} className='h-[18px] w-[18px]' resizeMode='contain'/>
            <CyDText className='font-bold mt-[2px] ml-[5px]'>{t('READ_ONLY_MODE')}</CyDText>
            </CyDView>}
            <BottomTabBar
              {...props}
            />
          </CyDAnimatedView>
          );
        }}
        screenOptions={({ navigation, route }) => ({
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: 70,
            elevation: 1,
            paddingBottom: paddingBottomTabBarStyles,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 0,
            borderLeftColor: '#d8d8d8',
            borderRightColor: '#d8d8d8',
            shadowColor: '#aaa',
            shadowOffset: {
              width: -1,
              height: -3
            },
            shadowOpacity: 0.2,
            shadowRadius: 3
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
            tabBarButton: () => <ShortcutsModal navigationRef={navigationRef}/>
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
