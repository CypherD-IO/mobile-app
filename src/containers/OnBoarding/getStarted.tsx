import React, { useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenTitle } from '../../constants';

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
            <CyDText className='text-[18px] font-medium text-white mt-[12px]'>
              {
                'Access 20+ chains, manage 1000+ tokens, and send, receive, or swap assets seamlessly.'
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
              {'Zero-Fee Crypto Card'}
            </CyDText>
            <CyDText className='text-[18px] font-medium text-white mt-[20px]'>
              {
                'Make crypto your everyday currency with Cypher . Instantly top up from any wallet using 1,000+ tokens across 25+ chains. Spend globally!'
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
