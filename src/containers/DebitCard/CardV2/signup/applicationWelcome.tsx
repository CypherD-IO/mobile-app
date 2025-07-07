import React, { useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
import Video from 'react-native-video';
import { BlurView } from '@react-native-community/blur';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
} from '../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../constants';
import { t } from 'i18next';
import AppImages, {
  AppImagesMap,
} from '../../../../../assets/images/appImages';
import OfferTagComponent from '../../../../components/v2/OfferTagComponent';
import ExclusiveOfferModal from '../../../../components/v2/exclusiveOfferModal';
import { useOnboardingReward } from '../../../../contexts/OnboardingRewardContext';
import {
  useTheme as useAppTheme,
  Theme,
} from '../../../../reducers/themeReducer';

interface StepData {
  id: number;
  title: string;
  description: string;
  icon: AppImages;
}

interface StepItemProps {
  step: StepData;
  isLast: boolean;
}

const StepItem = ({ step, isLast }: StepItemProps) => {
  return (
    <CyDView>
      <CyDView className='flex-row px-4'>
        <CyDView className='mr-4'>
          <CyDText className='text-[20px] font-semibold'>{step.id}</CyDText>
        </CyDView>

        <CyDView className='flex-1 pr-2'>
          <CyDText className='text-[20px] font-[500] mb-1'>
            {step.title}
          </CyDText>
          <CyDText className='text-[14px] text-n200'>
            {step.description}
          </CyDText>
        </CyDView>

        <CyDView className='w-[82px] h-[82px] justify-center items-center'>
          <CyDImage source={step.icon} className='w-[82px] h-[82px]' />
        </CyDView>
      </CyDView>
      {!isLast && (
        <CyDView className='my-6 relative'>
          <CyDView className='h-[1px] bg-n40 absolute left-[-16px] right-[-16px]' />
        </CyDView>
      )}
    </CyDView>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    position: 'absolute',
    top: 100,
    left: '50%',
    marginLeft: -150, // Half of 432px to center horizontally
    width: 300,
    height: 520,
  },
  blurContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});

