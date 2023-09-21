import React from 'react';
import {
  Extrapolate,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CyDAnimatedView } from '../../../styles/tailwindStyles';
import { isIOS } from '../../../misc/checkers';

export interface AnimatedTabBarProps {
  scrollY: SharedValue<number>;
  bannerHeight: 160 | 260;
  children: JSX.Element;
}

export const AnimatedTabBar = ({
  scrollY,
  children,
  bannerHeight,
  ...otherProps
}: AnimatedTabBarProps) => {
  const OFFSET_TABVIEW = isIOS() ? -bannerHeight : 0;
  const animatedTranslateY = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW, OFFSET_TABVIEW + bannerHeight],
      [bannerHeight, 0],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateY }],
    };
  });
  return (
    <CyDAnimatedView
      className={'z-10 w-full'}
      style={animatedTranslateY}
      {...otherProps}
    >
      {children}
    </CyDAnimatedView >
  );
};
