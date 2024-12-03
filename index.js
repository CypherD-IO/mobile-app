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


messaging().setBackgroundMessageHandler(async remoteMessage => {
  await showNotification(remoteMessage.notification, remoteMessage.data);
  return Promise.resolve();
});



AppRegistry.registerComponent(appName, () => App);
