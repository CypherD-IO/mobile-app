import React, { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDTouchView,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';

interface Props {
  /** Current step (0-indexed) */
  step: number;
  /** Total number of steps */
  totalSteps: number;
  /** Called when button is pressed */
  onPress: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the action is in progress */
  loading?: boolean;
  /** Whether this is the last step — shows filled button with check icon */
  isLastStep?: boolean;
  /** Label for the last step button */
  lastStepLabel?: string;
}

/**
 * Progress bar with attached action button.
 * - Shows a smooth-filling progress bar on the left
 * - Arrow button on the right (or full-width button with check on last step)
 * - Progress fills smoothly with animation
 */
export default function ProgressBarButton({
  step,
  totalSteps,
  onPress,
  disabled = false,
  loading = false,
  isLastStep = false,
  lastStepLabel = 'Submit',
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = totalSteps > 0 ? (step + 1) / totalSteps : 0;
    progress.value = withTiming(target, {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [step, totalSteps]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${(progress.value * 100).toFixed(1)}%` as any,
  }));

  if (isLastStep) {
    return (
      <CyDView className='flex-row items-center gap-[8px]'>
        {/* Full progress bar */}
        <CyDView className='flex-1 h-[6px] rounded-full bg-n40 overflow-hidden'>
          <Animated.View
            className='h-full rounded-full bg-base400'
            style={fillStyle}
          />
        </CyDView>

        {/* Tick button */}
        <CyDTouchView
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.8}
          className={`w-[52px] h-[52px] rounded-full items-center justify-center ${
            disabled || loading ? 'bg-n40' : 'bg-[#F7C645]'
          }`}>
          {loading ? (
            <ActivityIndicator color='#0D0D0D' size='small' />
          ) : (
            <CyDMaterialDesignIcons name='check' size={24} className='text-black' />
          )}
        </CyDTouchView>
      </CyDView>
    );
  }

  return (
    <CyDView className='flex-row items-center gap-[8px]'>
      {/* Progress bar */}
      <CyDView className='flex-1 h-[6px] rounded-full bg-n40 overflow-hidden'>
        <Animated.View
          className='h-full rounded-full bg-base400'
          style={fillStyle}
        />
      </CyDView>

      {/* Arrow button */}
      <CyDTouchView
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        className={`w-[52px] h-[52px] rounded-full items-center justify-center ${
          disabled || loading ? 'bg-n40' : 'bg-[#F7C645]'
        }`}>
        {loading ? (
          <ActivityIndicator color='#0D0D0D' size='small' />
        ) : (
          <CyDMaterialDesignIcons name='arrow-right' size={24} className='text-black' />
        )}
      </CyDTouchView>
    </CyDView>
  );
}
