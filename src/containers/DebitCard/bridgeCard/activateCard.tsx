import React, { useContext, useEffect, useState } from 'react';
import { CyDSafeAreaView, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import OtpInput from '../../../components/v2/OTPInput';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import LottieView from 'lottie-react-native';
import { StyleSheet } from 'react-native';
import useAxios from '../../../core/HttpRequest';
import { ButtonType, CardProviders, GlobalContextType } from '../../../constants/enum';
import clsx from 'clsx';
import { isAndroid } from '../../../misc/checkers';
import Button from '../../../components/v2/button';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import { getWalletProfile } from '../../../core/card';
import { GlobalContext } from '../../../core/globalContext';
import { screenTitle } from '../../../constants';

export default function ActivateCard (props: {navigation: any, route: {params: {onSuccess: (data: any, provider: CardProviders) => {}, currentCardProvider: CardProviders, card: {cardId: string}}}}) {
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const [sendingOTP, setSendingOTP] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const { navigation, route } = props;
  const { currentCardProvider, card } = route.params;
  const onSuccess = route.params.onSuccess;
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth, patchWithAuth } = useAxios();
  const [last4, setLast4] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const globalContext = useContext<any>(GlobalContext);

  useEffect(() => {
    void triggerOTP();
  }, []);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
  }, [resendInterval]);

  const triggerOTP = async () => {
    const triggerOTPUrl = `/v1/cards/${currentCardProvider}/card/${card.cardId}/trigger/activate-card`;
    try {
      const response = await postWithAuth(triggerOTPUrl, {});
      return !response.isError;
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

  const onModalHide = (type = '') => {
    hideModal();
    setLoading(false);
    if (type === 'success') {
      setTimeout(() => {
        navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
      }, MODAL_HIDE_TIMEOUT);
    }
  };

  const activateCard = async () => {
    const verificationUrl = `/v1/cards/${currentCardProvider}/card/${card?.cardId}/activate-card`;
    const payload = {
      otp: +(otp),
      last4
    };
    setLoading(true);
    try {
      const response = await patchWithAuth(verificationUrl, payload);
      if (!response.isError) {
        const data = await getWalletProfile(globalContext.globalState.token);
        globalContext.globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: data });
        showModal('state', { type: 'success', title: t('ACTIVATION_SUCCESSFUL'), description: t('CARD_ACTIVATION_SUCCESSFUL'), onSuccess: () => onModalHide('success'), onFailure: () => onModalHide() });
      } else {
        showModal('state', { type: 'error', title: t('VERIFICATION_FAILED'), description: t('INVALID_DETAILS'), onSuccess: () => onModalHide(), onFailure: () => onModalHide() });
      }
    } catch (e: any) {
      showModal('state', { type: 'error', title: t('VERIFICATION_FAILED'), description: t('INVALID_DETAILS'), onSuccess: () => onModalHide(), onFailure: () => onModalHide() });
      Sentry.captureException(e);
    }
  };

  const ActivateCardHeader = () => {
    return (
      <CyDView className='px-[20px]'>
        <CyDText className={'text-[25px] font-extrabold'}>{t<string>('CARD_ACTIVATION_HEADER')}</CyDText>
        <CyDText className={'text-[15px] font-bold'}>{t<string>('CARD_ACTIVATION_DESCRIPTION')}</CyDText>
      </CyDView>
    );
  };

  return (
    <CyDSafeAreaView className='h-full bg-white px-[20px]'>
      <ActivateCardHeader/>
      <CyDView className={' px-[20px] pt-[10px] mt-[20px]'}>
        <CyDText className={'text-[18px] font-extrabold'}>{t<string>('Last 4 digits of card number')}</CyDText>
        <CyDView>
          <CyDView className={'mt-[5px]'}>
            {/* <OtpInput pinCount={4} getOtp={(otp) => { void verifyOTP(Number(otp)); }}></OtpInput> */}
            <CyDTextInput
              className={clsx('h-[55px] text-center w-[100%] tracking-[2px] rounded-[5px] border-[1px] border-inputBorderColor', { 'pl-[1px] pt-[2px]': isAndroid(), 'tracking-[15px]': last4 !== '', 'border-redCyD': last4 !== '' && last4.length !== 4 })}
              keyboardType="numeric"
              placeholder='Enter last4 digits of card number'
              placeholderTextColor={'#C5C5C5'}
              onChangeText={(num: string) => setLast4(num)}
              value={last4}
              maxLength={4}
            />
          </CyDView>
        </CyDView>
      </CyDView>
      <CyDView className={'px-[20px] mt-[30px]'}>
      <CyDText className={'text-[18px] font-extrabold'}>{t<string>('OTP')}</CyDText>
        <CyDView>
          <CyDView className={'mt-[5px]'}>
            <OtpInput pinCount={4} getOtp={(otp) => { setOtp(otp); }} placeholder={t('ENTER_OTP')}></OtpInput>
            <CyDTouchView className={'flex flex-row items-center mt-[25px]'} disabled={sendingOTP || resendInterval !== 0} onPress={() => { void resendOTP(); }}>
              <CyDText className={'font-bold underline decoration-solid underline-offset-4'}>{t<string>('RESEND_CODE_INIT_CAPS')}</CyDText>
              {sendingOTP && <LottieView source={AppImages.LOADER_TRANSPARENT}
                autoPlay
                loop
                style={styles.lottie}
              />}
              {resendInterval !== 0 && <CyDText>{String(` in ${resendInterval} sec`)}</CyDText>}
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDView>
      <CyDView className='w-full absolute bottom-0 mb-[10px] items-center'>
          <Button title={t('ACTIVATE')} disabled={!otp || !last4 || (otp.length !== 4 || last4.length !== 4)} onPress={() => {
            void (async () => { await activateCard(); })();
          }} type={ButtonType.PRIMARY} loading={loading} style=' h-[60px] w-[90%]'/>
      </CyDView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25
  }
});