import React, { memo, useCallback, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, ViewToken } from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

/* 
It is looks nice to have some sort of scaling animation in the carousel items, like such:

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

*/
interface CardCarouselProps {
    cardsData: any[]
    boxWidthMultiplier?: number // multiplier to scale the width of the box
    moreThanOneCardOffset?: number // value to offset the card from the center position when there's more than one card.
    renderItem: ({ item, index, boxWidth, halfBoxDistance, panX }: { item: any, index: number, boxWidth: number, halfBoxDistance: number, panX: SharedValue<number> }) => JSX.Element;
    onCardChange?: (index: number) => void
}

const CardCarousel = ({ cardsData, boxWidthMultiplier = 0.85, moreThanOneCardOffset = 1, renderItem, onCardChange }: CardCarouselProps) => {
    const [scrollViewWidth, setScrollViewWidth] = useState(0);
    const boxWidth = scrollViewWidth * boxWidthMultiplier;
    const boxOffset = cardsData.length === 1 ? 1 : moreThanOneCardOffset;
    const boxDistance = scrollViewWidth / boxOffset - boxWidth;
    const halfBoxDistance = boxDistance / 2;
    const panX = useSharedValue(0);

    const handleViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[], changed: ViewToken[] }) => {
        if (onCardChange && viewableItems.length === 1 && viewableItems[0].index !== null) {
            onCardChange(viewableItems[0].index);
        }
    });

    const modifiedRenderItem = useCallback(({ item, index }) => {
        return renderItem({ item, index, boxWidth, halfBoxDistance, panX });
    }, [renderItem, boxWidth, halfBoxDistance, panX]);

    return (
        <FlatList
            horizontal
            data={cardsData}
            onViewableItemsChanged={handleViewableItemsChanged.current}
            viewabilityConfig={{
                itemVisiblePercentThreshold: 100 // Item is considered visible if 100% of it is visible
            }}
            contentContainerStyle={[styles.contentContainerStyle, Platform.select({ android: { paddingHorizontal: halfBoxDistance } })]}
            contentInsetAdjustmentBehavior='never'
            snapToAlignment='center'
            decelerationRate='fast'
            automaticallyAdjustContentInsets={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={1}
            snapToInterval={boxWidth}
            contentInset={Platform.select({
                ios: {
                    left: halfBoxDistance,
                    right: halfBoxDistance,
                }
            })}
            contentOffset={{ x: halfBoxDistance * -1, y: 0 }}
            onLayout={(e) => {
                setScrollViewWidth(e.nativeEvent.layout.width);
            }}
            onScroll={(e) => {
                panX.value = e.nativeEvent.contentOffset.x;
            }}
            keyExtractor={(_, index) => index.toString()}
            renderItem={modifiedRenderItem}
        />
    );
};

export default memo(CardCarousel);

const styles = StyleSheet.create({
    contentContainerStyle: {
        paddingVertical: 4
    },
});
