import { Extrapolation, SharedValue, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { CyDAnimatedView } from "../../../../styles/tailwindStyles";
import React, { ReactNode, memo } from "react";

interface CardCarouselItemProps {
    index: number
    boxWidth: number
    halfBoxDistance: number
    panX: SharedValue<number>
    children: ReactNode
}
const CardCarouselItem = ({ index, boxWidth, halfBoxDistance, panX, children }: CardCarouselItemProps) => {
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
        <CyDAnimatedView className={'flex justify-center items-center'}
            style={[animatedStyle, { width: boxWidth }]}>
            {children}
        </CyDAnimatedView>
    );
};

export default memo(CardCarouselItem);