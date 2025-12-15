import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dimensions } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../../styles/tailwindComponents';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default height for the widget (will be used for particle calculations)
// This matches approximately what the content height will be
const DEFAULT_WIDGET_HEIGHT = 356;

// Mock approval data
const MOCK_APPROVAL = {
  to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  value: '0.1 ETH',
  functionName: 'approve()',
  tokenSymbol: 'USDC',
  spenderName: 'Uniswap Router',
};

interface ApprovalWidgetProps {
  isVisible: boolean;
  onClose?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

// Individual particle component for the widget forming animation
interface WidgetParticleProps {
  index: number;
  totalParticles: number;
  isVisible: boolean;
  widgetWidth: number;
  widgetHeight: number;
}

const WidgetParticle: React.FC<WidgetParticleProps> = ({
  index,
  totalParticles,
  isVisible,
  widgetWidth,
  widgetHeight,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const borderRadius = useSharedValue(50);

  // Calculate grid position for this particle
  const cols = 6;
  const rows = Math.ceil(totalParticles / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const particleWidth = widgetWidth / cols;
  const particleHeight = widgetHeight / rows;
  const finalX = particleWidth * col;
  const finalY = particleHeight * row;

  // Memoize random values so they stay consistent throughout component lifecycle
  const randomValues = useMemo(
    () => ({
      startX: widgetWidth / 2 + (Math.random() - 0.5) * 200,
      startY: widgetHeight / 2 + (Math.random() - 0.5) * 200,
      delay: Math.random() * 200,
      duration: 400 + Math.random() * 150,
    }),
    // Empty dependency array - values are set once when component mounts
    // This prevents randomValues from changing during the animation lifecycle
    [],
  );

  useEffect(() => {
    if (isVisible) {
      // Appearance animation
      const { startX, startY, delay, duration } = randomValues;

      // Opacity: fade in
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
      );

      // Scale: grow from tiny
      scale.value = withDelay(
        delay,
        withSequence(
          withTiming(0.3, { duration: 100 }),
          withTiming(1.1, {
            duration: duration * 0.7,
            easing: Easing.out(Easing.cubic),
          }),
          withSpring(1, { damping: 12, stiffness: 120 }),
        ),
      );

      // BorderRadius: circle to sharp rectangle
      borderRadius.value = withDelay(
        delay,
        withSequence(
          withTiming(50, { duration: duration * 0.4 }),
          withTiming(0, {
            duration: duration * 0.6,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
      );

      // Move from scattered position to grid position
      translateX.value = withDelay(
        delay,
        withSequence(
          withTiming(startX + (Math.random() - 0.5) * 50, {
            duration: duration * 0.3,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(finalX, {
            duration: duration * 0.7,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          }),
        ),
      );

      translateY.value = withDelay(
        delay,
        withSequence(
          withTiming(startY + (Math.random() - 0.5) * 50, {
            duration: duration * 0.3,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(finalY, {
            duration: duration * 0.7,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          }),
        ),
      );
    } else {
      // Simple fade-out animation (optimized for performance)
      const reverseDuration = 250;

      // Quick fade out
      opacity.value = withTiming(0, { duration: reverseDuration });

      // Shrink to zero
      scale.value = withTiming(0, {
        duration: reverseDuration,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [isVisible]);

  const particleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: particleWidth,
    height: particleHeight,
    backgroundColor: '#FFFFFF',
    opacity: opacity.value,
    borderRadius: borderRadius.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={particleStyle} />;
};

const AnimatedView = Animated.createAnimatedComponent(CyDView);

export const ApprovalWidget: React.FC<ApprovalWidgetProps> = ({
  isVisible,
  onClose,
  onApprove,
  onReject,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const contentOpacity = useSharedValue(0);

  const widgetWidth = SCREEN_WIDTH - 32;
  // Use fixed height like SwapWidget to avoid any dynamic height issues
  const widgetHeight = DEFAULT_WIDGET_HEIGHT;
  const particleCount = 24;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Content fades in after particles form
      contentOpacity.value = withDelay(
        500,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
      );
    } else {
      // Content fades out first
      contentOpacity.value = withTiming(0, { duration: 150 });
      // Then unmount after animation completes
      setTimeout(() => {
        setShouldRender(false);
      }, 500);
    }
  }, [isVisible]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleApprove = (): void => {
    onApprove?.();
    onClose?.();
  };

  const handleReject = (): void => {
    onReject?.();
    onClose?.();
  };

  // Truncate address for display
  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  if (!shouldRender) return null;

  return (
    <CyDView className='mx-[16px]' style={{ height: widgetHeight }}>
      {/* Gradient background - fades in after particles form */}
      <AnimatedView
        style={[
          {
            position: 'absolute',
            left: -16,
            right: -16,
            top: -200,
            bottom: 0,
          },
          contentStyle,
        ]}>
        <LinearGradient
          colors={[
            'rgba(245,246,247,1)',
            'rgba(245,246,247,1)',
            'rgba(245,246,247,0.95)',
            'rgba(245,246,247,0.8)',
            'rgba(245,246,247,0.6)',
            'rgba(245,246,247,0.2)',
            'rgba(245,246,247,0)',
          ]}
          locations={[0, 0.35, 0.45, 0.55, 0.7, 0.85, 1]}
          style={{
            flex: 1,
          }}
        />
      </AnimatedView>

      {/* Particle layer - forms the white background */}
      {/* Always render particles (no conditional) - matches SwapWidget approach */}
      <CyDView
        className='absolute overflow-hidden rounded-[16px]'
        style={{ width: widgetWidth, height: widgetHeight, top: 0 }}>
        {Array.from({ length: particleCount }).map((_, index) => (
          <WidgetParticle
            key={index}
            index={index}
            totalParticles={particleCount}
            isVisible={isVisible}
            widgetWidth={widgetWidth}
            widgetHeight={widgetHeight}
          />
        ))}
      </CyDView>

      {/* Content layer - fades in after particles form */}
      <AnimatedView
        className='absolute p-[16px]'
        style={[
          { width: widgetWidth, height: widgetHeight, top: 0 },
          contentStyle,
        ]}>
        {/* Close button - returns to chat */}
        <CyDTouchView
          onPress={onClose}
          className='absolute top-[12px] right-[12px] w-[32px] h-[32px] rounded-full bg-n40 items-center justify-center z-[10]'>
          <CyDMaterialDesignIcons
            name='close'
            size={18}
            className='text-base400'
          />
        </CyDTouchView>

        {/* Header */}
        <CyDView className='flex-row items-center justify-center mb-[16px]'>
          <CyDMaterialDesignIcons
            name='shield-check-outline'
            size={24}
            className='text-p400 mr-[8px]'
          />
          <CyDText className='text-[18px] font-bold text-base400'>
            Approval Request
          </CyDText>
        </CyDView>

        {/* To Field */}
        <CyDView className='mb-[12px]'>
          <CyDText className='text-[12px] text-n200 font-medium mb-[4px]'>
            To
          </CyDText>
          <CyDView className='bg-n20 rounded-[8px] px-[12px] py-[10px]'>
            <CyDText className='text-[14px] text-base400 font-mono'>
              {truncateAddress(MOCK_APPROVAL.to)}
            </CyDText>
            <CyDText className='text-[11px] text-n200 mt-[2px]'>
              {MOCK_APPROVAL.spenderName}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Value Field */}
        <CyDView className='mb-[12px]'>
          <CyDText className='text-[12px] text-n200 font-medium mb-[4px]'>
            Value
          </CyDText>
          <CyDView className='bg-n20 rounded-[8px] px-[12px] py-[10px]'>
            <CyDText className='text-[16px] text-base400 font-semibold'>
              {MOCK_APPROVAL.value}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Function Field */}
        <CyDView className='mb-[16px]'>
          <CyDText className='text-[12px] text-n200 font-medium mb-[4px]'>
            Function
          </CyDText>
          <CyDView className='bg-n20 rounded-[8px] px-[12px] py-[10px]'>
            <CyDText className='text-[14px] text-p400 font-mono font-medium'>
              {MOCK_APPROVAL.functionName}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Action Buttons */}
        <CyDView className='flex-row justify-between'>
          <CyDTouchView
            onPress={handleReject}
            className='flex-1 mr-[8px] bg-n40 rounded-[12px] py-[14px] items-center justify-center'>
            <CyDText className='text-[16px] font-semibold text-base400'>
              Reject
            </CyDText>
          </CyDTouchView>
          <CyDTouchView
            onPress={handleApprove}
            className='flex-1 ml-[8px] bg-p400 rounded-[12px] py-[14px] items-center justify-center'>
            <CyDText className='text-[16px] font-semibold text-white'>
              Approve
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </AnimatedView>
    </CyDView>
  );
};
