import { ToastAndroid } from 'react-native';

/**
 * Platform-specific toast helper (Android).
 *
 * We keep this in a `.android.ts` file so:
 * - Android-only APIs stay out of cross-platform modules
 * - ESLint rules about platform-specific imports are satisfied
 */
export const showExitToast = (): void => {
  ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
};

