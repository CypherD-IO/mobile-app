import React from 'react';
import { Image, ViewStyle, DimensionValue } from 'react-native';
import { CyDText, CyDView } from '../../styles/tailwindComponents';
import { AppImagesMap } from '../../../assets/images/appImages';
import { useOnboardingReward } from '../../contexts/OnboardingRewardContext';

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

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  const formatTime = (value: number) => String(value).padStart(2, '0');

  if (remainingMs <= 0) {
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
            Get {totalRewardsPossible} $CYPR as sign up bonus
          </CyDText>

          {/* Countdown timer */}
          <CyDView className='bg-green300 border-[#006731] border-[1px] rounded-full w-[85px] px-2 py-1 items-center'>
            <CyDText className='text-white font-bold text-[14px]'>
              {formatTime(minutes)}m: {formatTime(seconds)}s
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

export default OfferTagComponent;
