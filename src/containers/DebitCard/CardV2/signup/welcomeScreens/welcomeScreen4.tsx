import React from 'react';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';

import AppImages from '../../../../../../assets/images/appImages';

export default function WelcomeSceen4() {
  const { t } = useTranslation();

  return (
    <CyDView className='flex flex-col items-center justify-evenly h-full mt-[40px] bg-black'>
      <CyDView className='flex flex-row justify-end w-full'>
        <CyDImage
          className='w-[342px] h-[269px]'
          source={AppImages.CARD_ONBOARDING_4}
        />
      </CyDView>
      <CyDView className='px-[16px] flex flex-col items-center'>
        <CyDText className='font-bold text-[34px] text-white text-center w-[263px]'>
          {t('Your Money is Always safe')}
        </CyDText>
        <CyDText className='font-semibold text-[18px] text-white mt-[14px] text-center w-[320px]'>
          {t(
            'Your money is always secure with Cypher. Enjoy extra protection with features like Freeze and Lockdown mode.',
          )}
        </CyDText>
      </CyDView>
    </CyDView>
  );
}
