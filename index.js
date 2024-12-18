/**
 * @format
 */
import 'whatwg-fetch';
import './shim';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { showNotification } from './src/notification/pushNotification';
import Sentry from '@sentry/react-native';
import notifee, { EventType } from '@notifee/react-native';

// Add background handler for notifee
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log("🚀 ~ notifee.onBackgroundEvent ~ detail:", detail);
  console.log("🚀 ~ notifee.onBackgroundEvent ~ type:", type);
  try {
    if (type === EventType.PRESS) {
      // Handle notification press
      const { notification } = detail;
      
      // You can store the notification data to handle it when app opens
      await notifee.setNotificationCategories([
        {
          id: notification?.data?.categoryId,
          actions: notification?.data?.actions || [],
        },
      ]);
    }
  } catch (e) {
    console.log('🚀 ~ notifee.onBackgroundEvent ~ e:', e);
    Sentry.captureException(e);
  }
});

// Your existing firebase background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    await showNotification(remoteMessage.notification, remoteMessage.data);
  } catch (e) {
    Sentry.captureException(e);
  }
  return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);
