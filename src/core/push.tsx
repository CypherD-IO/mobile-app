import firebase from '@react-native-firebase/app';
import axios from './Http';
import * as Sentry from '@sentry/react-native';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { hostWorker } from '../global';
import { isAddressSet } from './util';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';

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
        console.log('fcmToken : ', fcmToken);
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

export const showNotification = async (
  notification: FirebaseMessagingTypes.Notification | undefined,
) => {
  const channelId = await createNotificationChannel();
  if (notification?.body) {
    await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      android: {
        channelId,
      },
    });
  }
};

export async function requestUserPermission() {
  await notifee.requestPermission();
}
