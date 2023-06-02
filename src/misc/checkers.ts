import { Platform } from 'react-native';

export function isAndroid (): boolean {
  return Platform.OS === 'android';
}

export function isIOS (): boolean {
  return Platform.OS === 'ios';
}
