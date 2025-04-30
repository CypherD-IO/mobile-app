import React from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
} from '../../../../../../styles/tailwindComponents';
import AppImages from '../../../../../../../assets/images/appImages';

interface Props {
  onStart: () => void;
}

const KYCIntroComponent = () => {
  return (
    <CyDView className='flex-1 px-5'>
      {/* Flex container for image */}
      <CyDView className='flex-1 items-center justify-center'>
        <CyDImage
          source={AppImages.CARD_APP_FACE_RECOGNITION_FRAME}
          className='w-[146px] h-[170px]'
          resizeMode='contain'
        />
      </CyDView>

      {/* Text content container - positioned 75px from bottom */}
      <CyDView className='mb-[75px]'>
        {/* Title Section */}
        <CyDText className='text-n200 text-sm font-medium'>Step-II</CyDText>
        <CyDText className='text-[32px] mt-3'>KYC Verification</CyDText>

        {/* Description */}
        <CyDText className='text-n200 font-normal text-[14px] mt-[6px]'>
          To set up your account, please bring your ID. Ensure the selected
          country matches your documents. We will conduct a dynamic facial
          recognition check for enhanced security.
        </CyDText>

        {/* Warning Text */}
        <CyDText className='text-p300 text-[14px] mt-3'>
          Please ensure to look directly at the camera during facial dynamic
          recognition authentication.
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

export default KYCIntroComponent;
