/**
 * @format
 */
import 'whatwg-fetch';
import './shim';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import SplashScreen from 'react-native-lottie-splash-screen';
import App from './App';
import { name as appName } from './app.json';
import { showNotification } from './src/notification/pushNotification';
import Sentry from '@sentry/react-native';

/**
 * Ultra-early splash hide failsafe (RN 0.83+)
 *
 * If app initialization blocks or a provider never mounts, the native splash can remain
 * indefinitely. This guarantees we attempt to dismiss the splash as soon as the JS bundle
 * is executing, independent of React rendering.
 */
setTimeout(() => {
  try {
    // eslint-disable-next-line no-console
    console.log('[index.js] Forcing splash hide (failsafe)');
    SplashScreen.hide();
  } catch (e) {
    Sentry.captureException({
      reason: '[index.js] SplashScreen.hide() failed',
      e,
    });
  }
}, 1500);

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    await showNotification(remoteMessage.notification, remoteMessage.data);
  } catch (e) {
    Sentry.captureException(e);
  }
return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);
