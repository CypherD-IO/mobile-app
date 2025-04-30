import React from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDImage,
  CyDScrollView,
} from '../../../../../styles/tailwindComponents';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { screenTitle } from '../../../../../constants';
import AppImages from '../../../../../../assets/images/appImages';

const VerificationCompleted = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handleNext = () => {
    navigation.navigate(screenTitle.VERIFICATION_FAILED);
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CardApplicationHeader />

      <CyDScrollView className='flex-1 px-5'>
        {/* Main Image */}
        <CyDView className='items-center justify-center mt-[100px] mb-[100px]'>
          <CyDImage
            source={AppImages.CARD_APP_VERIFICATION_COMPLETED_ICON}
            className='w-[183px] h-[171px]'
            resizeMode='contain'
          />
        </CyDView>

        {/* Title and Description */}
        <CyDView>
          <CyDText className='text-[32px] font-normal'>
            Verification Completed
          </CyDText>
          <CyDText className='text-[14px] text-n200 mt-[6px] leading-[22px]'>
            Great news! Your KYC Verification has been successfully completed,
            you now have full access to all features
          </CyDText>
        </CyDView>
      </CyDScrollView>

      <CardApplicationFooter
        currentStep={2}
        totalSteps={3}
        currentSectionProgress={100}
        buttonConfig={{
          title: 'Next',
          onPress: handleNext,
        }}
      />
    </CyDSafeAreaView>
  );
};

export default VerificationCompleted;
