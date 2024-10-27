import firebase from '@react-native-firebase/app';
import axios from './Http';
import * as Sentry from '@sentry/react-native';
import PushNotification from 'react-native-push-notification';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { hostWorker } from '../global';
import { isAddressSet } from './util';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

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
        console.log('fcmToken .........', fcmToken);
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
    .then(status => {
      if (status === 1) {
        onMessage();
      }
    })
    .catch(e => {
      Sentry.captureException(e);
    });
};

export const setCategories = async () => {
  await notifee.setNotificationCategories([
    {
      id: 'notification',
      actions: [
        {
          id: 'approve',
          title: 'Approve Transaction',
        },
        {
          id: 'reject',
          title: 'Reject Transaction',
        },
      ],
    },
  ]);
};

export const showNotification = async (
  notification?: FirebaseMessagingTypes.Notification | undefined,
) => {
  console.log('showNotification :::::::::: ', notification);
  await notifee.requestPermission();
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  // if (notification?.body) {
    // let body = notification.body;
    // try {
    //   const bodyData = JSON.parse(body);
    //   body = bodyData.msg;
    // } catch (e) {
    //   console.log('Error parsing notification body:', e);
    // }
    try {
      await notifee.displayNotification({
        // title: notification.title,
        // body: body,
        title: 'hi',
        body: 'hello',
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
        },
        ios: {
          categoryId: 'notification',
        },
      });
      console.log('Notification displayed successfully');
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  // }
};

// export const onMessage = () => {
//   firebase.messaging().onMessage(response => {
//     console.log('from onMessage :::::::::: ', response);
//     void showNotification(response.notification);
//   });
// };

export const requestUserPermission = async () => {
  // console.log('requestUserPermission :::::::::: ');
  // const authStatus = await firebase.messaging().requestPermission();
  // console.log('authStatus :::::::::: ', authStatus);
  // const enabled =
  //   authStatus === firebase.messaging.AuthorizationStatus.AUTHORIZED ||
  //   authStatus === firebase.messaging.AuthorizationStatus.PROVISIONAL;
  // console.log('enabled :::::::::: ', enabled);
  // if (enabled) {
  //   console.log('Authorization status:', authStatus);
  // }
    const settings = await notifee.requestPermission();
};
