import React from 'react';
import { CyDText, CyDView } from '../../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';

export default function WelcomeSceen3() {
  const { t } = useTranslation();

  return (
    <CyDView className='h-full mt-[200px] px-[16px]'>
      <CyDText className='font-extrabold text-[40px] text-white text-left'>
        {t('Pay Online,')}
      </CyDText>
      <CyDText className='font-extrabold text-[40px] text-white'>
        {t('Securely')}
      </CyDText>

      {/* <CyDImage source={AppImages.RC_VIRTUAL} /> */}
    </CyDView>
  );
}
