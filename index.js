/**
 * @format
 */
import './shim';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import showNotification from './src/core/push';
import notifee, { EventType } from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  showNotification(remoteMessage.data.notification);
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.log('🚀 ~ notifee.onBackgroundEvent ~ detail:', detail);
  if (type === EventType.ACTION_PRESS && pressAction.id) {
    console.log('User pressed an action in the background with ID: ', pressAction.id);
    // Perform the appropriate action based on the action ID
    if (pressAction.id === 'approve') {
      // Handle Action 1
    } else if (pressAction.id === 'reject') {
      // Handle Action 2
    }
  } else if (type === EventType.ACTION_PRESS) {
    console.log('Notification was pressed by the user');
  }
});

AppRegistry.registerComponent(appName, () => App);
