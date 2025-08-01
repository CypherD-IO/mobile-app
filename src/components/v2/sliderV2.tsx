import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Insets,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Slider } from 'react-native-awesome-slider';
import { useSharedValue, WithTimingConfig } from 'react-native-reanimated';
import {
  CyDGestureHandlerRootView,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { round } from 'lodash';

// Enums for slider props
enum HapticModeEnum {
  NONE = 'none',
  STEP = 'step',
  BOTH = 'both',
}

enum PanDirectionEnum {
  START = 0,
  LEFT = 1,
  RIGHT = 2,
  END = 3,
}

// Theme type for slider
type SliderThemeType =
  | {
      minimumTrackTintColor?: string;
      maximumTrackTintColor?: string;
      cacheTrackTintColor?: string;
      bubbleBackgroundColor?: string;
      bubbleTextColor?: string;
      disableMinTrackTintColor?: string;
      heartbeatColor?: string;
    }
  | null
  | undefined;

interface SliderV2Props {
  // Core parameters (required)
  value: number;
  min?: number;
  max?: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;

  // Additional core parameters
  cache?: number;

  // Callbacks
  onSlidingStart?: () => void;
  onSlidingComplete?: (value: number) => void;
  onTap?: () => void;
  onHapticFeedback?: () => void;

  // Styling
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  sliderHeight?: number;
  theme?: SliderThemeType;

  // Bubble/Text customization
  bubble?: (s: number) => string;
  renderBubble?: () => React.ReactNode;
  setBubbleText?: (s: string) => void;
  bubbleTranslateY?: number;
  bubbleMaxWidth?: number;
  bubbleWidth?: number;
  bubbleTextStyle?: StyleProp<TextStyle>;
  bubbleContainerStyle?: StyleProp<ViewStyle>;

  // Thumb customization
  renderThumb?: () => React.ReactNode;
  thumbWidth?: number;
  thumbScaleValue?: number;

  // Marks/Steps
  renderMark?: ({ index }: { index: number }) => React.ReactNode;
  markWidth?: number;
  markStyle?: StyleProp<ViewStyle>;
  steps?: number;
  stepTimingOptions?: false | WithTimingConfig;
  snapToStep?: boolean;

  // Interaction
  disable?: boolean;
  disableTapEvent?: boolean;
  disableTrackFollow?: boolean;
  panHitSlop?: Insets;

  // Gesture control
  activeOffsetX?: number | [number, number];
  activeOffsetY?: number | [number, number];
  failOffsetX?: number | [number, number];
  failOffsetY?: number | [number, number];

  // Animation
  isScrubbing?: boolean;
  panDirectionValue?: PanDirectionEnum;
  heartbeat?: boolean;

  // Haptics
  hapticMode?: `${HapticModeEnum}`;

  // Utility
  testID?: string;
}

/**
 * SliderV2 Component
 * A modern, animated slider using react-native-awesome-slider.
 *
 * ALL POSSIBLE PARAMETERS FOR react-native-awesome-slider:
 *
 * === CORE PARAMETERS ===
 * - progress: Animated.SharedValue<number> (REQUIRED) - Current slider value
 * - minimumValue: Animated.SharedValue<number> (REQUIRED) - Minimum slider value
 * - maximumValue: Animated.SharedValue<number> (REQUIRED) - Maximum slider value
 * - cache?: Animated.SharedValue<number> - Cache value (rendered behind main progress)
 *
 * === CALLBACKS ===
 * - onValueChange?: (value: number) => void - Called when value changes
 * - onSlidingStart?: () => void - Called when sliding starts
 * - onSlidingComplete?: (value: number) => void - Called when sliding ends
 * - onTap?: () => void - Called on tap event
 * - onHapticFeedback?: () => void - Custom haptic feedback
 *
 * === STYLING ===
 * - style?: StyleProp<ViewStyle> - Container style
 * - containerStyle?: StyleProp<ViewStyle> - Container style (alternative)
 * - sliderHeight?: number - Height of the slider track
 * - theme?: SliderThemeType - Theme object with colors
 *
 * === BUBBLE/TEXT ===
 * - bubble?: (s: number) => string - Function to format bubble text
 * - renderBubble?: () => React.ReactNode - Custom bubble component
 * - setBubbleText?: (s: string) => void - Set bubble text programmatically
 * - bubbleTranslateY?: number - Bubble Y translation
 * - bubbleMaxWidth?: number - Max bubble width (default: 100)
 * - bubbleWidth?: number - Fixed bubble width
 * - bubbleTextStyle?: StyleProp<TextStyle> - Bubble text style
 * - bubbleContainerStyle?: StyleProp<ViewStyle> - Bubble container style
 *
 * === THUMB ===
 * - renderThumb?: () => React.ReactNode - Custom thumb component
 * - thumbWidth?: number - Thumb width (default: 15)
 * - thumbScaleValue?: Animated.SharedValue<number> - Thumb scale animation
 *
 * === MARKS/STEPS ===
 * - renderMark?: ({ index }: { index: number }) => React.ReactNode - Custom mark component
 * - markWidth?: number - Mark width
 * - markStyle?: StyleProp<ViewStyle> - Mark style
 * - steps?: number - Number of segmented steps
 * - stepTimingOptions?: false | WithTimingConfig - Animation for steps
 * - snapToStep?: boolean - Snap to nearest step
 *
 * === INTERACTION ===
 * - disable?: boolean - Disable slider
 * - disableTapEvent?: boolean - Disable tap events (default: true)
 * - disableTrackFollow?: boolean - Disable track following thumb
 * - panHitSlop?: Insets - Pan gesture hit slop
 *
 * === GESTURE CONTROL ===
 * - activeOffsetX?: number | [start: number, end: number] - X axis activation range
 * - activeOffsetY?: number | [start: number, end: number] - Y axis activation range
 * - failOffsetX?: number | [start: number, end: number] - X axis fail range
 * - failOffsetY?: number | [start: number, end: number] - Y axis fail range
 *
 * === ANIMATION ===
 * - isScrubbing?: Animated.SharedValue<boolean> - Scrubbing status
 * - panDirectionValue?: Animated.SharedValue<PanDirectionEnum> - Pan direction
 * - heartbeat?: boolean - Heartbeat animation
 *
 * === HAPTICS ===
 * - hapticMode?: 'none' | 'step' | 'both' - Haptic feedback mode
 *
 * === THEME COLORS ===
 * theme: {
 *   minimumTrackTintColor?: string - Progress color
 *   maximumTrackTintColor?: string - Background color
 *   cacheTrackTintColor?: string - Cache color
 *   bubbleBackgroundColor?: string - Bubble background
 *   bubbleTextColor?: string - Bubble text color
 *   disableMinTrackTintColor?: string - Disabled progress color
 *   heartbeatColor?: string - Heartbeat animation color
 * }
 *
 * === UTILITY ===
 * - testID?: string - Test identifier
 */
const SliderV2: React.FC<SliderV2Props> = ({
  // Core parameters
  value = 0,
  min = 0,
  max = 100,
  onValueChange,
  disabled = false,
  cache,

  // Callbacks
  onSlidingStart,
  onSlidingComplete,
  onTap,
  onHapticFeedback,

  // Styling
  style,
  containerStyle,
  sliderHeight,
  theme,

  // Bubble/Text customization
  bubble,
  renderBubble,
  setBubbleText,
  bubbleTranslateY,
  bubbleMaxWidth,
  bubbleWidth,
  bubbleTextStyle,
  bubbleContainerStyle,

  // Thumb customization
  renderThumb,
  thumbWidth,
  thumbScaleValue,

  // Marks/Steps
  renderMark,
  markWidth,
  markStyle,
  steps,
  stepTimingOptions,
  snapToStep,

  // Interaction
  disable,
  disableTapEvent,
  disableTrackFollow,
  panHitSlop,

  // Gesture control
  activeOffsetX,
  activeOffsetY,
  failOffsetX,
  failOffsetY,

  // Animation
  isScrubbing,
  panDirectionValue,
  heartbeat,

  // Haptics
  hapticMode,

  // Utility
  testID,
}) => {
  // Ensure values are numbers and have defaults
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const safeMin = typeof min === 'number' && !isNaN(min) ? min : 0;
  const safeMax = typeof max === 'number' && !isNaN(max) ? max : 100;

  // Track if user is currently sliding
  const isUserSliding = useRef(false);

  // Use shared values for smooth animation
  const progress = useSharedValue(safeValue);
  const minimumValue = useSharedValue(safeMin);
  const maximumValue = useSharedValue(safeMax);
  const cacheValue = useSharedValue(cache ?? 0);
  const isScrubbingValue = useSharedValue(isScrubbing ?? false);
  const panDirectionValueShared = useSharedValue(
    panDirectionValue ?? PanDirectionEnum.START,
  );
  const thumbScaleValueShared = useSharedValue(thumbScaleValue ?? 1);

  // Update shared values when props change (only when not user sliding)
  useEffect(() => {
    try {
      if (!isUserSliding.current) {
        // Only update if values actually changed to prevent feedback loops
        if (progress.value !== safeValue) {
          progress.value = safeValue;
        }
        if (minimumValue.value !== safeMin) {
          minimumValue.value = safeMin;
        }
        if (maximumValue.value !== safeMax) {
          maximumValue.value = safeMax;
        }
        if (cacheValue.value !== (cache ?? 0)) {
          cacheValue.value = cache ?? 0;
        }
        if (isScrubbingValue.value !== (isScrubbing ?? false)) {
          isScrubbingValue.value = isScrubbing ?? false;
        }
        if (
          panDirectionValueShared.value !==
          (panDirectionValue ?? PanDirectionEnum.START)
        ) {
          panDirectionValueShared.value =
            panDirectionValue ?? PanDirectionEnum.START;
        }
        if (thumbScaleValueShared.value !== (thumbScaleValue ?? 1)) {
          thumbScaleValueShared.value = thumbScaleValue ?? 1;
        }
      }
    } catch (err) {
      console.error('[SliderV2] Error updating shared values:', err);
    }
  }, [
    safeValue,
    safeMin,
    safeMax,
    cache,
    isScrubbing,
    panDirectionValue,
    thumbScaleValue,
  ]);

  // Handle value change with error handling
  const handleValueChange = (val: number) => {
    try {
      if (typeof val === 'number' && !isNaN(val) && !disabled) {
        onValueChange(round(val, 2));
      }
    } catch (err) {
      console.error('[SliderV2] Error in onValueChange:', err);
    }
  };

  // Handle sliding start
  const handleSlidingStart = () => {
    isUserSliding.current = true;
    onSlidingStart?.();
  };

  // Handle sliding complete
  const handleSlidingComplete = (val: number) => {
    onSlidingComplete?.(val);
    setTimeout(() => {
      isUserSliding.current = false;
    }, 200);
  };

  return (
    <CyDView>
      <Slider
        progress={progress}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        cache={cacheValue}
        onValueChange={handleValueChange}
        onSlidingStart={handleSlidingStart}
        onSlidingComplete={handleSlidingComplete}
        onTap={onTap}
        onHapticFeedback={onHapticFeedback}
        style={style}
        containerStyle={containerStyle ?? styles.defaultContainer}
        sliderHeight={sliderHeight ?? 12}
        theme={theme ?? defaultTheme}
        bubble={bubble}
        renderBubble={renderBubble ?? defaultBubble}
        setBubbleText={setBubbleText}
        bubbleTranslateY={bubbleTranslateY}
        bubbleMaxWidth={bubbleMaxWidth}
        bubbleWidth={bubbleWidth}
        bubbleTextStyle={bubbleTextStyle}
        bubbleContainerStyle={bubbleContainerStyle}
        renderThumb={renderThumb ?? defaultThumb}
        thumbWidth={thumbWidth ?? 24}
        thumbScaleValue={thumbScaleValueShared}
        renderMark={renderMark}
        markWidth={markWidth}
        markStyle={markStyle}
        steps={steps}
        stepTimingOptions={stepTimingOptions}
        snapToStep={snapToStep}
        disable={disable ?? disabled}
        disableTapEvent={disableTapEvent}
        disableTrackFollow={disableTrackFollow}
        panHitSlop={panHitSlop}
        activeOffsetX={activeOffsetX}
        activeOffsetY={activeOffsetY}
        failOffsetX={failOffsetX}
        failOffsetY={failOffsetY}
        isScrubbing={isScrubbingValue}
        panDirectionValue={panDirectionValueShared}
        heartbeat={heartbeat}
        hapticMode={hapticMode}
        testID={testID}
      />
    </CyDView>
  );
};

// Default values
const defaultTheme: SliderThemeType = {
  minimumTrackTintColor: '#FFB900',
  maximumTrackTintColor: '#0E0E0E',
  bubbleBackgroundColor: '#FFB900',
  bubbleTextColor: '#181818',
};

const defaultBubble = () => null;

const defaultThumb = () => (
  <CyDView className='w-[24px] h-[24px] bg-white rounded-full flex items-center justify-center'>
    <CyDView className='w-[14px] h-[14px] bg-[#FFB900] rounded-full' />
  </CyDView>
);

const styles = StyleSheet.create({
  defaultContainer: {
    height: 12,
    borderRadius: 12,
  },
});

export default SliderV2;
