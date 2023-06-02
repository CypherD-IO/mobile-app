import Toast from 'react-native-toast-message';

export const showToast = (message: string) => {
  Toast.show({
    type: 'simpleToast',
    props: { text: message, image: false }
  });
};
