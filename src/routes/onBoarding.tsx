import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screenTitle } from '../constants/index';
import OnBoarding from '../containers/OnBoarding';
import EnterKeyScreen from '../containers/Auth/EnterKey';
import QRScanner from '../containers/Qrcode/QRScanner';
import { Colors } from '../constants/theme';
import * as C from '../constants';
import CreateSeedPhrase from '../containers/OnBoarding/createSeedPhrase';
import TrackWallet from '../containers/OnBoarding/trackWallet';

const Stack = createNativeStackNavigator();

function OnBoardingStack (props: any) {
  const initialScreen = props.initialScreen ?? screenTitle.AUTO_CREATE;
  return (
        <Stack.Navigator initialRouteName={initialScreen}>
          <Stack.Screen name={screenTitle.AUTO_CREATE} component={OnBoarding} options={{ headerShown: false }} />
          <Stack.Screen
            name={screenTitle.ENTER_KEY}
            component={EnterKeyScreen}
            options={{
              headerTransparent: false,
              headerShadowVisible: false,
              title: 'Import Wallet',
              headerTitleAlign: 'center',
              headerTitleStyle: {
                fontFamily: C.fontsName.FONT_BLACK,
                fontSize: 20
              },
              headerTintColor: Colors.primaryTextColor,
              headerBackTitleVisible: false
            }}
          />
          <Stack.Screen
            name={screenTitle.QR_CODE_SCANNER}
            component={QRScanner}
            options={({ navigation, route }) => ({
              headerTransparent: true,
              headerShadowVisible: false,
              title: 'SCAN QR CODE',
              headerTitleAlign: 'center',
              headerTitleStyle: {
                fontFamily: C.fontsName.FONT_BLACK,
                fontSize: 20,
                color: Colors.whiteColor
              },
              navigationOptions: {
                tabBarVisible: false
              },

              headerTintColor: Colors.primaryTextColor,
              headerBackTitleVisible: false
            })}
          />
          <Stack.Screen
            name={screenTitle.CREATE_SEED_PHRASE}
            component={CreateSeedPhrase}
            options={({ navigation, route }) => ({
              headerShown: false
            })}
          />
          <Stack.Screen
            name={screenTitle.TRACK_WALLET_SCREEN}
            component={TrackWallet}
            options={({ navigation, route }) => ({
              headerTransparent: false,
              headerShadowVisible: false,
              title: 'Track Any Wallet',
              headerTitleAlign: 'center',
              headerTitleStyle: {
                fontFamily: C.fontsName.FONT_BLACK,
                fontSize: 20
              },
              navigationOptions: {
                tabBarVisible: false
              },

              headerTintColor: Colors.primaryTextColor,
              headerBackTitleVisible: false
            })}
          />
        </Stack.Navigator>
  );
}

export default OnBoardingStack;
