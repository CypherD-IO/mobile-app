import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
} from '@notifee/react-native';
import firebase from '@react-native-firebase/app';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../global';
import axios from '../../core/Http';
import { isAddressSet } from '../../core/util';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { screenTitle } from '../../constants';
import { CardControlTypes, GlobalModalType } from '../../constants/enum';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';

export default function usePushNotification() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { showModal, hideModal } = useGlobalModalContext();

  const getToken = async (
    walletAddress: string,
    cosmosAddress?: string,
    osmosisAddress?: string,
    junoAddress?: string,
    stargazeAddress?: string,
    nobleAddress?: string,
    coreumAddress?: string,
    kujiraAddress?: string,
  ) => {
    return await new Promise((resolve, reject) => {
      const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
      firebase
        .messaging()
        .getToken()
        .then(fcmToken => {
          console.log('🚀 ~ returnawaitnewPromise ~ fcmToken:', fcmToken);

          if (isAddressSet(walletAddress)) {
            const registerURL = `${ARCH_HOST}/v1/configuration/device/register`;
            const payload = {
              address: walletAddress,
              cosmosAddress,
              osmosisAddress,
              junoAddress,
              stargazeAddress,
              nobleAddress,
              coreumAddress,
              kujiraAddress,
              fcmToken,
            };
            axios
              .put(registerURL, payload)
              .then(resp => {
                resolve({ fcmToken });
              })
              .catch(error => {
                Sentry.captureException(error);
                resolve({ error });
              });
          }
        })
        .catch(e => {
          Sentry.captureException(e);
          resolve({ error: e });
        });
    });
  };

  async function createNotificationChannel() {
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
    return channelId;
  }

  const getAndroidActions = (categoryId?: string) => {
    switch (categoryId) {
      case 'CARD_TXN_DECLINE':
        return [
          {
            title: 'Add Country',
            pressAction: {
              id: 'add-country',
            },
          },
        ];
    }
  };

  const showNotification = async (
    notification: FirebaseMessagingTypes.Notification | undefined,
    data?: any,
  ) => {
    const channelId = await createNotificationChannel();
    if (notification?.body) {
      await notifee.displayNotification({
        title: notification.title,
        body: notification.body,
        data,
        android: {
          channelId,
          actions: getAndroidActions(data?.categoryId),
          style: {
            type: AndroidStyle.BIGTEXT,
            text: notification.body,
          },
        },
        ios: {
          categoryId: 'CARD_TXN_DECLINE',
        },
      });
    }
  };

  async function setCategories() {
    await notifee.setNotificationCategories([
      {
        id: 'CARD_TXN_DECLINE',
        actions: [
          {
            id: 'add-country',
            title: 'Add Country',
            foreground: true,
            // authenticationRequired: false,
          },
        ],
      },
    ]);
  }

  async function initializeForegroundEvent() {
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        const { notification, pressAction } = detail;

        switch (pressAction?.id) {
          case 'add-country':
            showModal(GlobalModalType.ADD_COUNTRY_FROM_NOTIFICATION, {
              closeModal: () => {
                hideModal();
              },
              data: {
                ...notification?.data,
              },
            });
            // navigation.navigate(screenTitle.INTERNATIONAL_CARD_CONTROLS, {
            //   cardId: notification?.data?.cardId,
            //   currentCardProvider: notification?.data?.provider,
            //   cardControlType: CardControlTypes.INTERNATIONAL,
            //   reason: notification?.data?.reason,
            //   merchantCountry: notification?.data?.merchantCountry,
            // });
            break;
        }
      }
    });
  }

  async function requestUserPermission() {
    const authStatus = await firebase.messaging().requestPermission();
    const enabled =
      authStatus === firebase.messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === firebase.messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await notifee.requestPermission();
      await initializeForegroundEvent();
      await setCategories();
    }
  }

  return {
    getToken,
    showNotification,
    requestUserPermission,
  };
}
