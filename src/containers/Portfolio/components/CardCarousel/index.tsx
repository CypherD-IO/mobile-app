import React, { memo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import CarouselItem from './CarouselItem';

const CardCarousel = () => {
    const [scrollViewWidth, setScrollViewWidth] = React.useState(0);
    const boxWidth = scrollViewWidth * 0.8;
    const boxDistance = scrollViewWidth / 1.25 - boxWidth;
    const halfBoxDistance = boxDistance / 2;
    const panX = useSharedValue(0);

    const renderItem = ({ item, index }: { item: string | number, index: number }) => {
        return <CarouselItem item={item} index={index} boxWidth={boxWidth} halfBoxDistance={halfBoxDistance} panX={panX} />;
    };

    return (
        <FlatList
            horizontal
            data={[1, 2, 3]}
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
            keyExtractor={(item, index) => `${index}-${item}`}
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