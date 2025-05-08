import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screenTitle } from '../constants/index';
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
} from '../styles/tailwindComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnBoardingGetStarted from '../containers/OnBoarding/getStarted';
import OnBoardOpotions from '../containers/OnBoarding/onBoardOpotions';

const Stack = createNativeStackNavigator();

interface CustomHeaderProps {
  title: string;
  navigation: NavigationProp<ParamListBase>;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({ title, navigation }) => {
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

const getHeaderOptions = (title: string) => {
  return ({ navigation }: { navigation: NavigationProp<ParamListBase> }) => ({
    header: () => <CustomHeader title={title} navigation={navigation} />,
  });
};

interface OnBoardingStackProps {
  initialScreen?: string;
}

function OnBoardingStack({
  initialScreen = screenTitle.ONBOARDING_GET_STARTED,
}: OnBoardingStackProps) {
  return (
    <Stack.Navigator initialRouteName={initialScreen}>
      {/* <Stack.Screen
        name={screenTitle.ONBOARDING}
        component={OnBoarding}
        options={{
          headerShown: false,
        }}
      /> */}
      <Stack.Screen
        name={screenTitle.ONBOARDING_GET_STARTED}
        component={OnBoardingGetStarted}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={screenTitle.ONBOARDING_OPTIONS}
        component={OnBoardOpotions}
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
        options={() => ({
          headerShown: false,
        })}
      />
      <Stack.Screen
        name={screenTitle.ENTER_PRIVATE_KEY}
        component={EnterPrivateKey}
        options={getHeaderOptions('Import Wallet')}
      />
      <Stack.Screen
        name={screenTitle.IMPORT_WALLET_OPTIONS}
        component={ImportWalletOptions}
        options={getHeaderOptions('Import Wallet')}
      />
      <Stack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={getHeaderOptions('SCAN QR CODE')}
      />
      <Stack.Screen
        name={screenTitle.CREATE_SEED_PHRASE}
        component={CreateSeedPhrase}
        options={() => ({
          headerShown: false,
        })}
      />
      <Stack.Screen
        name={screenTitle.TRACK_WALLET_SCREEN}
        component={TrackWallet}
        options={getHeaderOptions('Track Any Wallet')}
      />
    </Stack.Navigator>
  );
}

export default OnBoardingStack;
