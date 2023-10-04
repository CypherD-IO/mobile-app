import React, { ReactNode, memo } from "react";
import { Extrapolate, SharedValue, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { CyDAnimatedView } from "../../../styles/tailwindStyles";
import { H_CARD_SECTION, OFFSET_CARD_SECTION } from "./constants";

export interface AnimatedCardSectionProps {
  scrollY: SharedValue<number>;
  children: ReactNode;
}

const AnimatedCardSection = ({ scrollY, children, ...otherProps }: AnimatedCardSectionProps) => {
  const animatedStyles = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [OFFSET_CARD_SECTION, OFFSET_CARD_SECTION + H_CARD_SECTION],
      [0, -H_CARD_SECTION],
      Extrapolate.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [OFFSET_CARD_SECTION, OFFSET_CARD_SECTION + 0.6 * H_CARD_SECTION],
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
      style={[animatedStyles, { height: H_CARD_SECTION }]}
      {...otherProps}
    >
      {children}
    </CyDAnimatedView>
  );
};
export default memo(AnimatedCardSection);