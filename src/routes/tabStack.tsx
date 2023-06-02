import { screenTitle } from '../constants';
import { Image } from 'react-native';
import * as React from 'react';
import {
  BrowserStackScreen, DebitCardStackScreen,
  OptionsStackScreen,
  PortfolioStackScreen
} from './auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AppImages from '../../assets/images/appImages';
import ShortcutsModal from '../containers/Shortcuts';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useContext, useEffect, useState } from 'react';
import { ActivityContext, HdWalletContext } from '../core/util';
import SpInAppUpdates from 'sp-react-native-in-app-updates';

const Tab = createBottomTabNavigator();

function TabStack () {
  const navigationRef = useNavigationContainerRef();
  const activityContext = useContext<any>(ActivityContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const inAppUpdates = new SpInAppUpdates(
    false // isDebug
  );

  const [tabBarOptions, setTabBarOptions] = useState<any>({});

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
        setTabBarOptions({
          tabBarBadge: '',
          tabBarBadgeStyle: { fontSize: 0, paddingHorizontal: 0, lineHeight: 0, height: 10, width: 10, minWidth: 0, borderRadius: 6, top: 12, left: 4 }
        });
      } else setTabBarOptions({});
    };

    void isBadgeAvailable();
  }, [activityContext.state]);

  return (
    <NavigationContainer independent={true} ref={navigationRef}>
      <Tab.Navigator
        initialRouteName={screenTitle.PORTFOLIO}
        screenOptions={({ navigation, route }) => ({
          tabBarHideOnKeyboard: true,
          tabBarStyle: hdWalletContext.state.hideTabBar ? { height: 0, paddingBottom: 0, marginBottom: -50 } : { height: 80, paddingBottom: 20 },
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
              <Image
                style={{
                  height: 30,
                  resizeMode: 'contain',
                  marginTop: 5,
                  alignSelf: 'center'
                }}
                source={iconName}
              />
            );
          },
          tabBarActiveTintColor: 'black',
          tabBarInactiveTintColor: 'gray',
          headerShown: false
        })}
      >
        <Tab.Screen name={screenTitle.BROWSER} component={BrowserStackScreen}/>
        <Tab.Screen
          name={screenTitle.PORTFOLIO}
          component={PortfolioStackScreen}
        />
        <Tab.Screen name={screenTitle.SHORTCUTS} component={PortfolioStackScreen}
                    options={() => ({
                      tabBarButton: () => <ShortcutsModal navigationRef={navigationRef}/>
                    })}
        />
        <Tab.Screen name={screenTitle.DEBIT_CARD} component={DebitCardStackScreen} />
        <Tab.Screen name={screenTitle.OPTIONS} component={OptionsStackScreen} options={tabBarOptions}/>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default TabStack;
