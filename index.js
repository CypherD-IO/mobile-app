/**
 * @format
 */
import 'whatwg-fetch';
import './shim';
import { AppRegistry, LogBox, NativeModules, UIManager } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { CustomerIO } from 'customerio-reactnative';

// E2E Testing: suppress ALL LogBox UI during test runs.
// LogBox banners cover bottom-positioned buttons and block Detox taps.
// ignoreAllLogs() hides notification banners; uninstall() also prevents
// the full-screen error inspector from appearing.
//
// Detection priority:
// 1. react-native-config IS_TESTING — build-time baked, always works
// 2. SettingsManager (iOS UserDefaults) — reads Detox launchArgs at runtime
// 3. NativeModules.DetoxHelper — works in old bridge mode only
import { Config } from 'react-native-config';
const detoxSettings = NativeModules.SettingsManager?.settings ?? {};
const isE2ETesting =
  String(Config.IS_TESTING) === 'true' ||
  detoxSettings.detoxHandleSystemAlerts === 'YES' ||
  detoxSettings.detoxHandleSystemAlerts === true ||
  NativeModules.DetoxHelper != null ||
  NativeModules.DetoxManager != null;
if (isE2ETesting) {
  LogBox.ignoreAllLogs(true);
  LogBox.uninstall();
}
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

// Skip Firebase background handler under E2E tests. The handler itself isn't
// the worst offender, but registering it boots Firebase messaging which adds
// to Detox-sync "busy" signals at app launch.
if (!isE2ETesting) {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    try {
      const handled =
        await CustomerIO.pushMessaging.onBackgroundMessageReceived(remoteMessage);
      if (!handled) {
        await showNotification(remoteMessage.notification, remoteMessage.data);
      }
    } catch (e) {
      Sentry.captureException(e);
    }
    return Promise.resolve();
  });
}

// NOTE: Use `require()` here (instead of static `import App from './App'`) so our
// Bridgeless debug log above runs BEFORE the app module graph is evaluated.
AppRegistry.registerComponent(appName, () => require('./App').default);
