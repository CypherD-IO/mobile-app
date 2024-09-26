import { screenTitle } from '../constants';
import { BackHandler, ToastAndroid, StyleSheet, Image } from 'react-native';
import * as React from 'react';
import {
  DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen,
  SwapStackScreen,
} from './auth';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import AppImages from '../../assets/images/appImages';
import ShortcutsModal from '../containers/Shortcuts';
import {
  NavigationContainer,
  NavigationProp,
  ParamListBase,
  useNavigation,
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
import { isIOS } from '../misc/checkers';
import { Easing, Layout } from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import { useKeyboard } from '../hooks/useKeyboardVisibily';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';
import { ActivityContextDef } from '../reducers/activity_reducer';

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
  screenTitle.PORTFOLIO_SCREEN,
  screenTitle.BROWSER_SCREEN,
  screenTitle.OPTIONS_SCREEN,
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

  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

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

  // function MyTabBar({ state, descriptors, navigation }) {
  //   return (
  //     <CyDView
  //       className={clsx('flex flex-row justify-start items-center px-[10px]', {
  //         'pb-[6px]': isIOS(),
  //       })}>
  //       {state.routes.map((route, index) => {
  //         const { options } = descriptors[route.key];
  //         const label =
  //           options.tabBarLabel !== undefined
  //             ? options.tabBarLabel
  //             : options.title !== undefined
  //               ? options.title
  //               : route.name;

  //         const isFocused = state.index === index;
  //         const TabBarIcon = options.tabBarIcon;
  //         const TabBarButton = options.tabBarButton;
  //         const onPress = () => {
  //           const event = navigation.emit({
  //             type: 'tabPress',
  //             target: route.key,
  //             canPreventDefault: true,
  //           });

  //           if (!isFocused && !event.defaultPrevented) {
  //             // The `merge: true` option makes sure that the params inside the tab screen are preserved
  //             navigation.navigate({ name: route.name, merge: true });
  //           }
  //         };

  //         const onLongPress = () => {
  //           navigation.emit({
  //             type: 'tabLongPress',
  //             target: route.key,
  //           });
  //         };

  //         return (
  //           <CyDTouchView
  //             key={index}
  //             accessibilityRole='button'
  //             accessibilityState={isFocused ? { selected: true } : {}}
  //             accessibilityLabel={options.tabBarAccessibilityLabel}
  //             testID={options.tabBarTestID}
  //             onPress={onPress}
  //             onLongPress={onLongPress}
  //             className='flex flex-1 flex-row items-center'>
  //             <CyDView
  //               className={clsx(
  //                 'flex flex-1 flex-col items-center bg-transparent',
  //                 {
  //                   'mt-[10px] bg-transparent':
  //                     route.name === screenTitle.SHORTCUTS,
  //                 },
  //               )}>
  //               {route.name === screenTitle.SHORTCUTS ? (
  //                 <TabBarButton />
  //               ) : (
  //                 <TabBarIcon focused={isFocused} color='' size='' />
  //               )}
  //               <CyDText
  //                 className={clsx('text-[12px]', { 'font-bold': isFocused })}>
  //                 {route.name !== screenTitle.SHORTCUTS && label}
  //               </CyDText>
  //             </CyDView>
  //           </CyDTouchView>
  //         );
  //       })}
  //     </CyDView>
  //   );
  // }

  return (
    <NavigationContainer independent={true}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, size }) => {
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
              <Image
                source={iconSource}
                style={{ width: size, height: size }}
              />
            );
          },
          tabBarInactiveTintColor: '#7A8699',
          tabBarActiveTintColor: '#000000',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '400' as const,
            fontFamily: 'Manrope',
          },
          tabBarStyle: {
            ...styles.elevatedBackground,
            backgroundColor: 'white',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarBackground: () => (
            <CyDView className='absolute inset-0 bg-n0 rounded-t-[32px] shadow shadow-gray-400' />
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 24, // For Android
  },
});
