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


messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    await showNotification(remoteMessage.notification, remoteMessage.data);
  } catch (e) {
    Sentry.captureException(e);
  }
  return Promise.resolve();
});



AppRegistry.registerComponent(appName, () => App);
