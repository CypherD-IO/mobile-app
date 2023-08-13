import { useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import { OFFSET_TABVIEW } from '../../containers/Portfolio/animatedComponents';
import { H_BALANCE_BANNER } from '../../containers/Portfolio/constants';
import { SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { ScrollableType } from '../../constants/enum';

export const useScrollManager = (routes: Array<{ key: string, title: string, scrollableType: ScrollableType }>) => {
  const scrollY = useSharedValue(-H_BALANCE_BANNER);
  const [index, setIndex] = useState(0);
  const isListGliding = useRef(false);

  // having this tabkeyToScrollPosition as a SharedValue of an object or a Ref was problematic.
  // Since it wasn't updating inside the useAnimatedReaction.
  // So I had to use an object of values being sharedvalues.
  const tabkeyToScrollPosition: {[key: string]: SharedValue<number>} = {};
  for (const route of routes) {
    if (!(route.key in tabkeyToScrollPosition)) {
      tabkeyToScrollPosition[route.key] = useSharedValue(-H_BALANCE_BANNER);
    }
  }
  const tabkeyToScrollableChildRef = useRef<{ [key: string]: FlatList | ScrollView }>({})
    .current;

  useAnimatedReaction(
    () => { return scrollY.value; },
    (value) => {
      const activeTab = routes[index].key;
      tabkeyToScrollPosition[activeTab].value = value;
    },
    [index, scrollY, routes, tabkeyToScrollPosition]
  );

  return useMemo(() => {
    const syncScrollOffset = () => {
      const curRouteKey = routes[index].key;
      const curRouteScrollableType = routes[index].scrollableType;
      const scrollValue = tabkeyToScrollPosition[curRouteKey].value;

      Object.keys(tabkeyToScrollableChildRef).forEach((key) => {
        const scrollRef = tabkeyToScrollableChildRef[key];
        if (!scrollRef) {
          return;
        }

        if (/* header visible */
          key !== curRouteKey) {
          if (scrollValue <= OFFSET_TABVIEW + H_BALANCE_BANNER) {
            if (curRouteScrollableType === ScrollableType.SCROLLVIEW) {
              (scrollRef as ScrollView).scrollTo({
                y: Math.max(
                  Math.min(scrollValue, OFFSET_TABVIEW + H_BALANCE_BANNER),
                  OFFSET_TABVIEW
                ),
                animated: false
              });
            } else {
              (scrollRef as FlatList).scrollToOffset({
                offset: Math.max(
                  Math.min(scrollValue, OFFSET_TABVIEW + H_BALANCE_BANNER),
                  OFFSET_TABVIEW
                ),
                animated: false
              });
            }
            tabkeyToScrollPosition[key].value = scrollValue;
          } else if (
            /* header hidden */
            tabkeyToScrollPosition[key].value <
            OFFSET_TABVIEW + H_BALANCE_BANNER ||
            tabkeyToScrollPosition[key].value == null
          ) {
            if (curRouteScrollableType === ScrollableType.SCROLLVIEW) {
              (scrollRef as ScrollView).scrollTo({
                y: OFFSET_TABVIEW + H_BALANCE_BANNER,
                animated: false
              });
            } else {
              (scrollRef as FlatList).scrollToOffset({
                offset: OFFSET_TABVIEW + H_BALANCE_BANNER,
                animated: false
              });
            }
            tabkeyToScrollPosition[key].value =
              OFFSET_TABVIEW + H_BALANCE_BANNER;
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
      getRefForKey
    };
  }, [
    index,
    routes,
    scrollY,
    tabkeyToScrollPosition,
    tabkeyToScrollableChildRef
  ]);
};
