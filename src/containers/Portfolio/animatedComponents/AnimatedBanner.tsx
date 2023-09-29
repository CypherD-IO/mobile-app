import React, { ReactNode } from 'react';
import { CyDAnimatedView } from '../../../styles/tailwindStyles';
import { H_TAB_BAR } from '../constants';
import {
  Extrapolate,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS } from '../../../misc/checkers';
export interface AnimatedBannerProps {
  scrollY: SharedValue<number>;
  bannerHeight: 160 | 300,
  children: ReactNode;
}

export const AnimatedBanner = ({
  scrollY,
  bannerHeight,
  children,
  ...otherProps
}: AnimatedBannerProps) => {
  const OFFSET_TABVIEW = isIOS() ? -bannerHeight : 0;
  const topInset = useSafeAreaInsets().top + H_TAB_BAR + (isIOS() ? 0 : 8);
  const animatedStyles = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW, OFFSET_TABVIEW + bannerHeight],
      [0, -bannerHeight],
      Extrapolate.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [OFFSET_TABVIEW, OFFSET_TABVIEW + 0.6 * bannerHeight],
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
      className={`absolute z-10 w-full`}
      style={[animatedStyles, { height: bannerHeight, top: topInset }]}
      {...otherProps}
    >
      {children}
    </CyDAnimatedView>
  );
};
