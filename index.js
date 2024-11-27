/**
 * @format
 */
import 'whatwg-fetch';
import './shim';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { showNotification } from './src/hooks/usePushNotification';
import notifee, { EventType } from '@notifee/react-native';


notifee.onBackgroundEvent(async remoteMessage => {
  console.log('🚀 ~ notifee.onBackgroundEventr:', remoteMessage);

  const { type, detail } = remoteMessage;
  console.log("🚀 ~ type:", type);
  if (type === EventType.DELIVERED) {
    const { notification } = detail;
    console.log("🚀 ~ notification ~ data:", notification.data);

    if (notification?.id) {
      await notifee.cancelNotification(notification?.id);
    }

    // switch (notification?.data?.action ) {
    //   case 'add-country':
    //     console.log(
    //       '🚀 ~ notifee.onBackgroundEvent ~ notification: add-country',
    //     );
    //     // showModal(GlobalModalType.ADD_COUNTRY_FROM_NOTIFICATION, {
    //     //   closeModal: () => {
    //     //     hideModal();
    //     //   },
    //     //   data: {
    //     //     ...notification?.data,
    //     //   },
    //     // });
    //     
    //     break;
    // }
  }
});

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log("🚀 ~ setBackgroundMessageHandler ~ remoteMessage:", remoteMessage);
  await showNotification(remoteMessage.notification, remoteMessage.data);
  return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);
