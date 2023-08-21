import React from 'react';
import { CyDAnimatedView, CyDSafeAreaView } from '../../../styles/tailwindStyles';
import { H_BALANCE_BANNER, OFFSET_TABVIEW } from '../constants';
import { ViewProps } from 'react-native';
import { Extrapolate, SharedValue, interpolate, useAnimatedStyle } from 'react-native-reanimated';

export interface AnimatedBannerProps extends Omit<ViewProps, 'style'> {
  scrollY: SharedValue<number>
}

export const AnimatedBanner = ({ scrollY, children, ...otherProps }: AnimatedBannerProps) => {
  const animatedStyles = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [OFFSET_TABVIEW, OFFSET_TABVIEW + H_BALANCE_BANNER], [0, -H_BALANCE_BANNER], Extrapolate.CLAMP);
    const opacity = interpolate(scrollY.value, [OFFSET_TABVIEW, OFFSET_TABVIEW + 0.6 * H_BALANCE_BANNER], [1, 0], Extrapolate.CLAMP);
    return {
      opacity,
      transform: [{ translateY }]
    };
  });
  return (
    <CyDSafeAreaView className='z-10 mx-[10px]'>
      <CyDAnimatedView
      className={`absolute top-0 h-[${H_BALANCE_BANNER}px] w-full bg-white`}
      style={animatedStyles}
      {...otherProps}
      >
        {children}
      </CyDAnimatedView>
    </CyDSafeAreaView>
  );
};
