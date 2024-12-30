import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  Switch,
  TextInput,
  Image,
  TouchableWithoutFeedback,
  TouchableHighlight,
  KeyboardAvoidingView,
  InputAccessoryView,
  TextProps,
  TextInputProps,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { Dropdown } from 'react-native-element-dropdown';
import Animated from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { cssInterop } from 'nativewind';
import { Swipeable } from 'react-native-gesture-handler';

export const CyDText = (props: TextProps) => {
  return (
    <Text
      {...props}
      className={`text-base400 font-manrope ${props?.className ?? ''}`}
    />
  );
};
export const CyDTextInput = (props: TextInputProps) => {
  return (
    <TextInput
      {...props}
      className={`text-base400 font-manrope ${props?.className ?? ''}`}
    />
  );
};
export const CyDView = View;
export const CyDTouchView = TouchableOpacity;
export const CyDFlatList = cssInterop(FlatList, {
  className: 'style',
});
export const CyDSafeAreaView = SafeAreaView;
export const CyDImage = Image;
export const CyDImageBackground = cssInterop(ImageBackground, {
  className: 'style',
});
export const CyDModal = Modal;
export const CyDRefreshControl = RefreshControl;
export const CyDScrollView = ScrollView;
export const CyDSwitch = Switch;
export const CyDTouchableWithoutFeedback = TouchableWithoutFeedback;
export const CyDTouchableHighlight = TouchableHighlight;
export const CyDKeyboardAvoidingView = cssInterop(KeyboardAvoidingView, {
  className: 'style',
});
export const CyDDropDown = cssInterop(Dropdown, { className: 'style' });
export const CyDAnimatedView = cssInterop(Animated.View, {
  className: 'style',
});
export const CyDKeyboardAwareScrollView = cssInterop(KeyboardAwareScrollView, {
  className: 'style',
});
export const CyDInputAccessoryView = cssInterop(InputAccessoryView, {
  className: 'style',
});
export const CyDFastImage = cssInterop(FastImage, { className: 'style' });
export const CyDSwipeable = cssInterop(Swipeable, {
  className: 'containerStyle',
});
