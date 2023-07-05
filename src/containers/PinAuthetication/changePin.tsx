import React, { useState } from 'react';
import { t } from 'i18next';
import { CyDView, CyDText, CyDSafeAreaView } from '../../styles/tailwindStyles';
import OtpInput from '../../components/v2/OTPInput';
import { screenTitle } from '../../constants';
import { validatePin } from '../../core/Keychain';
import { BackHandler } from 'react-native';

export default function ChangePin ({ route, navigation }) {
  const [wrongPin, setWrongPin] = useState(false);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
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

  const PINHeader = () => {
    return (
      <>
        <CyDView>
          <CyDText className={'text-[30px] font-extrabold text-center pt-[60px]'}>{t<string>('CHANGE_PIN_TITLE')}</CyDText>
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
            getOtp={async (pin: string) => await changePinValue(pin)}
            showButton={true}
            buttonCTA={t('VERIFY_PIN')}
            showSecuredEntryToggle={true}
          />

          {wrongPin &&
            <CyDText className={'text-[15px] mt-[25px] text-center text-red-500'}>
              {t<string>('WRONG_PIN')}
            </CyDText>
          }
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
