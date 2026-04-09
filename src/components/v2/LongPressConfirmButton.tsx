import React, { useCallback, useRef, useState } from 'react';
import { NativeModules, Vibration } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { CyDText, CyDView } from '../../styles/tailwindComponents';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LongPressConfirmButtonProps {
  /** Called when the long press completes successfully */
  onConfirm: () => void | Promise<void>;
  /** Button label shown in idle state */
  label?: string;
  /** Label shown while holding */
  holdLabel?: string;
  /** How long to hold in ms (default 1500) */
  holdDuration?: number;
  /** Disable interaction */
  disabled?: boolean;
}

const CIRCLE_SIZE = 28;
const STROKE_WIDTH = 2.5;

function triggerHaptic(type: 'light' | 'medium' | 'success') {
  const hapticAvailable = !!NativeModules.RNReactNativeHapticFeedback;
  if (hapticAvailable) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactNativeHapticFeedback = require('react-native-haptic-feedback');
    const typeMap = {
      light: 'impactLight',
      medium: 'impactMedium',
      success: 'notificationSuccess',
    } as const;
    ReactNativeHapticFeedback.trigger(typeMap[type], {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } else {
    Vibration.vibrate(type === 'success' ? 50 : 20);
  }
}

export default function LongPressConfirmButton({
  onConfirm,
  label = 'Hold to confirm',
  holdLabel = 'Hold to confirm',
  holdDuration = 1500,
  disabled = false,
}: LongPressConfirmButtonProps) {
  const progress = useSharedValue(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const completedRef = useRef(false);

  const radius = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  const handleComplete = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    triggerHaptic('success');
    setDone(true);
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }, [onConfirm]);

  const onPressIn = useCallback(() => {
    if (disabled || done) return;
    completedRef.current = false;
    triggerHaptic('light');
    progress.value = withTiming(
      1,
      { duration: holdDuration, easing: Easing.linear },
      finished => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      },
    );
  }, [disabled, done, handleComplete, holdDuration, progress]);

  const onPressOut = useCallback(() => {
    if (done) return;
    cancelAnimation(progress);
    progress.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [done, progress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Dark overlay while pressing
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? 0.25 : 0,
  }));

  // Idle label: visible when not pressing
  const idleLabelStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? 0 : 1,
  }));

  // Hold label + circle: visible while pressing
  const holdContentStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? 1 : 0,
  }));

  return (
    <CyDView
      className='w-full h-[56px] rounded-[12px] overflow-hidden'
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
      onTouchCancel={onPressOut}>
      {/* Yellow background */}
      <CyDView className='absolute inset-0 bg-p100' />

      {/* Dark overlay on press */}
      <Animated.View
        className='absolute inset-0 bg-black'
        style={overlayStyle}
      />

      {/* Idle state: label only */}
      <Animated.View
        className='absolute inset-0 items-center justify-center'
        style={idleLabelStyle}>
        <CyDText className='text-[16px] font-bold text-black text-center'>
          {done ? 'Processing...' : label}
        </CyDText>
      </Animated.View>

      {/* Holding state: circle + hold label */}
      <Animated.View
        className='absolute inset-0 flex-row items-center justify-center gap-[10px]'
        style={holdContentStyle}>
        {/* Progress circle */}
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={radius}
            stroke='rgba(0,0,0,0.2)'
            strokeWidth={STROKE_WIDTH}
            fill='transparent'
          />
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={radius}
            stroke='#000'
            strokeWidth={STROKE_WIDTH}
            fill='transparent'
            strokeDasharray={circumference}
            animatedProps={animatedCircleProps}
            strokeLinecap='round'
          />
        </Svg>
        <CyDText className='text-[16px] font-bold text-black text-center'>
          {holdLabel}
        </CyDText>
      </Animated.View>
    </CyDView>
  );
}
