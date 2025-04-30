import React from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
  CyDScrollView,
  CyDMaterialDesignIcons,
} from '../../../../../../styles/tailwindComponents';
import AppImages from '../../../../../../../assets/images/appImages';

interface Props {
  onRefresh: () => void;
}

const KYCInProgressComponent = ({ onRefresh }: Props) => {
  return (
    <CyDScrollView className='flex-1 px-5'>
      {/* Main Image */}
      <CyDView className='items-center justify-center my-8'>
        <CyDImage
          source={AppImages.CARD_APP_VERIFICATION_IN_PROGRESS_ICON}
          className='w-[234px] h-[234px]'
          resizeMode='contain'
        />
      </CyDView>

      {/* Title */}
      <CyDText className='text-[32px]'>Verification In-Progress</CyDText>
      <CyDText className='text-[14px] font-medium text-n200'>
        Your KYC is currently in progress. Please wait for a short while as we
        complete the process.{' '}
      </CyDText>

      {/* KYC Status Card */}
      <CyDText className='text-[14px] text-n200 mt-4'>KYC Status</CyDText>
      <CyDView className='border-[1px] border-n40 rounded-[12px] p-3 mt-1'>
        <CyDView className='flex-row items-center'>
          <CyDView className='w-3 h-3 rounded-full bg-p200 mr-2' />
          <CyDText className='text-p300 text-[18px] font-medium'>
            In progress
          </CyDText>
          <CyDTouchView
            className='ml-auto bg-n30 rounded-[8px] px-4 py-[9px]'
            onPress={onRefresh}>
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

      {/* External Browser Note */}
      <CyDView className='mt-6'>
        <CyDText className='text-n200 text-[14px]'>
          If you haven&apos;t finished the KYC process in the external browser,
          just click the button below to continue.
        </CyDText>
        <CyDTouchView className='flex-row items-center justify-between bg-n20 rounded-[8px] px-4 py-[15px] mt-2 border-[1px] border-n40'>
          <CyDView className='flex-row items-center gap-1'>
            <CyDMaterialDesignIcons
              name='face-recognition'
              size={20}
              className='text-base400 mr-1'
            />
            <CyDText className='text-base400 text-[14px]'>
              Continue with KYC
            </CyDText>
          </CyDView>
          <CyDMaterialDesignIcons
            name='open-in-new'
            size={20}
            className='text-base400 mr-1'
          />
        </CyDTouchView>
      </CyDView>

      {/* Time Estimate */}
      <CyDView className='my-6 border-[1px] border-n40 rounded-[12px] p-4'>
        <CyDView className='flex-row items-start mb-4'>
          <CyDMaterialDesignIcons
            name='clock-time-three'
            size={24}
            className='text-base400 mr-2'
          />
          <CyDText className='text-[14px] flex-1'>
            Please wait for 5-10 minutes as we complete this process.
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
            complete.
          </CyDText>
        </CyDView>
      </CyDView>
    </CyDScrollView>
  );
};

export default KYCInProgressComponent;
