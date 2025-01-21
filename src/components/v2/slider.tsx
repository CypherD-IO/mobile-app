import { StyleSheet, View } from 'react-native';
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
import {
  CyDAnimatedView,
  CyDGestureHandlerRootView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import React from 'react';
import clsx from 'clsx';
import { round } from 'lodash';

const TRACK_PADDING = 12;
const HANDLE_WIDTH = 24;

interface SliderProps {
  minValue?: number;
  maxValue: number;
  steps?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  showValues?: boolean;
  customValues?: number[] | string[];
}

const Slider = ({
  minValue = 0,
  maxValue = 100,
  steps = 1,
  value = minValue,
  onValueChange,
  onSlidingComplete,
  showValues = false,
  customValues,
}: SliderProps) => {
  const offset = useSharedValue(0);
  const trackWidth = useSharedValue(0);

  const calculateOffset = (val: number, width: number) => {
    'worklet';
    const availableWidth = width - TRACK_PADDING * 2 - HANDLE_WIDTH;
    const percentage = (val - minValue) / (maxValue - minValue);

    if (steps && steps >= 2) {
      const stepSize = (maxValue - minValue) / steps;
      const nearestStepValue = Math.round(val / stepSize) * stepSize;
      const stepPercentage =
        (nearestStepValue - minValue) / (maxValue - minValue);
      return stepPercentage * availableWidth;
    }

    return percentage * availableWidth;
  };

  React.useEffect(() => {
    if (value !== undefined && trackWidth.value > 0) {
      offset.value = withSpring(calculateOffset(value, trackWidth.value), {
        damping: 20,
        stiffness: 300,
      });
    }
  }, [value, trackWidth.value]);

  const getStepPositions = (width: number) => {
    'worklet';
    const availableWidth = width - TRACK_PADDING * 2;
    const stepWidth = availableWidth / steps;
    return Array.from({ length: steps + 1 }, (_, i) => i * stepWidth);
  };

  const findNearestStep = (_offset: number, stepPositions: number[]) => {
    'worklet';
    return stepPositions.reduce((prev, curr) => {
      return Math.abs(curr - _offset) < Math.abs(prev - _offset) ? curr : prev;
    });
  };

  const calculateValue = (newOffset: number) => {
    'worklet';
    const availableWidth = trackWidth.value - TRACK_PADDING * 2 - HANDLE_WIDTH;
    const percentage = newOffset / availableWidth;
    const rawValue = minValue + (maxValue - minValue) * percentage;

    if (steps === 1) {
      return Math.round(rawValue);
    }

    const stepSize = (maxValue - minValue) / steps;
    return Math.round(rawValue / stepSize) * stepSize;
  };

  const updateValueWorklet = (newOffset: number) => {
    'worklet';
    if (onValueChange) {
      const _value = calculateValue(newOffset);
      runOnJS(onValueChange)(_value);
    }
  };

  const pan = Gesture.Pan()
    .onChange((event: { changeX: number }) => {
      'worklet';
      let newOffset = offset.value + event.changeX;
      const maxOffset = trackWidth.value - TRACK_PADDING * 2 - HANDLE_WIDTH;
      newOffset = Math.max(0, Math.min(newOffset, maxOffset));
      offset.value = newOffset;
      updateValueWorklet(newOffset);
    })
    .onFinalize(() => {
      'worklet';
      const currentOffset = offset.value;

      if (steps && steps >= 2) {
        const stepPositions = getStepPositions(trackWidth.value);
        const nearestStepOffset = findNearestStep(offset.value, stepPositions);

        offset.value = withSpring(nearestStepOffset, {
          damping: 20,
          stiffness: 300,
        });

        updateValueWorklet(nearestStepOffset);

        if (onSlidingComplete) {
          const finalValue = calculateValue(nearestStepOffset);
          runOnJS(onSlidingComplete)(finalValue);
        }
      } else {
        if (onSlidingComplete) {
          const finalValue = calculateValue(currentOffset);
          runOnJS(onSlidingComplete)(finalValue);
        }
      }
    });

  const onTrackLayout = (event: any) => {
    trackWidth.value = event.nativeEvent.layout.width;
    if (value !== undefined) {
      offset.value = withSpring(
        calculateOffset(value, event.nativeEvent.layout.width),
        {
          damping: 20,
          stiffness: 300,
        },
      );
    }
  };

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    left: TRACK_PADDING,
  }));

  const handleDotPress = (index: number) => {
    const stepValue = minValue + (index * (maxValue - minValue)) / steps;
    if (onValueChange) {
      onValueChange(stepValue);
    }
    if (trackWidth.value > 0) {
      const newOffset = calculateOffset(stepValue, trackWidth.value);
      offset.value = withSpring(newOffset, {
        damping: 20,
        stiffness: 300,
      });
    }
    if (onSlidingComplete) {
      onSlidingComplete(stepValue);
    }
  };

  const formatValue = (_value: number | string) => {
    'worklet';
    if (typeof _value === 'string') return _value;
    if (_value >= 1000) {
      return `${round(_value / 1000, 1)}k`;
    }
    return _value.toString();
  };

  const renderSteps = () => {
    if (!steps || steps < 2) return null;

    const numberOfDots = steps + 1;
    const calculatedValues = Array.from({ length: numberOfDots }, (_, index) =>
      Math.round(minValue + (index * (maxValue - minValue)) / steps),
    );

    return (
      <>
        {/* Dots centered on the yellow bar */}
        <CyDView className='absolute w-full h-full flex flex-row justify-between items-center px-[12px]'>
          {Array.from({ length: numberOfDots }).map((_, index) => (
            <CyDTouchView
              key={index}
              className='w-[20px] h-[20px] items-center justify-center'
              onPress={() => handleDotPress(index)}>
              <CyDView className='w-[4px] h-[4px] bg-n0 rounded-full' />
            </CyDTouchView>
          ))}
        </CyDView>

        {/* Modified values section */}
        {showValues && (
          <CyDView className='absolute w-full flex flex-row justify-between items-center px-[12px] top-[20px]'>
            {(customValues?.length === numberOfDots
              ? customValues
              : calculatedValues
            ).map((_value, index) => (
              <CyDView
                key={index}
                className={clsx('h-[20px] items-center justify-center', {
                  'w-[24px]': !customValues,
                })}>
                <CyDText className='text-base400 text-[10px]'>
                  {formatValue(_value)}
                </CyDText>
              </CyDView>
            ))}
          </CyDView>
        )}
      </>
    );
  };

  return (
    <CyDGestureHandlerRootView style={styles.container}>
      <CyDView style={styles.sliderTrack} onLayout={onTrackLayout}>
        {renderSteps()}
        <GestureDetector gesture={pan}>
          <CyDAnimatedView
            className='w-[24px] h-[24px] z-[1000] bg-white absolute shadow-md flex-row justify-center items-center rounded-full'
            style={sliderStyle}>
            <CyDView className='w-[8px] h-[8px] bg-p50 rounded-full justify-center items-center'>
              <CyDView className='bg-white w-[3px] h-[3px] rounded-full' />
            </CyDView>
          </CyDAnimatedView>
        </GestureDetector>
      </CyDView>
    </CyDGestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  sliderTrack: {
    width: '100%',
    height: 12,
    backgroundColor: '#F7C645',
    borderRadius: 25,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 20,
    marginBottom: 32,
  },
});

export default Slider;
