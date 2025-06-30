import React, { useEffect, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import Video from 'react-native-video';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDSafeAreaView,
  CyDImage,
} from '../../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../../constants';
import AppImages, {
  AppImagesMap,
} from '../../../../../../assets/images/appImages';
import Button from '../../../../../components/v2/button';
import { ButtonType } from '../../../../../constants/enum';

interface RouteParams {
  rewardAmount?: number;
  tokenSymbol?: string;
  message?: string;
}

interface TokenRewardEarnedProps {
  rewardAmount?: number;
  tokenSymbol?: string;
  message?: string;
}

const TokenRewardEarned = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Get props from route params or use dummy data
  const rewardAmount = route.params?.rewardAmount || 100;
  const tokenSymbol = route.params?.tokenSymbol || '$CYPR';
  const congratsMessage =
    route.params?.message ||
    "Congrats on signing up for the card! You've earned it!";

  useEffect(() => {
    // Simulate animation completion after 2 seconds
    const timer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    navigation.navigate(screenTitle.NAME_ON_CARD);
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-black'>
      {/* Background Video */}
      <Video
        source={{ uri: AppImagesMap.common.CYPR_TOKEN_SPIN_WITH_BG.uri }}
        style={styles.backgroundVideo}
        resizeMode='cover'
        repeat={true}
        paused={false}
        muted={true}
        controls={false}
        playInBackground={false}
        playWhenInactive={false}
      />

      {/* Content Overlay */}
      <CyDView className='flex-1 justify-between items-center px-6'>
        {/* Main Content */}
        <CyDView className='flex-1 justify-center items-center mb-16'>
          <CyDView className='flex-1' />
          {/* "You have earned" text */}
          <CyDText className='text-white text-[22px] font-bold text-center mb-[6px]'>
            You have earned
          </CyDText>

          {/* Reward amount badge */}
          <CyDView className='bg-white rounded-full px-[12px] py-1 flex-row items-center mb-4 shadow-lg'>
            <CyDImage
              source={AppImages.CYPR_TOKEN}
              className='w-[28px] h-[28px] mr-2'
              resizeMode='contain'
            />
            <CyDText className='text-black text-[24px] font-bold'>
              {rewardAmount}
            </CyDText>
          </CyDView>

          {/* Congratulations message */}
          <CyDText className='text-[#999999] text-[14px] text-center'>
            {congratsMessage}
          </CyDText>
        </CyDView>

        {/* Continue Button */}
        <CyDView className='w-full px-4 pb-8'>
          <Button
            title='Continue'
            onPress={handleContinue}
            type={ButtonType.PRIMARY}
            style='rounded-full w-full'
            paddingY={16}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
};

const styles = StyleSheet.create({
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
});

export default TokenRewardEarned;
