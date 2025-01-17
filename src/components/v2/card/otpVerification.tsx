import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  CyDLottieView,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import Loading from '../loading';
import { useTranslation } from 'react-i18next';
import useAxios from '../../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import CyDModalLayout from '../modal';
import StateModal from '../StateModal';
import { PinInput } from '../pinInput';

export default function OtpVerificationModal({
  isModalVisible,
  setIsModalVisible,
  triggerOTPUrl,
  isVerifyingOTP,
  verifyOTP,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (isModalVisible: boolean) => void;
  triggerOTPUrl: string;
  isVerifyingOTP: boolean;
  verifyOTP: (otp: string) => void;
}) {
  const { t } = useTranslation();
  const { postWithAuth } = useAxios();
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const [sendingOTP, setSendingOTP] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [otpValue, setOtpValue] = useState<string[]>(Array(4).fill(''));
  const [otpError, setOtpError] = useState<boolean>(false);

  useEffect(() => {
    if (isModalVisible) {
      void triggerOTP();
    }
    setError('');
  }, [isModalVisible]);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
    return () => {
      clearInterval(timer);
    };
  }, [resendInterval]);

  const triggerOTP = async () => {
    const response = await postWithAuth(triggerOTPUrl, {});
    if (!response.isError) {
      return true;
    } else {
      setError(
        response?.error?.errors?.[0]?.message ?? response?.error?.message ?? '',
      );
      Sentry.captureException(response.error);
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

  const handleOtpChange = (value: string[]) => {
    setOtpValue(value);
    setOtpError(false);
    if (value.every(digit => digit !== '')) {
      void verifyOTP(value.join(''));
    }
  };

  const handleOtpBlur = () => {
    // Add any blur logic if needed
  };

  const OTPHeader = useCallback(() => {
    return (
      <CyDView className={'mx-[12px]'}>
        <CyDText className={'text-[25px] font-extrabold'}>
          {t<string>('ENTER_AUTHENTICATION_CODE')}
        </CyDText>
        <CyDText className={'text-[15px] font-bold'}>
          {t<string>('CARD_SENT_OTP_EMAIL_AND_TELEGRAM')}
        </CyDText>
      </CyDView>
    );
  }, []);

  return (
    <CyDModalLayout
      setModalVisible={setIsModalVisible}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className={'h-full bg-n0 p-[12px] pt-[10px]'}>
        <StateModal
          isModalVisible={error !== ''}
          type={'error'}
          title={t('OTP_TRIGGER_FAILED')}
          description={error}
          onSuccess={() => {
            setIsModalVisible(false);
          }}
          onFailure={() => {
            setIsModalVisible(false);
          }}
        />
        <CyDView className='flex-row items-center justify-between mb-[12px] mx-[12px]'>
          <CyDTouchView
            onPress={() => {
              setIsModalVisible(false);
            }}
            className='w-[36px] h-[36px]'>
            <CydMaterialDesignIcons
              name={'arrow-left-thin'}
              size={32}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <OTPHeader />
        <CyDView className={'flex-1 mx-[20px]'}>
          {!isVerifyingOTP && (
            <CyDView className={'mt-[15%]'}>
              <PinInput
                value={otpValue}
                onChange={handleOtpChange}
                error={otpError}
                onBlur={handleOtpBlur}
                length={4}
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
              <CyDText className='text-[12px] mt-[4px]'>
                {t<string>('CHECK_SPAM_FOLDER')}
              </CyDText>
            </CyDView>
          )}
          {isVerifyingOTP && (
            <CyDView className='mt-[-200px]'>
              <Loading />
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25,
  },
  modalLayout: {
    margin: 0,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
});
