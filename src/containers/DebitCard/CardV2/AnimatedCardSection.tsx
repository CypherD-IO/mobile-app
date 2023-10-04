import React, { ReactNode, memo } from "react";
import { Extrapolate, SharedValue, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { CyDAnimatedView } from "../../../styles/tailwindStyles";
import { CardSectionHeights } from ".";
import { isIOS } from "../../../misc/checkers";

export interface AnimatedCardSectionProps {
  scrollY: SharedValue<number>;
  children: ReactNode;
  cardSectionHeight: CardSectionHeights
}

const AnimatedCardSection = ({ scrollY, children, cardSectionHeight, ...otherProps }: AnimatedCardSectionProps) => {
  const OFFSET_CARD_SECTION = isIOS() ? -cardSectionHeight : 0;
  const animatedStyles = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [OFFSET_CARD_SECTION, OFFSET_CARD_SECTION + cardSectionHeight],
      [0, -cardSectionHeight],
      Extrapolate.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [OFFSET_CARD_SECTION, OFFSET_CARD_SECTION + 0.6 * cardSectionHeight],
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
      style={[animatedStyles, { height: cardSectionHeight }]}
      {...otherProps}
    >
      {children}
    </CyDAnimatedView>
  );
};
export default memo(AnimatedCardSection);