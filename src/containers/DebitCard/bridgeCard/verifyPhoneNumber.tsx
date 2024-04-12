import React, { useEffect, useState } from 'react';
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
  CyDTextInput,
  CyDKeyboardAvoidingView,
} from '../../../styles/tailwindStyles';
import CyDModalLayout from '../../../components/v2/modal';
import Loading from '../../../components/v2/loading';
import LottieView from 'lottie-react-native';
import { isAndroid } from '../../../misc/checkers';
import { OTPType, CardProviders } from '../../../constants/enum';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import useAxios from '../../../core/HttpRequest';
import Intercom from '@intercom/intercom-react-native';
import { useTranslation } from 'react-i18next';

export default function PhoneNumberVerificationScreen() {
  const { showModal, hideModal } = useGlobalModalContext();
  const [isPhoneOTPVerified, setPhoneOTPVerified] = useState<boolean>(false);
  const [invalidOTP, setInvalidOTP] = useState<string>('');
  const [isChangeNumberModalVisible, setChangeNumberModalVisible] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const [resendingCode, setResendingCode] = useState<boolean>(false);
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth, patchWithAuth } = useAxios();
  const provider = CardProviders.PAYCADDY;

  const [formData, setFormData] = useState({
    countryFlag: '',
    dialCode: '',
    updatedPhoneNumber: '',
    updatedEmail: '',
    phoneNumber: '',
    email: '',
  });

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
      const OTPVerificationUrl = `/v1/cards/${CardProviders.PAYCADDY}/application/verify/phone`;
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
      const path = `/v1/cards/${CardProviders.PAYCADDY}/application/trigger/${type}`;
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

  const updateUserDetails = async (detail: string) => {
    setLoading(true);
    let payload = {};
    let phoneNumberWithoutSpecialCharacters = '';
    let phoneNumberWithoutDialCodes = '';
    phoneNumberWithoutSpecialCharacters = formData.updatedPhoneNumber.replace(
      /[- +()#*;,.<>{}[\]\\/]/gi,
      '',
    );
    phoneNumberWithoutDialCodes = phoneNumberWithoutSpecialCharacters.replace(
      formData.dialCode,
      '',
    );
    payload = { phone: formData.dialCode + phoneNumberWithoutDialCodes };
    const response = await patchWithAuth(
      `/v1/cards/${provider}/application`,
      payload,
    );
    if (!response.isError) {
      setFormData({
        ...formData,
        phoneNumber: formData.dialCode + phoneNumberWithoutDialCodes,
        updatedPhoneNumber: phoneNumberWithoutDialCodes,
      });
      await triggerOTP(detail);
    } else {
      showModal('state', {
        type: 'error',
        title: '',
        description: t('UPDATE_INFO_ERROR_MESSAGE'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
    setLoading(false);
  };

  return (
    <>
      <CyDModalLayout
        setModalVisible={setChangeNumberModalVisible}
        isModalVisible={isChangeNumberModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDKeyboardAvoidingView
          behavior={isAndroid() ? 'height' : 'padding'}
          className='flex flex-col justify-end h-full'>
          <CyDView className={'bg-white h-[250px] rounded-t-[20px]'}>
            <CyDView
              className={'flex flex-row mt-[20px] justify-end mr-[22px] z-50'}>
              <CyDTouchView
                onPress={() => {
                  setChangeNumberModalVisible(false);
                }}
                className={'ml-[18px]'}>
                <CyDImage
                  source={AppImages.CLOSE}
                  className={' w-[22px] h-[22px] z-[50] right-[0px] '}
                />
              </CyDTouchView>
            </CyDView>
            <CyDView className={'mt-[-18px]'}>
              <CyDText className={'text-center text-[18px] font-bold'}>
                {t<string>('CHANGE_NUMBER_INIT_CAPS')}
              </CyDText>
            </CyDView>
            <CyDView
              className={clsx(
                'h-[50px] ml-[30px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%] flex flex-row',
              )}>
              <CyDView
                className={
                  'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white py-[13px] rounded-l-[16px] flex items-center'
                }>
                <CyDView className={'mt-[-4px] ml-[-55px]'}>
                  <CyDText className={'text-[33px] mt-[-6px]'}>
                    {formData.countryFlag}
                  </CyDText>
                </CyDView>
                <CyDView className={'mt-[-20px] ml-[45px]'}>
                  <CyDText className={'text-[13px] font-extrabold text-center'}>
                    {formData.dialCode}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDView className={'flex flex-row items-center w-8/12'}>
                <CyDView className={'flex flex-row items-center'}>
                  <CyDTextInput
                    className={clsx(
                      'text-center text-black font-nunito text-[16px] ml-[8px]',
                      { 'mt-[-8px]': isAndroid() },
                    )}
                    value={formData.updatedPhoneNumber}
                    autoCapitalize='none'
                    keyboardType={'numeric'}
                    maxLength={15}
                    key='phoneNumber'
                    autoCorrect={false}
                    placeholderTextColor={'#C5C5C5'}
                    onChangeText={value =>
                      setFormData({ ...formData, updatedPhoneNumber: value })
                    }
                    placeholder='Phone Number'
                  />
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDTouchView
              onPress={() => {
                setChangeNumberModalVisible(false);
                void updateUserDetails(OTPType.PHONE);
              }}
              className={
                'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'
              }>
              <CyDText className={'text-[16px] text-center font-bold'}>
                {t<string>('UPDATE_INIT_CAPS')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDKeyboardAvoidingView>
      </CyDModalLayout>
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
                  {t<string>('SENT_AUTHENTICATION_CODE_TO') +
                    ' ' +
                    formData.phoneNumber}
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
                      <CyDTouchView
                        onPress={() => {
                          setChangeNumberModalVisible(true);
                        }}>
                        <CyDText
                          className={
                            'font-bold underline decoration-solid underline-offset-4'
                          }>
                          {t<string>('CHANGE_NUMBER_INIT_CAPS')}
                        </CyDText>
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
                      {formData.phoneNumber}
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
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  lottie25: { height: 25 },
  lottie40: { height: 40 },
});
