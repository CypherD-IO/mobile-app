import React, { useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { BlurView } from '@react-native-community/blur';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDScrollView,
  CyDTouchView,
  CyDIcons,
} from '../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../constants';
import { t } from 'i18next';
import AppImages, {
  AppImagesMap,
} from '../../../../../assets/images/appImages';
import CardApplicationHeader from '../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../components/v2/CardApplicationFooter';
import OfferTagComponent from '../../../../components/v2/OfferTagComponent';

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
          <CyDText className='text-[20px] font-semibold text-white'>
            {step.id}
          </CyDText>
        </CyDView>

        <CyDView className='flex-1 pr-2'>
          <CyDText className='text-[20px] font-[500] mb-1 text-white'>
            {step.title}
          </CyDText>
          <CyDText className='text-[14px] text-gray-300'>
            {step.description}
          </CyDText>
        </CyDView>

        <CyDView className='w-[82px] h-[82px] justify-center items-center'>
          <CyDImage source={step.icon} className='w-[82px] h-[82px]' />
        </CyDView>
      </CyDView>
      {!isLast && (
        <CyDView className='my-6 relative'>
          <CyDView className='h-[1px] bg-white/20 absolute left-[-16px] right-[-16px]' />
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
    backgroundColor: 'rgba(22, 22, 22, 0.90)',
  },
});

const ApplicationWelcome = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const [isVideoPaused, setIsVideoPaused] = useState(true);

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

  return (
    <CyDView className='flex-1 bg-black'>
      <CyDView className='flex-1' style={{ paddingTop: insets.top }}>
        {/* Background Video */}
        <Video
          source={{ uri: AppImagesMap.common.VIRTUAL_CARD_VERTICAL_SPIN.uri }}
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
          <CyDText className='text-[32px] font-medium text-white'>
            {t('CARDS')}
          </CyDText>
          <CyDTouchView onPress={handleBack}>
            <CyDView className='flex-row items-center gap-1 bg-white/20 px-6 py-2 rounded-full'>
              <CyDText className='text-white font-medium'>Skip</CyDText>
            </CyDView>
          </CyDTouchView>
        </CyDView>

        {/* Spacer to push content to bottom */}
        <CyDView className='flex-1' />

        {/* Bottom Content Container with Blur Effect */}
        <BlurView
          style={styles.blurContainer}
          blurType='dark'
          blurAmount={10}
          reducedTransparencyFallbackColor='rgba(0, 0, 0, 0.7)'>
          {/* Title */}
          <CyDView className='mb-4 mt-6 items-center'>
            <CyDText className='text-[22px] text-white font-bold'>
              {t('GET_YOUR_CYPHER_CARD')}
            </CyDText>
            <CyDText className='text-[22px] mb-4 text-white font-bold'>
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
      </CyDView>

      {/* Bottom Inset Background */}
      <CyDView
        style={{
          height: insets.bottom,
          backgroundColor: 'rgba(22, 22, 22, 100)',
        }}
      />
    </CyDView>
  );
};

export default ApplicationWelcome;
