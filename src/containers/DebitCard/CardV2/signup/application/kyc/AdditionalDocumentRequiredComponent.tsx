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
import { t } from 'i18next';

interface AdditionalDocumentRequiredComponentProps {
  onSubmitDocuments?: () => void;
}

const AdditionalDocumentRequiredComponent = ({
  onSubmitDocuments,
}: AdditionalDocumentRequiredComponentProps) => {
  return (
    <CyDScrollView className='flex-1 px-5'>
      {/* Main Image */}
      <CyDView className='items-center justify-center my-8'>
        <CyDImage
          source={AppImages.CARD_APP_ADDITIONAL_DOCUMENT_ICON}
          className='w-[193px] h-[196px]'
          resizeMode='contain'
        />
      </CyDView>

      {/* Title and Subtitle */}
      <CyDText className='text-[30px]'>
        {t('ADDITIONAL_DOCUMENT_REQUIRED')}
      </CyDText>
      <CyDText className='text-[14px] font-medium text-n200 mt-[6px]'>
        Could you share a few more details so we can wrap up your verification?
      </CyDText>

      {/* Action Required Card */}
      <CyDView className='mt-6 bg-p0 rounded-[12px] p-4 border-[1px] border-p400'>
        <CyDView className='flex-row items-start'>
          <CyDMaterialDesignIcons
            name='information-outline'
            size={24}
            className='text-p400 mr-2'
          />
          <CyDView className='flex-1'>
            <CyDText className='text-[18px] font-medium text-p400'>
              Action Required
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDText className='text-[14px] text-p400 mt-1'>
          {t('ADDITIONAL_DOCUMENT_REQUIRED_DESCRIPTION')}
        </CyDText>

        {/* Upload Button */}
        <CyDTouchView
          className='flex-row items-center justify-between bg-white rounded-[8px] px-4 py-[15px] mt-4'
          onPress={onSubmitDocuments}>
          <CyDText className='text-base400 text-[16px] font-medium'>
            Submit Additional details
          </CyDText>
          <CyDMaterialDesignIcons
            name='open-in-new'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
      </CyDView>
    </CyDScrollView>
  );
};

export default AdditionalDocumentRequiredComponent;
