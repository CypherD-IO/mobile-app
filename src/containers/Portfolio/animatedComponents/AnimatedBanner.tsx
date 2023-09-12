import React, { ReactNode } from 'react';
import { CyDAnimatedView } from '../../../styles/tailwindStyles';
import { H_BALANCE_BANNER, H_TAB_BAR, OFFSET_TABVIEW } from '../constants';
import {
  Extrapolate,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export interface AnimatedBannerProps {
  scrollY: SharedValue<number>;
  children: ReactNode;
}

export const AnimatedBanner = ({
  scrollY,
  children,
  ...otherProps
}: AnimatedBannerProps) => {
  const topInset = useSafeAreaInsets().top + H_TAB_BAR;
  const animatedStyles = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW, OFFSET_TABVIEW + H_BALANCE_BANNER],
      [0, -H_BALANCE_BANNER],
      Extrapolate.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW, OFFSET_TABVIEW + 0.6 * H_BALANCE_BANNER],
      [1, 0],
      Extrapolate.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });
  return (
    <CyDAnimatedView
      className={`absolute top-[${topInset}px] h-[${H_BALANCE_BANNER}px] z-10 px-[10px] w-full bg-white`}
      style={animatedStyles}
      {...otherProps}
    >
      {children}
    </CyDAnimatedView>
  );
};
