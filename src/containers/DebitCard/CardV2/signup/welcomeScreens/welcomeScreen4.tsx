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
    <CyDView className='flex flex-col justify-evenly h-full '>
      <CyDView className='px-[16px]'>
        <CyDText className='font-extrabold text-[40px] text-white'>
          {t('Your Money ')}
        </CyDText>
        <CyDText className='font-extrabold text-[40px] text-white'>
          {t('is Always safe')}
        </CyDText>
      </CyDView>
      <CyDView className='flex flex-row justify-end'>
        <CyDImage
          // width='350'
          // height='214'
          className=' w-[250px] h-[300px]'
          source={AppImages.CARD_ONBOARDING_3}
        />
      </CyDView>
      {/* <CyDImage source={AppImages.RC_VIRTUAL} /> */}
    </CyDView>
  );
}
