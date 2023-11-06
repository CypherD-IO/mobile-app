import React from 'react';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import {
  CyDImage,
  CyDText,
  CyDView,
  CyDImageBackground,
  CyDTouchView,
  CyDScrollView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { screenTitle } from '../../constants';

export default function CardSignupCompleteScreen({ navigation }) {
  const { t } = useTranslation();

  return (
    <CyDScrollView className={'h-full bg-appColor'}>
      <CyDImageBackground
        className={'h-[45%] pt-[30px]'}
        source={AppImages.CARD_SIGNUP_BACKGROUND}
        resizeMode={'cover'}>
        <CyDView className={'flex flex-row justify-center mt-[45%]'}>
          <CyDView className={'bg-appColor rounded-full p-[6px]'}>
            <CyDImage source={AppImages.BLACK_BACKGROUND_TICK}></CyDImage>
          </CyDView>
        </CyDView>
        <CyDView className={'mt-[10px] flex flex-row justify-center px-[30px]'}>
          <CyDText className={'text-[30px] text-center font-extrabold'}>
            {t<string>('APPLICATION_SUBMITTED')}
          </CyDText>
        </CyDView>
        <CyDView className={'flex flex-row mt-[20px] px-[38px] justify-start'}>
          <CyDText className={'ml-[8px] text-[18px] font-bold text-center'}>
            {t<string>('CARD_SIGNUP_COMPLETE_TEXT')}
          </CyDText>
        </CyDView>
        <CyDTouchView
          onPress={() =>
            navigation.navigate(screenTitle.CARD_KYC_STATUS_SCREEN)
          }
          className={clsx(
            'py-[16px] mt-[22px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[80%] mx-auto mb-[25px] text-white bg-black',
          )}>
          <CyDText
            className={clsx('text-center font-black text-white text-[18px]')}>
            {t<string>('VIEW_CARD_STATUS')}
          </CyDText>
        </CyDTouchView>
      </CyDImageBackground>
    </CyDScrollView>
  );
}
