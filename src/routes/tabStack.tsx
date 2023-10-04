import { screenTitle } from '../constants';
import { BackHandler, ToastAndroid, StyleSheet } from 'react-native';
import * as React from 'react';
import {
  BrowserStackScreen,
  DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen,
} from './auth';
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
  useBottomTabBarHeight,
} from '@react-navigation/bottom-tabs';
import AppImages from '../../assets/images/appImages';
import ShortcutsModal from '../containers/Shortcuts';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useContext, useEffect, useState } from 'react';
import { ActivityContext, HdWalletContext } from '../core/util';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import {
  CyDAnimatedView,
  CyDFastImage,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import { t } from 'i18next';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../misc/checkers';
import { Easing, Layout } from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import { useKeyboard } from '../hooks/useKeyboardVisibily';

const Tab = createBottomTabNavigator();

function TabStack() {
  const navigationRef = useNavigationContainerRef();
  const activityContext = useContext<any>(ActivityContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { isReadOnlyWallet } = hdWalletContext.state;
  const inAppUpdates = new SpInAppUpdates(
    false, // isDebug
  );
  const screensToHaveNavBar = [
    screenTitle.PORTFOLIO_SCREEN,
    screenTitle.BROWSER_SCREEN,
    screenTitle.OPTIONS_SCREEN,
    screenTitle.CARD_SIGNUP_LANDING_SCREEN,
    screenTitle.CARD_SIGNUP_SCREEN,
    screenTitle.BRIDGE_CARD_SCREEN,
  ];

  const [badgedTabBarOptions, setBadgedTabBarOptions] = useState<any>({});

  const { keyboardHeight } = useKeyboard();

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

  const latestDate = (activities: any, lastVisited: Date) => {
    if (activities.length === 0) return false;
    const sortedAsc = activities.sort(
      (objA: any, objB: any) => Number(objA.datetime) - Number(objB.datetime),
    );
    return sortedAsc[sortedAsc.length - 1].datetime > lastVisited;
  };

  useEffect(() => {
    const isBadgeAvailable = async () => {
      let showBadge = false;
      const updateResp = await inAppUpdates.checkNeedsUpdate();
      showBadge =
        updateResp.shouldUpdate ||
        latestDate(
          activityContext.state.activityObjects,
          activityContext.state.lastVisited,
        );
      if (showBadge) {
        setBadgedTabBarOptions({
          tabBarBadge: '',
          tabBarBadgeStyle: {
            fontSize: 0,
            paddingHorizontal: 0,
            lineHeight: 0,
            height: 10,
            width: 10,
            minWidth: 0,
            borderRadius: 6,
            top: 12,
            left: 4,
          },
        });
      } else setBadgedTabBarOptions({});
    };

    void isBadgeAvailable();
  }, [activityContext.state]);

  function MyTabBar({ state, descriptors, navigation }) {
    return (
      <CyDView className='flex flex-row justify-start items-center px-[10px]'>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;
          const TabBarIcon = options.tabBarIcon;
          const TabBarButton = options.tabBarButton;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // The `merge: true` option makes sure that the params inside the tab screen are preserved
              navigation.navigate({ name: route.name, merge: true });
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <CyDTouchView
              key={index}
              accessibilityRole='button'
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              className='flex flex-1 flex-row items-center'
            >
              <CyDView
                className={clsx(
                  'flex flex-1 flex-col items-center bg-transparent',
                  {
                    'mt-[10px] bg-transparent':
                      route.name === screenTitle.SHORTCUTS,
                  },
                )}
              >
                {route.name === screenTitle.SHORTCUTS ? (
                  <TabBarButton />
                ) : (
                  <TabBarIcon focused={isFocused} color='' size='' />
                )}
                <CyDText
                  className={clsx('text-[12px]', { 'font-bold': isFocused })}
                >
                  {route.name !== screenTitle.SHORTCUTS && label}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          );
        })}
      </CyDView>
    );
  }

  return (
    <NavigationContainer independent={true} ref={navigationRef}>
      <Tab.Navigator
        initialRouteName={screenTitle.PORTFOLIO}
        tabBar={(props: BottomTabBarProps) => {
          const currentRouteStack = props.state.routes[
            props.state.index
          ].state?.routes.map((item) => item.name);
          const showTabBar =
            currentRouteStack === undefined ||
            screensToHaveNavBar.includes(
              currentRouteStack[currentRouteStack.length - 1],
            );
          return (
            <CyDAnimatedView
              // TO REDO : TABBAR ANIMATION
              layout={Layout.easing(Easing.ease).delay(50)}
              className={clsx(
                'rounded-t-[24px] pb-[20px] shadow absolute bottom-[-20px] w-full',
                {
                  'bottom-[-110px]': !showTabBar,
                  'bottom-[-350px]': keyboardHeight,
                  'shadow-gray-400': (!isReadOnlyWallet && !isIOS()) || isIOS(),
                },
              )}
              style={styles.elevatedBackground}
            >
              {isReadOnlyWallet && (
                <CyDView
                  className={clsx('rounded-t-[24px]', {
                    'h-[20px]': showTabBar,
                  })}
                  style={styles.elevatedBackground}
                >
                  <CyDView
                    className={clsx(
                      'flex flex-row justify-center items-center bg-ternaryBackgroundColor py-[5px] top-[2px] rounded-t-[24px]',
                      { hidden: !showTabBar, 'top-[6px]': !isIOS() },
                    )}
                  >
                    <CyDImage
                      source={AppImages.EYE_OPEN}
                      className='h-[18px] w-[18px]'
                      resizeMode='contain'
                    />
                    <CyDText className='font-bold mt-[2px] ml-[5px]'>
                      {t('READ_ONLY_MODE')}
                    </CyDText>
                  </CyDView>
                </CyDView>
              )}
              <MyTabBar {...props} />
            </CyDAnimatedView>
          );
        }}
        screenOptions={({ navigation, route }) => ({
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: 90,
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
              iconName = focused
                ? AppImages.OPTION_SEL
                : AppImages.OPTION_UNSEL;
            } else if (route.name === screenTitle.DEBIT_CARD) {
              iconName = focused ? AppImages.CARD_SEL : AppImages.CARD_UNSEL;
            }

            // You can return any component that you like here!
            return (
              <CyDFastImage
                source={iconName}
                className='h-[30px] w-[30px] self-center'
                resizeMode='contain'
              />
            );
          },
          tabBarLabelStyle: {
            fontFamily: 'Nunito',
          },
          tabBarActiveTintColor: 'black',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen
          name={screenTitle.PORTFOLIO}
          component={PortfolioStackScreen}
        />
        <Tab.Screen name={screenTitle.BROWSER} component={BrowserStackScreen} />
        <Tab.Screen
          name={screenTitle.SHORTCUTS}
          component={PortfolioStackScreen}
          options={({ route }) => ({
            tabBarButton: () => (
              <CyDView
                className={clsx('mt-[5px] scale-110 shadow shadow-yellow-200')}
              >
                <ShortcutsModal navigationRef={navigationRef} />
              </CyDView>
            ),
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
            ...badgedTabBarOptions,
          })}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default TabStack;

const styles = StyleSheet.create({
  elevatedBackground: {
    elevation: 3,
    backgroundColor: isIOS() ? Colors.white : Colors.transparent,
  },
});
