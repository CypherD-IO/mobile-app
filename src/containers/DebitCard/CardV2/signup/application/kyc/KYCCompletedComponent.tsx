import React from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDScrollView,
} from '../../../../../../styles/tailwindComponents';
import AppImages from '../../../../../../../assets/images/appImages';

const KYCCompletedComponent = () => {
  return (
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
          Great news! Your KYC Verification has been successfully completed, you
          can now create your card
        </CyDText>
      </CyDView>
    </CyDScrollView>
  );
};

export default KYCCompletedComponent;
