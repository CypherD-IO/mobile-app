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
import { CyDView } from '../../styles/tailwindStyles';
import React from 'react';

const INITIAL_BOX_SIZE = 24;
const TRACK_PADDING = 8;

interface SliderProps {
  minValue: number;
  maxValue: number;
  steps?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
}

const Slider = ({
  minValue,
  maxValue,
  steps = 1,
  value,
  onValueChange,
  onSlidingComplete,
}: SliderProps) => {
  const offset = useSharedValue(0);
  const trackWidth = useSharedValue(0);

  const calculateOffset = (val: number, width: number) => {
    'worklet';
    const availableWidth = width - INITIAL_BOX_SIZE - TRACK_PADDING * 2;
    const percentage = (val - minValue) / (maxValue - minValue);

    if (steps && steps >= 2) {
      // Calculate step size and nearest step value
      const stepSize = (maxValue - minValue) / (steps - 1);
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
    const availableWidth = width - INITIAL_BOX_SIZE - TRACK_PADDING * 2;
    const stepWidth = availableWidth / (steps - 1);
    return Array.from({ length: steps }, (_, i) => i * stepWidth);
  };

  const findNearestStep = (_offset: number, stepPositions: number[]) => {
    'worklet';
    return stepPositions.reduce((prev, curr) => {
      return Math.abs(curr - _offset) < Math.abs(prev - _offset) ? curr : prev;
    });
  };

  const calculateValue = (newOffset: number) => {
    'worklet';
    const availableWidth =
      trackWidth.value - INITIAL_BOX_SIZE - TRACK_PADDING * 2;
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
      const maxOffset = trackWidth.value - INITIAL_BOX_SIZE - TRACK_PADDING * 2;
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
        // Handle case when steps is 1 or undefined
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

  const renderSteps = () => {
    if (!steps || steps < 2) return null;

    return (
      <CyDView className=' flex flex-row justify-between items-center px-[16px]'>
        {Array.from({ length: steps }).map((_, index) => (
          <CyDView key={index} className='w-[4px] h-[4px] bg-n0 rounded-full' />
        ))}
      </CyDView>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.sliderTrack} onLayout={onTrackLayout}>
        {renderSteps()}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.sliderHandle, sliderStyle]}>
            <View style={styles.handleRing}>
              <View style={styles.handleDot} />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
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
  },
  sliderHandle: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 999,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleRing: {
    width: 8,
    height: 8,
    backgroundColor: '#F7C645',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleDot: {
    width: 3,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 999,
  },
});

export default Slider;
