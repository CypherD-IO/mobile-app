import React from 'react';
import {
    Extrapolate,
    SharedValue,
    interpolate,
    useAnimatedStyle,
} from 'react-native-reanimated';
import { CyDAnimatedView } from '../../../styles/tailwindStyles';
import { isIOS } from '../../../misc/checkers';
import { CardSectionHeights } from '.';

export interface AnimatedToolBarProps {
    scrollY: SharedValue<number>;
    children: JSX.Element;
    cardSectionHeight: CardSectionHeights
}

export const AnimatedToolBar = ({
    scrollY,
    children,
    cardSectionHeight,
    ...otherProps
}: AnimatedToolBarProps) => {
    const OFFSET_CARD_SECTION = isIOS() ? -cardSectionHeight : 0;
    const animatedTranslateY = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [OFFSET_CARD_SECTION, OFFSET_CARD_SECTION + cardSectionHeight],
            [cardSectionHeight, 0],
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
