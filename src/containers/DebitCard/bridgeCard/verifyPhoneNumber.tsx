import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { t } from 'i18next';
import * as Sentry from '@sentry/react-native';
import OtpInput from '../../../components/v2/OTPInput';
import clsx from 'clsx';
import AppImages from '../../../../assets/images/appImages';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDSafeAreaView,
} from '../../../styles/tailwindStyles';
import Loading from '../../../components/v2/loading';
import LottieView from 'lottie-react-native';
import { OTPType, CardProviders } from '../../../constants/enum';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import useAxios from '../../../core/HttpRequest';
import Intercom from '@intercom/intercom-react-native';
import { useTranslation } from 'react-i18next';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { RouteProp, useRoute } from '@react-navigation/native';

interface RouteParams {
  phoneNumber: string;
}

export default function PhoneNumberVerificationScreen() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const globalContext = useContext<any>(GlobalContext);
  const { phoneNumber } = route.params;
  const { showModal, hideModal } = useGlobalModalContext();
  const [isPhoneOTPVerified, setPhoneOTPVerified] = useState<boolean>(false);
  const [invalidOTP, setInvalidOTP] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const [resendingCode, setResendingCode] = useState<boolean>(false);
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth } = useAxios();
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
  }, [resendInterval]);

  const onModalHide = () => {
    hideModal();
    setVerifyingOTP(false);
  };

  const verifyOTPByType = async ({
    otp,
  }: {
    otp?: string | number;
    shouldSkip?: boolean;
  }) => {
    setVerifyingOTP(true);
    try {
      const OTPVerificationUrl = `/v1/cards/${provider}/application/verify/phone`;
      const response = await postWithAuth(OTPVerificationUrl, {
        otp: Number(otp),
      });
      if (!response.isError) {
        setPhoneOTPVerified(true);
      } else {
        showModal('state', {
          type: 'error',
          title: t('VERIFICATION_FAILED'),
          description: response.error.message ?? '',
          onSuccess: () => onModalHide(),
          onFailure: () => onModalHide(),
        });
      }
      setVerifyingOTP(false);
    } catch (e: any) {
      Sentry.captureException(e);
    }
  };

  const triggerOTP = async (type: string) => {
    try {
      const path = `/v1/cards/${provider}/application/trigger/${type}`;
      const response = await postWithAuth(path, {});
      if (response.isError) {
        showModal('state', {
          type: 'error',
          title: t('OTP_TRIGGER_FAILED'),
          description: response.error.message ?? '',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const getOTP = async (otp: string | number) => {
    await verifyOTPByType({ otp });
  };

  const resendCode = async (type: string) => {
    setResendingCode(true);
    await triggerOTP(type);
    setResendingCode(false);
    let resendTime = resendOtpTime;
    setTimer(
      setInterval(() => {
        resendTime--;
        setResendInterval(resendTime);
      }, 1000),
    );
  };

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <CyDSafeAreaView className={'h-full bg-white '}>
          <CyDView className={'flex flex-row mt-[30px]'}>
            <CyDView className={'w-[6%] h-full'}>
              <CyDView
                className={
                  'absolute ml-[21px] rounded-[50px] w-[14px] h-[14px] bg-appColor'
                }
              />
              <CyDView
                className={clsx(
                  'absolute mt-[14px] ml-[26px] w-[3px] bg-paleGrey',
                  {
                    'h-[206px]': !isPhoneOTPVerified,
                    'h-[141px]': isPhoneOTPVerified,
                    'h-[248px]': invalidOTP !== '',
                  },
                )}
              />
              <CyDView
                className={clsx(
                  'absolute ml-[21px] rounded-[50px] w-[14px] h-[14px]',
                  {
                    'mt-[220px] border-[1px] border-appColor':
                      !isPhoneOTPVerified,
                    'mt-[148px] bg-appColor': isPhoneOTPVerified,
                    'mt-[260px]': invalidOTP !== '',
                  },
                )}
              />
            </CyDView>
            <CyDView className={'w-[93%]'}>
              <CyDView className={'mx-[22px]'}>
                <CyDText className={'text-[17px] mb-[12px] font-semibold'}>
                  {t<string>('SENT_AUTHENTICATION_CODE_TO') + ' ' + phoneNumber}
                </CyDText>
                {!isPhoneOTPVerified && (
                  <CyDView>
                    {!verifyingOTP && (
                      <CyDView className={'flex flex-row justify-center'}>
                        <OtpInput
                          pinCount={4}
                          getOtp={otp => {
                            void getOTP(otp);
                          }}
                          placeholder={t('ENTER_OTP')}
                        />
                      </CyDView>
                    )}
                    {verifyingOTP && (
                      <CyDView
                        className={
                          'flex items-center justify-between  h-[65px]'
                        }>
                        <LottieView
                          source={AppImages.LOADER_TRANSPARENT}
                          autoPlay
                          loop
                          style={styles.lottie40}
                        />
                      </CyDView>
                    )}
                    {invalidOTP !== '' && (
                      <CyDView>
                        <CyDText
                          className={'text-redOffColor font-bold text-center'}>
                          {invalidOTP}
                        </CyDText>
                      </CyDView>
                    )}
                    <CyDView
                      className={
                        'flex flex-row justify-between mt-[12px] mx-[1px]'
                      }>
                      <CyDTouchView
                        className={'flex flex-row items-center'}
                        disabled={resendingCode || resendInterval !== 0}
                        onPress={() => {
                          void resendCode(OTPType.PHONE);
                        }}>
                        <CyDText
                          className={
                            'font-bold underline decoration-solid underline-offset-4'
                          }>
                          {t<string>('RESEND_CODE_INIT_CAPS')}
                        </CyDText>
                        {resendingCode && (
                          <LottieView
                            source={AppImages.LOADER_TRANSPARENT}
                            autoPlay
                            loop
                            style={styles.lottie25}
                          />
                        )}
                        {resendInterval !== 0 && (
                          <CyDText>
                            {'in ' + String(resendInterval) + ' sec'}
                          </CyDText>
                        )}
                      </CyDTouchView>
                    </CyDView>
                    <CyDView className='mt-[54px]'>
                      <ManualVerification />
                    </CyDView>
                  </CyDView>
                )}
                {isPhoneOTPVerified && (
                  <CyDView
                    className={
                      'flex flex-row justify-between items-center bg-paleDarkGreen mt-[10px] px-[8px] py-[10px] rounded-[5px]'
                    }>
                    <CyDText className={'text-[16px] pl-[8px] font-bold'}>
                      {phoneNumber}
                    </CyDText>
                    <CyDImage source={AppImages.DARK_GREEN_BACKGROUND_TICK} />
                  </CyDView>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDSafeAreaView>
      )}
    </>
  );
}

const ManualVerification = () => {
  const { t } = useTranslation();
  return (
    <CyDView className={'mb-[60px]'}>
      <CyDTouchView
        className={'mb-[15px]'}
        onPress={() => {
          void Intercom.present();
        }}>
        <CyDText className={'text-center'}>
          {t<string>('TROUBLE_PHONE_VERIFICATION') + ' '}
          <CyDText className='text-blue-500 font-bold underline underline-offset-2 '>
            {t<string>('CONTACT_CYPHER_SUPPORT')}
          </CyDText>
          <CyDImage
            source={AppImages.LINK}
            className='h-[16px] w-[16px] ml-[6px]'
            resizeMode='contain'
          />
        </CyDText>
      </CyDTouchView>
    </CyDView>
  );
};

const styles = StyleSheet.create({
  lottie25: { height: 25 },
  lottie40: { height: 40 },
});
