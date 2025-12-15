import React, { useState, useEffect, useMemo } from 'react';
import { TextInput, Dimensions } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDFastImage,
} from '../../../styles/tailwindComponents';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock token data for demo
const MOCK_TOKENS = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    logoUrl:
      'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    price: 1.0,
    balance: 10.0,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    price: 1.0,
    balance: 0,
  },
};

interface SwapWidgetProps {
  isVisible: boolean;
  onClose?: () => void;
}

// Individual particle component for the widget forming animation
interface WidgetParticleProps {
  index: number;
  totalParticles: number;
  isVisible: boolean;
  widgetWidth: number;
  widgetHeight: number;
  collapseCenter: { x: number; y: number };
}

const WidgetParticle: React.FC<WidgetParticleProps> = ({
  index,
  totalParticles,
  isVisible,
  widgetWidth,
  widgetHeight,
  collapseCenter,
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

  // Memoize random values so they stay consistent
  const randomValues = useMemo(
    () => ({
      startX: widgetWidth / 2 + (Math.random() - 0.5) * 200,
      startY: widgetHeight / 2 + (Math.random() - 0.5) * 200,
      delay: Math.random() * 200,
      duration: 400 + Math.random() * 150,
      reverseDelay: Math.random() * 100,
    }),
    [widgetWidth, widgetHeight],
  );

  useEffect(() => {
    if (isVisible) {
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

      // BorderRadius: circle to sharp rectangle (0 = no rounded edges)
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

export const SwapWidget: React.FC<SwapWidgetProps> = ({
  isVisible,
  onClose,
}) => {
  const [fromToken, setFromToken] = useState(MOCK_TOKENS.USDC);
  const [toToken, setToToken] = useState(MOCK_TOKENS.USDT);
  const [fromAmount, setFromAmount] = useState('10');
  const [shouldRender, setShouldRender] = useState(false);

  // Content opacity for revealing after particles form
  const contentOpacity = useSharedValue(0);

  // Calculate output amount (1:1 for stablecoins demo)
  const toAmount = (parseFloat(fromAmount) || 0) * 1.0017674;
  const fromUsdValue = (parseFloat(fromAmount) || 0) * fromToken.price;
  const toUsdValue = toAmount * toToken.price;

  const widgetWidth = SCREEN_WIDTH - 32; // 16px margin on each side
  const widgetHeight = 280;
  const particleCount = 24; // 6x4 grid for the widget

  // Collapse point (center of widget)
  const collapseCenter = { x: widgetWidth / 2, y: widgetHeight / 2 };

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

  const handleToggleTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
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
            collapseCenter={collapseCenter}
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

        {/* From Section */}
        <CyDView className='mb-[8px]'>
          <CyDView className='flex-row justify-between items-center mb-[4px]'>
            <CyDText className='text-[14px] text-n200 font-medium'>
              From
            </CyDText>
            <CyDTouchView className='flex-row items-center'>
              <CyDText className='text-[14px] text-base400 font-semibold mr-[4px]'>
                {fromToken.symbol}
              </CyDText>
              <CyDFastImage
                source={{ uri: fromToken.logoUrl }}
                className='w-[32px] h-[32px] rounded-full'
              />
              <CyDMaterialDesignIcons
                name='chevron-down'
                size={20}
                className='text-base400 ml-[2px]'
              />
            </CyDTouchView>
          </CyDView>

          <CyDView className='flex-row justify-between items-end'>
            <CyDView>
              <TextInput
                className='text-[32px] font-bold text-base400 p-0'
                value={fromAmount}
                onChangeText={setFromAmount}
                keyboardType='numeric'
                placeholder='0'
                placeholderTextColor='#A0AEC0'
              />
              <CyDText className='text-[12px] text-n200 mt-[2px]'>
                ${fromUsdValue.toFixed(6)}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Swap Toggle Divider */}
        <CyDView className='flex-row items-center justify-center my-[8px]'>
          <CyDView className='flex-1 h-[1px] bg-n40' />
          <CyDTouchView
            onPress={handleToggleTokens}
            className='mx-[12px] p-[4px]'>
            <CyDMaterialDesignIcons
              name='swap-vertical'
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDView className='flex-1 h-[1px] bg-n40' />
        </CyDView>

        {/* To Section */}
        <CyDView>
          <CyDView className='flex-row justify-between items-center mb-[4px]'>
            <CyDText className='text-[14px] text-n200 font-medium'>To</CyDText>
            <CyDTouchView className='flex-row items-center'>
              <CyDText className='text-[14px] text-base400 font-semibold mr-[4px]'>
                {toToken.symbol}
              </CyDText>
              <CyDFastImage
                source={{ uri: toToken.logoUrl }}
                className='w-[32px] h-[32px] rounded-full'
              />
              <CyDMaterialDesignIcons
                name='chevron-down'
                size={20}
                className='text-base400 ml-[2px]'
              />
            </CyDTouchView>
          </CyDView>

          <CyDView>
            <CyDText className='text-[32px] font-bold text-base400'>
              {toAmount.toFixed(6)}
            </CyDText>
            <CyDText className='text-[12px] text-n200 mt-[2px]'>
              ${toUsdValue.toFixed(6)}
            </CyDText>
          </CyDView>
        </CyDView>
      </AnimatedView>
    </CyDView>
  );
};
