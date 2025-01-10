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
  ImageProps,
  ImageBackgroundProps,
} from 'react-native';
import FastImage, { FastImageProps } from 'react-native-fast-image';
import { Dropdown } from 'react-native-element-dropdown';
import Animated from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { cssInterop } from 'nativewind';
import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { IconNames, CydIconsPack } from '../customFonts';
import { Theme, useTheme } from '../reducers/themeReducer';
import { get } from 'lodash';
import AppImages, { AppImagesMap } from '../../assets/images/appImages';
import LottieView, { AnimatedLottieViewProps } from 'lottie-react-native';

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
        contextMenuHidden={false}
        className={`text-base400 bg-n0 font-manrope ${props?.className ?? ''}`}
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

const _CyDImage = cssInterop(Image, {
  className: 'style',
});

export const _CyDFastImage = cssInterop(FastImage, { className: 'style' });

export const _CyDImageBackground = cssInterop(ImageBackground, {
  className: 'style',
});

const getImageSource = (
  source: AppImages | { uri: string } | number | undefined,
  theme: Theme,
) => {
  return source && typeof source === 'object' && 'uri' in source
    ? source
    : get(AppImagesMap, ['common', source ?? ''], '') ||
        get(AppImagesMap, [theme, source ?? ''], '');
};

export const CyDFastImage = (
  props: Omit<FastImageProps, 'source'> & {
    source?: AppImages | { uri: string } | number;
  },
) => {
  const { theme } = useTheme();
  return (
    <_CyDFastImage {...props} source={getImageSource(props.source, theme)} />
  );
};

export const CyDImage = (
  props: Omit<ImageProps, 'source'> & {
    source?: AppImages | { uri: string } | number;
  },
) => {
  const { theme } = useTheme();
  return <_CyDImage {...props} source={getImageSource(props.source, theme)} />;
};

export const CyDImageBackground = (
  props: Omit<ImageBackgroundProps, 'source'> & {
    source?: AppImages | { uri: string } | number;
  },
) => {
  const { theme } = useTheme();
  return (
    <_CyDImageBackground
      {...props}
      source={getImageSource(props.source, theme)}
    />
  );
};

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

export const CyDAnimatedView: React.FC<{
  className?: string;
  [key: string]: any;
}> = props => {
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

export const CyDIcons = cssInterop(CydIconsPack, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true,
      fontSize: 'size',
    },
  },
}) as React.ComponentType<{
  name: IconNames;
  size?: number;
  color?: string;
  className?: string;
}>;

export const _CyDLottieView = cssInterop(LottieView, {
  className: 'style',
}) as React.ComponentType<
  React.ComponentProps<typeof LottieView> & {
    className?: string;
  }
>;

export const CyDLottieView = (
  props: Omit<AnimatedLottieViewProps, 'source'> & {
    source?: AppImages | { uri: string } | number;
  },
) => {
  const { theme } = useTheme();
  return (
    <_CyDLottieView {...props} source={getImageSource(props.source, theme)} />
  );
};
