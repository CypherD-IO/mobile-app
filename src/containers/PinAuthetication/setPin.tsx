import React from 'react';
import { t } from 'i18next';
import { CyDView, CyDText, CyDSafeAreaView } from '../../styles/tailwindStyles';
import OtpInput from '../../components/v2/OTPInput';
import { screenTitle } from '../../constants';

export default function SetPin ({ route, navigation }) {
  const { setPinAuthentication = (value) => {}, changePinValue = false } = route.params;

  let setPin = (pin: string) => {
    navigation.navigate(screenTitle.CONFIRM_PIN, { setPinAuthentication, pin, backButton: true });
  };
  if (changePinValue) {
    setPin = (pin: string) => {
      navigation.navigate(screenTitle.CONFIRM_CHANGE_PIN, { pin, changePinValue: true });
    };
  }

  const PINHeader = () => {
    return (
      <>
        <CyDView>
          <CyDText className={'text-[30px] font-extrabold text-center pt-[60px]'}>{changePinValue ? t<string>('SET_CHANGE_PIN_TITLE') : t<string>('SET_PIN_TITLE')}</CyDText>
        </CyDView>
      </>
    );
  };

  const PIN = () => {
    return (
      <CyDView>
        <CyDView className={'mt-[15%]'}>
          <OtpInput
            pinCount={4}
            getOtp={(pin: string) => setPin(pin)}
            showButton={true}
            buttonCTA={t('SET_PIN')}
          />
        </CyDView>
      </CyDView>
    );
  };

  return (
      <CyDSafeAreaView>
        <CyDView className={'h-full bg-white px-[20px] pt-[10px]'}>
          <PINHeader/>
          <PIN/>
        </CyDView>
      </CyDSafeAreaView>
  );
}
