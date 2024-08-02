import React from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { screenTitle } from '../../../constants';
import { transactionType } from 'viem';
import { CardControlTypes } from '../../../constants/enum';

export default function CardControlsMenu({ route, navigation }) {
  const { currentCardProvider, card } = route.params;
  return (
    <CyDSafeAreaView className={'h-full bg-cardBgFrom pt-[10px]'}>
      <CyDView className='mx-[16px] mt-[16px]'>
        <CyDText className='text-xs text-n200 font-bold'>
          Spend Category
        </CyDText>
        <CyDTouchView
          className='flex flex-row mt-[8px] bg-white rounded-[10px] px-[12px] py-[16px] justify-between items-center'
          onPress={() => {
            navigation.navigate(screenTitle.DOMESTIC_CARD_CONTROLS, {
              cardControlType: CardControlTypes.DOMESTIC,
              currentCardProvider,
              card,
            });
          }}>
          <CyDText className='text-[18px] font-medium tr'>
            Domestic Transactions
          </CyDText>
          <CyDImage
            source={AppImages.RIGHT_ARROW}
            className='w-[12px] h-[12px]'></CyDImage>
        </CyDTouchView>
        <CyDTouchView
          className='flex flex-row mt-[12px] bg-white rounded-[10px] px-[12px] py-[16px] justify-between items-center'
          onPress={() => {
            navigation.navigate(screenTitle.INTERNATIONAL_CARD_CONTROLS, {
              cardControlType: CardControlTypes.INTERNATIONAL,
              currentCardProvider,
              card,
            });
          }}>
          <CyDText className='text-[18px] font-medium tr'>
            International Transactions
          </CyDText>
          <CyDImage
            source={AppImages.RIGHT_ARROW}
            className='w-[12px] h-[12px]'></CyDImage>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
