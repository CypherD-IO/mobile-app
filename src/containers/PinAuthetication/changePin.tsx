import React, { useState } from 'react';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
} from '../../styles/tailwindComponents';
import OtpInput from '../../components/v2/OTPInput';
import { screenTitle } from '../../constants';
import { validatePin } from '../../core/Keychain';
import { BackHandler } from 'react-native';
import PageHeader from '../../components/PageHeader';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';

export default function ChangePin() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [wrongPin, setWrongPin] = useState(false);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const changePinValue = async (pin: string) => {
    if (await validatePin(pin)) {
      setWrongPin(false);
      navigation.navigate(screenTitle.SET_CHANGE_PIN, { changePinValue: true });
    } else {
      setWrongPin(true);
    }
  };

  const PIN = () => {
    return (
      <CyDView>
        <CyDView className={'mt-[15%]'}>
          <OtpInput
            pinCount={4}
            getOtp={async (pin: string) => await changePinValue(pin)}
            showButton={true}
            buttonCTA={t('VERIFY_PIN')}
            showSecuredEntryToggle={true}
          />

          {wrongPin && (
            <CyDText
              className={'text-[15px] mt-[25px] text-center text-red-500'}>
              {t<string>('WRONG_PIN')}
            </CyDText>
          )}
        </CyDView>
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <PageHeader title={'CHANGE_PIN_TITLE'} navigation={navigation} />
      <CyDView className={'h-full bg-n20 p-[24px]'}>
        <PIN />
      </CyDView>
    </CyDSafeAreaView>
  );
}
