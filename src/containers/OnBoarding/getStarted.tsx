import React, { useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDScrollView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTitle } from '../../constants';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  scrollContentContainer: {
    flexGrow: 1,
  },
});

function Section2({ handleContinue }: { handleContinue: () => void }) {
  const inset = useSafeAreaInsets();
  return (
    <CyDView className='flex-1 bg-[#171717]' style={{ paddingTop: inset.top }}>
      <CyDScrollView
        className='flex-1'
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}>
        <CyDView className={`h-[55%] bg-[#171717] min-h-[300px]`}>
          <CyDImage
            source={AppImages.ON_BOARDING_1}
            className='w-full h-full'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pb-[120px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'Non Custodial \nCrypto Wallet'}
            </CyDText>
            <CyDText className='text-[18px] font-medium text-white mt-[12px]'>
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

function Section3({ handleContinue }: { handleContinue: () => void }) {
  const inset = useSafeAreaInsets();
  return (
    <CyDView className='flex-1 bg-[#171717]' style={{ paddingTop: inset.top }}>
      <CyDScrollView
        className='flex-1'
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}>
        <CyDView className={`h-[55%] bg-[#171717] min-h-[300px]`}>
          <CyDImage
            source={AppImages.ON_BOARDING_2}
            className='w-full h-full'
          />
        </CyDView>
        <CyDView className='bg-black flex-1'>
          <CyDView className='px-[24px] pb-[120px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'Zero-Fee Crypto Card'}
            </CyDText>
            <CyDText className='text-[18px] font-medium text-white mt-[20px]'>
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

const OnBoardingGetStarted = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleContinue = () => {
    if (currentIndex < 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Navigate to the next screen or handle completion
      navigation.navigate(screenTitle.ONBOARDING_OPTIONS);
    }
  };

  return (
    <>
      {currentIndex === 0 && <Section2 handleContinue={handleContinue} />}
      {currentIndex === 1 && <Section3 handleContinue={handleContinue} />}
    </>
  );
};

export default OnBoardingGetStarted;
