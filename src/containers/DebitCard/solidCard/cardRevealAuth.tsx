import React, { useContext, useEffect, useState } from 'react';
import { CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import OtpInput from '../../../components/v2/OTPInput';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { GlobalContext } from '../../../core/globalContext';
import axios from '../../../core/Http';
import * as Sentry from '@sentry/react-native';
import LottieView from 'lottie-react-native';
import Loading from '../../../components/v2/loading';
import { StyleSheet } from 'react-native';
import { hostWorker } from '../../../global';

export default function CardRevealAuthScreen (props: {navigation: any, route: {params: {onSuccess: () => {}, card: {}}}}) {
  const { t } = useTranslation();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { showModal, hideModal } = useGlobalModalContext();
  const [sendingOTP, setSendingOTP] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const globalContext = useContext<any>(GlobalContext);
  const { navigation, route } = props;
  const card = route.params.card;
  const onSuccess = route.params.onSuccess;
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState();

  useEffect(() => {
    void triggerOTP();
  }, []);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
  }, [resendInterval]);

  const triggerOTP = async () => {
    const triggerOTPUrl = `${ARCH_HOST}/v1/cards/${card.cardId}/trigger/show-token`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
    };

    try {
      await axios.post(triggerOTPUrl, {}, config);
      return true;
    } catch (e: any) {
      showModal('state', { type: 'error', title: t('OTP_TRIGGER_FAILED'), description: e.mesaage, onSuccess: hideModal, onFailure: hideModal });
      Sentry.captureException(e);
      return false;
    }
  };

  const resendOTP = async () => {
    setSendingOTP(true);
    const response = await triggerOTP();
    if (response) {
      setSendingOTP(false);
      let resendTime = resendOtpTime;
      setTimer(setInterval(() => { resendTime--; setResendInterval(resendTime); }, 1000));
    }
  };

  const onModalHide = () => {
    hideModal();
    setVerifyingOTP(false);
  };

  const verifyOTP = async (num) => {
    const OTPVerificationUrl = `${ARCH_HOST}/v1/cards/${card.cardId}/verify/show-token`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
    };

    setVerifyingOTP(true);
    const payload = {
      otp: +(num),
      isMobile: true
    };
    try {
      await axios.post(OTPVerificationUrl, payload, config).then(response => { setVerifyingOTP(false); onSuccess(response.data); navigation.goBack(); });
    } catch (e: any) {
      showModal('state', { type: 'error', title: t('VERIFICATION_FAILED'), description: t('INVALID_OTP'), onSuccess: () => onModalHide(), onFailure: () => onModalHide() });
      Sentry.captureException(e);
    }
  };

  const OTPHeader = () => {
    return (
      <CyDView>
        <CyDText className={'text-[25px] font-extrabold'}>{t<string>('ENTER_AUTHENTICATION_CODE')}</CyDText>
        <CyDText className={'text-[15px] font-bold'}>{t<string>('CARD_SENT_OTP')}</CyDText>
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView>
      <CyDView className={'h-full bg-white px-[20px] pt-[10px]'}>
        <OTPHeader/>
        <CyDView>
          {!verifyingOTP && <CyDView className={'mt-[20%]'}>
            <OtpInput pinCount={4} getOtp={async (otp) => await verifyOTP(otp)}></OtpInput>
            <CyDTouchView className={'flex flex-row items-center mt-[20%]'} disabled={sendingOTP || resendInterval !== 0} onPress={() => { void resendOTP(); }}>
              <CyDText className={'font-bold underline decoration-solid underline-offset-4'}>{t<string>('RESEND_CODE_INIT_CAPS')}</CyDText>
              {sendingOTP && <LottieView source={AppImages.LOADER_TRANSPARENT}
                autoPlay
                loop
                style={styles.lottie}
              />}
              {resendInterval !== 0 && <CyDText>{` in ${resendInterval} sec`}</CyDText>}
            </CyDTouchView>
          </CyDView>}
          {verifyingOTP && <Loading />}
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25
  }
});
