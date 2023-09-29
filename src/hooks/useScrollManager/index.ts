import { useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import {
  SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { ScrollableType } from '../../constants/enum';
import { isIOS } from '../../misc/checkers';

export const useScrollManager = (
  routes: Array<{ key: string; title: string; scrollableType: ScrollableType }>
) => {
  const [bannerHeight, setBannerHeight] = useState<160 | 300>(160);
  const OFFSET_TABVIEW = isIOS() ? -bannerHeight : 0;
  const scrollY = useSharedValue(-bannerHeight);
  const [index, setIndex] = useState(0);
  const isListGliding = useRef(false);

  // having this tabkeyToScrollPosition as a SharedValue of an object or a Ref was problematic.
  // Since it wasn't updating inside the useAnimatedReaction.
  // So I had to use an object of values being sharedvalues.
  const tabkeyToScrollPosition: { [key: string]: SharedValue<number> } = {};
  for (const route of routes) {
    if (!(route.key in tabkeyToScrollPosition)) {
      tabkeyToScrollPosition[route.key] = useSharedValue(-bannerHeight);
    }
  }
  const tabkeyToScrollableChildRef = useRef<{
    [key: string]: FlatList | ScrollView;
  }>({}).current;

  useAnimatedReaction(
    () => {
      return scrollY.value;
    },
    (value) => {
      const activeTab = routes[index].key;
      tabkeyToScrollPosition[activeTab].value = value;
    },
    [index, scrollY, routes, tabkeyToScrollPosition]
  );

  return useMemo(() => {
    const syncScrollOffset = () => {
      const curRouteKey = routes[index].key;
      const scrollValue = tabkeyToScrollPosition[curRouteKey].value;

      Object.keys(tabkeyToScrollableChildRef).forEach(key => {
        const scrollRef = tabkeyToScrollableChildRef[key];
        const curRouteScrollableType = routes[routes.findIndex(route => route.key === key)].scrollableType;

        if (!scrollRef) {
          return;
        }

        if (/* header visible */ key !== curRouteKey) {
          if (scrollValue <= OFFSET_TABVIEW + bannerHeight) {
            if (curRouteScrollableType === ScrollableType.SCROLLVIEW) {
              (scrollRef as ScrollView).scrollTo({
                y: Math.max(
                  Math.min(scrollValue, OFFSET_TABVIEW + bannerHeight),
                  OFFSET_TABVIEW
                ),
                animated: false,
              });
            } else {
              (scrollRef as FlatList).scrollToOffset({
                offset: Math.max(
                  Math.min(scrollValue, OFFSET_TABVIEW + bannerHeight),
                  OFFSET_TABVIEW
                ),
                animated: false,
              });
            }
            tabkeyToScrollPosition[key].value = scrollValue;
          } else if (
            /* header hidden */
            tabkeyToScrollPosition[key].value <
              OFFSET_TABVIEW + bannerHeight ||
            tabkeyToScrollPosition[key].value == null
          ) {
            if (curRouteScrollableType === ScrollableType.SCROLLVIEW) {
              (scrollRef as ScrollView).scrollTo({
                y: OFFSET_TABVIEW + bannerHeight,
                animated: false,
              });
            } else {
              (scrollRef as FlatList).scrollToOffset({
                offset: OFFSET_TABVIEW + bannerHeight,
                animated: false,
              });
            }
            tabkeyToScrollPosition[key].value =
              OFFSET_TABVIEW + bannerHeight;
          }
        }
      });
    };

    const onMomentumScrollBegin = () => {
      isListGliding.current = true;
    };

    const onMomentumScrollEnd = () => {
      isListGliding.current = false;
      syncScrollOffset();
    };

    const onScrollEndDrag = () => {
      syncScrollOffset();
    };

    const trackRef = (key: string, ref: FlatList<any> | ScrollView) => {
      tabkeyToScrollableChildRef[key] = ref;
    };

    const getRefForKey = (key: string) => tabkeyToScrollableChildRef[key];

    return {
      scrollY,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      onScrollEndDrag,
      trackRef,
      index,
      setIndex,
      bannerHeight,
      setBannerHeight,
      getRefForKey,
    };
  }, [
    index,
    bannerHeight,
    OFFSET_TABVIEW,
    routes,
    scrollY,
    tabkeyToScrollPosition,
    tabkeyToScrollableChildRef,
  ]);
};
