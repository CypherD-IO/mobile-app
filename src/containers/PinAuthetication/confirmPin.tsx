import React, { useContext, useState } from 'react';
import { changePin, savePin } from '../../core/Keychain';
import { HdWalletContext } from '../../core/util';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDTouchView,
  CyDIcons,
} from '../../styles/tailwindComponents';
import OtpInput from '../../components/v2/OTPInput';
import { screenTitle } from '../../constants';
import Toast from 'react-native-toast-message';
import { BackHandler } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

interface RouteParams {
  setPinAuthentication: (value: boolean) => void;
  pin: string;
  backButton: boolean;
  changePinValue: boolean;
}
export default function ConfirmPin() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const {
    setPinAuthentication = value => {},
    pin,
    backButton = false,
    changePinValue = false,
  } = route.params;
  const [wrongPin, setWrongPin] = useState(false); // state to show or hide the Wrong Pin text
  const hdWallet = useContext<any>(HdWalletContext);

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

  const PINHeader = () => {
    return (
      <>
        {backButton && (
          <CyDTouchView
            className={'mt-[10px]'}
            onPress={() => {
              navigation.navigate(screenTitle.SET_PIN);
            }}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        )}
        <CyDView>
          <CyDText
            className={'text-[30px] font-extrabold text-center pt-[40px]'}>
            {t<string>('CONFIRM_PIN_TITLE')}
          </CyDText>
        </CyDView>
      </>
    );
  };

  let savePinValue = async (pinConfirm: string) => {
    if (pin !== pinConfirm) {
      setWrongPin(true);
      return;
    }
    setWrongPin(false);
    await savePin(pin);
    hdWallet.dispatch({ type: 'SET_PIN_VALUE', value: { pin } });
    Toast.show({
      type: 'success',
      text1: t('PIN_SET_SUCCESSFUL'),
      text2: t('PIN_SET_SUCCESSFUL_DESCRIPTION'),
      position: 'bottom',
    });
    setPinAuthentication(true);
  };
  if (changePinValue) {
    savePinValue = async (pinConfirm: string) => {
      if (pin !== pinConfirm) {
        setWrongPin(true);
        return;
      }
      setWrongPin(false);
      await changePin(hdWallet.state.pinValue, pin);
      hdWallet.dispatch({ type: 'SET_PIN_VALUE', value: { pin } });
      Toast.show({
        type: 'success',
        text1: t('PIN_SET_SUCCESSFUL'),
        text2: t('PIN_SET_SUCCESSFUL_DESCRIPTION'),
        position: 'bottom',
      });
      navigation.navigate(screenTitle.SECURITY_PRIVACY);
    };
  }

  const PIN = () => {
    return (
      <CyDView>
        <CyDView className={'mt-[15%]'}>
          <OtpInput
            pinCount={4}
            getOtp={async (pinConfirm: string) =>
              await savePinValue(pinConfirm)
            }
            showButton={true}
            buttonCTA={t('CONFIRM')}
            loader={true}
          />
        </CyDView>

        {wrongPin && (
          <CyDText className={'text-[15px] mt-[25px] text-center text-red-500'}>
            {t<string>('WRONG_PIN')}
          </CyDText>
        )}
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView>
      <CyDView className={'h-full bg-n20 px-[20px] pt-[10px]'}>
        <PINHeader />
        <PIN />
      </CyDView>
    </CyDSafeAreaView>
  );
}
