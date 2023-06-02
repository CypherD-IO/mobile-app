import firebase from '@react-native-firebase/app';
import axios from './Http';
import * as Sentry from '@sentry/react-native';
import PushNotification from 'react-native-push-notification';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { hostWorker } from '../global';
import { isAddressSet } from './util';

export const getToken = (
  walletAddress: string,
  cosmosAddress: string,
  osmosisAddress: string,
  junoAddress: string,
  stargazeAddress: string
) => {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  firebase
    .messaging()
    .getToken()
    .then((fcmToken) => {
      if (isAddressSet(walletAddress)) {
        const registerURL = `${ARCH_HOST}/v1/configuration/device/register`;
        const payload = {
          address: walletAddress,
          cosmosAddress,
          osmosisAddress,
          junoAddress,
          stargazeAddress,
          fcmToken
        };
        axios.put(registerURL, payload)
          .catch(error => {
            Sentry.captureException(error);
          });
      }
    })
    .catch(e => {
      Sentry.captureException(e);
    });
};

export const registerForRemoteMessages = () => {
  firebase
    .messaging()
    .registerDeviceForRemoteMessages()
    .then(() => {
      requestPermissions();
    })
    .catch(e => {
      Sentry.captureException(e);
    });
};

export const requestPermissions = () => {
  firebase
    .messaging()
    .requestPermission()
    .then((status) => {
      if (status === 1) {
        onMessage();
      }
    })
    .catch(e => {
      Sentry.captureException(e);
    });
};

export const showNotification = (notification: FirebaseMessagingTypes.Notification | undefined) => {
  if (notification?.body) {
    PushNotification.localNotification({
      title: notification.title,
      message: notification.body
    });
  }
};

export const onMessage = () => {
  firebase.messaging().onMessage((response) => {
    showNotification(response.notification);
  });
};
