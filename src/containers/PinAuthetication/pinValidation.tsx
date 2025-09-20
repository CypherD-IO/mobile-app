import React, { useContext, useState } from 'react';
import {
  isBiometricEnabled,
  removeCredentialsFromKeychain,
  removePin,
  validatePin,
} from '../../core/Keychain';
import { HdWalletContext } from '../../core/util';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
} from '../../styles/tailwindComponents';
import OtpInput from '../../components/v2/OTPInput';
import { clearAllData } from '../../core/asyncStorage';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { screenTitle } from '../../constants';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Loading from '../../components/v2/loading';
import PageHeader from '../../components/PageHeader';

interface RouteParams {
  title: string;
  setPinAuthentication: (value: any) => {};
  lockScreen: boolean;
  callback: any;
}

export default function PinValidation() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const {
    title = `${t<string>('ENTER_PIN')}`,
    setPinAuthentication = value => {},
    lockScreen = false,
    callback,
  } = route.params;
  const retryCount = 10;
  const [retries, setRetries] = useState(retryCount);
  const [wrongPin, setWrongPin] = useState(false); // state to show or hide the Wrong Pin text
  const [reSettingToBiometric, setReSettingToBiometric] = useState(false);
  const hdWallet = useContext<any>(HdWalletContext);
  const { showModal, hideModal } = useGlobalModalContext();

  let validatePinValue = async (pin: string) => {
    if (retries < 1) {
      return;
    }
    if (await validatePin(pin)) {
      setWrongPin(false);
      hdWallet.dispatch({ type: 'SET_PIN_VALUE', value: { pin } });
      if (await isBiometricEnabled()) {
        setReSettingToBiometric(true);
        await removePin(hdWallet, pin);
        setReSettingToBiometric(false);
      }
      callback?.();
      if (setPinAuthentication) {
        setPinAuthentication(true);
      }
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

        {retries <= 3 && (
          <CyDText className={'text-[15px] mt-[25px] text-center'}>
            {t<string>('RETRIES_LEFT')}
            {retries}
          </CyDText>
        )}

        {wrongPin && (
          <CyDText className={'text-[15px] mt-[25px] text-center text-red-500'}>
            {t<string>('WRONG_PIN')}
          </CyDText>
        )}

        {retries === 0 && (
          <CyDText
            className={'text-[20px] text-center mt-[10px] underline'}
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onPress={async () => {
              showModal('state', {
                type: 'info',
                title: t<string>('RESETING_PIN'),
                description: t<string>('RESET_PIN_DESCRIPTION'),
                onSuccess: onSuccessFunctionality,
              });
              await removeCredentialsFromKeychain();
              await clearAllData();
              setRetries(retryCount);
              hdWallet.dispatch({
                type: 'RESET_PIN_AUTHENTICATION',
                value: {
                  isReset: true,
                },
              });
            }}>
            {t<string>('RESET_PIN')}
          </CyDText>
        )}
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView edges={['top']} className='flex-1 bg-n0'>
      <PageHeader title={title} navigation={navigation} />
      <CyDView className={'h-full bg-n20 p-[24px]'}>
        {reSettingToBiometric ? (
          <Loading blurBg />
        ) : (
          <>
            <PIN />
          </>
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
}
