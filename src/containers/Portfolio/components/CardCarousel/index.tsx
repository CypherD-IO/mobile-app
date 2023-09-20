import React, { ReactNode, memo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import CarouselItem from './CarouselItem';
import { BannerRecord } from '../../../../models/bannerRecord.interface';
import StaticCard from './StaticCard';

interface CardCarouselItemProps {
    activityCards: ReactNode[]
    staticCardData: BannerRecord[]
    dscSetter: React.Dispatch<React.SetStateAction<string[]>>
}

const CardCarousel = ({ activityCards, staticCardData, dscSetter }: CardCarouselItemProps) => {
    const [scrollViewWidth, setScrollViewWidth] = useState(0);
    const boxWidth = scrollViewWidth * 0.85;
    const boxDistance = scrollViewWidth / 1.175 - boxWidth;
    const halfBoxDistance = boxDistance / 2;
    const panX = useSharedValue(0);

    const renderItem = ({ item, index }: { item: ReactNode, index: number }) => {
        return <CarouselItem index={index} boxWidth={boxWidth} halfBoxDistance={halfBoxDistance} panX={panX}>
            {item}
        </CarouselItem>;
    };

    const makeCards = () => {
        const sortedBannerRecords = staticCardData.sort((a, b) => {
            const priorityOrder = ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW'];
            return priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority);
        });
        const highestPriorityCards = sortedBannerRecords
            .filter((sc) => sc.priority === 'HIGHEST')
            .map((sc) => (
                <StaticCard
                    dscSetter={dscSetter}
                    id={sc.id}
                    title={sc.title}
                    description={sc.description}
                    bgImageURI={sc.bgImageURI}
                    redirectURI={sc.redirectURI}
                    isClosable={sc.isClosable}
                    endDate={sc.endDate}
                />
            ));

        const otherCards = sortedBannerRecords
            .filter((sc) => sc.priority !== 'HIGHEST')
            .map((sc) => (
                <StaticCard
                    dscSetter={dscSetter}
                    id={sc.id}
                    title={sc.title}
                    description={sc.description}
                    bgImageURI={sc.bgImageURI}
                    redirectURI={sc.redirectURI}
                    isClosable={sc.isClosable}
                    endDate={sc.endDate}
                />
            ));

        return [...highestPriorityCards, ...activityCards, ...otherCards];
    };

    const cards = makeCards();

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