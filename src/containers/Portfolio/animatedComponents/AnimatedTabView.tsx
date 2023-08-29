import React, { memo, ReactElement, useCallback } from 'react';
import {
  FlatListProps,
  ListRenderItem,
  Platform,
  ScrollViewProps,
  StyleSheet,
  ViewProps,
  ViewToken,
} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { isAndroid, isIOS } from '../../../misc/checkers';
import { H_BALANCE_BANNER, H_GUTTER } from '../constants';

// we provide this bc ios allows overscrolling but android doesn't
// so on ios because of pull to refresh / rubberbaanding we set scroll pos to negative banner position
// on android we set to 0 and makeup banner height diff with contentinset padding
export const OFFSET_TABVIEW = isIOS() ? -H_BALANCE_BANNER : 0;

export interface AnimatedTabViewProps
  extends ViewProps,
    Pick<
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
  children?: React.ReactNode;
  extraData?: any;
}

const AnimatedTabViewWithoutMemo = ({
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
    contentInset: Platform.select({ ios: { top: H_BALANCE_BANNER } }),
    contentOffset: Platform.select({
      ios: {
        x: 0,
        y: -H_BALANCE_BANNER,
      },
    }),
    contentContainerStyle: Platform.select({
      ios: {
        flexGrow: 1,
        paddingBottom: H_GUTTER,
      },
      android: {
        flexGrow: 1,
        paddingTop: H_BALANCE_BANNER,
        paddingBottom: H_GUTTER,
      },
    }),
    showsVerticalScrollIndicator: false,
  };

  const viewableItems = useSharedValue<ViewToken[]>([]);

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

  const renderFlatlistItem = useCallback(
    ({ item, index }) => {
      return renderItem({ item, index, viewableItems });
    },
    [viewableItems.value, extraData]
  );

  if (children) {
    return (
      <Animated.ScrollView
        {...commonProps}
        contentContainerStyle={
          isAndroid()
            ? styles.scrollViewContentContainer
            : commonProps.contentContainerStyle
        }
        ref={onRef as Animated.ScrollView}
      >
        {children}
      </Animated.ScrollView>
    );
  } else {
    return (
      <Animated.FlatList
        {...commonProps}
        ref={onRef as Animated.FlatList<any>}
        data={data}
        keyExtractor={keyExtractor}
        // TO REDO
        // onViewableItemsChanged={onViewRef.current}
        // viewabilityConfig={viewConfigRef.current}
        renderItem={renderFlatlistItem}
        ListEmptyComponent={ListEmptyComponent}
        initialNumToRender={initialNumToRender}
        maxToRenderPerBatch={maxToRenderPerBatch}
        onContentSizeChange={onContentSizeChange}
        extraData={extraData}
      />
    );
  }
};

export const AnimatedTabView = memo(
  AnimatedTabViewWithoutMemo
) as typeof AnimatedTabViewWithoutMemo;

const styles = StyleSheet.create({
  scrollViewContentContainer: {
    // height: '100%',
    flexGrow: 1,
    // paddingTop: H_BALANCE_BANNER,
    paddingBottom: H_GUTTER,
  },
});
