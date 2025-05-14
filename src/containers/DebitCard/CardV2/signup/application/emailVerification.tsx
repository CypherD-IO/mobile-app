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
  CyDSafeAreaView,
  CyDLottieView,
} from '../../../../../styles/tailwindComponents';
import { CardProfile } from '../../../../../models/cardProfile.model';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../core/globalContext';
import { CardProviders, OTPType } from '../../../../../constants/enum';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import ChangeEmailModal from '../../../../../components/v2/ChangeEmailModal';
import useAxios from '../../../../../core/HttpRequest';
import { screenTitle } from '../../../../../constants';
import { showToast } from '../../../../utilities/toastUtility';
import Loading from '../../../../../components/v2/loading';
import OTPInput from '../../../../../components/v2/otpBox';
import AppImages from '../../../../../../assets/images/appImages';

const EmailVerification = (): JSX.Element => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getWithAuth, postWithAuth, patchWithAuth } = useAxios();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalState.cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;

  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState<string>(cardProfile.email);
  const [loading, setLoading] = useState({
    pageLoading: false,
    otpLoading: false,
  });
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const handleResendOtp = async (): Promise<void> => {
    try {
      await triggerOTP(OTPType.EMAIL);
    } catch (error) {
      showToast(t('UNEXPECTED_ERROR'), 'error');
    }
  };

  const handleNext = async (): Promise<void> => {
    setLoading({ ...loading, otpLoading: true });
    try {
      const response = await postWithAuth(
        `/v1/cards/${provider}/application/verify/${OTPType.EMAIL}`,
        {
          otp: otp ? Number(otp) : undefined,
          toSkip: false,
        },
      );

      if (!response.isError) {
        navigation.navigate(screenTitle.KYC_VERIFICATION_INTRO);
      } else {
        showToast(
          response.error?.message ?? t('OTP_VERIFICATION_FAILED'),
          'error',
        );
      }
    } catch (error) {
      showToast(t('UNEXPECTED_ERROR'), 'error');
    } finally {
      setLoading({ ...loading, otpLoading: false });
    }
  };

  const triggerOTP = async (type: string) => {
    try {
      const response = await postWithAuth(
        `/v1/cards/${provider}/application/trigger/${type}`,
        {},
      );
      if (response.isError) {
        showToast(response.error?.message ?? t('OTP_TRIGGER_FAILED'), 'error');
      }
    } catch (error) {
      showToast(t('UNEXPECTED_ERROR'), 'error');
    }
  };

  const handleUpdateEmail = async (newEmail: string) => {
    try {
      setIsUpdatingEmail(true);
      const response = await patchWithAuth(
        `/v1/cards/${provider}/application`,
        {
          email: newEmail,
        },
      );

      if (!response.isError) {
        setEmail(response.data.email);
        showToast(t('EMAIL_UPDATE_SUCCESS'), 'success');
        await triggerOTP(OTPType.EMAIL); // Trigger new OTP for the new email
      } else {
        showToast(response.error ?? t('EMAIL_UPDATE_FAILED'), 'error');
      }
    } catch (error) {
      showToast(t('UNEXPECTED_ERROR'), 'error');
    } finally {
      setIsUpdatingEmail(false);
      setShowChangeEmailModal(false);
    }
  };

  useEffect(() => {
    const getApplication = async () => {
      setLoading({ ...loading, pageLoading: true });
      try {
        const response = await getWithAuth(`/v1/cards/${provider}/application`);
        if (!response.isError && response.data) {
          if (!response.data?.emailVerfied) {
            setEmail(response.data.email);
            await triggerOTP(OTPType.EMAIL);
          }
        } else {
          showToast(
            response.error?.message ?? t('OTP_TRIGGER_FAILED'),
            'error',
          );
        }
      } catch (error) {
        showToast(t('UNEXPECTED_ERROR'), 'error');
      } finally {
        setLoading({ ...loading, pageLoading: false });
      }
    };

    void getApplication();
  }, []);

  useEffect(() => {
    if (otp.length === 4) {
      void handleNext();
    }
  }, [otp]);

  if (loading.pageLoading) {
    return <Loading />;
  }

  const isValid = otp.length === 4;

  const handleLegalPress = () => {
    navigation.navigate(screenTitle.CARD_FAQ_SCREEN, {
      uri: 'https://cypherhq.io/legal/',
      title: 'Terms of Service',
    });
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <CardApplicationHeader
        onBackPress={() => navigation.navigate(screenTitle.PORTFOLIO)}
      />

      <CyDView className='flex-1 px-[20px]'>
        {/* Title */}
        <CyDText className='text-[32px] mt-6 mb-[6px]'>
          {t('Verify Email')}
        </CyDText>

        {/* Description */}
        <CyDView className='flex flex-col mt-[6px]'>
          <CyDView className='flex flex-row flex-wrap items-center'>
            <CyDText className='text-[14px] font-bold text-n200'>
              Enter the code we&apos;ve sent to{' '}
            </CyDText>
            <CyDText className='text-[14px] text-base400 font-bold'>
              {email}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDText className='text-[14px] font-bold text-n200'>
              Not yours?{' '}
            </CyDText>
            <CyDTouchView
              onPress={() => {
                setShowChangeEmailModal(true);
              }}>
              <CyDText className='text-[14px] font-bold underline'>
                Change email address
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>

        {/* OTP Input */}
        <CyDView className='mt-[58px]'>
          <OTPInput
            pinCount={4}
            onOTPFilled={value => setOtp(value)}
            value={otp}
            otpInputStyle='bg-n20 w-[56px] h-[84px] text-center align-center border-[1px] border-b-[4px] border-base400 text-[24px] font-bold mr-[7px] rounded-[8px]'
          />
        </CyDView>

        {/* Resend Code */}
        <CyDTouchView
          onPress={() => {
            void handleResendOtp();
          }}
          className='flex flex-row items-center mt-[44px]'
          disabled={loading.otpLoading}>
          <CyDText className='text-blue300 font-medium'>
            Didn&apos;t get a code?
          </CyDText>
          {loading.otpLoading && (
            <CyDView className='w-[20px] h-[20px]'>
              <CyDLottieView
                source={AppImages.LOADER_TRANSPARENT}
                autoPlay
                loop
              />
            </CyDView>
          )}
        </CyDTouchView>
      </CyDView>

      <CyDView className='flex flex-row items-center mb-[16px] mx-[16px]'>
        <CyDText className='text-n200 text-[12px]'>
          {t('By continuing, you agree to our ')}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            handleLegalPress();
          }}>
          <CyDText className='text-blue300 text-[12px] font-medium'>
            {t('Terms of Service')}
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CardApplicationFooter
        currentStep={2}
        totalSteps={3}
        currentSectionProgress={20}
        buttonConfig={{
          title: t('NEXT'),
          onPress: () => {
            void handleNext();
          },
          disabled: !isValid || loading.otpLoading,
          loading: loading.otpLoading,
        }}
      />

      <ChangeEmailModal
        isVisible={showChangeEmailModal}
        onClose={() => setShowChangeEmailModal(false)}
        onUpdate={handleUpdateEmail}
        loading={isUpdatingEmail}
      />
    </CyDSafeAreaView>
  );
};

export default EmailVerification;
