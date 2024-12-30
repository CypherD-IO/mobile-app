import React, { useEffect, useState } from 'react';
import {
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import OtpInput from '../../../components/v2/OTPInput';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import LottieView from 'lottie-react-native';
import Loading from '../../../components/v2/loading';
import { StyleSheet } from 'react-native';
import useAxios from '../../../core/HttpRequest';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

interface RouteParams {
  onSuccess: () => void;
  linkedWalletToDelete: string;
}
export default function LinkWalletAuth() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const [sendingOTP, setSendingOTP] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const { linkedWalletToDelete, onSuccess } = route.params;
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth, deleteWithAuth } = useAxios();
  const isFocused = useIsFocused();

  useEffect(() => {
    void triggerOTP();
  }, [isFocused]);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
    return () => {
      clearInterval(timer);
    };
  }, [resendInterval]);

  const triggerOTP = async () => {
    const triggerOTPUrl = '/v1/authentication/profile/trigger/update-child';

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
      setTimer(
        setInterval(() => {
          resendTime--;
          setResendInterval(resendTime);
        }, 1000),
      );
    }
  };

  const onModalHide = () => {
    hideModal();
    setVerifyingOTP(false);
  };

  const verifyOTP = async (num: number) => {
    setVerifyingOTP(true);
    const response = await deleteWithAuth(
      `/v1/authentication/profile/child/${linkedWalletToDelete.toLowerCase()}?otp=${num}`,
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

  const OTPHeader = () => {
    return (
      <CyDView>
        <CyDText className={'text-[25px] font-extrabold'}>
          {t<string>('ENTER_AUTHENTICATION_CODE')}
        </CyDText>
        <CyDText className={'text-[15px] font-bold'}>
          {t<string>('CARD_SENT_OTP')}
        </CyDText>
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView>
      <CyDView className={'h-full bg-n0 px-[20px] pt-[10px]'}>
        <OTPHeader />
        <CyDView>
          {!verifyingOTP && (
            <CyDView className={'mt-[15%]'}>
              <OtpInput
                pinCount={4}
                getOtp={otp => {
                  void verifyOTP(Number(otp));
                }}
                placeholder={t('ENTER_OTP')}
              />
              <CyDTouchView
                className={'flex flex-row items-center mt-[15%]'}
                disabled={sendingOTP || resendInterval !== 0}
                onPress={() => {
                  void resendOTP();
                }}>
                <CyDText
                  className={
                    'font-bold underline decoration-solid underline-offset-4'
                  }>
                  {t<string>('RESEND_CODE_INIT_CAPS')}
                </CyDText>
                {sendingOTP && (
                  <LottieView
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
          )}
          {verifyingOTP && (
            <CyDView className='mt-[-200px]'>
              <Loading />
            </CyDView>
          )}
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
