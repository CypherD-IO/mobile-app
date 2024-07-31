import React from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';

export default function CardControls() {
  return (
    <CyDSafeAreaView className={'h-full bg-white pt-[10px]'}>
      <CyDView className='mx-[16px]'>
        <CyDText className='text-xs text-n200 font-bold'>
          Spend Category
        </CyDText>
        <CyDView className='flex flex-row bg-white rounded-[10px] p-[12px] justify-between items-center'>
          <CyDText className='text-[18px] font-medium tr'>
            Domestic Transactions
          </CyDText>
          <CyDImage
            source={AppImages.RIGHT_ARROW}
            className='w-[20px] h-[20px]'></CyDImage>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
