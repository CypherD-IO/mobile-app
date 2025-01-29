import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screenTitle } from '../constants/index';
import OnBoarding from '../containers/OnBoarding';
import EnterKeyScreen from '../containers/Auth/EnterKey';
import QRScanner from '../containers/Qrcode/QRScanner';
import CreateSeedPhrase from '../containers/OnBoarding/createSeedPhrase';
import TrackWallet from '../containers/OnBoarding/trackWallet';
import ImportWalletOptions from '../containers/Options/importWalletOptions';
import EnterPrivateKey from '../containers/Auth/EnterPrivateKey';
import { ChooseWalletIndex } from '../containers/Auth/ChooseWalletIndex';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

const CustomHeader = ({
  title,
  navigation,
}: {
  title: string;
  navigation: NavigationProp<ParamListBase>;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <CyDView
      className='bg-n20 flex-row justify-between pb-[10px]'
      style={{ paddingTop: insets.top }}>
      <CyDTouchView
        className='px-[12px]'
        onPress={() => {
          navigation.goBack();
        }}>
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
      </CyDTouchView>
      <CyDText className='text-base400 text-[20px] font-extrabold mr-[44px]'>
        {title}
      </CyDText>
      <CyDView className='' />
    </CyDView>
  );
};

function OnBoardingStack(props: any) {
  const initialScreen = props.initialScreen ?? screenTitle.ONBOARDING;
  return (
    <Stack.Navigator initialRouteName={initialScreen}>
      <Stack.Screen
        name={screenTitle.ONBOARDING}
        component={OnBoarding}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={screenTitle.ENTER_KEY}
        component={EnterKeyScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={screenTitle.CHOOSE_WALLET_INDEX}
        component={ChooseWalletIndex}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />
      <Stack.Screen
        name={screenTitle.ENTER_PRIVATE_KEY}
        component={EnterPrivateKey}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader title='Import Wallet' navigation={navigation} />
          ),
        })}
      />
      <Stack.Screen
        name={screenTitle.IMPORT_WALLET_OPTIONS}
        component={ImportWalletOptions}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader title='Import Wallet' navigation={navigation} />
          ),
        })}
      />
      <Stack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader title='SCAN QR CODE' navigation={navigation} />
          ),
        })}
      />
      <Stack.Screen
        name={screenTitle.CREATE_SEED_PHRASE}
        component={CreateSeedPhrase}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />
      <Stack.Screen
        name={screenTitle.TRACK_WALLET_SCREEN}
        component={TrackWallet}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader title='Track Any Wallet' navigation={navigation} />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

export default OnBoardingStack;
