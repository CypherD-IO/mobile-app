/**
 * @format
 */
import './shim';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { showNotification } from './src/core/push';

// messaging().onMessage(async remoteMessage => {
//   console.log('onMessage called remoteMessage ::::::::::::: ', remoteMessage);
//   showNotification(remoteMessage.data.notification);
// });

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('setBackgroundMessageHandler called remoteMessage ::::::::::::: ', remoteMessage);
  // const parsedNotification = JSON.parse(remoteMessage.data);
  //   console.log('parsedNotification ::::::::::::: ', parsedNotification);
  showNotification(remoteMessage.data.notification);
});

AppRegistry.registerComponent(appName, () => App);
