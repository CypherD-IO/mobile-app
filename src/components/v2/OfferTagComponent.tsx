import React, { useEffect, useMemo } from 'react';
import {
  Image,
  ViewStyle,
  DimensionValue,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import {
  CyDText,
  CyDView,
  CyDAnimatedView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { AppImagesMap } from '../../../assets/images/appImages';
import { useOnboardingReward } from '../../contexts/OnboardingRewardContext';
import { get } from 'lodash';

/**
 * Position interface for controlling the floating banner position
 * All values are optional and should be numbers representing pixels or percentage strings
 */
interface OfferTagPosition {
  top?: DimensionValue;
  bottom?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
}

/**
 * Props interface for OfferTagComponent
 */
interface OfferTagComponentProps {
  position?: OfferTagPosition;
}

/**
 * OfferTagComponent - A floating green offer banner with countdown timer
 * This component is positioned absolutely and doesn't take up layout space
 * Features:
 * - Real-time countdown timer
 * - Green rounded banner design matching the provided screenshot
 * - Configurable floating positioning that doesn't affect page layout
 * - SKIP button functionality
 * - Responsive design with proper padding and styling
 *
 * @param position - Object containing top, bottom, left, right positioning values
 */
const OfferTagComponent: React.FC<OfferTagComponentProps> = ({
  position = { top: 48, left: 16, right: 16 }, // Default position: top with side margins
}) => {
  const { remainingMs, totalRewardsPossible } = useOnboardingReward();
  const { statusWiseRewards } = useOnboardingReward();

  const isEligible = useMemo(() => {
    return get(statusWiseRewards, ['kycPending', 'earned'], false);
  }, [statusWiseRewards]);

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const formatTime = (value: number) => String(value).padStart(2, '0');

  const shouldHide = remainingMs <= 0;

  /**
   * Dynamic absolute positioning – keeps existing API unchanged.
   */
  const dynamicPositionStyle: ViewStyle = {
    position: 'absolute',
    zIndex: 50,
    ...position,
  };

  /* ------------------------------------------------------------------
   *  Animation setup (Android only – iOS retains current behaviour)
   * ------------------------------------------------------------------ */

  // Shared value driving horizontal slide
  const translateX = useSharedValue(0);
  // Dimensions for computing target offset
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  // Approximate width that should remain visible when collapsed – includes
  // icon (28) + padding/margin (~20)
  const COLLAPSED_WIDTH = 56;
  const LEFT_MARGIN =
    typeof position.left === 'number' ? position.left : 16; /* default 16px */

  /**
   * How far the banner needs to travel for the icon to reach the right margin
   */
  const TARGET_TRANSLATE_X =
    SCREEN_WIDTH -
    COLLAPSED_WIDTH -
    LEFT_MARGIN; /* right margin ~= LEFT_MARGIN */

  // Animate on keyboard visibility changes (Android only)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      translateX.value = withTiming(TARGET_TRANSLATE_X, { duration: 300 });
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      translateX.value = withTiming(0, { duration: 300 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [TARGET_TRANSLATE_X, translateX]);

  // Animated styles – banner slide
  const bannerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Animated styles – fade out text & timer as banner slides
  const textAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, TARGET_TRANSLATE_X * 0.5, TARGET_TRANSLATE_X],
      [1, 0.3, 0],
      Extrapolate.CLAMP,
    );
    return { opacity };
  });

  if (shouldHide) {
    // Countdown finished – don't render the banner. Hooks have still run above.
    return null;
  }

  return (
    <CyDAnimatedView style={[dynamicPositionStyle, bannerAnimatedStyle]}>
      <CyDView className='flex-row items-center justify-between bg-green300 rounded-full p-1 shadow-lg'>
        {/* Left side - Icon */}
        {isEligible ? (
          <CyDMaterialDesignIcons
            name='check-circle'
            size={28}
            color='white'
            className='mr-2'
          />
        ) : (
          <Image
            source={AppImagesMap.common.OFFER_CODE_TAG_GREEN}
            className='w-[28px] h-[28px] mr-2'
            resizeMode='contain'
          />
        )}

        {/* Offer text and timer (opacity animated) */}
        <CyDAnimatedView
          style={textAnimatedStyle}
          className='flex flex-1 flex-row items-center justify-between'>
          <CyDText className='text-white leading-tight mr-2'>
            {isEligible
              ? 'You are eligible for the sign-up bonus'
              : `Get ${totalRewardsPossible} $CYPR as sign up bonus`}
          </CyDText>

          {/* Countdown timer */}
          {!isEligible && (
            <CyDView className='bg-green300 border-[#006731] border-[1px] rounded-full min-w-[90px] px-2 py-1 items-center'>
              <CyDText className='text-white font-bold text-[14px]'>
                {formatTime(minutes)}m: {formatTime(seconds)}s
              </CyDText>
            </CyDView>
          )}
        </CyDAnimatedView>
      </CyDView>
    </CyDAnimatedView>
  );
};

export default OfferTagComponent;
