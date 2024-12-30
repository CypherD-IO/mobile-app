import * as React from 'react';
import { Formik } from 'formik';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { useContext, useEffect, useState } from 'react';
import * as yup from 'yup';
import Web3 from 'web3';
import { t } from 'i18next';
import clsx from 'clsx';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import useAxios from '../../../core/HttpRequest';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import { GlobalContext } from '../../../core/globalContext';
import { CardProviders, GlobalContextType } from '../../../constants/enum';
import OtpInput from '../../../components/v2/OTPInput';
import LottieView from 'lottie-react-native';
import * as Sentry from '@sentry/react-native';
import { StyleSheet } from 'react-native';
import { getChainNameFromAddress, trimWhitespace } from '../../../core/util';
import { CardProfile } from '../../../models/cardProfile.model';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { isAddress } from 'web3-validator';

export default function LinkAnotherWallet({ navigation }) {
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
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { cardProfileModal } = useCardUtilities();

  const RESENT_OTP_TIME = 30;

  const formValidationSchema = yup.object({
    address: yup
      .string()
      .required('Address Required')
      .test('Enter valid ETH Address', 'Enter valid ETH Address', address => {
        return isAddress(trimWhitespace(address ?? ''));
      }),
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
    const path = `/v1/authentication/profile/trigger/update-child`;

    const response = await postWithAuth(path, {});
    if (!response.isError) {
      return !response.isError;
    } else {
      const errorObject = {
        response,
        message:
          'isError=true when trying to sendOtp in link another wallet screen.',
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
      child: formValues.address.toLowerCase(),
      label: formValues.walletName,
      chain: getChainNameFromAddress(formValues.address),
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
        description: response.error?.message ?? t('WALLET_LINK_UNSUCCESSFUL'),
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
      Sentry.captureException(errorObject);
    }
    setIsSubmitting(false);
  };

  const labels = {
    address: {
      label: t('ADDRESS_UPPERCASE'),
      placeHolder: t('LINK_ADDRESS_PLACEHOLDER'),
    },
    walletName: {
      label: t('WALLET_NAME_UPPERCASE'),
      placeHolder: t('WALLET_NAME_PLACEHOLDER'),
    },
  };

  const onSubmitForm = async () => {
    setIsOTPTriggered(true);
    await triggerOtp();
  };

  const handleTextChange = (text, handleChange, field) => {
    handleChange(field);
    const tempFormValues = { ...formValues };
    tempFormValues[field] = trimWhitespace(text);
    setFormValues(tempFormValues);
  };

  return (
    <CyDView className={'bg-n0 w-full h-full'}>
      <Formik
        enableReinitialize={true}
        initialValues={formValues}
        validationSchema={formValidationSchema}
        onSubmit={onSubmitForm}>
        {formProps => (
          <CyDView className='flex flex-1 h-full'>
            <CyDKeyboardAwareScrollView className='flex flex-col w-full'>
              <CyDView className='flex flex-1 h-full'>
                {Object.keys(formValues).map((field, index) => {
                  return (
                    <CyDView
                      className='flex-1 mt-[25px] self-center w-[87%]'
                      key={index}>
                      <CyDView className='flex flex-row justify-start gap-[10px]'>
                        <CyDText className='font-bold '>
                          {labels[field].label}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row justify-between items-center w-[100%]'>
                        <CyDTextInput
                          className={clsx(
                            'mt-[5px] w-[100%] border-[1px] border-inputBorderColor rounded-[10px] p-[12px] pr-[38px] text-[16px]  ',
                            {
                              'border-redOffColor':
                                formProps.touched[field] &&
                                formProps.errors[field],
                            },
                          )}
                          value={formProps.values[field]}
                          autoCapitalize='none'
                          key={index}
                          autoCorrect={false}
                          onChangeText={text => {
                            handleTextChange(
                              text,
                              formProps.handleChange,
                              field,
                              0,
                            );
                          }}
                          placeholderTextColor={'#C5C5C5'}
                          placeholder={labels[field].placeHolder}
                        />
                        {formProps.values[field] !== '' ? (
                          <CyDTouchView
                            className='left-[-32px]'
                            onPress={() => {
                              formProps.setFieldValue(`${field}`, '');
                            }}>
                            <CyDImage source={AppImages.CLOSE_CIRCLE} />
                          </CyDTouchView>
                        ) : (
                          <></>
                        )}
                      </CyDView>
                      {formProps.touched[field] && formProps.errors[field] && (
                        <CyDView className={'ml-[5px] mt-[6px] mb-[-11px]'}>
                          <CyDText className={'text-redOffColor font-semibold'}>
                            {formProps.errors[field]}
                          </CyDText>
                        </CyDView>
                      )}
                    </CyDView>
                  );
                })}
              </CyDView>
              <CyDView className={'bg-n0 pt-[10px] self-center w-[87%]'}>
                <CyDView>
                  {isOTPTriggered && (
                    <CyDView className={'mt-[20px]'}>
                      <CyDText className={'text-[15px] mb-[12px] font-bold'}>
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
                          <CyDText>
                            {String(` in ${resendInterval} sec`)}
                          </CyDText>
                        )}
                      </CyDTouchView>
                    </CyDView>
                  )}
                </CyDView>
              </CyDView>
            </CyDKeyboardAwareScrollView>
            <CyDView className='w-full px-[24px] items-center mb-[20px]'>
              <Button
                style='h-[60px] w-[90%]'
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
    </CyDView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25,
  },
});
