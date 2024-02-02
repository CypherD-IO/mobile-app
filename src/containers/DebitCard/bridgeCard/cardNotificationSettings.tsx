import React, { useContext, useEffect, useState } from 'react';
import {
  CARD_ALERT_TYPES,
  CARD_NOTIFICATION_TYPES,
  CardProviders,
  GlobalContextType,
} from '../../../constants/enum';
import { GlobalContext } from '../../../core/globalContext';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import useAxios from '../../../core/HttpRequest';
import { CardProfile } from '../../../models/cardProfile.model';
import { get } from 'lodash';
import { CyDSwitch, CyDText, CyDView } from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import AppImages from '../../../../assets/images/appImages';
import { StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { getWalletProfile } from '../../../core/card';

export default function CardNotificationSettings(props: {
  route: {
    params: {
      currentCardProvider: CardProviders;
      card: { cardId: string; status: string; type: string };
    };
  };
}) {
  const { route } = props;
  const { card, currentCardProvider } = route.params;
  const { cardId, status } = card;
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { showModal, hideModal } = useGlobalModalContext();
  const { patchWithAuth } = useAxios();
  const [emailSwitchLoading, setEmailSwitchLoading] = useState(false);
  const [smsSwitchLoading, setSmsSwitchLoading] = useState(false);
  const [fcmSwitchLoading, setFcmSwitchLoading] = useState(false);
  const [currentNotificationOption, setCurrentNotificationOption] = useState({
    email: get(cardProfile, ['cardNotification', 'isEmailAllowed'], true),
    sms: get(cardProfile, ['cardNotification', 'isSmsAllowed'], true),
    fcm: get(cardProfile, ['cardNotification', 'isFcmAllowed'], true),
  });

  useEffect(() => {
    setCurrentNotificationOption({
      email: get(cardProfile, ['cardNotification', 'isEmailAllowed'], true),
      sms: get(cardProfile, ['cardNotification', 'isSmsAllowed'], true),
      fcm: get(cardProfile, ['cardNotification', 'isFcmAllowed'], true),
    });
  }, [globalContext]);

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
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

  const toggleSmsNotifiction = async () => {
    setSmsSwitchLoading(true);
    const response = await patchWithAuth(`/v1/cards/unsubscribe-alerts`, {
      type: CARD_ALERT_TYPES.CARD_TRANSACTION_SMS,
      toggleValue: !currentNotificationOption.sms,
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
          void toggleSmsNotifiction();
          break;
        case CARD_NOTIFICATION_TYPES.FCM:
          void toggleFcmNotifiction();
          break;
      }
    }
  };

  return (
    <CyDView className='h-full bg-white pt-[30px]'>
      <CyDView className='flex flex-row justify-between align-center mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
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
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: {
    alignSelf: 'center',
    left: 75,
    top: -3,
  },
});
