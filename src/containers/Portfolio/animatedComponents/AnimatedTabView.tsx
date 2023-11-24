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
import { H_GUTTER } from '../constants';
import { PortfolioBannerHeights } from '../../../hooks/useScrollManager';

export interface AnimatedTabViewProps
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
    | 'ListHeaderComponent'
  > {
  bannerHeight: PortfolioBannerHeights;
  data?: any[];
  renderItem?:
  | ListRenderItem<any>
  | Animated.Node<ListRenderItem<any> | null | undefined>
  | null
  | undefined;
  onRef: Animated.FlatList<any> | Animated.ScrollView | null;
  scrollY: SharedValue<number>;
  refreshControl?: ReactElement;
  children?: React.ReactNode;
  extraData?: any;
}

const AnimatedTabViewWithoutMemo = ({
  bannerHeight,
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
  children,
  keyExtractor,
  extraData,
  ListHeaderComponent,
}: AnimatedTabViewProps) => {
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
    contentInset: Platform.select({ ios: { top: bannerHeight } }),
    contentOffset: Platform.select({
      ios: {
        x: 0,
        y: -bannerHeight,
      },
    }),
    contentContainerStyle: Platform.select({
      ios: {
        flexGrow: 1,
        paddingBottom: H_GUTTER,
      },
      android: {
        flexGrow: 1,
        paddingTop: bannerHeight,
        paddingBottom: H_GUTTER,
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

  if (children) {
    return (
      <Animated.ScrollView
        {...commonProps}
        ref={onRef as LegacyRef<Animated.ScrollView>}
      >
        {children}
      </Animated.ScrollView>
    );
  } else {
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
        ListHeaderComponent={ListHeaderComponent}
      />
    );
  }
};

export const AnimatedTabView = memo(
  AnimatedTabViewWithoutMemo
) as typeof AnimatedTabViewWithoutMemo;
