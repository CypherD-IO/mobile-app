/**
 * @format
 */
import './shim';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { showNotification } from './src/core/push';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  showNotification(remoteMessage.data.notification);
});

AppRegistry.registerComponent(appName, () => App);
