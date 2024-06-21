import Toast from 'react-native-toast-message';

export const showToast = (message: string, type = 'success') => {
  Toast.show({
    type,
    text1: message,
  });
};
