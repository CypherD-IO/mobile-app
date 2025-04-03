import React, { useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDSafeAreaView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTitle } from '../../constants';

function Section1({ handleContinue }: { handleContinue: () => void }) {
  return (
    <CyDSafeAreaView className='flex-1 bg-[#FFBF15]'>
      <CyDView className=' flex-1 ml-[24px]'>
        <CyDText className='text-[22px] font-bold text-black mt-[24px]'>
          {'Cypher'}
        </CyDText>
        <CyDView className='flex-1 justify-center'>
          <CyDText className='text-[44px] font-medium text-goldText'>
            {'Get Ready to'}
          </CyDText>
          <CyDText className='text-white leading-[120%] text-[44px] font-medium'>
            {'Supercharge your'}
          </CyDText>
          <CyDText className='text-goldText leading-[120%] text-[44px] font-medium'>
            {'Crypto Spending'}
          </CyDText>
          <CyDText className='text-goldText leading-[120%] text-[44px] font-medium'>
            {'journey'}
          </CyDText>
        </CyDView>
      </CyDView>

      <CyDTouchView
        className='bg-white mx-[16px] py-[14px] rounded-[30px]'
        onPress={handleContinue}>
        <CyDText className='text-[20px] font-bold text-center text-black'>
          {'Continue'}
        </CyDText>
      </CyDTouchView>
    </CyDSafeAreaView>
  );
}

function Section2({ handleContinue }: { handleContinue: () => void }) {
  const inset = useSafeAreaInsets();
  return (
    <CyDView className='flex-1 bg-[#171717]' style={{ paddingTop: inset.top }}>
      <CyDView className={`h-[55%] bg-[#171717]`}>
        <CyDImage source={AppImages.ON_BOARDING_1} className='w-full h-full' />
      </CyDView>
      <CyDView className='bg-black flex-1'>
        <CyDView className=' flex-1 justify-between'>
          <CyDView className='px-[24px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'Non Custodial \nCrypto Wallet'}
            </CyDText>
            <CyDText className='text-[18px] font-medium text-[#C2C7D0] mt-[12px]'>
              {
                'You can support over 16+ chains and more than 1000+ tokens! Keep an eye on DeFi, NFTs, and easily send or receive from any wallet.'
              }
            </CyDText>
          </CyDView>
          <CyDTouchView
            className='bg-white py-[14px] mx-[16px] rounded-[30px] mb-[40px]'
            onPress={handleContinue}>
            <CyDText className='text-[20px] font-bold text-center text-black'>
              {'Continue'}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

function Section3({ handleContinue }: { handleContinue: () => void }) {
  const inset = useSafeAreaInsets();
  return (
    <CyDView className='flex-1 bg-[#171717]' style={{ paddingTop: inset.top }}>
      <CyDView className={`h-[55%] bg-[#171717]`}>
        <CyDImage source={AppImages.ON_BOARDING_2} className='w-full h-full' />
      </CyDView>
      <CyDView className='bg-black flex-1'>
        <CyDView className=' flex-1 justify-between'>
          <CyDView className='px-[24px]'>
            <CyDText className='text-[32px] font-bold text-white mt-[38px] font-nord'>
              {'VISA Powered \nCrypto card '}
            </CyDText>
            <CyDText className='text-[18px] font-medium text-[#C2C7D0] mt-[20px]'>
              {
                'Use your crypto at over 60 million places worldwide without worrying about currency conversion!'
              }
            </CyDText>
          </CyDView>
          <CyDTouchView
            className='bg-white py-[14px] mx-[16px] rounded-[30px] mb-[40px]'
            onPress={handleContinue}>
            <CyDText className='text-[20px] font-bold text-center text-black'>
              {'Continue'}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const OnBoardingGetStarted = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleContinue = () => {
    if (currentIndex < 2) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Navigate to the next screen or handle completion
      navigation.navigate(screenTitle.ONBOARDING_OPTIONS);
    }
  };

  return (
    <>
      {currentIndex === 0 && <Section1 handleContinue={handleContinue} />}
      {currentIndex === 1 && <Section2 handleContinue={handleContinue} />}
      {currentIndex === 2 && <Section3 handleContinue={handleContinue} />}
    </>
  );
};

export default OnBoardingGetStarted;
