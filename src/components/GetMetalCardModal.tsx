import React from 'react';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDFastImage,
} from '../styles/tailwindComponents';
import AppImages from '../../assets/images/appImages';
export const GetMetalCardModal = ({
  onGetAdditionalCard,
}: {
  onGetAdditionalCard: () => void;
}) => {
  return (
    <CyDView className='bg-[#1A1F59] rounded-[12px] px-[16px] pb-[16px] m-[16px]'>
      <CyDView className='flex flex-row items-center justify-between'>
        <CyDView className='flex-1 mr-4 mt-[23px]'>
          <CyDText className='text-[20px] font-[800] leading-[24px] tracking-[-1px] text-white flex-wrap'>
            {t('METAL_CARD_TITLE_TEXT')}
          </CyDText>
          <CyDText className='text-[12px] leading-[16px] font-[500] text-n80 mt-[4px] flex-wrap'>
            {t('METAL_CARD_SUB_TEXT')}
          </CyDText>
        </CyDView>
        <CyDView className='shadow-xl shadow-[#968DF7]'>
          <CyDFastImage
            source={AppImages.METAL_CARDS_STACK}
            className='h-[126px] w-[78px] rotate-[11.88deg]'
          />
        </CyDView>
      </CyDView>
      <CyDTouchView
        className='bg-[#FFB900] rounded-[12px] h-[42px] py-[11px] px-[12px] items-center justify-center mt-[4px]'
        onPress={() => {
          onGetAdditionalCard();
        }}>
        <CyDText className='font-bold text-black'>{t('CLAIM_NOW')}</CyDText>
      </CyDTouchView>
    </CyDView>
  );
};
