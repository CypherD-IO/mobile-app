import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { Formik, FormikProps } from 'formik';
import { t } from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { isAddress } from 'web3-validator';
import * as yup from 'yup';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import OtpInput from '../../../components/v2/OTPInput';
import Button from '../../../components/v2/button';
import { GlobalContextType } from '../../../constants/enum';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import {
  getChainNameFromAddress,
  isEthereumAddress,
  parseErrorMessage,
  trimWhitespace,
} from '../../../core/util';
import useCardUtilities from '../../../hooks/useCardUtilities';
import {
  CyDKeyboardAwareScrollView,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { isSolanaAddress } from '../../utilities/solanaUtilities';
import PageHeader from '../../../components/PageHeader';

export default function LinkAnotherWallet() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [formValues, setFormValues] = useState({
    address: '',
    walletName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOTPTriggered, setIsOTPTriggered] = useState<boolean>(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { cardProfileModal } = useCardUtilities();

  const RESENT_OTP_TIME = 30;

  const formValidationSchema = yup.object({
    address: yup
      .string()
      .required('Address Required')
      .test(
        'Enter valid ETH Address / Solana Address',
        'Enter valid ETH Address / Solana Address',
        address => {
          return (
            isSolanaAddress(trimWhitespace(address ?? '')) ||
            isAddress(trimWhitespace(address ?? ''))
          );
        },
      ),
    walletName: yup.string().required('Wallet Name Required'),
  });

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
    return () => {
      clearInterval(timer);
    };
  }, [resendInterval]);

  const triggerOtp = async () => {
    // add / delete pass this after the slash
    const path = `/v1/authentication/profile/trigger/update-child`;

    const response = await postWithAuth(path, {});
    if (!response.isError) {
      return !response.isError;
    } else {
      const errorObject = {
        response,
        message: 'Error when trying to sendOtp in link another wallet screen.',
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
      child: !isEthereumAddress(formValues.address)
        ? formValues.address
        : formValues.address.toLowerCase(),
      label: formValues.walletName,
      chain: getChainNameFromAddress(formValues.address) ?? '',
      otp: '',
    };

    if (otp.length === 4) {
      data.otp = Number(otp);
    }

    const response = await postWithAuth(
      `/v1/authentication/profile/child`,
      data,
    );
    if (!response.isError) {
      await refreshProfile();
      showModal('state', {
        type: 'success',
        title: t('SUCCESS'),
        description: t('WALLET_LINKED_SUCCESSFULLY'),
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
    } else {
      const errorObject = {
        response,
        message: 'isError=true when trying to link another wallet',
      };
      showModal('state', {
        type: 'error',
        title: t('FAILURE'),
        description: parseErrorMessage(response.error),
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
      Sentry.captureException(errorObject);
    }
    setIsSubmitting(false);
  };

  const labels = {
    address: {
      label: t('NEW_ADDRESS_TO_LINK'),
      placeHolder: t('LINK_ADDRESS_PLACEHOLDER'),
    },
    walletName: {
      label: t('WALLET_NAME_UPPERCASE'),
      placeHolder: t('WALLET_NAME'),
    },
  };

  const onSubmitForm = async () => {
    setIsOTPTriggered(true);
    await triggerOtp();
  };

  const handleTextChange = (
    text: string,
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean,
    ) => void,
    field: string,
  ) => {
    const trimmed = trimWhitespace(text);
    setFieldValue(field, trimmed);
    setFormValues(prev => ({ ...prev, [field]: trimmed }));
  };

  return (
    <CyDSafeAreaView className={'h-full bg-n0'} edges={['top']}>
      <PageHeader title={'LINK_ANOTHER_WALLET'} navigation={navigation} />

      <Formik
        enableReinitialize={true}
        initialValues={formValues}
        validationSchema={formValidationSchema}
        onSubmit={onSubmitForm}>
        {formProps => (
          <CyDView className='flex-1 bg-n20'>
            <CyDKeyboardAwareScrollView
              className=''
              contentContainerClassName='flex-grow pt-[24px]'
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps='handled'>
              <CyDView className='px-[24px]'>
                {/* Form Fields Container */}
                <CyDView className=''>
                  {Object.keys(formValues).map((field, index) => {
                    return (
                      <CyDView className='mt-[25px]' key={index}>
                        <CyDView className='flex flex-row justify-start gap-[10px] mb-[5px]'>
                          <CyDText className='font-bold text-base400'>
                            {labels[field as keyof typeof labels].label}
                          </CyDText>
                        </CyDView>
                        <CyDView className='flex flex-row justify-between items-center w-[100%]'>
                          <CyDTextInput
                            className={clsx(
                              'bg-n0 w-[100%] border-[1px] border-n40 rounded-[10px] p-[16px] text-[16px] text-base400',
                              {
                                'border-redOffColor':
                                  formProps.touched[
                                    field as keyof typeof formValues
                                  ] &&
                                  formProps.errors[
                                    field as keyof typeof formValues
                                  ],
                              },
                            )}
                            value={
                              formProps.values[field as keyof typeof formValues]
                            }
                            autoCapitalize='none'
                            key={index}
                            autoCorrect={false}
                            onChangeText={text => {
                              handleTextChange(
                                text,
                                formProps.setFieldValue,
                                field,
                              );
                            }}
                            placeholderTextColor={'#C5C5C5'}
                            placeholder={
                              labels[field as keyof typeof labels].placeHolder
                            }
                          />
                          {formProps.values[
                            field as keyof typeof formValues
                          ] !== '' ? (
                            <CyDTouchView
                              className='absolute right-[12px]'
                              onPress={() => {
                                void formProps.setFieldValue(`${field}`, '');
                              }}>
                              <CyDMaterialDesignIcons
                                name={'close'}
                                size={24}
                                className='text-base400'
                              />
                            </CyDTouchView>
                          ) : (
                            <></>
                          )}
                        </CyDView>
                        {formProps.touched[field as keyof typeof formValues] &&
                          formProps.errors[
                            field as keyof typeof formValues
                          ] && (
                            <CyDView className={'ml-[5px] mt-[6px] mb-[-11px]'}>
                              <CyDText
                                className={'text-redOffColor font-semibold'}>
                                {
                                  formProps.errors[
                                    field as keyof typeof formValues
                                  ]
                                }
                              </CyDText>
                            </CyDView>
                          )}
                      </CyDView>
                    );
                  })}
                </CyDView>

                {/* OTP Section */}
                <CyDView className='pt-[10px]'>
                  {isOTPTriggered && (
                    <CyDView className={'mt-[20px]'}>
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
            </CyDKeyboardAwareScrollView>

            {/* Fixed Button at Bottom */}
            <CyDView className='w-full px-[24px] items-center py-[20px] bg-n20 mb-[20px]'>
              <Button
                style='h-[60px] w-full'
                title={t<string>(isOTPTriggered ? 'SUBMIT' : 'UPDATE')}
                loading={isSubmitting}
                onPress={() => {
                  formProps.handleSubmit();
                  void intercomAnalyticsLog('link_another_wallet');
                }}
              />
            </CyDView>
          </CyDView>
        )}
      </Formik>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25,
  },
});
