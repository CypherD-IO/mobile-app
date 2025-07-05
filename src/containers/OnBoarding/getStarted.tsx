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
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTitle } from '../../constants';
import { Platform, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import CypherTokenBottomSheetContent from '../../components/v2/cypherTokenBottomSheetContent';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';

const styles = StyleSheet.create({
  scrollContentContainer: {
    paddingBottom: 120, // Ensure enough space for the fixed bottom button
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
});

function Section1({ handleContinue }: { handleContinue: () => void }) {
  const inset = useSafeAreaInsets();
  return (
    <CyDView className='flex-1 bg-[#000000]' style={{ paddingTop: inset.top }}>
      <CyDScrollView
        className='flex-1'
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}>
        <CyDView className='bg-[#000000] justify-center items-center w-[412px] h-[464px]'>
          <CyDImage
            source={AppImages.ON_BOARDING_2}
            className='w-full h-full'
            resizeMode='cover'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pt-[20px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'Zero Fee,\nRewarding Crypto Card'}
            </CyDText>
            <CyDText className='text-[16px] font-medium mt-[20px] !text-[#666666]'>
              {
                'Make crypto your everyday currency with Cypher . Instantly top up from any wallet using 1,000+ tokens across 25+ chains. Spend globally!'
              }
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDScrollView>

      {/* Fixed Continue Button */}
      <CyDView className='absolute bottom-0 left-0 right-0 bg-black px-[16px] pb-[40px] pt-[20px]'>
        <CyDTouchView
          className='bg-white py-[14px] rounded-[30px]'
          onPress={handleContinue}>
          <CyDText className='text-[20px] font-bold text-center text-black'>
            {'Continue'}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
}

function Section2({ handleContinue }: { handleContinue: () => void }) {
  const inset = useSafeAreaInsets();
  return (
    <CyDView className='flex-1 bg-[#000000]' style={{ paddingTop: inset.top }}>
      <CyDScrollView
        className='flex-1'
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}>
        <CyDView className='bg-[#000000] justify-center items-center w-[412px] h-[464px]'>
          <CyDImage
            source={AppImages.ON_BOARDING_1}
            className='w-full h-full'
            resizeMode='cover'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pt-[20px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'Non Custodial \nCrypto Wallet'}
            </CyDText>
            <CyDText className='text-[18px] font-medium mt-[12px] !text-[#666666]'>
              {
                'Access 14+ chains, manage 1000+ tokens, and send, receive, or swap assets seamlessly.'
              }
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDScrollView>

      {/* Fixed Continue Button */}
      <CyDView className='absolute bottom-0 left-0 right-0 bg-black px-[16px] pb-[40px] pt-[20px]'>
        <CyDTouchView
          className='bg-white py-[14px] rounded-[30px]'
          onPress={handleContinue}>
          <CyDText className='text-[20px] font-bold text-center text-black'>
            {'Continue'}
          </CyDText>
        </CyDTouchView>
      </CyDView>
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
  const inset = useSafeAreaInsets();

  return (
    <CyDView className='flex-1 bg-black' style={{ paddingTop: inset.top }}>
      <CyDScrollView
        className='flex-1'
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}>
        <CyDView
          className={`h-[55%] bg-black min-h-[300px] justify-center items-center`}>
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
        <CyDView className='bg-black flex-1'>
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
                'SCYPR is the reward and governance token used in the Cypher platform.'
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

      {/* Fixed Continue Button */}
      <CyDView className='absolute bottom-0 left-0 right-0 bg-black px-[16px] pb-[40px] pt-[20px]'>
        <CyDTouchView
          className='bg-white py-[14px] rounded-[30px]'
          onPress={handleContinue}>
          <CyDText className='text-[20px] font-bold text-center text-black'>
            {'Continue'}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
}

const OnBoardingGetStarted = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { showBottomSheet } = useGlobalBottomSheet();

  /**
   * Handles continue button press across sections
   */
  const handleContinue = () => {
    if (currentIndex < 2) {
      // Move to next section (0 -> 1 -> 2)
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate(screenTitle.ONBOARDING_OPTIONS);
    }
  };

  /**
   * Handles showing the Cypher token details bottom sheet
   */
  const handleShowTokenDetails = () => {
    console.log('Showing Cypher token details bottom sheet');

    showBottomSheet({
      id: 'cypher-token-details',
      snapPoints: ['75%', Platform.OS === 'android' ? '100%' : '93%'],
      showCloseButton: true,
      scrollable: true,
      content: <CypherTokenBottomSheetContent />,
      onClose: () => {
        console.log('Cypher token details bottom sheet closed');
      },
      backgroundColor: 'rgba(15, 15, 15, 0.95)',
    });
  };

  return (
    <>
      {currentIndex === 0 && <Section1 handleContinue={handleContinue} />}
      {currentIndex === 1 && <Section2 handleContinue={handleContinue} />}
      {currentIndex === 2 && (
        <Section3
          handleContinue={handleContinue}
          onShowTokenDetails={handleShowTokenDetails}
        />
      )}
    </>
  );
};

export default OnBoardingGetStarted;
