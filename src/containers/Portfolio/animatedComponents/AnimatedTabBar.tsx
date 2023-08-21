import React from 'react';
import { Extrapolate, SharedValue, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { CyDAnimatedView } from '../../../styles/tailwindStyles';
import { OFFSET_TABVIEW, H_BALANCE_BANNER, H_TAB_BAR } from '../constants';
import { ViewProps } from 'react-native';

export interface AnimatedTabBarProps extends Omit<ViewProps, 'style'> {
  scrollY: SharedValue<number>
}

export const AnimatedTabBar = ({ scrollY, children, ...otherProps }: AnimatedTabBarProps) => {
  const animatedTranslateY = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW, OFFSET_TABVIEW + H_BALANCE_BANNER],
      [H_BALANCE_BANNER, 0],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateY }]
    };
  });
  const animatedOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW + H_BALANCE_BANNER, OFFSET_TABVIEW + H_BALANCE_BANNER + H_TAB_BAR],
      [0, 1],
      Extrapolate.CLAMP
    );
    return {
      opacity
    };
  });
  return (
    <CyDAnimatedView
      className={'z-10 w-full'}
      style={animatedTranslateY}
      {...otherProps}
    >
        {children}
      <CyDAnimatedView
        className={'bg-sepratorColor mx-[10px] h-[1px]'}
        style={animatedOpacity}
      />
    </CyDAnimatedView>
  );
};
