import React, { useEffect, useState } from 'react';
import {
  CyDIcons,
  CyDLottieView,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
  CyDMaterialDesignIcons,
} from '../../../styles/tailwindComponents';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import Loading from '../../../components/v2/loading';
import { StyleSheet } from 'react-native';
import useAxios from '../../../core/HttpRequest';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  CardOperationsAuthType,
  CardProviders,
  CardStatus,
} from '../../../constants/enum';
import { Card } from '../../../models/card.model';
import { t } from 'i18next';
import { PinInput } from '../../../components/v2/pinInput';

interface RouteParams {
  onSuccess: () => void;
  currentCardProvider: CardProviders;
  card: Card;
  authType: CardOperationsAuthType;
  godmExpiryInMinutes?: number;
  forAllCards?: boolean;
}

const OTPHeader = ({
  navigation,
  card,
}: {
  navigation: NavigationProp<ParamListBase>;
  card: Card;
}) => {
  return (
    <CyDView>
      <CyDTouchView
        className='flex-row items-center'
        onPress={() => {
          navigation.goBack();
        }}>
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
      </CyDTouchView>

      <CyDMaterialDesignIcons
        name='shield-check'
        size={32}
        className='text-base400 mt-4'
      />

      <CyDText className='mt-[6px] text-[28px] font-bold'>
        {t<string>('OTP_VERIFICATION')}
      </CyDText>

      <CyDText className='mt-[6px] text-[14px] text-n200'>
        {t<string>('CARD_SENT_OTP_EMAIL_AND_TELEGRAM')}
      </CyDText>

      <CyDText className='text-[10px] mt-[6px] text-n200'>
        {t<string>('CHECK_SPAM_FOLDER')}
      </CyDText>
    </CyDView>
  );
};

export default function CardUnlockAuth() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { showModal, hideModal } = useGlobalModalContext();
  const [sendingOTP, setSendingOTP] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const {
    currentCardProvider,
    card,
    authType,
    godmExpiryInMinutes,
    forAllCards = false,
  } = route.params;
  const onSuccess = route.params.onSuccess;
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const { postWithAuth, patchWithAuth } = useAxios();
  const [otpValue, setOtpValue] = useState<string[]>(Array(4).fill(''));
  const [otpError, setOtpError] = useState<boolean>(false);

  useEffect(() => {
    void triggerOTP();
  }, []);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [timer]);

  const triggerOTP = async () => {
    const triggerOTPUrl = `/v1/cards/${currentCardProvider}/card/${card.cardId}/trigger/${authType}`;

    const response = await postWithAuth(triggerOTPUrl, {});

    if (!response.isError) {
      return true;
    } else {
      showModal('state', {
        type: 'error',
        title: t('OTP_TRIGGER_FAILED'),
        description: response?.error?.message ?? '',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(response.error);
      return false;
    }
  };

  const resendOTP = async () => {
    setSendingOTP(true);
    const response = await triggerOTP();
    if (response) {
      setSendingOTP(false);
      let resendTime = resendOtpTime;
      setResendInterval(resendTime);

      const intervalId = setInterval(() => {
        resendTime--;
        setResendInterval(resendTime);

        if (resendTime <= 0) {
          clearInterval(intervalId);
          setTimer(null);
        }
      }, 1000);

      setTimer(intervalId);
    }
  };

  const onModalHide = () => {
    hideModal();
    setVerifyingOTP(false);
  };

  const getVerifyOTPPayload = (num: number) => {
    return {
      ...(authType === CardOperationsAuthType.UNBLOCK
        ? {}
        : authType === CardOperationsAuthType.ZERO_RESTRICTION_MODE_ON
          ? { godm: true, godmExpiryInMinutes }
          : { status: CardStatus.ACTIVE }),
      otp: num,
      ...(forAllCards ? { forAllCards: true } : {}),
    };
  };

  const verifyOTP = async (num: number) => {
    setVerifyingOTP(true);
    const payload = getVerifyOTPPayload(num);
    const response = await patchWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/${authType}`,
      payload,
    );

    if (!response.isError) {
      setVerifyingOTP(false);
      onSuccess();
      navigation.goBack();
    } else {
      showModal('state', {
        type: 'error',
        title: t('VERIFICATION_FAILED'),
        description: response.error.message ?? t('INVALID_OTP'),
        onSuccess: () => onModalHide(),
        onFailure: () => onModalHide(),
      });
    }
  };

  const handleOtpChange = (value: string[]) => {
    setOtpValue(value);
    setOtpError(false);
    if (value.length === 4 && value.every(digit => digit !== '')) {
      void verifyOTP(parseInt(value.join(''), 10));
    }
  };

  const handleOtpBlur = () => {
    // You can add any additional logic here if needed when the OTP input loses focus
  };

  if (verifyingOTP) {
    return <Loading />;
  }

  return (
    <CyDSafeAreaView className=' bg-n20'>
      <CyDView className={'h-full px-[20px] pt-[10px]'}>
        <OTPHeader navigation={navigation} card={card} />
        <CyDView>
          <CyDView className={'mt-[24px]'}>
            <PinInput
              value={otpValue}
              onChange={handleOtpChange}
              error={otpError}
              onBlur={handleOtpBlur}
              length={4}
            />
            <CyDTouchView
              className={'flex flex-row items-center mt-[8px]'}
              disabled={sendingOTP || resendInterval !== 0}
              onPress={() => {
                void resendOTP();
              }}>
              <CyDText className={'font-normal text-[12px] text-n200'}>
                {"Didn't receive ? "}
                <CyDText className='underline text-blue300 font-bold'>
                  {t<string>('RESEND_OTP')}
                </CyDText>
              </CyDText>
              {sendingOTP && (
                <CyDLottieView
                  source={AppImages.LOADER_TRANSPARENT}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
              )}
              {resendInterval !== 0 && (
                <CyDText>{String(` in ${resendInterval} sec`)}</CyDText>
              )}
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25,
  },
});
