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
  CyDMaterialDesignIcons,
} from '../../../../../styles/tailwindComponents';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { screenTitle } from '../../../../../constants';
import AppImages from '../../../../../../assets/images/appImages';

const VerificationFailed = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handleNext = () => {
    navigation.navigate(screenTitle.NAME_ON_CARD);
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CardApplicationHeader />

      <CyDScrollView className='flex-1 px-5'>
        {/* Main Image */}
        <CyDView className='items-center justify-center mt-[100px] mb-[100px]'>
          <CyDImage
            source={AppImages.CARD_APP_VERIFICATION_FAILED_ICON}
            className='w-[166px] h-[166px]'
            resizeMode='contain'
          />
        </CyDView>

        {/* Title and Description */}
        <CyDView>
          <CyDText className='text-[32px] font-normal'>
            Verification Failed
          </CyDText>
          <CyDText className='text-[14px] text-n200 mt-[6px] leading-[22px]'>
            We regret to inform you that your KYC verification has not been
            approved by our banking partner.
          </CyDText>
        </CyDView>

        {/* Error Message Card */}
        <CyDView className='mt-4 bg-red20 rounded-[12px] p-4 border-[1px] border-red200'>
          <CyDView className='flex-row items-start'>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={24}
              className='text-red400 mr-2'
            />
            <CyDText className='text-[14px] text-red400 flex-1'>
              We can&apos;t share the specific reasons for your rejection right
              now, considering your privacy and security.
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDScrollView>

      <CardApplicationFooter
        currentStep={2}
        totalSteps={3}
        currentSectionProgress={40}
        buttonConfig={{
          title: 'Next',
          onPress: handleNext,
        }}
      />
    </CyDSafeAreaView>
  );
};

export default VerificationFailed;
