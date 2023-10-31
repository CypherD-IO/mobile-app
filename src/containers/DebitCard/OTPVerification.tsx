import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { t } from 'i18next';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import OtpInput from '../../components/v2/OTPInput';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDSafeAreaView,
  CyDTextInput,
  CyDKeyboardAvoidingView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from '../../components/v2/modal';
import { GlobalContext } from '../../core/globalContext';
import Loading from '../../components/v2/loading';
import LottieView from 'lottie-react-native';
import Toast from 'react-native-toast-message';
import { screenTitle } from '../../constants';
import { isAndroid, isIOS } from '../../misc/checkers';
import { concatErrorMessagesFromArray } from '../../core/util';
import { OTPType, GlobalContextType } from '../../constants/enum';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { getWalletProfile } from '../../core/card';
import { hostWorker } from '../../global';
import { countryMaster } from '../../../assets/datasets/countryMaster';

export default function OTPVerificationScreen({ navigation }) {
  const globalContext = useContext<any>(GlobalContext);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { showModal, hideModal } = useGlobalModalContext();
  const [isPhoneOTPVerified, setPhoneOTPVerified] = useState<boolean>(false);
  const [isEmailOTPVerified, setEmailOTPVerified] = useState<boolean>(false);
  const [invalidOTP, setInvalidOTP] = useState<string>('');
  const [isChangeNumberModalVisible, setChangeNumberModalVisible] =
    useState<boolean>(false);
  const [isChangeEmailModalVisible, setChangeEmailModalVisible] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const [resendingCode, setResendingCode] = useState<boolean>(false);
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState();

  const [formData, setFormData] = useState({
    countryFlag: '',
    dialCode: '',
    updatedPhoneNumber: '',
    updatedEmail: '',
    phoneNumber: '',
    email: '',
  });

  useEffect(() => {
    setLoading(true);
    if (formData.phoneNumber === '' || formData.email === '') {
      void getProfile();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
  }, [resendInterval]);

  const getProfile = async () => {
    const profileUrl = `${ARCH_HOST}/v1/cards/application`;
    const config = {
      headers: {
        Authorization: `Bearer ${String(globalContext.globalState.token)}`,
      },
    };
    try {
      const { data } = await axios.get(profileUrl, config);
      const [selectedCountryWithDialCode] = countryMaster.filter(
        (country) => country.Iso2 === data.country,
      );
      const profileData = {
        countryFlag: selectedCountryWithDialCode.unicode_flag,
        dialCode: selectedCountryWithDialCode.dial_code,
        updatedPhoneNumber: data.phone
          .split(selectedCountryWithDialCode.dial_code)
          .pop(),
        updatedEmail: data.email,
        phoneNumber: data.phone,
        email: data.email,
      };
      setFormData(profileData);
      if (!data.phoneVerified) {
        void triggerOTP(OTPType.PHONE);
      }
      if (!data.emailVerfied) {
        void triggerOTP(OTPType.EMAIL);
      }
      setPhoneOTPVerified(data.phoneVerified);
      setEmailOTPVerified(data.emailVerfied);
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const onModalHide = () => {
    hideModal();
    setVerifyingOTP(false);
  };

  const verifyOTPByType = async (otp) => {
    let OTPVerificationUrl = `${ARCH_HOST}/v1/cards/application/verify/`;
    const config = {
      headers: {
        Authorization: `Bearer ${String(globalContext.globalState.token)}`,
      },
    };

    if (!isPhoneOTPVerified) {
      OTPVerificationUrl += OTPType.PHONE;
    } else if (isPhoneOTPVerified && !isEmailOTPVerified) {
      OTPVerificationUrl += OTPType.EMAIL;
    }
    setVerifyingOTP(true);
    try {
      await axios.post(OTPVerificationUrl, { otp: +otp }, config);
      if (!isPhoneOTPVerified) {
        setPhoneOTPVerified(true);
      } else if (isPhoneOTPVerified && !isEmailOTPVerified) {
        setEmailOTPVerified(true);
      }
      setVerifyingOTP(false);
    } catch (e: any) {
      showModal('state', {
        type: 'error',
        title: t('VERIFICATION_FAILED'),
        description: concatErrorMessagesFromArray(e.response.data.errors),
        onSuccess: () => onModalHide(),
        onFailure: () => onModalHide(),
      });
      Sentry.captureException(e);
    }
  };

  const triggerOTP = async (type: string) => {
    const OTPUrl = `${ARCH_HOST}/v1/cards/application/trigger/` + type;
    const config = {
      headers: {
        Authorization: `Bearer ${String(globalContext.globalState.token)}`,
      },
    };
    try {
      await axios.post(OTPUrl, {}, config);
    } catch (e) {
      showModal('state', {
        type: 'error',
        title: t('OTP_TRIGGER_FAILED'),
        description: concatErrorMessagesFromArray(e.response.data.errors),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(e);
    }
  };

  const getOTP = async (otp) => {
    await verifyOTPByType(otp);
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
    if (detail === OTPType.EMAIL) {
      payload = { email: formData.updatedEmail };
    } else if (detail === OTPType.PHONE) {
      phoneNumberWithoutSpecialCharacters = formData.updatedPhoneNumber.replace(
        /[- +()#*;,.<>{}[\]\\/]/gi,
        '',
      );
      phoneNumberWithoutDialCodes = phoneNumberWithoutSpecialCharacters.replace(
        formData.dialCode,
        '',
      );
      payload = { phone: formData.dialCode + phoneNumberWithoutDialCodes };
    }
    const updateUrl = `${ARCH_HOST}/v1/cards/application`;
    const config = {
      headers: {
        Authorization: `Bearer ${String(globalContext.globalState.token)}`,
      },
    };

    try {
      await axios.patch(updateUrl, payload, config);
      setLoading(false);
      if (detail === OTPType.PHONE) {
        setFormData({
          ...formData,
          phoneNumber: formData.dialCode + phoneNumberWithoutDialCodes,
          updatedPhoneNumber: phoneNumberWithoutDialCodes,
        });
      } else if (detail === OTPType.EMAIL) {
        setFormData({ ...formData, email: formData.updatedEmail });
      }
      await triggerOTP(detail);
    } catch (e) {
      Toast.show({
        type: t('TOAST_TYPE_ERROR'),
        text2: concatErrorMessagesFromArray(e.response.data.errors),
        position: 'bottom',
      });
      Sentry.captureException(e);
      setLoading(false);
    }
  };

  const submitVerification = async () => {
    setLoading(true);
    try {
      const triggerKYCUrl = `${ARCH_HOST}/v1/cards/application/kyc`;
      const config = {
        headers: {
          Authorization: `Bearer ${String(globalContext.globalState.token)}`,
        },
      };
      await axios.post(triggerKYCUrl, {}, config);
      const data = await getWalletProfile(globalContext.globalState.token);
      globalContext.globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: data,
      });
      navigation.navigate(screenTitle.CARD_SIGNUP_COMPLETE_SCREEN);
    } catch (e) {
      Toast.show({
        type: t('TOAST_TYPE_ERROR'),
        text2: t('INITIATE_KYC_ERROR_MESSAGE'),
        position: 'bottom',
      });
      Sentry.captureException(e);
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
        animationOut={'slideOutDown'}
      >
        <CyDKeyboardAvoidingView
          behavior={isAndroid() ? 'height' : 'padding'}
          className='flex flex-col justify-end h-full'
        >
          <CyDView className={'bg-white h-[250px] rounded-t-[20px]'}>
            <CyDView
              className={'flex flex-row mt-[20px] justify-end mr-[22px] z-50'}
            >
              <CyDTouchView
                onPress={() => {
                  setChangeNumberModalVisible(false);
                }}
                className={'ml-[18px]'}
              >
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
              )}
            >
              <CyDView
                className={
                  'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white py-[13px] rounded-l-[16px] flex items-center'
                }
              >
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
                    onChangeText={(value) =>
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
              }
            >
              <CyDText className={'text-[16px] text-center font-bold'}>
                {t<string>('UPDATE_INIT_CAPS')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDKeyboardAvoidingView>
      </CyDModalLayout>
      <CyDModalLayout
        setModalVisible={setChangeEmailModalVisible}
        isModalVisible={isChangeEmailModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDKeyboardAvoidingView
          behavior={isAndroid() ? 'height' : 'padding'}
          className='flex flex-col justify-end h-full'
        >
          <CyDView className={'bg-white h-[250px] rounded-t-[20px]'}>
            <CyDView
              className={'flex flex-row mt-[20px] justify-end mr-[22px] z-50'}
            >
              <CyDTouchView
                onPress={() => {
                  setChangeEmailModalVisible(false);
                }}
                className={'ml-[18px]'}
              >
                <CyDImage
                  source={AppImages.CLOSE}
                  className={' w-[22px] h-[22px] z-[50] right-[0px] '}
                />
              </CyDTouchView>
            </CyDView>
            <CyDView className={'mt-[-18px]'}>
              <CyDText className={'text-center text-[18px] font-bold'}>
                {t<string>('CHANGE_EMAIL_INIT_CAPS')}
              </CyDText>
            </CyDView>
            <CyDView className={'mt-[20px] flex flex-row justify-center'}>
              <CyDTextInput
                className={
                  'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor'
                }
                value={formData.updatedEmail}
                autoCapitalize='none'
                autoCorrect={false}
                placeholderTextColor={'#C5C5C5'}
                onChangeText={(value) =>
                  setFormData({ ...formData, updatedEmail: value })
                }
                placeholder='Email Id'
              />
            </CyDView>
            <CyDTouchView
              onPress={() => {
                setChangeEmailModalVisible(false);
                void updateUserDetails(OTPType.EMAIL);
              }}
              className={
                'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'
              }
            >
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
                    'h-[230px]': !isPhoneOTPVerified,
                    'h-[141px]': isPhoneOTPVerified,
                    'h-[248px]': invalidOTP !== '',
                  },
                )}
              />
              <CyDView
                className={clsx(
                  'absolute ml-[21px] rounded-[50px] w-[14px] h-[14px]',
                  {
                    'mt-[243px] border-[1px] border-appColor':
                      !isPhoneOTPVerified,
                    'mt-[148px] bg-appColor': isPhoneOTPVerified,
                    'mt-[260px]': invalidOTP !== '',
                  },
                )}
              />
            </CyDView>
            <CyDView className={'w-[93%]'}>
              <CyDView className={'mx-[22px]'}>
                <CyDText className={'text-[26px] font-bold mt-[-6px]'}>
                  {t<string>('VERIFY_PHONE_NO_HEADING')}
                </CyDText>
                {!isPhoneOTPVerified && (
                  <CyDView>
                    <CyDText className={'text-[17px] mt-[12px] font-semibold'}>
                      {`${t<string>('SENT_AUTHENTICATION_CODE_TO')} ${
                        formData.phoneNumber
                      } ${t<string>('THIS_NUMBER')}`}
                    </CyDText>
                    {!verifyingOTP && (
                      <CyDView className={'flex flex-row justify-center'}>
                        <OtpInput
                          pinCount={4}
                          getOtp={async (otp) => await getOTP(otp)}
                          placeholder={t('ENTER_OTP')}
                        />
                      </CyDView>
                    )}
                    {verifyingOTP && (
                      <CyDView
                        className={
                          'flex items-center justify-between  h-[65px]'
                        }
                      >
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
                          className={'text-redOffColor font-bold text-center'}
                        >
                          {invalidOTP}
                        </CyDText>
                      </CyDView>
                    )}
                    <CyDView
                      className={
                        'flex flex-row justify-between mt-[12px] mr-[12px]'
                      }
                    >
                      <CyDTouchView
                        className={'flex flex-row items-center'}
                        disabled={resendingCode || resendInterval !== 0}
                        onPress={() => {
                          void resendCode(OTPType.PHONE);
                        }}
                      >
                        <CyDText
                          className={
                            'font-bold underline decoration-solid underline-offset-4'
                          }
                        >
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
                          <CyDText>{` in ${resendInterval} sec`}</CyDText>
                        )}
                      </CyDTouchView>
                      <CyDTouchView
                        onPress={() => {
                          setChangeNumberModalVisible(true);
                        }}
                      >
                        <CyDText
                          className={
                            'font-bold underline decoration-solid underline-offset-4'
                          }
                        >
                          {t<string>('CHANGE_NUMBER_INIT_CAPS')}
                        </CyDText>
                      </CyDTouchView>
                    </CyDView>
                  </CyDView>
                )}
                {isPhoneOTPVerified && (
                  <CyDView
                    className={
                      'flex flex-row justify-between items-center bg-paleDarkGreen mt-[10px] px-[8px] py-[10px] rounded-[5px]'
                    }
                  >
                    <CyDText className={'text-[16px] pl-[8px] font-bold'}>
                      {formData.phoneNumber}
                    </CyDText>
                    <CyDImage source={AppImages.DARK_GREEN_BACKGROUND_TICK} />
                  </CyDView>
                )}
                <CyDView
                  className={
                    'h-[1px] w-[100%] bg-portfolioBorderColor mt-[25px]'
                  }
                />
              </CyDView>
              <CyDView className={'mx-[22px]'}>
                <CyDText
                  className={clsx('text-[26px] font-bold', {
                    'mt-[23px]': isIOS(),
                    'mt-[33px]': isAndroid(),
                  })}
                >
                  {t<string>('VERIFY_EMAIL_ID_HEADING')}
                </CyDText>
                {isPhoneOTPVerified && (
                  <CyDView className={'w-full'}>
                    {!isEmailOTPVerified && (
                      <CyDView>
                        <CyDText
                          className={'text-[17px] mt-[12px] font-semibold'}
                        >
                          {`${t<string>('SENT_AUTHENTICATION_CODE_TO')}`}{' '}
                          {formData.email}
                        </CyDText>
                        {!verifyingOTP && (
                          <CyDView className={'flex flex-row justify-center'}>
                            <OtpInput
                              pinCount={4}
                              getOtp={async (otp) => await getOTP(otp)}
                              placeholder={t('ENTER_OTP')}
                            />
                          </CyDView>
                        )}
                        {verifyingOTP && (
                          <CyDView
                            className={'flex items-center justify-between'}
                          >
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
                              className={
                                'text-redOffColor font-bold text-center'
                              }
                            >
                              {invalidOTP}
                            </CyDText>
                          </CyDView>
                        )}
                        <CyDView
                          className={
                            'flex flex-row justify-between items-center mt-[12px] mr-[12px]'
                          }
                        >
                          <CyDTouchView
                            className={'flex flex-row items-center'}
                            disabled={resendingCode || resendInterval !== 0}
                            onPress={() => {
                              void resendCode(OTPType.EMAIL);
                            }}
                          >
                            <CyDText
                              className={
                                'font-bold underline decoration-solid underline-offset-4'
                              }
                            >
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
                              <CyDText>{` in ${resendInterval} sec`}</CyDText>
                            )}
                          </CyDTouchView>
                          <CyDTouchView
                            onPress={() => {
                              setChangeEmailModalVisible(true);
                            }}
                          >
                            <CyDText
                              className={
                                'font-bold underline decoration-solid underline-offset-4'
                              }
                            >
                              {t<string>('CHANGE_EMAIL_INIT_CAPS')}
                            </CyDText>
                          </CyDTouchView>
                        </CyDView>
                      </CyDView>
                    )}
                    {isEmailOTPVerified && (
                      <CyDView
                        className={
                          'flex flex-row justify-between items-center bg-paleDarkGreen mt-[10px] px-[8px] py-[10px] rounded-[5px]'
                        }
                      >
                        <CyDText className={'text-[16px] pl-[8px] font-bold'}>
                          {formData.email}
                        </CyDText>
                        <CyDImage
                          source={AppImages.DARK_GREEN_BACKGROUND_TICK}
                        />
                      </CyDView>
                    )}
                  </CyDView>
                )}
                {isPhoneOTPVerified && isEmailOTPVerified && (
                  <CyDView>
                    <CyDTouchView
                      onPress={() => {
                        void submitVerification();
                      }}
                      className={
                        'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] w-[100%] mx-auto mt-[25px]'
                      }
                    >
                      <CyDText className={'text-center font-bold'}>
                        {t<string>('PROCEED')}
                      </CyDText>
                    </CyDTouchView>
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

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  lottie25: { height: 25 },
  lottie40: { height: 40 },
});
