import React, { ReactNode, memo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import CarouselItem from './CarouselItem';

interface CardCarouselItemProps {
    cards: ReactNode[]
}

const CardCarousel = ({ cards }: CardCarouselItemProps) => {
    const [scrollViewWidth, setScrollViewWidth] = useState(0);
    const boxWidth = scrollViewWidth * 0.85;
    const boxDistance = scrollViewWidth / 1.15 - boxWidth;
    const halfBoxDistance = boxDistance / 2;
    const panX = useSharedValue(0);

    const renderItem = ({ item, index }: { item: ReactNode, index: number }) => {
        return <CarouselItem index={index} boxWidth={boxWidth} halfBoxDistance={halfBoxDistance} panX={panX}>
            {item}
        </CarouselItem>;
    };

    return (
        <FlatList
            horizontal
            data={cards}
            contentContainerStyle={styles.contentContainerStyle}
            contentInsetAdjustmentBehavior='never'
            snapToAlignment='center'
            decelerationRate='fast'
            automaticallyAdjustContentInsets={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={1}
            snapToInterval={boxWidth}
            contentInset={{
                left: halfBoxDistance,
                right: halfBoxDistance,
            }}
            contentOffset={{ x: halfBoxDistance * -1, y: 0 }}
            onLayout={(e) => {
                setScrollViewWidth(e.nativeEvent.layout.width);
            }}
            onScroll={(e) => {
                panX.value = e.nativeEvent.contentOffset.x;
            }}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
        />
    );
};

export default memo(CardCarousel);

const styles = StyleSheet.create({
    contentContainerStyle: {
        paddingVertical: 4
    }
});