import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  LayoutChangeEvent,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import clsx from 'clsx';
import { CyDMaterialDesignIcons, CyDText, CyDView } from '../../styles/tailwindComponents';

type Props = {
  /** When false, the bar is hidden. */
  visible: boolean;
  onSwipeComplete: () => void | Promise<void>;
  label?: string;
};

/**
 * Horizontal swipe-to-confirm bar.
 * Reusable across bridge, payout, and any signing flow.
 */
const KNOB_SLOT = 56; // knob 48 + horizontal inset

export default function SwipeToConfirmBar({
  visible,
  onSwipeComplete,
  label = 'Swipe to confirm',
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fallbackW = Dimensions.get('window').width;
  const SIDE_MARGINS = 32; // px-[16px] * 2 typical parent padding
  const initialTravel = Math.max(100, fallbackW - KNOB_SLOT - SIDE_MARGINS);
  const maxTravelSv = useSharedValue(initialTravel);
  const translateX = useSharedValue(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const fireComplete = useCallback(async () => {
    setSubmitting(true);
    try {
      await onSwipeComplete();
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  }, [onSwipeComplete]);

  useEffect(() => {
    const w = trackWidth > 0 ? trackWidth : fallbackW - SIDE_MARGINS;
    maxTravelSv.value = Math.max(100, w - KNOB_SLOT);
  }, [trackWidth, fallbackW, maxTravelSv]);

  const gesture = Gesture.Pan()
    .activeOffsetX(12)
    .failOffsetY([-12, 12])
    .onUpdate(event => {
      'worklet';
      const cap = maxTravelSv.value;
      translateX.value = Math.max(0, Math.min(event.translationX, cap));
    })
    .onEnd(() => {
      'worklet';
      const cap = maxTravelSv.value;
      if (translateX.value > cap * 0.88) {
        translateX.value = withSpring(cap);
        runOnJS(fireComplete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + 28,
  }));

  const labelStyle = useAnimatedStyle(() => {
    const cap = maxTravelSv.value;
    const progress = cap > 0 ? translateX.value / cap : 0;
    return {
      opacity: interpolate(progress, [0, 0.5, 0.8], [1, 0.4, 0]),
      transform: [{ translateX: interpolate(progress, [0, 1], [0, 20]) }],
    };
  });

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  if (!visible) return null;

  return (
    <GestureHandlerRootView>
      <CyDView
        className='w-full bg-n40 h-[56px] rounded-full overflow-hidden border border-n20'
        onLayout={onTrackLayout}>
        <View pointerEvents={done ? 'none' : 'auto'} className='w-full h-[56px]'>
          <Animated.View
            className='absolute left-0 top-0 bottom-0 bg-p100/25 rounded-full'
            style={fillStyle}
          />
          <Animated.View className='absolute inset-0 justify-center z-0 px-[52px]' style={done ? undefined : labelStyle}>
            <CyDText className='text-[13px] font-semibold text-base150 text-center'>
              {done ? 'Processing…' : label}
            </CyDText>
          </Animated.View>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[knobStyle, { zIndex: 1 }]} className='absolute left-[4px] top-[4px]'>
              <CyDView
                className={clsx(
                  'w-[48px] h-[48px] rounded-full justify-center items-center bg-p100',
                  done && 'bg-green350',
                )}>
                {submitting ? (
                  <ActivityIndicator color='#000' size='small' />
                ) : (
                  <CyDMaterialDesignIcons
                    name={done ? 'check' : 'chevron-right'}
                    size={22}
                    className='text-black'
                  />
                )}
              </CyDView>
            </Animated.View>
          </GestureDetector>
        </View>
      </CyDView>
    </GestureHandlerRootView>
  );
}
