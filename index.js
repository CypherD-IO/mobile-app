/**
 * @format
 */
import 'whatwg-fetch';
import './shim';
import { AppRegistry, UIManager } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { name as appName } from './app.json';
import { showNotification } from './src/notification/pushNotification';
import Sentry from '@sentry/react-native';

/**
 * RN 0.83 Bridgeless debugging (temporary, safe to keep in DEV only):
 *
 * We are currently investigating a crash where `react-native-safe-area-context`
 * fails with:
 *   "Could not find component config for native component"
 *
 * In RN 0.83, iOS can run in Bridgeless mode (`global.RN$Bridgeless === true`),
 * and `UIManager.getViewManagerConfig(...)` depends on the "native ViewConfig interop"
 * binding being installed (it exposes `global.RN$LegacyInterop_UIManager_getConstants`).
 *
 * This log helps us confirm whether that binding is present at runtime.
 * If it is missing, any library that calls `codegenNativeComponent(..., { interfaceOnly: true })`
 * will fail to resolve its native view config.
 */
if (__DEV__) {
  try {
    // eslint-disable-next-line no-console
    console.log('[RN83][Bridgeless]', {
      RN$Bridgeless: global.RN$Bridgeless === true,
      hasLegacyInteropUIManagerGetConstants:
        typeof global.RN$LegacyInterop_UIManager_getConstants === 'function',
      hasLegacyInteropUIManagerGetConstantsForViewManager:
        typeof global.RN$LegacyInterop_UIManager_getConstantsForViewManager === 'function',
      hasViewManagerConfig_RNCSafeAreaView: UIManager.hasViewManagerConfig('RNCSafeAreaView'),
      viewManagerConfig_RNCSafeAreaView: UIManager.getViewManagerConfig('RNCSafeAreaView'),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[RN83][Bridgeless] debug log failed', e);
  }
}

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    await showNotification(remoteMessage.notification, remoteMessage.data);
  } catch (e) {
    Sentry.captureException(e);
  }
return Promise.resolve();
});

// NOTE: Use `require()` here (instead of static `import App from './App'`) so our
// Bridgeless debug log above runs BEFORE the app module graph is evaluated.
AppRegistry.registerComponent(appName, () => require('./App').default);
