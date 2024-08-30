import React from 'react';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../../../assets/images/appImages';

export default function WelcomeSceen3() {
  const { t } = useTranslation();

  return (
    <CyDView className='flex flex-col items-center justify-evenly h-full px-[16px] bg-black '>
      <CyDView className='flex flex-col justify-center items-center w-full'>
        <CyDImage
          className='w-[286px] h-[425px]'
          source={AppImages.CARD_ONBOARDING_3}
        />
      </CyDView>
      <CyDView className='w-[263px]'>
        <CyDText className='font-extrabold text-[40px] text-white text-center font-manrope'>
          {t('Pay Online, Securely')}
        </CyDText>
        <CyDText className='font-semibold text-[18px] text-white mt-[12px] text-center font-manrope'>
          {t(
            'Authenticate online payments with OTP, Telegram approval, or a simple swipe to pay.',
          )}
        </CyDText>
      </CyDView>
    </CyDView>
  );
}
