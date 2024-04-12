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
import { isAndroid } from '../../misc/checkers';
import {
  OTPType,
  GlobalContextType,
  CardProviders,
  ButtonType,
} from '../../constants/enum';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { getWalletProfile } from '../../core/card';
import { countryMaster } from '../../../assets/datasets/countryMaster';
import useAxios from '../../core/HttpRequest';
import Button from '../../components/v2/button';

export default function OTPVerificationScreen({ navigation }) {
  const globalContext = useContext<any>(GlobalContext);
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
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { getWithAuth, postWithAuth, patchWithAuth } = useAxios();
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
    void getApplication();
  }, []);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
  }, [resendInterval]);

  const getApplication = async () => {
    setLoading(true);
    try {
      const response = await getWithAuth(
        `/v1/cards/${CardProviders.PAYCADDY}/application`,
      );
      if (!response.isError) {
        const { data } = response;
        const [selectedCountryWithDialCode] = countryMaster.filter(
          country => country.Iso2 === data.country,
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
        if (!data.emailVerfied) {
          void triggerOTP(OTPType.EMAIL);
        }
        if (data.emailVerfied && !data.phoneVerified) {
          void triggerOTP(OTPType.PHONE);
        }
        setPhoneOTPVerified(data.phoneVerified);
        setEmailOTPVerified(data.emailVerfied);
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
      Sentry.captureException(e);
    }
  };

  const onModalHide = () => {
    hideModal();
    setVerifyingOTP(false);
  };

  const verifyOTPByType = async ({
    otp,
    shouldSkip = false,
  }: {
    otp?: string | number;
    shouldSkip?: boolean;
  }) => {
    setVerifyingOTP(true);
    try {
      let OTPVerificationUrl = `/v1/cards/${CardProviders.PAYCADDY}/application/verify/`;
      if (!isPhoneOTPVerified) {
        OTPVerificationUrl += OTPType.PHONE;
      } else if (isPhoneOTPVerified && !isEmailOTPVerified) {
        OTPVerificationUrl += OTPType.EMAIL;
      }
      const response = await postWithAuth(OTPVerificationUrl, {
        otp: otp ? Number(otp) : undefined,
        toSkip: shouldSkip,
      });
      if (!response.isError) {
        if (!isPhoneOTPVerified) {
          setPhoneOTPVerified(true);
          void triggerOTP(OTPType.EMAIL);
        } else if (isPhoneOTPVerified && !isEmailOTPVerified) {
          setEmailOTPVerified(true);
        }
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
    const response = await patchWithAuth(
      `/v1/cards/${provider}/application`,
      payload,
    );
    if (!response.isError) {
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

  const submitVerification = async () => {
    setLoading(true);
    try {
      const response = await getWithAuth(
        `/v1/cards/${CardProviders.PAYCADDY}/application/kyc`,
      );
      if (!response.isError) {
        const data = await getWalletProfile(globalContext.globalState.token);
        globalContext.globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: data,
        });
        navigation.navigate(screenTitle.CARD_SIGNUP_COMPLETE_SCREEN);
      } else {
        throw new Error(response.error);
      }
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
      <CyDModalLayout
        setModalVisible={setChangeEmailModalVisible}
        isModalVisible={isChangeEmailModalVisible}
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
                  setChangeEmailModalVisible(false);
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
                onChangeText={value =>
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
                    'h-[180px]': !isEmailOTPVerified,
                    'h-[120px]': isEmailOTPVerified,
                    'h-[248px]': invalidOTP !== '',
                  },
                )}
              />
              <CyDView
                className={clsx(
                  'absolute ml-[21px] rounded-[50px] w-[14px] h-[14px]',
                  {
                    'mt-[195px] border-[1px] border-appColor':
                      !isEmailOTPVerified,
                    'mt-[135px] bg-appColor': isEmailOTPVerified,
                    'mt-[260px]': invalidOTP !== '',
                  },
                )}
              />
            </CyDView>
            <CyDView className={'w-[93%]'}>
              <CyDView className={'mx-[22px]'}>
                <CyDText className={clsx('text-[26px] font-bold', {})}>
                  {t<string>('VERIFY_EMAIL_ID_HEADING')}
                </CyDText>
                <CyDView className={'w-full'}>
                  {!isEmailOTPVerified && (
                    <CyDView>
                      <CyDText
                        className={'text-[17px] mt-[12px] font-semibold'}>
                        {t<string>('SENT_AUTHENTICATION_CODE_TO') +
                          ' ' +
                          formData.email}
                      </CyDText>
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
                          className={'flex items-center justify-between'}>
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
                            }>
                            {invalidOTP}
                          </CyDText>
                        </CyDView>
                      )}
                      <CyDView
                        className={
                          'flex flex-row justify-between items-center mt-[12px] mr-[12px]'
                        }>
                        <CyDTouchView
                          className={'flex flex-row items-center'}
                          disabled={resendingCode || resendInterval !== 0}
                          onPress={() => {
                            void resendCode(OTPType.EMAIL);
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
                            setChangeEmailModalVisible(true);
                          }}>
                          <CyDText
                            className={
                              'font-bold underline decoration-solid underline-offset-4'
                            }>
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
                      }>
                      <CyDText className={'text-[16px] pl-[8px] font-bold'}>
                        {formData.email}
                      </CyDText>
                      <CyDImage source={AppImages.DARK_GREEN_BACKGROUND_TICK} />
                    </CyDView>
                  )}
                </CyDView>
              </CyDView>
              <CyDView className={'mx-[22px] mt-[36px]'}>
                {isEmailOTPVerified && (
                  <CyDView>
                    <CyDText className={'text-[26px] font-bold mt-[-6px]'}>
                      {t<string>('VERIFY_PHONE_NO_HEADING')}
                    </CyDText>
                    {!isPhoneOTPVerified && (
                      <CyDView>
                        <CyDText
                          className={'text-[17px] mt-[12px] font-semibold'}>
                          {t<string>('SENT_AUTHENTICATION_CODE_TO') +
                            ' ' +
                            formData.phoneNumber}
                        </CyDText>
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
                              className={
                                'text-redOffColor font-bold text-center'
                              }>
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
                        <Button
                          title='Verify Later'
                          onPress={() => {
                            void verifyOTPByType({ shouldSkip: true });
                          }}
                          disabled={verifyingOTP}
                          type={ButtonType.SECONDARY}
                          style={'mt-[16px] py-[10px]'}
                        />
                        <CyDText className='flex flex-row items-start mt-[12px]'>
                          <CyDText className='font-bold underline'>
                            Note:{' '}
                          </CyDText>
                          <CyDText>{t('PHONE_VERIFY_LATER_DESC')}</CyDText>
                        </CyDText>
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
                        <CyDImage
                          source={AppImages.DARK_GREEN_BACKGROUND_TICK}
                        />
                      </CyDView>
                    )}
                  </CyDView>
                )}

                <CyDView
                  className={
                    'h-[1px] w-[100%] bg-portfolioBorderColor mt-[25px]'
                  }
                />
              </CyDView>
              {isPhoneOTPVerified && isEmailOTPVerified && (
                <CyDView className='mx-[20px] mt-[16px]'>
                  <Button
                    title={t<string>('PROCEED')}
                    style={'h-[54px]'}
                    onPress={() => {
                      void submitVerification();
                    }}
                  />
                </CyDView>
              )}
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
