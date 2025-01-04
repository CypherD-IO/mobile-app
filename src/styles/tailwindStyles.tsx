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
import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import CydIconsPack from '../customFonts/generator';

export const CyDText = (props: TextProps) => {
  return (
    <Text
      {...props}
      className={`text-base400 font-manrope ${props?.className ?? ''}`}
    />
  );
};
export const CyDTextInput = React.forwardRef<TextInput, TextInputProps>(
  (props, ref) => {
    return (
      <TextInput
        {...props}
        ref={ref}
        className={`text-base400 font-manrope ${props?.className ?? ''}`}
      />
    );
  },
);
CyDTextInput.displayName = 'CyDTextInput';
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
export const CyDAnimatedView = (props: any) => {
  return <Animated.View {...props} className={`${props?.className ?? ''}`} />;
};
export const CyDGestureHandlerRootView = cssInterop(GestureHandlerRootView, {
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
export const CydMaterialDesignIcons = cssInterop(MaterialDesignIcons, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
      fontSize: 'size',
    },
  },
});

export const CydIcons = cssInterop(CydIconsPack, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
      fontSize: 'size',
    },
  },
});
