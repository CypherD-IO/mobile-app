import React, { useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDScrollView,
} from '../../styles/tailwindComponents';
import AppImages, { AppImagesMap } from '../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { screenTitle } from '../../constants';
import { Platform, StyleSheet, BackHandler, PanResponder } from 'react-native';
import Video from 'react-native-video';
import CypherTokenBottomSheetContent from '../../components/v2/cypherTokenBottomSheetContent';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';

const styles = StyleSheet.create({
  videoContainer: {
    width: '100%',
    height: '100%',
  },
});

// Progress Indicator Component
function ProgressIndicator({
  currentIndex,
  totalSections,
}: {
  currentIndex: number;
  totalSections: number;
}) {
  return (
    <CyDView className='flex-row justify-center items-center pt-4'>
      {Array.from({ length: totalSections }).map((_, index) => {
        const isActive = index === currentIndex;
        const dotStyle = {
          backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
        };

        return (
          <CyDView
            key={index}
            className='w-2 h-2 rounded-full mx-1'
            style={dotStyle}
          />
        );
      })}
    </CyDView>
  );
}

// Bottom Navigation Component
function BottomNavigation({
  currentIndex,
  totalSections,
  onBack,
  onContinue,
}: {
  currentIndex: number;
  totalSections: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  const showBackButton = currentIndex > 0;

  return (
    <CyDView className=' bg-black'>
      {/* Progress Indicators */}
      <ProgressIndicator
        currentIndex={currentIndex}
        totalSections={totalSections}
      />

      {/* Button Row */}
      <CyDView
        className={`flex-row items-center px-4 pb-10 pt-5 ${showBackButton ? 'justify-between' : ''}`}>
        {/* Back Button or Spacer */}
        {showBackButton ? (
          <CyDTouchView
            className='border-2 border-white/30 bg-transparent py-[12px] px-[14px] rounded-[30px] min-w-[100px]'
            onPress={onBack}>
            <CyDText className='text-white text-[16px] font-semibold text-center'>
              {'Back'}
            </CyDText>
          </CyDTouchView>
        ) : (
          <></>
        )}

        {/* Continue Button */}
        <CyDTouchView
          className={`bg-white py-[14px] px-6 rounded-[30px] ${
            showBackButton ? 'ml-3' : 'flex-1'
          }`}
          onPress={onContinue}>
          <CyDText className='text-[16px] font-bold text-center text-black'>
            {'Continue'}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
}

function Section1({ handleContinue }: { handleContinue: () => void }) {
  return (
    <CyDView className='flex-1 bg-[#000000]'>
      <CyDScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}>
        <CyDView className='bg-[#000000] justify-center items-center h-[464px]'>
          <CyDImage
            source={AppImages.ON_BOARDING_2}
            className='w-full h-full'
            resizeMode='cover'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pt-[20px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[12px] font-nord'>
              {'Lowest Fees,\nRewarding Crypto Card'}
            </CyDText>
            <CyDText className='text-[16px] font-medium mt-[20px] !text-[#666666]'>
              {
                'Make crypto your everyday currency with Cypher . Instantly top up from any wallet using 1,000+ tokens across 16+ chains. Spend globally and earn rewards!'
              }
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
}

function Section2({ handleContinue }: { handleContinue: () => void }) {
  return (
    <CyDView className='flex-1 bg-[#000000]'>
      <CyDScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}>
        <CyDView className='bg-[#000000] justify-center items-center  h-[464px]'>
          <CyDImage
            source={AppImages.ON_BOARDING_1}
            className='w-full h-full'
            resizeMode='cover'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pt-[20px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[12px] font-nord'>
              {'Non Custodial \nCrypto Wallet'}
            </CyDText>
            <CyDText className='text-[18px] font-medium mt-[12px] !text-[#666666]'>
              {
                'Access 16+ chains, manage 1000+ tokens, and send, receive, or swap assets seamlessly.'
              }
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
}

function Section3({
  handleContinue,
  onShowTokenDetails,
}: {
  handleContinue: () => void;
  onShowTokenDetails: () => void;
}) {
  const videoContainerHeight = Platform.OS === 'android' ? 350 : 300;

  return (
    <CyDView className='flex-1 bg-black'>
      <CyDScrollView
        className='flex-1'
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps='handled'>
        <CyDView
          className='bg-black justify-center items-center min-h-[300px]'
          style={{ height: videoContainerHeight }}>
          <CyDView className='w-full h-full' pointerEvents={'none'}>
            <Video
              source={{ uri: AppImagesMap.common.CYPR_TOKEN_SPIN.uri }}
              style={styles.videoContainer}
              resizeMode='cover'
              repeat={true}
              paused={false}
              muted={true}
              controls={false}
              playInBackground={false}
              playWhenInactive={false}
            />
          </CyDView>
        </CyDView>
        <CyDView className='bg-black'>
          <CyDView className='px-[24px] pt-[20px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[12px] font-nord'>
              {'Earn $CYPR\nTokens with Every\nPurchase!'}
            </CyDText>
            <CyDText className='text-[18px] font-medium mt-[12px] !text-[#666666]'>
              {
                'Get rewarded on every transaction and boost your rewards as you spend!'
              }
            </CyDText>
            <CyDText className='text-[16px] font-medium mt-[12px] !text-[#666666]'>
              {
                '$CYPR is the reward and governance token used in the Cypher platform.'
              }
            </CyDText>
            <CyDTouchView className='mt-[24px]' onPress={onShowTokenDetails}>
              <CyDText className='text-[16px] font-medium text-white underline'>
                {'See details'}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
}

const OnBoardingGetStarted = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { showBottomSheet } = useGlobalBottomSheet();
  const totalSections = 3;

  /**
   * Handles continue button press across sections
   * Logs current state and navigates to next section or final destination
   */
  const handleContinue = () => {
    if (currentIndex < totalSections - 1) {
      // Move to next section (0 -> 1 -> 2)
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate(screenTitle.ONBOARDING_OPTIONS);
    }
  };

  /**
   * Handles back button press across sections
   * Logs current state and navigates to previous section or exits onboarding
   */
  const handleBack = () => {
    if (currentIndex > 0) {
      // Move to previous section (2 -> 1 -> 0)
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
    } else {
      // If on first section, navigate back to previous screen
      navigation.goBack();
    }
  };

  /**
   * Handles showing the Cypher token details bottom sheet
   * Displays comprehensive token information in a modal
   */
  const handleShowTokenDetails = () => {
    showBottomSheet({
      id: 'cypher-token-details',
      snapPoints: ['75%', Platform.OS === 'android' ? '100%' : '93%'],
      showCloseButton: true,
      scrollable: true,
      content: <CypherTokenBottomSheetContent />,
      backgroundColor: 'rgba(15, 15, 15, 0.95)',
    });
  };

  /**
   * Pan responder for handling swipe gestures
   * Left swipe -> next section, Right swipe -> previous section
   * Includes thresholds to prevent accidental navigation
   */
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes with sufficient movement
      const { dx, dy } = gestureState;
      return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20;
    },

    onPanResponderMove: (evt, gestureState) => {
      // Log gesture progress for debugging
    },

    onPanResponderRelease: (evt, gestureState) => {
      const { dx, vx } = gestureState;
      const swipeThreshold = 100; // Minimum distance for swipe
      const velocityThreshold = 0.5; // Minimum velocity for swipe

      // Check if swipe meets minimum requirements
      const isSignificantSwipe =
        Math.abs(dx) > swipeThreshold || Math.abs(vx) > velocityThreshold;

      if (isSignificantSwipe) {
        if (dx > 0) {
          // Right swipe - go to previous section
          handleBack();
        } else {
          // Left swipe - go to next section
          handleContinue();
        }
      }
    },
  });

  // Handle Android hardware back button
  // Ensures consistent back navigation behavior across platforms
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true; // Prevent default back button behavior
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, [currentIndex]),
  );

  return (
    <CyDView className='flex-1' {...panResponder.panHandlers}>
      {/* Sections */}
      {currentIndex === 0 && <Section1 handleContinue={handleContinue} />}
      {currentIndex === 1 && <Section2 handleContinue={handleContinue} />}
      {currentIndex === 2 && (
        <Section3
          handleContinue={handleContinue}
          onShowTokenDetails={handleShowTokenDetails}
        />
      )}

      {/* Fixed Bottom Navigation */}
      <BottomNavigation
        currentIndex={currentIndex}
        totalSections={totalSections}
        onBack={handleBack}
        onContinue={handleContinue}
      />
    </CyDView>
  );
};

export default OnBoardingGetStarted;