const ApplicationWelcome = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [showExclusiveOfferModal, setShowExclusiveOfferModal] = useState(false);
  const {
    isRewardSlotAvailable,
    totalRewardsPossible,
    createTracking,
    deadline,
  } = useOnboardingReward();

  const { theme } = useAppTheme();
  const colorScheme = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Dynamic background colour for the step container. Use a light translucent
  // white in light-mode and a dark translucent black/grey in dark-mode so that
  // the design matches platform conventions.
  const containerBgColor = isDarkMode
    ? 'rgba(22, 22, 22, 0.90)'
    : 'rgba(255, 255, 255, 0.90)';

  console.log('deadline : ', deadline);
  console.log('isRewardSlotAvailable : ', isRewardSlotAvailable);

  // Show modal once when reward slot is available
  React.useEffect(() => {
    if (isRewardSlotAvailable && !deadline) {
      setTimeout(() => {
        setShowExclusiveOfferModal(true);
      }, 500);
    }
  }, [isRewardSlotAvailable, deadline]);

  // Handle video playback based on screen focus
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused - start video
      setIsVideoPaused(true);

      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsVideoPaused(false); // Start playing (paused = false)
      }, 100);

      return () => {
        // Screen is unfocused - pause video
        clearTimeout(timer);
        setIsVideoPaused(true); // Pause video (paused = true)
      };
    }, []),
  );

  const steps: StepData[] = [
    {
      id: 1,
      title: t('INTRODUCE_YOURSELF'),
      description: t('INTRODUCE_YOURSELF_DESCRIPTION'),
      icon: AppImages.CARD_APP_INTRO_ICON,
    },
    {
      id: 2,
      title: t('VERIFY_YOUR_IDENTITY'),
      description: t('VERIFY_YOUR_IDENTITY_DESCRIPTION'),
      icon: AppImages.CARD_APP_ID_VERIFICATION_ICON,
    },
    {
      id: 3,
      title: t('GET_YOUR_CARD_AND_ACTIVATE'),
      description: t('GET_YOUR_CARD_AND_ACTIVATE_DESCRIPTION'),
      icon: AppImages.CARD_APP_ACTIVATE_CARD_ICON,
    },
  ];

  const handleNext = () => {
    navigation.navigate(screenTitle.ENTER_REFERRAL_CODE);
  };

  const handleBack = () => {
    navigation.navigate(screenTitle.PORTFOLIO);
  };

  const handleExclusiveOfferClose = () => {
    // Ensure backend updates before closing the modal, without breaking the expected void return type
    createTracking()
      .catch(error => {
        console.log('createTracking error', error);
      })
      .finally(() => {
        setShowExclusiveOfferModal(false);
      });
  };

  return (
    <CyDView className='flex-1 bg-n0'>
      <CyDView className='flex-1' style={{ paddingTop: insets.top }}>
        {/* Background Video */}
        <Video
          source={{
            uri: isDarkMode
              ? AppImagesMap.common.VIRTUAL_CARD_VERTICAL_SPIN.uri
              : AppImagesMap.common.VIRTUAL_CARD_VERTICAL_SPIN_WHITE_BG.uri,
          }}
          style={styles.videoContainer}
          resizeMode='cover'
          repeat={true}
          paused={isVideoPaused}
          muted={true}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          onLoad={() => {
            // Video loaded successfully, ensure it starts playing
            setIsVideoPaused(false);
          }}
          onError={error => {
            console.log('Video playback error:', error);
          }}
        />

        {/* Header */}
        <CyDView className='flex-row justify-between items-center px-4 py-2'>
          <CyDText className='text-[32px] font-medium'>{t('CARDS')}</CyDText>
          <CyDTouchView onPress={handleBack}>
            <CyDView className='flex-row items-center gap-1 bg-base40 px-6 py-2 rounded-full'>
              <CyDText className='font-medium'>Skip</CyDText>
            </CyDView>
          </CyDTouchView>
        </CyDView>

        {/* Spacer to push content to bottom */}
        <CyDView className='flex-1' />

        {/* Bottom Content Container with Blur Effect */}
        {Platform.OS === 'ios' ? (
          <BlurView
            style={[
              styles.blurContainer,
              { backgroundColor: containerBgColor },
            ]}
            blurType={isDarkMode ? 'dark' : 'light'}
            blurAmount={10}
            reducedTransparencyFallbackColor={containerBgColor}>
            {/* Title */}
            <CyDView className='mb-4 mt-6 items-center'>
              <CyDText className='text-[22px] font-bold'>
                {t('GET_YOUR_CYPHER_CARD')}
              </CyDText>
              <CyDText className='text-[22px] mb-4 font-bold'>
                {t('IN_UNDER_5_MINUTES')}
              </CyDText>
            </CyDView>

            {/* Steps */}
            <CyDView className='mb-[60px]'>
              {steps.map((step, index) => (
                <StepItem
                  key={step.id}
                  step={step}
                  isLast={index === steps.length - 1}
                />
              ))}
            </CyDView>

            {/* Offer Tag Component - using relative positioning within container */}
            <OfferTagComponent position={{ bottom: 94, left: 16, right: 16 }} />

            {/* Continue Button */}
            <CyDTouchView
              className='bg-[#F7C645] py-[14px] rounded-[30px]'
              onPress={handleNext}>
              <CyDText className='text-[20px] font-bold text-center text-black'>
                {'Continue'}
              </CyDText>
            </CyDTouchView>
          </BlurView>
        ) : (
          <CyDView
            style={[
              styles.blurContainer,
              { backgroundColor: containerBgColor },
            ]}>
            {/* Title */}
            <CyDView className='mb-4 mt-6 items-center'>
              <CyDText className='text-[22px] font-bold'>
                {t('GET_YOUR_CYPHER_CARD')}
              </CyDText>
              <CyDText className='text-[22px] mb-4 font-bold'>
                {t('IN_UNDER_5_MINUTES')}
              </CyDText>
            </CyDView>

            {/* Steps */}
            <CyDView className='mb-[60px]'>
              {steps.map((step, index) => (
                <StepItem
                  key={step.id}
                  step={step}
                  isLast={index === steps.length - 1}
                />
              ))}
            </CyDView>

            {/* Offer Tag Component - using relative positioning within container */}
            <OfferTagComponent position={{ bottom: 94, left: 16, right: 16 }} />

            {/* Continue Button */}
            <CyDTouchView
              className='bg-[#F7C645] py-[14px] rounded-[30px]'
              onPress={handleNext}>
              <CyDText className='text-[20px] font-bold text-center text-black'>
                {'Continue'}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )}
      </CyDView>

      {/* Bottom Inset Background */}
      <CyDView
        style={{ backgroundColor: containerBgColor, height: insets.bottom }}
      />

      {/* Exclusive Offer Modal */}
      <ExclusiveOfferModal
        isVisible={showExclusiveOfferModal}
        onClickGotIt={handleExclusiveOfferClose}
        onSeeDetails={() => {
          console.log('Card signup - exclusive offer see details clicked');
        }}
        rewardAmount={totalRewardsPossible}
      />
    </CyDView>
  );
};

export default ApplicationWelcome;
