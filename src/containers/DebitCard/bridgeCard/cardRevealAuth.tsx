import React, { useEffect, useState } from 'react';
import {
  CyDIcons,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { PinInput } from '../../../components/v2/pinInput';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import * as Sentry from '@sentry/react-native';
import Loading from '../../../components/v2/loading';
import { StyleSheet } from 'react-native';
import useAxios from '../../../core/HttpRequest';
import { CardProviders, PhysicalCardType } from '../../../constants/enum';
import {
  encryptPin,
  generateKeys,
  generateSessionId,
  parseErrorMessage,
} from '../../../core/util';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { t } from 'i18next';
import { Card } from '../../../models/card.model';
import { capitalize } from 'lodash';
import { Config } from 'react-native-config';

interface RouteParams {
  onSuccess: (data: unknown, provider: CardProviders) => void;
  currentCardProvider: CardProviders;
  card: Card;
  triggerOTPParam?: string;
  verifyOTPPayload?: any;
}

const getTriggerOTPUrl = (
  currentCardProvider = '',
  cardId = '',
  triggerOTPParam: string,
): string => {
  const baseUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/trigger/`;

  switch (triggerOTPParam) {
    case 'verify/show-token':
      return `${baseUrl}show-token`;
    case 'set-pin':
      return `${baseUrl}set-pin`;
    case 'tg-set-pin':
      return '/v1/cards/tg/set-pin/trigger';
    default:
      return `${baseUrl}${triggerOTPParam}`;
  }
};

const getOTPVerificationUrl = (
  currentCardProvider: CardProviders,
  cardId: string,
  triggerOTPParam: string,
): string => {
  const baseUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/`;

  switch (triggerOTPParam) {
    case 'verify/show-token':
      return `${baseUrl}verify/show-token`;
    case 'set-pin':
      return `${baseUrl}set-pin`;
    case 'tg-set-pin':
      return '/v1/cards/tg/set-pin';
    default:
      return `${baseUrl}${triggerOTPParam}`;
  }
};

export default function CardRevealAuthScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { showModal, hideModal } = useGlobalModalContext();
  const [sendingOTP, setSendingOTP] = useState<boolean>(false);
  const [verifyingOTP, setVerifyingOTP] = useState<boolean>(false);
  const {
    currentCardProvider,
    card,
    verifyOTPPayload,
    triggerOTPParam = 'verify/show-token',
  } = route.params ?? {};
  const onSuccess = route.params.onSuccess;
  const resendOtpTime = 30;
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { postWithAuth } = useAxios();
  const [otpValue, setOtpValue] = useState<string[]>(Array(4).fill(''));
  const [otpError, setOtpError] = useState<boolean>(false);

  useEffect(() => {
    void triggerOTP();
  }, []);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
  }, [resendInterval]);

  const triggerOTP = async () => {
    const triggerOTPUrl = getTriggerOTPUrl(
      card?.cardProvider,
      card?.cardId,
      triggerOTPParam,
    );
    const response = await postWithAuth(triggerOTPUrl, {});
    if (!response.isError) {
      return true;
    } else {
      showModal('state', {
        type: 'error',
        title: response?.error?.message ?? t('OTP_TRIGGER_FAILED'),
        description: parseErrorMessage(''),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(response.error);
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

  const onModalHide = () => {
    hideModal();
    setVerifyingOTP(false);
  };

  const verifyOTP = async (num: number) => {
    const OTPVerificationUrl = getOTPVerificationUrl(
      card?.cardProvider,
      card?.cardId,
      triggerOTPParam,
    );
    if (
      (card.cardProvider === CardProviders.REAP_CARD ||
        card.cardProvider === CardProviders.RAIN_CARD ||
        currentCardProvider === CardProviders.REAP_CARD) &&
      triggerOTPParam === 'verify/show-token'
    ) {
      try {
        let payload;
        let response;
        setVerifyingOTP(true);
        if (card.cardProvider === CardProviders.REAP_CARD) {
          const key = await generateKeys();
          payload = {
            otp: +num,
            stylesheetUrl: `https://public.cypherd.io/css/${card.physicalCardType === PhysicalCardType.METAL ? 'cardRevealMobileOnMetal.css' : 'cardRevealMobileOnCard.css'}`,
            publicKey: key?.publicKeyBase64,
            ...(verifyOTPPayload || {}),
          };
          response = await postWithAuth(OTPVerificationUrl, payload);
          if (!response.isError) {
            setVerifyingOTP(false);
            onSuccess(
              {
                base64Message: response.data.token,
                privateKey: key?.privateKey,
                reuseToken: response.data.reuseToken,
                userNameValue: response.data.userName,
              },
              card?.cardProvider,
            );
            navigation.goBack();
          }
        } else {
          const pem = Config.RA_PUB_KEY;
          const data = await generateSessionId(pem);
          payload = {
            otp: num ? Number(num) : undefined,
            stylesheetUrl:
              'https://public.cypherd.io/css/reapDAppCardReveal.css',
            sessionId: data?.sessionId,
          };
          response = await postWithAuth(OTPVerificationUrl, payload);
          if (!response.isError) {
            setVerifyingOTP(false);
            onSuccess(
              {
                expirationMonth: response.data.expirationMonth,
                expirationYear: response.data.expirationYear,
                encryptedPan: response.data.encryptedPan,
                encryptedCvc: response.data.encryptedCvc,
                sessionId: data?.sessionId,
                secretKey: data?.secretKey,
                reuseToken: response.data.reuseToken,
                userNameValue: response.data.userName,
              },
              card?.cardProvider,
            );
            navigation.goBack();
          }
        }

        if (response.isError) {
          showModal('state', {
            type: 'error',
            title: t('VERIFICATION_FAILED'),
            description: parseErrorMessage(t('INVALID_OTP')),
            onSuccess: () => onModalHide(),
            onFailure: () => onModalHide(),
          });
        }
      } catch (e: any) {
        showModal('state', {
          type: 'error',
          title: t('VERIFICATION_FAILED'),
          description: t('INVALID_OTP'),
          onSuccess: () => onModalHide(),
          onFailure: () => onModalHide(),
        });
        Sentry.captureException(e);
      }
    } else if (
      triggerOTPParam === 'set-pin' ||
      triggerOTPParam === 'tg-set-pin' ||
      (currentCardProvider === CardProviders.PAYCADDY &&
        triggerOTPParam === 'verify/show-token')
    ) {
      setVerifyingOTP(true);
      const payload = {
        otp: +num,
        ...(verifyOTPPayload || {}),
      };
      if (card.cardProvider === CardProviders.RAIN_CARD) {
        const pem = Config.RA_PUB_KEY;
        const { secretKey, sessionId } = await generateSessionId(pem);
        const { encryptedPin: encryptedPinData, encodedIv } = await encryptPin({
          pin: verifyOTPPayload.pin,
          sessionKey: secretKey,
          sessionId,
        });
        payload.encryptedPin = {
          iv: encodedIv,
          data: encryptedPinData,
        };
        payload.sessionId = sessionId;
      }
      try {
        const response = await postWithAuth(OTPVerificationUrl, payload);
        if (!response.isError) {
          setVerifyingOTP(false);
          onSuccess(response.data, currentCardProvider);
          navigation.goBack();
        } else {
          showModal('state', {
            type: 'error',
            title: t('VERIFICATION_FAILED'),
            description: parseErrorMessage(t('INVALID_OTP')),
            onSuccess: () => onModalHide(),
            onFailure: () => onModalHide(),
          });
        }
      } catch (e: any) {
        showModal('state', {
          type: 'error',
          title: t('VERIFICATION_FAILED'),
          description: t('INVALID_OTP'),
          onSuccess: () => onModalHide(),
          onFailure: () => onModalHide(),
        });
        Sentry.captureException(e);
      }
    }
  };

  const handleOtpChange = (value: string[]) => {
    setOtpValue(value);
    setOtpError(false);
    if (value.every(digit => digit !== '')) {
      void verifyOTP(parseInt(value.join(''), 10));
    }
  };

  const handleOtpBlur = () => {
    // You can add any additional logic here if needed when the OTP input loses focus
  };

  if (verifyingOTP) {
    return <Loading />;
  }

  return (
    <CyDSafeAreaView className='bg-n20'>
      <CyDView className={'h-full px-[20px] pt-[10px]'}>
        <CyDTouchView
          className='flex-row items-center'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
          <CyDText className='ml-[12px] font-regular text-[18px]'>
            {capitalize(card?.type)} {' card ** '} {card?.last4}
          </CyDText>
        </CyDTouchView>

        <CyDMaterialDesignIcons
          name='shield-check'
          size={32}
          className='text-base400 mt-[44px]'
        />

        <CyDText className='mt-[6px] text-[28px] font-bold'>
          {t<string>('OTP_VERIFICATION')}
        </CyDText>

        <CyDText className='mt-[6px] text-[14px] text-n200'>
          {t<string>(
            currentCardProvider === CardProviders.REAP_CARD
              ? 'CARD_SENT_OTP_EMAIL_AND_TELEGRAM'
              : 'CARD_SENT_OTP',
          )}
        </CyDText>

        <CyDText className='text-[10px] mt-[6px] text-n200 '>
          {t<string>('CHECK_SPAM_FOLDER')}
        </CyDText>

        <CyDView className={'mt-[44px]'}>
          <PinInput
            value={otpValue}
            onChange={handleOtpChange}
            error={otpError}
            onBlur={handleOtpBlur}
            length={4}
            className='flex-row justify-start'
          />
          <CyDTouchView
            className={'flex flex-row items-center mt-[8px]'}
            disabled={sendingOTP || resendInterval !== 0}
            onPress={() => {
              void resendOTP();
            }}>
            <CyDText className={'font-normal text-[12px] text-n200'}>
              {"Didn't receive ? "}
              <CyDText className='underline text-blue300 font-bold'>
                {t<string>('RESEND_OTP')}
              </CyDText>
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
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 25,
  },
});
