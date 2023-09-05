import React from 'react';
import {
  Extrapolate,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CyDAnimatedView } from '../../../styles/tailwindStyles';
import { OFFSET_TABVIEW, H_BALANCE_BANNER } from '../constants';

export interface AnimatedTabBarProps {
  scrollY: SharedValue<number>;
  children: JSX.Element;
}

export const AnimatedTabBar = ({
  scrollY,
  children,
  ...otherProps
}: AnimatedTabBarProps) => {
  const animatedTranslateY = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW, OFFSET_TABVIEW + H_BALANCE_BANNER],
      [H_BALANCE_BANNER, 0],
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
