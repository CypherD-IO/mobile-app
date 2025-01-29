import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { PinInput } from '../../../components/v2/pinInput';
import { screenTitle } from '../../../constants';
import {
  ButtonType,
  CardProviders,
  GlobalContextType,
} from '../../../constants/enum';
import { GlobalContext } from '../../../core/globalContext';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { useKeyboard } from '../../../hooks/useKeyboard';
import {
  CyDKeyboardAwareScrollView,
  CyDLottieView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';

interface RouteParams {
  currentCardProvider: CardProviders;
  card: { cardId: string };
}
export default function ActivateCard() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const [sendingOTP, setSendingOTP] = useState<boolean>(false);
  const { currentCardProvider, card } = route.params;
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth, patchWithAuth } = useAxios();
  const [last4, setLast4] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const globalContext = useContext<any>(GlobalContext);
  const { keyboardHeight } = useKeyboard();
  const { getWalletProfile } = useCardUtilities();
  const [otpValue, setOtpValue] = useState<string[]>(Array(4).fill(''));
  const [otpError, setOtpError] = useState<boolean>(false);
  const [last4Value, setLast4Value] = useState<string[]>(Array(4).fill(''));
  const [last4Error, setLast4Error] = useState<boolean>(false);

  useEffect(() => {
    void triggerOTP();

    return () => {
      Keyboard.dismiss();
    };
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
      if (response.isError) {
        showModal('state', {
          type: 'error',
          title: t('OTP_TRIGGER_FAILED'),
          description: response?.error?.message ?? '',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
      return !response.isError;
    } catch (e: any) {
      showModal('state', {
        type: 'error',
        title: t('OTP_TRIGGER_FAILED'),
        description: e.mesaage,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
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
      setTimer(
        setInterval(() => {
          resendTime--;
          setResendInterval(resendTime);
        }, 1000),
      );
    }
  };

  const onModalHide = (type = '') => {
    hideModal();
    setLoading(false);
    if (type === 'success') {
      setTimeout(() => {
        navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
          onSuccess: (data: any, cardProvider: CardProviders) => {
            navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
          },
          currentCardProvider,
          card,
        });
      }, MODAL_HIDE_TIMEOUT);
    }
  };

  const activateCard = async () => {
    const verificationUrl = `/v1/cards/${currentCardProvider}/card/${card?.cardId}/activate-card`;
    const payload = {
      otp: +otp,
      last4,
      shouldCancelVirtualCard: false,
    };
    setLoading(true);
    Keyboard.dismiss();
    try {
      const response = await patchWithAuth(verificationUrl, payload);
      if (!response.isError) {
        const data = await getWalletProfile(globalContext.globalState.token);
        globalContext.globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: data,
        });
        showModal('state', {
          type: 'success',
          title: t('ACTIVATION_SUCCESSFUL'),
          description: t('CARD_ACTIVATION_SUCCESSFUL'),
          onSuccess: () => onModalHide('success'),
          onFailure: () => onModalHide(),
        });
      } else {
        showModal('state', {
          type: 'error',
          title: t('VERIFICATION_FAILED'),
          description: response.error.message ?? t('INVALID_DETAILS'),
          onSuccess: () => onModalHide(),
          onFailure: () => onModalHide(),
        });
      }
    } catch (e: any) {
      showModal('state', {
        type: 'error',
        title: t('VERIFICATION_FAILED'),
        description: t('INVALID_DETAILS'),
        onSuccess: () => onModalHide(),
        onFailure: () => onModalHide(),
      });
      Sentry.captureException(e);
    }
  };

  const handleOtpChange = (value: string[]) => {
    setOtpValue(value);
    setOtpError(false);
    setOtp(value.join(''));
  };

  const handleOtpBlur = () => {
    // Add any blur logic if needed
  };

  const handleLast4Change = (value: string[]) => {
    setLast4Value(value);
    setLast4Error(false);
    setLast4(value.join(''));
  };

  const handleLast4Blur = () => {
    // Add any blur logic if needed
  };

  return (
    <CyDKeyboardAwareScrollView
      className='pb-[12px] bg-n20'
      contentContainerStyle={{
        ...styles.contentContainerStyle,
        ...(!keyboardHeight && { flex: 1 }),
      }}>
      <CyDKeyboardAwareScrollView enableOnAndroid>
        <CyDView>
          <CyDView className='px-[20px]'>
            <CyDText className={'text-[25px] font-bold'}>
              {t<string>('CARD_ACTIVATION_HEADER')}
            </CyDText>
            <CyDText className={'text-[16px] text-subTextColor'}>
              {t<string>('CARD_ACTIVATION_DESCRIPTION')}
            </CyDText>
          </CyDView>
          <CyDView className={' px-[24px] pt-[10px] mt-[14px]'}>
            <CyDText className={'text-[18px] font-semibold'}>
              {t<string>('Last 4 digits of card number')}
            </CyDText>
            <CyDView>
              <CyDView className={'mt-[5px]'}>
                <PinInput
                  value={last4Value}
                  onChange={handleLast4Change}
                  error={last4Error}
                  onBlur={handleLast4Blur}
                  length={4}
                />
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className={'px-[20px] mt-[30px]'}>
            <CyDText className={'text-[18px] font-semibold'}>
              {t<string>('OTP')}
            </CyDText>
            <CyDView>
              <CyDView className={'mt-[5px]'}>
                <PinInput
                  value={otpValue}
                  onChange={handleOtpChange}
                  error={otpError}
                  onBlur={handleOtpBlur}
                  length={4}
                />
                <CyDTouchView
                  className={'flex flex-row self-start items-center mt-[25px]'}
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
                    <CyDLottieView
                      source={AppImages.LOADER_TRANSPARENT}
                      autoPlay
                      loop
                      style={styles.lottie}
                    />
                  )}
                  {resendInterval !== 0 && (
                    <CyDText>{String(` in ${resendInterval} sec`)}</CyDText>
                  )}
                </CyDTouchView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='w-full mb-[4px] mt-[22px] items-center'>
          <Button
            title={t('ACTIVATE')}
            disabled={!otp || !last4 || otp.length !== 4 || last4.length !== 4}
            onPress={() => {
              void (async () => {
                await activateCard();
              })();
            }}
            type={ButtonType.PRIMARY}
            loading={loading}
            style=' h-[60px] w-[90%]'
          />
        </CyDView>
      </CyDKeyboardAwareScrollView>
    </CyDKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25,
  },
  contentContainerStyle: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
});
