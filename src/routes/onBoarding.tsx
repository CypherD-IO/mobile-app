import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screenTitle } from '../constants/index';
import EnterKeyScreen from '../containers/Auth/EnterKey';
import QRScanner from '../containers/Qrcode/QRScanner';
import CreateSeedPhrase from '../containers/OnBoarding/createSeedPhrase';
import TrackWallet from '../containers/OnBoarding/trackWallet';
import EnterPrivateKey from '../containers/Auth/EnterPrivateKey';
import { ChooseWalletIndex } from '../containers/Auth/ChooseWalletIndex';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Keyboard } from 'react-native';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from '../hooks/useKeyboard';
import OnBoardingGetStarted from '../containers/OnBoarding/getStarted';
import OnBoardOpotions from '../containers/OnBoarding/onBoardOpotions';
import RewardsOnboarding from '../containers/OnBoarding/rewardsOnboarding';

const Stack = createNativeStackNavigator();

const CustomHeader = ({
  title,
  navigation,
  keyboardHeight,
  textAlign = 'center',
  textStyle,
  backgroundColor,
}: {
  title: string;
  navigation: NavigationProp<ParamListBase>;
  keyboardHeight: number;
  textAlign?: 'center' | 'start';
  textStyle?: string;
  backgroundColor?: string;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <CyDView
      className={`flex-row ${textAlign === 'center' ? 'justify-between' : 'items-center'} pb-[10px] ${backgroundColor ?? 'bg-n20'}`}
      style={{ paddingTop: insets.top }}>
      <CyDTouchView
        className='px-[12px] mx-[4px]'
        onPress={() => {
          if (keyboardHeight) {
            Keyboard.dismiss();
            setTimeout(() => {
              navigation.goBack();
            }, 100);
          } else {
            navigation.goBack();
          }
        }}>
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
      </CyDTouchView>
      <CyDText
        className={`text-base400 text-[20px] font-extrabold ${textAlign === 'center' ? 'mr-[44px]' : ''} ${textStyle ?? ''}`}>
        {title}
      </CyDText>
      {textAlign === 'center' && <CyDView className='' />}
    </CyDView>
  );
};

const HeaderWrapper = ({
  title,
  navigation,
}: {
  title: string;
  navigation: NavigationProp<ParamListBase>;
}) => {
  const { keyboardHeight } = useKeyboard();
  return (
    <CustomHeader
      title={title}
      navigation={navigation}
      keyboardHeight={keyboardHeight}
    />
  );
};

const getHeaderOptions = (title: string) => {
  return ({ navigation }: { navigation: NavigationProp<ParamListBase> }) => {
    return {
      header: () => <HeaderWrapper title={title} navigation={navigation} />,
    };
  };
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
        component={RewardsOnboarding}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={screenTitle.ENTER_KEY}
        component={EnterKeyScreen}
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <CustomHeader
              title='Import Wallet'
              navigation={navigation}
              keyboardHeight={0}
              textAlign='start'
              backgroundColor='bg-n0'
            />
          ),
        })}
      />
      <Stack.Screen
        name={screenTitle.CHOOSE_WALLET_INDEX}
        component={ChooseWalletIndex}
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <CustomHeader
              title='Import Wallet'
              navigation={navigation}
              keyboardHeight={0}
              textAlign='start'
              backgroundColor='bg-n0'
            />
          ),
        })}
      />
      <Stack.Screen
        name={screenTitle.ENTER_PRIVATE_KEY}
        component={EnterPrivateKey}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={getHeaderOptions('SCAN QR CODE')}
      />
      <Stack.Screen
        name={screenTitle.CREATE_SEED_PHRASE}
        component={CreateSeedPhrase}
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <CustomHeader
              title='Create New Wallet'
              navigation={navigation}
              keyboardHeight={0}
              textAlign='start'
              backgroundColor='bg-n0'
            />
          ),
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
