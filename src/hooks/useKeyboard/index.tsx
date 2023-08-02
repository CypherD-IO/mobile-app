import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, StatusBar } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { isAndroid } from '../../misc/checkers';

export const useKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', onKeyboardDidShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', onKeyboardDidHide);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const onKeyboardDidShow = (e: KeyboardEvent) => {
    setKeyboardHeight(e.endCoordinates.screenY - StatusBar?.currentHeight - headerHeight - 8);
  };

  const onKeyboardDidHide = () => {
    setKeyboardHeight(0);
  };

  return { keyboardHeight };
};
