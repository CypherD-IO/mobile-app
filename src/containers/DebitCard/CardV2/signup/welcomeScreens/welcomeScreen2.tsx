import React from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../../../assets/images/appImages';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../../../../styles/tailwindStyles';

export default function WelcomeSceen() {
  const { t } = useTranslation();

  return (
    <CyDView className='flex flex-col items-center justify-evenly h-full px-[16px] mt-[40px] bg-black'>
      <CyDView className='flex flex-col justify-center items-center w-full'>
        <CyDImage
          className='w-[286px] h-[425px]'
          source={AppImages.CARD_ONBOARDING_2}
        />
      </CyDView>
      <CyDView className=''>
        <CyDText className='font-extrabold text-[34px] text-white text-center '>
          {t('Go Virtual & Spend Immediately')}
        </CyDText>
        <CyDText className='font-semibold text-[18px] text-white mt-[12px] text-center  w-[320px]'>
          {t(
            'Activate your virtual Cypher Card in few easy steps and start spending globally with your phone. takes just 5 min',
          )}
        </CyDText>
      </CyDView>
    </CyDView>
  );
}
