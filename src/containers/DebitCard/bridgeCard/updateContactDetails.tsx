import React, { useContext, useEffect, useRef, useState } from 'react';
import useAxios from '../../../core/HttpRequest';
import { GlobalContextType } from '../../../constants/enum';
import * as Sentry from '@sentry/react-native';
import {
  CyDIcons,
  CyDKeyboardAwareScrollView,
  CyDLottieView,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { Formik, FormikProps } from 'formik';
import Button from '../../../components/v2/button';
import clsx from 'clsx';
import { isAndroid } from '../../../misc/checkers';
import AppImages from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import ChooseCountryModal from '../../../components/v2/ChooseCountryModal';
import { ICountry } from '../../../models/cardApplication.model';
import * as yup from 'yup';
import { isValidEmailID } from '../../../core/util';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import OtpInput from '../../../components/v2/OTPInput';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import { StyleSheet } from 'react-native';
import useCardUtilities from '../../../hooks/useCardUtilities';
import PageHeader from '../../../components/PageHeader';

export default function UpdateCardContactDetails({
  navigation,
}: {
  navigation: any;
}) {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isOTPTriggered, setIsOTPTriggered] = useState<boolean>(false);
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [userBasicDetails, setUserBasicDetails] = useState({
    phoneNumber: '',
    email: '',
  });
  const [selectedCountryForDialCode, setSelectedCountryForDialCode] =
    useState<ICountry>({
      name: 'United States',
      dialCode: '+1',
      flag: '🇺🇸',
      Iso2: 'US',
      Iso3: 'USA',
      currency: 'USD',
    });
  const [
    selectCountryModalForDialCodeVisible,
    setSelectCountryModalForDialCodeVisible,
  ] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth, patchWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();
  const { cardProfileModal } = useCardUtilities();

  const formikRef = useRef<FormikProps<typeof userBasicDetails>>(null);

  const RESENT_OTP_TIME = 30;

  const userBasicDetailsValidationSchema = yup.object({
    email: yup
      .string()
      .required(t('EMAIL_REQUIRED'))
      .test('isValidEmail', t('INVALID_EMAIL'), email => {
        if (email) {
          return isValidEmailID(email);
        } else {
          return true;
        }
      }),
    phoneNumber: yup.string().required(t('PHONE_NUMBER_REQUIRED')),
  });

  useEffect(() => {
    void getProfile();
  }, []);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
    return () => {
      clearInterval(timer);
    };
  }, [resendInterval]);

  const getProfile = async () => {
    setPhoneNumber(cardProfile.phone);
    setUserBasicDetails({
      phoneNumber: '',
      email: String(cardProfile.email),
    });
  };

  const onDialCodeModalOpen = values => {
    setUserBasicDetails({ ...userBasicDetails, ...values });
    setSelectCountryModalForDialCodeVisible(true);
  };

  const updateDetails = values => {
    setUserBasicDetails(values);
    setIsOTPTriggered(true);
    void triggerOtp();
  };

  const triggerOtp = async () => {
    const path = `/v1/authentication/profile/trigger/update-contact`;

    try {
      const response = await postWithAuth(path, {});
      if (!response.isError) {
        return !response.isError;
      } else {
        const errorObject = {
          response,
          message:
            'isError=true when trying to sendOtp in update card contact details scree.',
        };
        Sentry.captureException(errorObject);
        showModal('state', {
          type: 'error',
          title: t('OTP_TRIGGER_FAILED'),
          description: t('OTP_TRIGGER_FAILED_TEXT'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return false;
      }
    } catch (e) {
      const errorObject = {
        e,
        message:
          'Error caught when trying to sendOtp in update card contact details screen',
      };
      Sentry.captureException(errorObject);
      showModal('state', {
        type: 'error',
        title: t('OTP_TRIGGER_FAILED'),
        description: t('OTP_TRIGGER_FAILED_TEXT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return false;
    }
  };

  const resendOTP = async () => {
    setSendingOTP(true);
    const otpTriggered = await triggerOtp();
    if (otpTriggered) {
      let resendTime = RESENT_OTP_TIME;
      setTimer(
        setInterval(() => {
          resendTime--;
          setResendInterval(resendTime);
        }, 1000),
      );
    }
    setSendingOTP(false);
  };

  function onModalHide() {
    hideModal();
    setTimeout(() => {
      navigation.goBack();
    }, MODAL_HIDE_TIMEOUT);
  }

  const refreshProfile = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    const tempProfile = await cardProfileModal(response.data);
    if (!response.isError) {
      globalContext.globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: tempProfile,
      });
      return true;
    }
  };

  const onOTPEntry = async (otp: string) => {
    setIsSubmitting(true);
    const data: Record<string, string | number> = {
      phone: selectedCountryForDialCode.dialCode + userBasicDetails.phoneNumber,
      email: userBasicDetails.email,
    };

    if (otp.length === 4) {
      data.otp = Number(otp);
    }

    try {
      const response = await patchWithAuth(
        `/v1/authentication/profile/contactDetails`,
        data,
      );
      if (!response.isError) {
        await refreshProfile();
        showModal('state', {
          type: 'success',
          title: t('SUCCESS'),
          description: t('CONTACT_DETAILS_UPDATION_SUCCESSFUL'),
          onSuccess: onModalHide,
          onFailure: hideModal,
        });
      } else {
        const errorObject = {
          response,
          message: 'isError=true when trying to update card contact details',
        };
        showModal('state', {
          type: 'error',
          title: t('FAILURE'),
          description:
            response.error?.message ?? t('CONTACT_DETAILS_UPDATION_FAILURE'),
          onSuccess: onModalHide,
          onFailure: hideModal,
        });
        Sentry.captureException(errorObject);
      }
      setIsSubmitting(false);
    } catch (e) {
      const errorObject = {
        e,
        message: 'isError=true when trying to update card contact details',
      };
      showModal('state', {
        type: 'error',
        title: t('FAILURE'),
        description: t('CONTACT_DETAILS_UPDATION_FAILURE'),
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
      Sentry.captureException(errorObject);
      setIsSubmitting(false);
    }
  };

  return (
    <CyDSafeAreaView className={'h-full bg-n0'} edges={['top']}>
      <PageHeader title={'UPDATE_CONTACT_DETAILS'} navigation={navigation} />
      <CyDView className='flex-1 bg-n20'>
        <CyDKeyboardAwareScrollView
          className='flex-1'
          contentContainerClassName='flex-grow pt-[24px]'
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'>
          <ChooseCountryModal
            isModalVisible={selectCountryModalForDialCodeVisible}
            setModalVisible={setSelectCountryModalForDialCodeVisible}
            selectedCountryState={[
              selectedCountryForDialCode,
              setSelectedCountryForDialCode,
            ]}
          />
          <Formik
            innerRef={formikRef}
            enableReinitialize={true}
            initialValues={userBasicDetails}
            validationSchema={userBasicDetailsValidationSchema}
            onSubmit={values => updateDetails(values)}>
            {formProps => (
              <CyDView className='px-[30px]'>
                <CyDView>
                  <CyDText className='text-[16px] font-bold mt-[20px] text-base400'>
                    {t('CURRENT_PHONE_NUMBER')} {phoneNumber}
                  </CyDText>
                  <CyDView
                    className={clsx(
                      'h-[50px] mt-[8px] border-[1px] border-n40 flex flex-row rounded-md',
                      {
                        'border-redOffColor':
                          formProps.touched.phoneNumber &&
                          formProps.errors.phoneNumber,
                      },
                    )}>
                    <CyDTouchView
                      onPress={() => onDialCodeModalOpen(formProps.values)}
                      className={
                        'w-4/12 border-r-[1px] border-n40 bg-n0 py-[13px] flex items-center rounded-l-md'
                      }>
                      <CyDView className={'mt-[-4px] ml-[-55px]'}>
                        <CyDText className={'text-[33px] mt-[-6px]'}>
                          {selectedCountryForDialCode.flag}
                        </CyDText>
                      </CyDView>
                      <CyDView className={'mt-[-20px] ml-[45px]'}>
                        <CyDText
                          className={'text-[13px] font-extrabold text-center'}>
                          {selectedCountryForDialCode.dialCode}
                        </CyDText>
                      </CyDView>
                    </CyDTouchView>
                    <CyDView
                      className={
                        'flex flex-row items-center w-8/12 rounded-r-md bg-n0'
                      }>
                      <CyDView className={'flex flex-row items-center'}>
                        <CyDTextInput
                          className={clsx(
                            'text-base400  text-[16px] ml-[8px] w-[90%]',
                            { 'mt-[-8px]': isAndroid() },
                          )}
                          value={formProps.values.phoneNumber}
                          autoCapitalize='none'
                          keyboardType={'numeric'}
                          maxLength={15}
                          key='phoneNumber'
                          autoCorrect={false}
                          placeholderTextColor={'#C5C5C5'}
                          onChangeText={formProps.handleChange('phoneNumber')}
                          placeholder='Phone Number'
                        />
                      </CyDView>
                    </CyDView>
                  </CyDView>
                  {formProps.touched.phoneNumber &&
                    formProps.errors.phoneNumber && (
                      <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}>
                        <CyDText className={'text-redOffColor font-semibold'}>
                          {formProps.errors.phoneNumber}
                        </CyDText>
                      </CyDView>
                    )}
                </CyDView>

                <CyDView className={'mt-[24px] '}>
                  <CyDText className='text-[16px] font-bold mt-[20px] text-base400'>
                    {t('EMAIL_ADDRESS')}
                  </CyDText>
                  <CyDTextInput
                    className={clsx(
                      ' border-[1px] border-n40 mt-[8px] p-[12px] text-[18px] rounded-md text-base400',
                      {
                        'border-redOffColor':
                          formProps.touched.email && formProps.errors.email,
                      },
                    )}
                    value={formProps.values.email}
                    key='email'
                    textContentType='emailAddress'
                    keyboardType='email-address'
                    autoCapitalize='none'
                    autoCorrect={false}
                    onChangeText={formProps.handleChange('email')}
                    placeholderTextColor={'#C5C5C5'}
                    placeholder='Email'
                  />
                </CyDView>
                {formProps.touched.email && formProps.errors.email && (
                  <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}>
                    <CyDText className={'text-redOffColor font-semibold'}>
                      {formProps.errors.email}
                    </CyDText>
                  </CyDView>
                )}
                <CyDView className={'bg-n0 '}>
                  <CyDView>
                    {isOTPTriggered && (
                      <CyDView className={'mt-[20px] pt-[10px]'}>
                        <CyDText
                          className={
                            'text-[15px] mb-[12px] font-bold text-base400'
                          }>
                          {t<string>('UPDATE_CARD_DETAILS_OTP')}
                        </CyDText>
                        <OtpInput
                          pinCount={4}
                          getOtp={otp => {
                            void onOTPEntry(otp);
                          }}
                          placeholder={t('ENTER_OTP')}
                        />
                        <CyDTouchView
                          className={'flex flex-row items-center mt-[18px]'}
                          disabled={sendingOTP || resendInterval !== 0}
                          onPress={() => {
                            void resendOTP();
                          }}>
                          <CyDText
                            className={
                              'font-bold underline decoration-solid underline-offset-4 text-base400'
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
                            <CyDText className='text-base400'>
                              {String(` in ${resendInterval} sec`)}
                            </CyDText>
                          )}
                        </CyDTouchView>
                      </CyDView>
                    )}
                  </CyDView>
                </CyDView>
              </CyDView>
            )}
          </Formik>
        </CyDKeyboardAwareScrollView>

        {/* Fixed Button at Bottom */}
        <CyDView className='w-full px-[30px] items-center py-[20px] bg-n20 mb-[20px]'>
          <Button
            title={t<string>(isOTPTriggered ? 'SUBMIT' : 'UPDATE')}
            loading={isSubmitting}
            onPress={() => formikRef.current?.handleSubmit()}
            style='h-[55px] w-full'
            isPrivateKeyDependent={false}
          />
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
