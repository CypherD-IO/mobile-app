import { Extrapolation, SharedValue, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { CyDAnimatedView, CyDText } from "../../../../styles/tailwindStyles";
import React, { memo } from "react";

interface CardCarouselItemProps {
    item: any
    index: number
    boxWidth: number
    halfBoxDistance: number
    panX: SharedValue<number>
}
const CardCarouselItem = ({ item, index, boxWidth, halfBoxDistance, panX }: CardCarouselItemProps) => {
    const animatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            panX.value,
            [
                (index - 1) * boxWidth - halfBoxDistance,
                index * boxWidth - halfBoxDistance,
                (index + 1) * boxWidth - halfBoxDistance, // adjust positioning
            ],
            [0.85, 1, 0.85], // scale down when out of scope
            Extrapolation.CLAMP,
        );
        return {
            transform: [{ scale }]
        };
    });
    return (
        <CyDAnimatedView className={'flex justify-center bg-privacyMessageBackgroundColor items-center border border-sepratorColor rounded-[8px]'}
            style={[animatedStyle, { width: boxWidth }]}>
            <CyDText>{item}</CyDText>
        </CyDAnimatedView>
    );
};

export default memo(CardCarouselItem);