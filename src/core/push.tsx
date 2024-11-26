import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
} from '@notifee/react-native';
import firebase from '@react-native-firebase/app';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../global';
import axios from './Http';
import { isAddressSet } from './util';

export const getToken = async (
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

export const showNotification = async (
  notification: FirebaseMessagingTypes.Notification | undefined,
  data?: any,
) => {
  console.log('🚀 ~ data:', data);
  const channelId = await createNotificationChannel();
  if (notification?.body) {
    await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
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
          // foreground: true,
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
          // Handle enable international action
          // Make API calls or perform background tasks
          console.log('🚀 ~ notifee.onForegroundEvent ~ CARD_TXN_DECLINE:');
          break;
        case 'zero_restriction':
          // Handle zero restriction action
          break;
      }
    }
  });
}

async function initializeBackgroundEvent() {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('🚀 ~ notifee.onBackgroundEvent ~ detail:', detail);
    if (type === EventType.ACTION_PRESS) {
      const { notification, pressAction } = detail;
      // console.log('🚀 ~ notifee.onBackgroundEvent ~ detail:', detail);

      switch (pressAction?.id) {
        case 'add-country':
          // Handle enable international action
          // Make API calls or perform background tasks
          console.log('🚀 ~ notifee.onBackgroundEvent ~ CARD_TXN_DECLINE:');
          break;
        case 'zero_restriction':
          // Handle zero restriction action
          break;
      }

      // Optionally cancel the notification after handling
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
    }
  });
}

export const setBackgroundMessageHandler = () => {
  firebase.messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background message handler:', remoteMessage);
    await showNotification(remoteMessage.notification, remoteMessage.data);
    return await Promise.resolve();
  });
};

export async function requestUserPermission() {
  const authStatus = await firebase.messaging().requestPermission();
  const enabled =
    authStatus === firebase.messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === firebase.messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    await notifee.requestPermission();
    await initializeBackgroundEvent();
    await initializeForegroundEvent();
    await setCategories();
    setBackgroundMessageHandler();
  }
}
