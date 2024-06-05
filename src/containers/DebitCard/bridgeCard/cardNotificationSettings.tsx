import React, { useContext, useEffect, useState } from 'react';
import {
  CARD_ALERT_TYPES,
  CARD_NOTIFICATION_TYPES,
  CardProviders,
  GlobalContextType,
} from '../../../constants/enum';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import useAxios from '../../../core/HttpRequest';
import { get } from 'lodash';
import {
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDSwitch,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import AppImages from '../../../../assets/images/appImages';
import { Linking, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { getWalletProfile } from '../../../core/card';
import OtpInput from '../../../components/v2/OTPInput';
import * as Sentry from '@sentry/react-native';
import CyDModalLayout from '../../../components/v2/modal';
import { copyToClipboard } from '../../../core/util';
import Button from '../../../components/v2/button';
import { showToast } from '../../utilities/toastUtility';

export default function CardNotificationSettings(props: {
  route: {
    params: {
      currentCardProvider: CardProviders;
      card: { cardId: string; status: string; type: string };
    };
  };
}) {
  const RESENT_OTP_TIME = 30;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalContext.globalState.cardProfile;
  const { showModal, hideModal } = useGlobalModalContext();
  const { patchWithAuth, postWithAuth, getWithAuth } = useAxios();
  const [telegramSwitchLoading, setTelegramSwitchLoading] = useState(false);
  const [emailSwitchLoading, setEmailSwitchLoading] = useState(false);
  const [smsSwitchLoading, setSmsSwitchLoading] = useState(false);
  const [fcmSwitchLoading, setFcmSwitchLoading] = useState(false);
  const [telegramConnectionId, setTelegramConnectionId] = useState('');
  const [currentNotificationOption, setCurrentNotificationOption] = useState({
    email: get(cardProfile, ['cardNotification', 'isEmailAllowed'], true),
    sms: get(cardProfile, ['cardNotification', 'isSmsAllowed'], true),
    fcm: get(cardProfile, ['cardNotification', 'isFcmAllowed'], true),
    telegram: get(
      cardProfile,
      ['cardNotification', 'isTelegramAllowed'],
      false,
    ),
  });
  const [isOTPTriggered, setIsOTPTriggered] = useState<boolean>(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [resendInterval, setResendInterval] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const [isTelegramAuthModalVisible, setIsTelegramAuthModalVisible] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentNotificationOption({
      email: get(cardProfile, ['cardNotification', 'isEmailAllowed'], true),
      sms: get(cardProfile, ['cardNotification', 'isSmsAllowed'], true),
      fcm: get(cardProfile, ['cardNotification', 'isFcmAllowed'], true),
      telegram: get(
        cardProfile,
        ['cardNotification', 'isTelegramAllowed'],
        false,
      ),
    });
  }, [globalContext]);

  useEffect(() => {
    if (resendInterval === 0) {
      clearInterval(timer);
    }
    return () => {
      clearInterval(timer);
    };
  }, [resendInterval]);

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  useEffect(() => {
    const getNewTelegramConnectionId = async () => {
      const resp = await getWithAuth('/v1/cards/tg-create');
      setTelegramConnectionId(resp.data);
    };
    void getNewTelegramConnectionId();
  }, [isTelegramAuthModalVisible]);

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

  const triggerOtp = async () => {
    const path = '/v1/cards/trigger/unsubscribe-alerts';

    const response = await postWithAuth(path, {});
    if (response.isError) {
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
    return true;
  };

  const onOTPEntry = async (otp: string) => {
    await toggleSmsNotifiction(otp);
    setIsOTPTriggered(false);
  };

  const toggleEmailNotifiction = async () => {
    setEmailSwitchLoading(true);
    const response = await patchWithAuth(`/v1/cards/unsubscribe-alerts`, {
      type: CARD_ALERT_TYPES.CARD_TRANSACTION_EMAIL,
      toggleValue: !currentNotificationOption.email,
    });
    if (!response.isError) {
      await refreshProfile();
      setEmailSwitchLoading(false);
      showModal('state', {
        type: 'success',
        title: t('TOGGLE_EMAIL_NOTIFICATION_SUCCESS'),
        description: !currentNotificationOption.email
          ? t('EMAIL_NOTIFICATION_TURNED_ON')
          : t('EMAIL_NOTIFICATION_TURNED_OFF'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      setEmailSwitchLoading(false);
      showModal('state', {
        type: 'error',
        title: t('TOGGLE_EMAIL_NOTIFICATION_FAIL'),
        description:
          response.error.errors[0].message ?? t('ERROR_IN_TOGGLE_EMAIL'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const toggleTelegramNotifiction = async () => {
    setTelegramSwitchLoading(true);
    const response = await patchWithAuth(`/v1/cards/unsubscribe-alerts`, {
      type: CARD_ALERT_TYPES.CARD_TRANSACTION_TELEGRAM,
      toggleValue: !currentNotificationOption.telegram,
    });
    if (!response.isError) {
      await refreshProfile();
      setTelegramSwitchLoading(false);
      showModal('state', {
        type: 'success',
        title: t('TOGGLE_TELEGRAM_NOTIFICATION_SUCCESS'),
        description: !currentNotificationOption.telegram
          ? t('TELEGRAM_NOTIFICATION_TURNED_ON')
          : t('TELEGRAM_NOTIFICATION_TURNED_OFF'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      setTelegramSwitchLoading(false);
      showModal('state', {
        type: 'error',
        title: t('TOGGLE_TELEGRAM_NOTIFICATION_FAIL'),
        description:
          response.error.errors[0].message ?? t('ERROR_IN_TOGGLE_TELEGRAM'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const toggleSmsNotifiction = async (otp = '') => {
    setSmsSwitchLoading(true);
    const response = await patchWithAuth(`/v1/cards/unsubscribe-alerts`, {
      type: CARD_ALERT_TYPES.CARD_TRANSACTION_SMS,
      toggleValue: !currentNotificationOption.sms,
      ...(!currentNotificationOption.sms ? { otp: Number(otp) } : {}),
    });
    if (!response.isError) {
      await refreshProfile();
      setSmsSwitchLoading(false);
      showModal('state', {
        type: 'success',
        title: t('TOGGLE_SMS_NOTIFICATION_SUCCESS'),
        description: !currentNotificationOption.sms
          ? t('SMS_NOTIFICATION_TURNED_ON')
          : t('SMS_NOTIFICATION_TURNED_OFF'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      setSmsSwitchLoading(false);
      showModal('state', {
        type: 'error',
        title: t('TOGGLE_SMS_NOTIFICATION_FAIL'),
        description:
          response.error.errors[0].message ?? t('ERROR_IN_TOGGLE_SMS'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const toggleFcmNotifiction = async () => {
    setFcmSwitchLoading(true);
    const response = await patchWithAuth(`/v1/cards/unsubscribe-alerts`, {
      type: CARD_ALERT_TYPES.CARD_TRANSACTION_FCM,
      toggleValue: !currentNotificationOption.fcm,
    });
    if (!response.isError) {
      await refreshProfile();
      setFcmSwitchLoading(false);
      showModal('state', {
        type: 'success',
        title: t('TOGGLE_FCM_NOTIFICATION_SUCCESS'),
        description: !currentNotificationOption.fcm
          ? t('FCM_NOTIFICATION_TURNED_ON')
          : t('FCM_NOTIFICATION_TURNED_OFF'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      setFcmSwitchLoading(false);
      showModal('state', {
        type: 'error',
        title: t('TOGGLE_FCM_NOTIFICATION_FAIL'),
        description:
          response.error.errors[0].message ?? t('ERROR_IN_TOGGLE_FCM'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const handleToggleNotifications = (
    cardNotificationType: CARD_NOTIFICATION_TYPES,
  ) => {
    if (get(currentNotificationOption, cardNotificationType) === true) {
      showModal('state', {
        type: 'warning',
        title: `${t('WARNING')}`,
        description: `Are you sure you want to turn off ${cardNotificationType} notifications?`,
        onSuccess: () => {
          switch (cardNotificationType) {
            case CARD_NOTIFICATION_TYPES.TELEGRAM:
              void toggleTelegramNotifiction();
              break;
            case CARD_NOTIFICATION_TYPES.EMAIL:
              void toggleEmailNotifiction();
              break;
            case CARD_NOTIFICATION_TYPES.SMS:
              void toggleSmsNotifiction();
              break;
            case CARD_NOTIFICATION_TYPES.FCM:
              void toggleFcmNotifiction();
              break;
          }
          hideModal();
        },
        onFailure: () => {
          hideModal();
        },
      });
    } else {
      switch (cardNotificationType) {
        case CARD_NOTIFICATION_TYPES.EMAIL:
          void toggleEmailNotifiction();
          break;
        case CARD_NOTIFICATION_TYPES.SMS:
          setIsOTPTriggered(true);
          void triggerOtp();
          break;
        case CARD_NOTIFICATION_TYPES.FCM:
          void toggleFcmNotifiction();
          break;
      }
    }
  };

  const onTelegramAuth = () => {
    setIsTelegramAuthModalVisible(true);
  };

  return (
    <CyDView className='h-full bg-white pt-[30px]'>
      <CyDModalLayout
        isModalVisible={isTelegramAuthModalVisible}
        setModalVisible={setIsTelegramAuthModalVisible}
        style={styles.modalContainer}>
        <CyDView className='bg-white h-[100%] w-[100%]'>
          <CyDSafeAreaView className='flex flex-row w-full'>
            <CyDView className='flex-row items-center w-[100%] px-[10px]'>
              <CyDTouchView
                onPress={() => setIsTelegramAuthModalVisible(false)}>
                <CyDImage
                  source={AppImages.BACK}
                  className='h-[22px] w-[25px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
              <CyDView className='flex flex-1 items-center'>
                <CyDText className='font-extrabold text-[20px] ml-[-25px]'>
                  {t<string>('Setup Telegram')}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDSafeAreaView>
          {isTelegramAuthModalVisible && (
            <>
              <CyDView className='h-full bg-white p-[30px] flex flex-row'>
                <CyDFastImage
                  className='h-[232px] w-[10px] mr-3 mt-[35px]'
                  source={AppImages.TELEGRAM_SETUP_STATUSBAR}
                />
                <CyDView className='p-[15px] flex flex-col'>
                  <CyDView className='border-[1px] border-cardBgTo m-[8px] rounded-[5px] p-[12px]'>
                    <CyDText className='text-[15px] font-nunito text-primaryTextColor'>
                      {t<string>(
                        `CypherHQ bot, using the account where you want to receive notifications at,`,
                      )}
                    </CyDText>
                    <CyDText
                      className='text-blue-600 underline cursor-pointer'
                      onPress={() => {
                        console.log('FEAUFIGAO');
                        void Linking.openURL('https://t.me/CypherHQBot');
                      }}>
                      CypherHQBot{' '}
                    </CyDText>
                  </CyDView>
                  <CyDView className='border-[1px] border-cardBgTo m-[8px] rounded-[5px] p-[6px]'>
                    <CyDText className='text-[15px] font-nunito text-primaryTextColor'>
                      {t<string>(
                        `Copy and paste the following bot command after clicking on start to begin receiving notifications.\nClick Done after you have gotten the confirmation!`,
                      )}
                    </CyDText>
                  </CyDView>

                  <CyDText className='ml-[8px] text-primaryText text-[10px]'>
                    Bot Command
                  </CyDText>
                  <CyDView className='border-[1px] border-cardBgTo m-[8px] rounded-[5px] p-[6px]'>
                    <CyDTouchView
                      className='text-[15px] font-nunito text-primaryTextColor justify-between flex flex-row'
                      onPress={() => {
                        copyToClipboard(`/link ${telegramConnectionId}`);
                        showToast(t('SEED_PHARSE_COPY'));
                      }}>
                      <CyDText className='text-center font-nunito text-[14px] font-bold mt-[3px]'>
                        {t<string>(`/link ${telegramConnectionId}`)}
                      </CyDText>
                      <CyDImage
                        source={AppImages.COPY}
                        className={'w-[16px] h-[18px] mt-[3px]'}
                      />
                    </CyDTouchView>
                  </CyDView>
                  <CyDView className='pt-[10px]'>
                    <Button
                      title={t('Done')}
                      loading={isLoading}
                      // eslint-disable-next-line @typescript-eslint/no-misused-promises
                      onPress={async () => {
                        setIsLoading(true);
                        await refreshProfile();
                        setIsLoading(false);
                        if (currentNotificationOption.telegram) {
                          setIsTelegramAuthModalVisible(false);
                        }
                      }}
                      style='h-[55px] px-[55px]'
                      isPrivateKeyDependent={true}
                    />
                  </CyDView>
                </CyDView>
              </CyDView>
            </>
          )}
        </CyDView>
      </CyDModalLayout>
      {!isOTPTriggered && (
        <>
          {!currentNotificationOption.telegram ? (
            <CyDTouchView
              className='flex flex-row justify-between align-center mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'
              onPress={() => onTelegramAuth()}>
              <CyDView className='flex flex-row items-center'>
                <CyDText className='text-[16px] font-bold'>
                  {t<string>('TELEGRAM_NOTIFICATION')}
                </CyDText>
              </CyDView>
              <CyDImage
                source={AppImages.TELEGRAM_BLUE}
                className='h-[22px] w-[22px]'
              />
            </CyDTouchView>
          ) : (
            <CyDView className='flex flex-row justify-between align-center mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
              <CyDView>
                <CyDText className='text-[16px] font-bold'>
                  {t<string>('TELEGRAM_NOTIFICATION')}
                </CyDText>
              </CyDView>
              {telegramSwitchLoading ? (
                <LottieView
                  style={styles.loader}
                  autoPlay
                  loop
                  source={AppImages.LOADER_TRANSPARENT}
                />
              ) : (
                <CyDSwitch
                  onValueChange={() => {
                    void handleToggleNotifications(
                      CARD_NOTIFICATION_TYPES.TELEGRAM,
                    );
                  }}
                  value={currentNotificationOption.telegram}
                />
              )}
            </CyDView>
          )}

          <CyDView className='flex flex-row justify-between align-center mt-[20px] mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
            <CyDView>
              <CyDText className='text-[16px] font-bold'>
                {t<string>('EMAIL_NOTIFICATION')}
              </CyDText>
            </CyDView>
            {emailSwitchLoading ? (
              <LottieView
                style={styles.loader}
                autoPlay
                loop
                source={AppImages.LOADER_TRANSPARENT}
              />
            ) : (
              <CyDSwitch
                onValueChange={() => {
                  void handleToggleNotifications(CARD_NOTIFICATION_TYPES.EMAIL);
                }}
                value={currentNotificationOption.email}
              />
            )}
          </CyDView>
          <CyDView className='flex flex-row justify-between align-center mt-[20px] mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
            <CyDView>
              <CyDText className='text-[16px] font-bold'>
                {t<string>('SMS_NOTIFICATION')}
              </CyDText>
            </CyDView>
            {smsSwitchLoading ? (
              <LottieView
                style={styles.loader}
                autoPlay
                loop
                source={AppImages.LOADER_TRANSPARENT}
              />
            ) : (
              <CyDSwitch
                onValueChange={() => {
                  void handleToggleNotifications(CARD_NOTIFICATION_TYPES.SMS);
                }}
                value={currentNotificationOption.sms}
              />
            )}
          </CyDView>
          <CyDView className='flex flex-row justify-between align-center mt-[20px] mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
            <CyDView>
              <CyDText className='text-[16px] font-bold'>
                {t<string>('FCM_NOTIFICATION')}
              </CyDText>
            </CyDView>
            {fcmSwitchLoading ? (
              <LottieView
                style={styles.loader}
                autoPlay
                loop
                source={AppImages.LOADER_TRANSPARENT}
              />
            ) : (
              <CyDSwitch
                onValueChange={() => {
                  void handleToggleNotifications(CARD_NOTIFICATION_TYPES.FCM);
                }}
                value={currentNotificationOption.fcm}
              />
            )}
          </CyDView>
        </>
      )}
      {isOTPTriggered && (
        <CyDView className={'mx-[25px]'}>
          <CyDText className={'text-[15px] mb-[12px] font-bold'}>
            {t<string>('SET_SMS_NOTIFICATION_TOGGLE_TRUE_OTP')}
          </CyDText>
          <OtpInput
            pinCount={6}
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
              <CyDText>{String(` in ${resendInterval} sec`)}</CyDText>
            )}
          </CyDTouchView>
        </CyDView>
      )}
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: {
    alignSelf: 'center',
    left: 75,
    top: -3,
  },
  lottie: {
    height: 25,
  },
  modalContainer: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
