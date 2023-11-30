import React, { memo, ReactElement } from 'react';
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
import { CardSectionHeights } from '../../../constants/cardPageV2';

export interface AnimatedTxnListProps
  extends Pick<
    FlatListProps<any> & ScrollViewProps,
    | 'initialNumToRender'
    | 'maxToRenderPerBatch'
    | 'onContentSizeChange'
    | 'onMomentumScrollBegin'
    | 'onMomentumScrollEnd'
    | 'onScrollEndDrag'
    | 'onEndReached'
    | 'keyExtractor'
    | 'updateCellsBatchingPeriod'
    | 'windowSize'
    | 'ListEmptyComponent'
    | 'ListFooterComponent'
  > {
  data?: any[];
  renderItem?:
    | ListRenderItem<any>
    | Animated.Node<ListRenderItem<any> | null | undefined>
    | null
    | undefined;
  scrollY: SharedValue<number>;
  refreshControl?: ReactElement;
  extraData?: any;
  cardSectionHeight: CardSectionHeights;
}

const AnimatedTxnListWithoutMemo = ({
  cardSectionHeight,
  data,
  renderItem,
  onContentSizeChange,
  initialNumToRender,
  maxToRenderPerBatch,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  onEndReached,
  scrollY,
  refreshControl,
  ListEmptyComponent,
  ListFooterComponent,
  keyExtractor,
  extraData,
}: AnimatedTxnListProps) => {
  const handleScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const commonProps = {
    refreshControl,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
    onScroll: handleScroll,
    onScrollEndDrag,
    onEndReached,
    scrollEventThrottle: 1,
    // ios has over scrolling and other things which make this look and feel nicer
    contentInset: Platform.select({ ios: { top: cardSectionHeight } }),
    contentOffset: Platform.select({
      ios: {
        x: 0,
        y: -cardSectionHeight,
      },
    }),
    contentContainerStyle: Platform.select({
      ios: {
        flexGrow: 1,
      },
      android: {
        flexGrow: 1,
        paddingTop: cardSectionHeight,
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
      ListFooterComponent={ListFooterComponent}
      extraData={extraData}
    />
  );
};

export const AnimatedTxnList = memo(
  AnimatedTxnListWithoutMemo,
) as typeof AnimatedTxnListWithoutMemo;
