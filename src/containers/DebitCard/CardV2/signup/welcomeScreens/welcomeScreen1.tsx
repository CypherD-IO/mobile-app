import React from 'react';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../../../assets/images/appImages';

export default function WelcomeSceen1() {
  const { t } = useTranslation();

  return (
    <CyDView className='flex flex-col justify-evenly h-full '>
      <CyDView className='h-[80%]'>
        <CyDImage
          // width='350'
          // height='214'
          className='w-full h-full'
          source={AppImages.CARD_ONBOARDING_1}
        />
      </CyDView>
      <CyDView className='h-[20%] px-[16px]'>
        <CyDText className='font-extrabold text-[32px] text-white font-manrope'>
          {t('Go Global,')}
        </CyDText>
        <CyDText className='font-extrabold text-[32px] text-white'>
          {t('Pay Local,')}
        </CyDText>
        <CyDText className='font-extrabold text-[32px] text-white'>
          {t('with amazing')}
        </CyDText>
        <CyDText className='font-extrabold text-[32px] text-white'>
          {t('acceptance')}
        </CyDText>
      </CyDView>
      {/* <CyDImage source={AppImages.RC_VIRTUAL} /> */}
    </CyDView>
  );
}
