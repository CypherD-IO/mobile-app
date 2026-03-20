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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import clsx from 'clsx';
import { CyDMaterialDesignIcons, CyDText, CyDView } from '../../../styles/tailwindComponents';

type Props = {
  /** When false, the bar is hidden (no signing required for this screen). */
  visible: boolean;
  onSwipeComplete: () => void;
  label?: string;
};

/**
 * Horizontal swipe-to-confirm; only mounted/visible when a signature is required.
 */
const KNOB_SLOT = 56; // knob 48 + horizontal inset

export default function BridgeV2SwipeToSignBar({
  visible,
  onSwipeComplete,
  label = 'Swipe to sign',
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fallbackW = Dimensions.get('window').width;
  /** Reject (72) + gap + sheet margins — until onLayout measures the real track */
  const INLINE_ACTIONS_RESERVE = 118;
  const initialTravel = Math.max(100, fallbackW - KNOB_SLOT - INLINE_ACTIONS_RESERVE);
  const maxTravelSv = useSharedValue(initialTravel);
  const translateX = useSharedValue(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const fireComplete = useCallback(() => {
    setSubmitting(true);
    setDone(true);
    onSwipeComplete();
  }, [onSwipeComplete]);

  useEffect(() => {
    const w = trackWidth > 0 ? trackWidth : fallbackW - INLINE_ACTIONS_RESERVE;
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

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  if (!visible) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, minWidth: 0 }}>
      <CyDView
        className='w-full bg-n40 h-[56px] rounded-full overflow-hidden border border-n20'
        onLayout={onTrackLayout}>
        <View pointerEvents={done ? 'none' : 'auto'} className='w-full h-[56px]'>
          <Animated.View
            className='absolute left-0 top-0 bottom-0 bg-p100/25 rounded-full'
            style={fillStyle}
          />
          <CyDView className='absolute inset-0 justify-center z-0 px-[52px]'>
            <CyDText className='text-[13px] font-semibold text-base150 text-center'>
              {done ? 'Signing…' : label}
            </CyDText>
          </CyDView>
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
                    className='text-p0'
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
