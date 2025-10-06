import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ViewStyle,
  DimensionValue,
  Dimensions,
  Pressable,
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
  collapsed?: boolean; // Controls whether the component should be collapsed to the right
}

/**
 * OfferTagComponent - A floating green offer banner with countdown timer
 * This component is positioned absolutely and doesn't take up layout space
 * Features:
 * - Real-time countdown timer
 * - Green rounded banner design matching the provided screenshot
 * - Configurable floating positioning that doesn't affect page layout
 * - Click to expand/collapse functionality
 * - Auto-collapse on interaction outside the component
 * - Responsive design with proper padding and styling
 *
 * @param position - Object containing top, bottom, left, right positioning values
 * @param collapsed - Boolean controlling whether component should be collapsed (slid to right)
 */
const OfferTagComponent: React.FC<OfferTagComponentProps> = ({
  position = { top: 48, left: 16, right: 16 }, // Default position: top with side margins
  collapsed = false, // Default to expanded state
}) => {
  const { remainingMs, totalRewardsPossible } = useOnboardingReward();
  const { statusWiseRewards } = useOnboardingReward();

  // Track whether user has manually expanded the component
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

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
   *  Animation setup (Both Android and iOS)
   * ------------------------------------------------------------------ */

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

  // Shared value driving horizontal slide
  // Initialize with correct value based on collapsed prop to prevent flash
  const translateX = useSharedValue(collapsed ? TARGET_TRANSLATE_X : 0);

  /**
   * Effect to handle collapsed state changes
   * When collapsed prop is true and user hasn't manually expanded, slide to right
   * When collapsed prop is false, always show expanded
   * Only reset manual expansion when transitioning from collapsed to expanded (not on each screen change)
   */
  useEffect(() => {
    // Only reset manual expansion when transitioning TO expanded (collapsed=false)
    // This prevents the brief expand-then-collapse animation when navigating between collapsed screens
    if (!collapsed) {
      setIsManuallyExpanded(false);
      translateX.value = withTiming(0, { duration: 300 });
    } else if (collapsed && !isManuallyExpanded) {
      // Collapse to right only if not manually expanded
      translateX.value = withTiming(TARGET_TRANSLATE_X, { duration: 300 });
    }
  }, [collapsed, TARGET_TRANSLATE_X, translateX, isManuallyExpanded]);

  /**
   * Effect to handle manual expansion animation
   * When user manually expands, animate to full width
   */
  useEffect(() => {
    if (collapsed && isManuallyExpanded) {
      // User manually expanded, show full banner
      translateX.value = withTiming(0, { duration: 300 });
    } else if (collapsed && !isManuallyExpanded) {
      // Ensure it stays collapsed when not manually expanded
      translateX.value = withTiming(TARGET_TRANSLATE_X, { duration: 300 });
    }
  }, [isManuallyExpanded, collapsed, TARGET_TRANSLATE_X, translateX]);

  /**
   * Handle click on the component
   * When collapsed and clicked, expand it
   * When expanded (after manual expansion), clicking anywhere outside should collapse it
   */
  const handlePress = () => {
    if (collapsed) {
      // Toggle the manual expansion state
      setIsManuallyExpanded(!isManuallyExpanded);
    }
  };

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

  /**
   * Auto-collapse when user interacts with screen
   * This effect listens for any touch outside the component to collapse it back
   */
  useEffect(() => {
    if (collapsed && isManuallyExpanded) {
      // Set a timer to auto-collapse after 5 seconds of expansion
      const timer = setTimeout(() => {
        setIsManuallyExpanded(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [collapsed, isManuallyExpanded]);

  if (shouldHide) {
    // Countdown finished – don't render the banner. Hooks have still run above.
    return null;
  }

  return (
    <CyDAnimatedView style={[dynamicPositionStyle, bannerAnimatedStyle]}>
      <Pressable onPress={handlePress}>
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
      </Pressable>
    </CyDAnimatedView>
  );
};

export default OfferTagComponent;
