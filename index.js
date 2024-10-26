/**
 * @format
 */
import './shim';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { showNotification } from './src/core/push';
import notifee, { EventType } from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🚀 ~ messaging().setBackgroundMessageHandler ~ remoteMessage:', remoteMessage);
  await showNotification(remoteMessage);
});

// notifee.onForegroundEvent(({ type, detail }) => {
//   switch (type) {
//     case EventType.ACTION_PRESS:
//       console.log('User pressed an action with ID: ', detail.pressAction.id);
//       // Perform the appropriate action based on the action ID
//       if (detail.pressAction.id === 'approve') {
//         // Handle Action 1
//         console.log('Approve action pressed');
//       } else if (detail.pressAction.id === 'reject') {
//         // Handle Action 2
//         console.log('Reject action pressed');
//       }
//       break;
//     case EventType.DISMISSED:
//       console.log('Notification was dismissed by the user');
//       break;
//   }
// });


// notifee.onBackgroundEvent(async ({ type, detail }) => {
//   const { notification, pressAction } = detail;
//   console.log('🚀 ~ notifee.onBackgroundEvent ~ detail:', detail);
//   if (type === EventType.ACTION_PRESS && pressAction?.id) {
//     console.log('User pressed an action in the background with ID: ', pressAction.id);
//     // Perform the appropriate action based on the action ID
//     if (pressAction.id === 'approve') {
//       // Handle Approve action
//       console.log('Approve action pressed');
//     } else if (pressAction.id === 'reject') {
//       // Handle Reject action
//       console.log('Reject action pressed');
//     }
//   } else if (type === EventType.PRESS) {
//     console.log('Notification was pressed by the user');
//   }
// });

AppRegistry.registerComponent(appName, () => App);
