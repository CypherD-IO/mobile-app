import React, { useState, useEffect } from 'react';
import {
  Image,
  TouchableOpacity,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { CyDText, CyDView } from '../../styles/tailwindComponents';
import { AppImagesMap } from '../../../assets/images/appImages';

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
  // State for countdown timer - starting with dummy 59 minutes 41 seconds as shown in screenshot
  const [timeLeft, setTimeLeft] = useState({
    minutes: 59,
    seconds: 41,
  });

  // State to control component visibility
  const [isVisible, setIsVisible] = useState(true);

  /**
   * Effect hook to handle the countdown timer
   * Updates every second to provide real-time countdown functionality
   * Currently doesn't persist across app sessions (as requested)
   */
  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        const { minutes, seconds } = prevTime;

        // If timer reaches 00:00, keep it at 00:00 for now (as requested, no action needed)
        if (minutes === 0 && seconds === 0) {
          return { minutes: 0, seconds: 0 };
        }

        // Decrement seconds, handle minute rollover
        if (seconds > 0) {
          return { minutes, seconds: seconds - 1 };
        } else if (minutes > 0) {
          return { minutes: minutes - 1, seconds: 59 };
        }

        return { minutes: 0, seconds: 0 };
      });
    }, 1000);

    // Cleanup timer on component unmount or visibility change
    return () => clearInterval(timer);
  }, [isVisible]);

  /**
   * Format time values to always show two digits (e.g., 05 instead of 5)
   */
  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  /**
   * Handle SKIP button press - hides the component
   */
  const handleSkip = () => {
    setIsVisible(false);
  };

  // Don't render if component is not visible
  if (!isVisible) {
    return null;
  }

  /**
   * Create dynamic style object based on position props
   * This allows flexible positioning of the floating banner
   */
  const dynamicPositionStyle: ViewStyle = {
    position: 'absolute',
    zIndex: 50,
    ...position, // Spread the position props directly into the style
  };

  return (
    <CyDView style={dynamicPositionStyle}>
      <CyDView className='flex-row items-center justify-between bg-green300 rounded-full p-1 shadow-lg'>
        {/* Left side - Icon (using the green offer code tag image) */}
        <Image
          source={AppImagesMap.common.OFFER_CODE_TAG_GREEN}
          className='w-[28px] h-[28px] mr-2'
          resizeMode='contain'
        />

        {/* Offer text and timer */}
        <CyDView className='flex flex-1 flex-row items-center justify-between'>
          <CyDText className='text-white leading-tight'>
            Get 500 $CYPR as sign up bonus
          </CyDText>

          {/* Countdown timer */}
          <CyDView className='bg-green300 border-[#006731] border-[1px] rounded-full w-[85px] px-2 py-1 items-center'>
            <CyDText className='text-white font-bold text-[14px]'>
              {formatTime(timeLeft.minutes)}m: {formatTime(timeLeft.seconds)}s
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

export default OfferTagComponent;
