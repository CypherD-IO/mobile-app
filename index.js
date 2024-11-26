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

// Add background event handler for notifee
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const { pressAction } = detail;

    switch (pressAction?.id) {
      case 'add-country':
        // Handle add-country action
        console.log('Background: Add country action pressed');
        // Add your logic here
        break;
      // Add other cases as needed
    }
  }
});

// Existing firebase background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log("🚀 ~ messaging ~ remoteMessage:", remoteMessage);
  await showNotification(remoteMessage.notification, remoteMessage.data);
  return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);
