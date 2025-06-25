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
import { StyleSheet } from 'react-native';
import Video from 'react-native-video';
import CypherTokenModal from '../../components/v2/cypherTokenModal';
import ExclusiveOfferModal from '../../components/v2/exclusiveOfferModal';

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
        <CyDView className={`h-[55%] bg-[#000000] min-h-[300px] max-h-[480px]`}>
          <CyDImage
            source={AppImages.ON_BOARDING_2}
            className='w-full h-full'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pt-[20px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'Zero Fee,\nRewarding Crypto Card'}
            </CyDText>
            <CyDText className='text-[16px] font-medium text-[#666666] mt-[20px]'>
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
        <CyDView className={`h-[55%] bg-[#000000] min-h-[300px] max-h-[480px]`}>
          <CyDImage
            source={AppImages.ON_BOARDING_1}
            className='w-full h-full'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pt-[20px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'Non Custodial \nCrypto Wallet'}
            </CyDText>
            <CyDText className='text-[18px] font-medium text-[#666666] mt-[12px]'>
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
            <CyDText className='text-[18px] font-medium text-[#666666] mt-[12px]'>
              {
                'Get rewarded on every transaction and boost your rewards as you spend!'
              }
            </CyDText>
            <CyDText className='text-[16px] font-medium text-[#666666] mt-[12px]'>
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
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showExclusiveOfferModal, setShowExclusiveOfferModal] = useState(false);

  const handleContinue = () => {
    if (currentIndex < 2) {
      // Move to next section (0 -> 1 -> 2)
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
    } else {
      // Show exclusive offer modal after Section3 (index 2)
      setShowExclusiveOfferModal(true);
    }
  };

  const handleExclusiveOfferClose = () => {
    try {
      setShowExclusiveOfferModal(false);
      setTimeout(() => {
        navigation.navigate(screenTitle.ONBOARDING_OPTIONS);
      }, 500);
    } catch (error) {}
  };

  return (
    <>
      {currentIndex === 0 && <Section1 handleContinue={handleContinue} />}
      {currentIndex === 1 && <Section2 handleContinue={handleContinue} />}
      {currentIndex === 2 && (
        <Section3
          handleContinue={handleContinue}
          onShowTokenDetails={() => setShowTokenModal(true)}
        />
      )}

      <CypherTokenModal
        isVisible={showTokenModal}
        onClose={() => setShowTokenModal(false)}
      />

      <ExclusiveOfferModal
        isVisible={showExclusiveOfferModal}
        onClose={handleExclusiveOfferClose}
        onSeeDetails={() => {
          // Optional: Handle see details if needed
          console.log(
            'OnBoarding GetStarted - exclusive offer see details clicked',
          );
        }}
      />
    </>
  );
};

export default OnBoardingGetStarted;
