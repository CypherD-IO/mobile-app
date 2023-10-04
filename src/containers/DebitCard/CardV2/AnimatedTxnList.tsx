import React, { LegacyRef, memo, ReactElement } from 'react';
import {
    FlatListProps,
    ListRenderItem,
    Platform,
    ScrollViewProps,
} from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { H_CARD_GUTTER, H_CARD_SECTION } from './constants';

export interface AnimatedTxnListProps
    extends Pick<
        FlatListProps<any> & ScrollViewProps,
        | 'initialNumToRender'
        | 'maxToRenderPerBatch'
        | 'onContentSizeChange'
        | 'onMomentumScrollBegin'
        | 'onMomentumScrollEnd'
        | 'onScrollEndDrag'
        | 'keyExtractor'
        | 'updateCellsBatchingPeriod'
        | 'windowSize'
        | 'ListEmptyComponent'
    > {
    data?: any[];
    renderItem?:
    | ListRenderItem<any>
    | Animated.Node<ListRenderItem<any> | null | undefined>
    | null
    | undefined;
    onRef: Animated.FlatList<any> | Animated.ScrollView | null;
    scrollY: SharedValue<number>;
    refreshControl?: ReactElement;
    extraData?: any;
}

const AnimatedTxnListWithoutMemo = ({
    data,
    renderItem,
    onContentSizeChange,
    initialNumToRender,
    maxToRenderPerBatch,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
    onScrollEndDrag,
    onRef,
    scrollY,
    refreshControl,
    ListEmptyComponent,
    keyExtractor,
    extraData,
}: AnimatedTxnListProps) => {
    const handleScroll = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const commonProps = {
        refreshControl,
        onMomentumScrollBegin,
        onMomentumScrollEnd,
        onScroll: handleScroll,
        onScrollEndDrag,
        scrollEventThrottle: 1,
        // ios has over scrolling and other things which make this look and feel nicer
        contentInset: Platform.select({ ios: { top: H_CARD_SECTION } }),
        contentOffset: Platform.select({
            ios: {
                x: 0,
                y: -H_CARD_SECTION,
            },
        }),
        contentContainerStyle: Platform.select({
            ios: {
                flexGrow: 1,
                paddingBottom: H_CARD_GUTTER,
            },
            android: {
                flexGrow: 1,
                paddingTop: H_CARD_SECTION,
                paddingBottom: H_CARD_GUTTER,
            },
        }),
        showsVerticalScrollIndicator: false,
    };

    // TODO : FlatList scrolling animation

    // const viewableItems = useSharedValue<ViewToken[]>([]);
    // const onViewRef = React.useRef(
    //   ({ viewableItems: vItems }: { viewableItems: ViewToken[] }) => {
    //     if (vItems.length) {
    //       viewableItems.value = vItems.map((vItem) =>
    //         vItem.isViewable ? vItem.item : null
    //       );
    //     }
    //   }
    // );
    // const viewConfigRef = React.useRef({
    //   waitForInteraction: false,
    //   itemVisiblePercentThreshold: 75,
    // });
    // const renderFlatlistItem = useCallback(
    //   ({ item, index }) => {
    //     return renderItem({ item, index, viewableItems });
    //   },
    //   [viewableItems.value, extraData]
    // );

    return (
        <Animated.FlatList
            {...commonProps}
            ref={onRef as LegacyRef<Animated.FlatList<any>>}
            data={data}
            keyExtractor={keyExtractor}
            // TODO : FlatList scrolling animation
            // onViewableItemsChanged={onViewRef.current}
            // viewabilityConfig={viewConfigRef.current}
            renderItem={renderItem}
            ListEmptyComponent={ListEmptyComponent}
            initialNumToRender={initialNumToRender}
            maxToRenderPerBatch={maxToRenderPerBatch}
            onContentSizeChange={onContentSizeChange}
            extraData={extraData}
        />
    );
};

export const AnimatedTxnList = memo(
    AnimatedTxnListWithoutMemo
) as typeof AnimatedTxnListWithoutMemo;
