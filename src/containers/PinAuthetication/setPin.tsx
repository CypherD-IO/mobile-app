import React from 'react';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
} from '../../styles/tailwindComponents';
import OtpInput from '../../components/v2/OTPInput';
import { screenTitle } from '../../constants';
import { BackHandler } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import PageHeader from '../../components/PageHeader';

interface SetPinProps {
  setPinAuthentication?: (value: boolean) => void;
}

interface RouteParams {
  changePinValue: boolean;
}

export default function SetPin({
  setPinAuthentication = () => {},
}: SetPinProps): JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { changePinValue = false } = route.params ?? ({} as RouteParams);

  let setPin = (pin: string) => {
    navigation.navigate(screenTitle.CONFIRM_PIN, {
      pin,
      backButton: true,
    });
  };
  if (changePinValue) {
    setPin = (pin: string) => {
      navigation.navigate(screenTitle.CONFIRM_CHANGE_PIN, {
        pin,
        changePinValue: true,
      });
    };
  }

  const PIN = (): JSX.Element => {
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

  const handleBackButton = (): boolean => {
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

  return (
    <CyDSafeAreaView edges={['top']} className='flex-1 bg-n0'>
      <PageHeader
        title={changePinValue ? 'SET_CHANGE_PIN_TITLE' : 'SET_PIN_TITLE'}
        navigation={navigation}
      />
      <CyDView className={'h-full bg-n20 p-[24px]'}>
        <PIN />
      </CyDView>
    </CyDSafeAreaView>
  );
}
