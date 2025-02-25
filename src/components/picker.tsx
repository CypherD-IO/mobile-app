import React, { useCallback, useEffect, useRef } from 'react';
import { CyDView, CyDText } from '../styles/tailwindComponents';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface PickerProps {
  value: Array<{ label: string | number; value: string | number }>;
  onChange?: (selected: {
    label: string | number;
    value: string | number;
  }) => void;
  initialValue?: number;
}

const PickerItem = React.memo(
  ({
    item,
    index,
    scrollY,
  }: {
    item: { label: string | number; value: number | string };
    index: number;
    scrollY: SharedValue<number>;
  }) => {
    const itemStyle = useAnimatedStyle(() => {
      const input = [
        (index - 2) * ITEM_HEIGHT,
        (index - 1) * ITEM_HEIGHT,
        index * ITEM_HEIGHT,
        (index + 1) * ITEM_HEIGHT,
        (index + 2) * ITEM_HEIGHT,
      ];

      const scale = interpolate(
        scrollY.value,
        input,
        [0.6, 0.9, 1, 0.9, 0.6],
        'clamp',
      );

      const opacity = interpolate(
        scrollY.value,
        input,
        [0.3, 0.8, 1, 0.8, 0.3],
        'clamp',
      );

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <Animated.View
        style={itemStyle}
        className='h-[40px] justify-center items-center'>
        <CyDText className='text-[22px] font-medium text-[#3C3C43]'>
          {item.label}
        </CyDText>
      </Animated.View>
    );
  },
);

PickerItem.displayName = 'PickerItem';

const CyDPicker: React.FC<PickerProps> = ({
  value,
  onChange,
  initialValue,
}) => {
  const scrollY = useSharedValue(0);

  const scrollViewRef = useRef<Animated.ScrollView | null>(null);

  useEffect(() => {
    if (initialValue) {
      const index = value.findIndex(item => item.value === initialValue);

      if (index !== -1) {
        setTimeout(() => {
          scrollY.value = index * ITEM_HEIGHT;
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: index * ITEM_HEIGHT,
              animated: true,
            });
          }
        }, 50);
      }
    }
  }, [initialValue, value]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: event => {
      const maxScroll = (value.length - 1) * ITEM_HEIGHT;
      scrollY.value = Math.max(0, Math.min(event.contentOffset.y, maxScroll));
    },
    onMomentumEnd: event => {
      'worklet';
      const maxScroll = (value.length - 1) * ITEM_HEIGHT;
      const clampedOffset = Math.max(
        0,
        Math.min(event.contentOffset.y, maxScroll),
      );
      const index = Math.round(clampedOffset / ITEM_HEIGHT);
      const safeIndex = Math.max(0, Math.min(index, value.length - 1));
      const safeSnapToY = safeIndex * ITEM_HEIGHT;

      scrollY.value = withSpring(safeSnapToY, {
        damping: 20,
        stiffness: 200,
      });

      if (onChange) {
        runOnJS(onChange)({
          label: value[safeIndex].label,
          value: value[safeIndex].value,
        });
      }
    },
    onEndDrag: event => {
      'worklet';
      const maxScroll = (value.length - 1) * ITEM_HEIGHT;
      const clampedOffset = Math.max(
        0,
        Math.min(event.contentOffset.y, maxScroll),
      );
      const index = Math.round(clampedOffset / ITEM_HEIGHT);
      const safeIndex = Math.max(0, Math.min(index, value.length - 1));
      const safeSnapToY = safeIndex * ITEM_HEIGHT;

      scrollY.value = withSpring(safeSnapToY, {
        damping: 20,
        stiffness: 200,
      });

      if (onChange) {
        runOnJS(onChange)({
          label: value[safeIndex].label,
          value: value[safeIndex].value,
        });
      }
    },
  });

  const renderItem = useCallback(
    (
      item: { label: string | number; value: number | string },
      index: number,
    ) => {
      return (
        <PickerItem key={index} item={item} index={index} scrollY={scrollY} />
      );
    },
    [scrollY],
  );

  return (
    <GestureHandlerRootView>
      <CyDView className='relative'>
        <CyDView className='absolute w-full h-[40px] bg-[#747480]/5 top-[80px] rounded-[8px]' />
        <Animated.ScrollView
          ref={scrollViewRef}
          className='h-[200px]'
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate='fast'
          onScroll={handleScroll}
          scrollEventThrottle={1}
          bounces={false}
          contentContainerStyle={{
            paddingVertical: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
          }}>
          {value.map((item, index) => renderItem(item, index))}
        </Animated.ScrollView>
      </CyDView>
    </GestureHandlerRootView>
  );
};

export default CyDPicker;
