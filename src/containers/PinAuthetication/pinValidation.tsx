import React, { useContext, useState } from 'react';
import { isBiometricEnabled, removeCredentialsFromKeychain, removePin, validatePin } from '../../core/Keychain';
import { HdWalletContext } from '../../core/util';
import { t } from 'i18next';
import { CyDView, CyDText, CyDSafeAreaView } from '../../styles/tailwindStyles';
import OtpInput from '../../components/v2/OTPInput';
import { clearAllData } from '../../core/asyncStorage';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { screenTitle } from '../../constants';

export default function PinValidation ({ route, navigation }) {
  const { setPinAuthentication = (value) => {}, lockScreen = false } = route.params;
  const retryCount = 10;
  const [retries, setRetries] = useState(retryCount);
  const [wrongPin, setWrongPin] = useState(false); // state to show or hide the Wrong Pin text
  const hdWallet = useContext<any>(HdWalletContext);
  const { showModal, hideModal } = useGlobalModalContext();

  const PINHeader = () => {
    return (
      <>
        <CyDView>
          <CyDText className={'text-[30px] font-extrabold text-center pt-[60px]'}>{t<string>('ENTER_PIN')}</CyDText>
        </CyDView>
      </>
    );
  };

  let validatePinValue = async (pin: string) => {
    if (retries < 1) {
      return;
    }
    if (await validatePin(pin)) {
      setWrongPin(false);
      hdWallet.dispatch({ type: 'SET_PIN_VALUE', value: { pin } });
      if (await isBiometricEnabled()) {
        await removePin(hdWallet, pin);
      }
      navigation.setParams(setPinAuthentication(true));
    } else {
      if (retries > 1) {
        setWrongPin(true);
      } else {
        setWrongPin(false);
      }
      setRetries(retries - 1);
    }
  };
  if (lockScreen) {
    validatePinValue = async (pin: string) => {
      if (retries < 1) {
        return;
      }
      if (await validatePin(pin)) {
        setWrongPin(false);
        // hdWallet.dispatch({ type: 'SET_PIN_VALUE', value: { pin } });
        hdWallet.dispatch({ type: 'HIDE_TAB_BAR', value: { tabBarHidden: false } });
        navigation.goBack();
      } else {
        if (retries > 1) {
          setWrongPin(true);
        } else {
          setWrongPin(false);
        }
        setRetries(retries - 1);
      }
    };
  }

  const onSuccessFunctionality = () => {
    navigation.navigate(screenTitle.SET_PIN);
    hideModal();
  };

  const PIN = () => {
    return (
      <CyDView>
        <CyDView className={'mt-[15%]'}>
          <OtpInput
            pinCount={4}
            getOtp={async (otp: string) => await validatePinValue(otp)}
            showButton={true}
            buttonCTA={t('ENTER')}
            showSecuredEntryToggle={true}
            loader={true}
          />
        </CyDView>

        {retries <= 3 && <CyDText className={'text-[15px] mt-[25px] text-center'}>
          {t<string>('RETRIES_LEFT')}{retries}
        </CyDText>}

        {wrongPin &&
          <CyDText className={'text-[15px] mt-[25px] text-center text-red-500'}>
            {t<string>('WRONG_PIN')}
          </CyDText>
        }

        {retries === 0 &&
          <CyDText
            className={'text-[20px] text-center mt-[10px] underline'}
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onPress={async () => {
              showModal('state', { type: 'info', title: t<string>('RESETING_PIN'), description: t<string>('RESET_PIN_DESCRIPTION'), onSuccess: onSuccessFunctionality });
              await removeCredentialsFromKeychain();
              await clearAllData();
              setRetries(retryCount);
              hdWallet.dispatch({
                type: 'RESET_PIN_AUTHENTICATION',
                value: {
                  isReset: true
                }
              });
            }}>
              {t<string>('RESET_PIN')}
          </CyDText>
        }

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
