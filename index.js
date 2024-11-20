/**
 * @format
 */
import './shim';
import { AppRegistry, LogBox } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { showNotification } from './src/core/push';

// Add global error handler
const errorHandler = (error, isFatal) => {
  console.error('Global error:', error);
  console.log('Is fatal:', isFatal);
};

ErrorUtils.setGlobalHandler(errorHandler);

// Enable more detailed console logging
LogBox.ignoreLogs(['Warning:']); // Ignore specific warnings
console.reportErrorsAsExceptions = false; // Prevent console.error from triggering red box

messaging().setBackgroundMessageHandler(async remoteMessage => {
  showNotification(remoteMessage.data.notification);
});

AppRegistry.registerComponent(appName, () => App);
