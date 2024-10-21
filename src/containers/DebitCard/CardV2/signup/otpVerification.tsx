import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDFastImage,
  CyDImage,
  CyDTextInput,
  CyDScrollView,
} from '../../../../styles/tailwindStyles';
import AppImages from '../../../../../assets/images/appImages';
import OTPInput from '../../../../components/v2/otpBox';
import Button from '../../../../components/v2/button';
import useAxios from '../../../../core/HttpRequest';
import { CardProfile } from '../../../../models/cardProfile.model';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../core/globalContext';
import { CardProviders, OTPType } from '../../../../constants/enum';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CyDModalLayout from '../../../../components/v2/modal';
import { Keyboard, StyleSheet } from 'react-native';
import { showToast } from '../../../utilities/toastUtility';
import LottieView from 'lottie-react-native';
import { screenTitle } from '../../../../constants';
import Loading from '../../../../components/v2/loading';
import CardProviderSwitch from '../../../../components/cardProviderSwitch';

export default function OTPVerification(): JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getWithAuth, postWithAuth, patchWithAuth } = useAxios();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const { showModal, hideModal } = useGlobalModalContext();
  const insets = useSafeAreaInsets();

  const cardProfile = globalState.cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;

  const [otp, setOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [email, setEmail] = useState<string>(cardProfile.email);
  const [isEditEmailModalVisible, setIsEditEmailModalVisible] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [loading, setLoading] = useState<{
    pageLoading: boolean;
    otpLoading: boolean;
    emailLoading: boolean;
  }>({
    pageLoading: false,
    otpLoading: false,
    emailLoading: false,
  });

  const handleBackPress = (): void => {
    navigation.reset({
      index: 0,
      routes: [{ name: screenTitle.PORTFOLIO }],
    });
  };

  const handleChangeEmail = async (): Promise<void> => {
    setLoading({ ...loading, emailLoading: true });
    try {
      const response = await patchWithAuth(
        `/v1/cards/${provider}/application`,
        {
          email: newEmail,
        },
      );
      setIsEditEmailModalVisible(false);
      setNewEmail('');
      if (response.isError) {
        showToast(response.error ?? t('EMAIL_UPDATE_FAILED'), 'error');
      } else {
        showToast(t('EMAIL_UPDATE_SUCCESS'), 'success');
        setEmail(response.data.email);
      }
    } catch (e) {
      console.error(e);
      showToast(t('UNEXPECTED_ERROR'), 'error');
    } finally {
      setLoading({ ...loading, emailLoading: false });
    }
  };

  const handleResendOTP = async (): Promise<void> => {
    setSendingOTP(true);
    try {
      await triggerOTP(OTPType.EMAIL);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (): Promise<void> => {
    setLoading({ ...loading, otpLoading: true });
    const OTPVerificationUrl = `/v1/cards/${provider}/application/verify/${OTPType.EMAIL}`;
    const response = await postWithAuth(OTPVerificationUrl, {
      otp: otp ? Number(otp) : undefined,
      toSkip: false,
    });
    setLoading({ ...loading, otpLoading: false });
    if (!response.isError) {
      navigation.navigate(screenTitle.TELEGRAM_SETUP, {
        navigateTo: screenTitle.KYC_VERIFICATION,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: t('OTP_VERIFICATION_FAILED'),
        description: response.error.message ?? '',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
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

  const getApplication = async () => {
    setLoading({ ...loading, pageLoading: true });
    const { isError, error, data } = await getWithAuth(
      `/v1/cards/${provider}/application`,
    );
    setLoading({ ...loading, pageLoading: false });
    if (!isError && data) {
      if (!data?.emailVerfied) {
        setEmail(data.email);
        await triggerOTP(OTPType.EMAIL);
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('OTP_TRIGGER_FAILED'),
        description: error.message ?? '',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  useEffect(() => {
    void (async () => {
      await getApplication();
    })();
  }, []);

  useEffect(() => {
    if (otp.length === 4) {
      Keyboard.dismiss();
      void handleVerifyOTP();
    }
  }, [otp]);

  if (loading.pageLoading) {
    return <Loading />;
  }

  return (
    <CyDView
      className='flex-1 flex flex-col justify-between bg-[#F1F0F5]'
      style={{ paddingTop: insets.top }}>
      <CyDModalLayout
        setModalVisible={() => {
          setIsEditEmailModalVisible(false);
        }}
        isModalVisible={isEditEmailModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => {
              setIsEditEmailModalVisible(false);
            }}
            className={'z-[50]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={'w-[22px] h-[22px] z-[50] absolute right-[0px]'}
            />
          </CyDTouchView>
          <CyDText
            className={
              'mt-[10px] font-bold text-center text-[22px] font-manrope'
            }>
            {t('CHANGE_EMAIL')}
          </CyDText>
          <CyDView className={'mt-[20px]'}>
            <CyDTextInput
              className={
                'border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[16px] w-full font-manrope'
              }
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder={t('ENTER_NEW_EMAIL')}
              keyboardType='email-address'
              autoCapitalize='none'
            />
          </CyDView>
          <CyDView className={'mt-[20px]'}>
            <Button
              title={t('UPDATE_EMAIL')}
              onPress={() => {
                void handleChangeEmail();
              }}
              disabled={!newEmail || loading.emailLoading}
              loading={loading.emailLoading}
              loaderStyle={styles.loaderStyle}
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>
      <CyDView className='p-[16px]'>
        {/* remove the CardProviderSwitch after sunsetting PC */}
        <CyDView className='flex-row justify-between items-center'>
          <CyDTouchView className='' onPress={handleBackPress}>
            <CyDFastImage
              className={'w-[32px] h-[32px]'}
              resizeMode='cover'
              source={AppImages.BACK_ARROW_GRAY}
            />
          </CyDTouchView>
          <CardProviderSwitch />
          <CyDView />
        </CyDView>

        <CyDScrollView>
          <CyDText className='text-[28px] font-bold my-[12px]'>
            {t('VERIFY_EMAIL_ID_HEADING')}
          </CyDText>

          <CyDTouchView
            onPress={() => {
              setIsEditEmailModalVisible(true);
            }}>
            <CyDText className='text-[12px] text-n200 font-regular mb-6 font-manrope'>
              {`OTP has been sent to "${email}" not your email id `}

              <CyDText className='text-blue300 font-manrope'>Edit mail</CyDText>
            </CyDText>
          </CyDTouchView>

          <CyDView className='mt-[24px] mb-[8px]'>
            <OTPInput
              pinCount={4}
              onOTPFilled={value => setOtp(value)}
              value={otp}
            />
          </CyDView>

          <CyDTouchView
            onPress={() => {
              void handleResendOTP();
            }}
            className='mt-4 flex-row items-center'
            disabled={sendingOTP}>
            <CyDText className='text-n200 font-manrope'>
              {t('DIDNT_RECEIVE_OTP')}
              {!sendingOTP && (
                <CyDText className='text-blue300 font-manrope'>
                  {' '}
                  {t('RESEND_CODE_INIT_CAPS')}
                </CyDText>
              )}
            </CyDText>
            {sendingOTP && (
              <LottieView
                source={AppImages.LOADER_TRANSPARENT}
                autoPlay
                loop
                style={styles.lottie}
              />
            )}
          </CyDTouchView>
        </CyDScrollView>
      </CyDView>

      <CyDView className='px-[16px] pb-[48px] bg-white rounded-t-[16px]'>
        {/* <CyDText className='mt-[14px] text-[12px] font-bold font-manrope'>
          {'Verify Email'}
        </CyDText> */}
        <CyDView className='pt-[14px]'>
          <Button
            title={t('VERIFY_OTP')}
            onPress={() => {
              void handleVerifyOTP();
            }}
            disabled={otp.length !== 4}
            loading={loading.otpLoading}
            loaderStyle={styles.loaderStyle}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  loaderStyle: {
    height: 22,
    width: 22,
  },
  lottie: {
    height: 20,
    // width: 12,
  },
});
