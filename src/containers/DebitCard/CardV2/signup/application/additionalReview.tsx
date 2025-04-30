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
  CyDTouchView,
  CyDScrollView,
  CyDMaterialDesignIcons,
} from '../../../../../styles/tailwindComponents';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { screenTitle } from '../../../../../constants';
import AppImages from '../../../../../../assets/images/appImages';

const AdditionalReview = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handleRefresh = () => {
    // TODO: Implement refresh logic to check KYC status
    console.log('Refreshing KYC status...');
  };

  const handleNext = () => {
    navigation.navigate(screenTitle.VERIFICATION_COMPLETED);
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CardApplicationHeader />

      <CyDScrollView className='flex-1 px-5'>
        {/* Main Image */}
        <CyDView className='items-center justify-center my-8'>
          <CyDImage
            source={AppImages.CARD_APP_DOCUMENT_REVIEW_ICON}
            className='w-[208px] h-[208px]'
            resizeMode='contain'
          />
        </CyDView>

        {/* Title and Subtitle */}
        <CyDText className='text-[32px]'>Additional Review</CyDText>
        <CyDText className='text-[14px] font-medium text-n200 mt-[6px]'>
          We&apos;re currently processing your document with care.
        </CyDText>

        {/* Processing Time Info */}
        <CyDView className='mt-6 border-[1px] border-n40 rounded-[12px] p-4'>
          <CyDView className='flex-row items-start mb-4'>
            <CyDMaterialDesignIcons
              name='clock-time-three'
              size={24}
              className='text-base400 mr-2'
            />
            <CyDText className='text-[14px] flex-1'>
              The additional review generally requires{' '}
              <CyDText className='font-bold'>3 to 5 business</CyDText> days for
              completion.
            </CyDText>
          </CyDView>

          {/* Email Notification */}
          <CyDView className='flex-row items-start border-t-[1px] border-n40 pt-4'>
            <CyDMaterialDesignIcons
              name='email'
              size={24}
              className='text-base400 mr-2'
            />
            <CyDText className='text-[14px] flex-1'>
              You&apos;ll receive an email as soon as your KYC verification is
              complete
            </CyDText>
          </CyDView>
        </CyDView>

        {/* KYC Status */}
        <CyDText className='text-[14px] text-n200 mt-6'>KYC Status</CyDText>
        <CyDView className='border-[1px] border-n40 rounded-[12px] p-3 mt-1'>
          <CyDView className='flex-row items-center'>
            <CyDView className='w-3 h-3 rounded-full bg-p200 mr-2' />
            <CyDText className='text-p300 text-[18px] font-medium'>
              In progress
            </CyDText>
            <CyDTouchView
              className='ml-auto bg-n30 rounded-[8px] px-4 py-[9px]'
              onPress={handleRefresh}>
              <CyDView className='flex-row items-center'>
                <CyDMaterialDesignIcons
                  name='refresh'
                  size={20}
                  className='text-base400 mr-1'
                />
                <CyDText className='text-base400 text-[14px]'>Refresh</CyDText>
              </CyDView>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDScrollView>

      <CardApplicationFooter
        currentStep={2}
        totalSteps={3}
        currentSectionProgress={60}
        buttonConfig={{
          title: 'Next',
          onPress: handleNext,
        }}
      />
    </CyDSafeAreaView>
  );
};

export default AdditionalReview;
