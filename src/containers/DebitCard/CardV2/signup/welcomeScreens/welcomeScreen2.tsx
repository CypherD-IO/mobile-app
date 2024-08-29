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
    <CyDView className='flex flex-col justify-evenly h-full px-[16px] mt-[40px] bg-black'>
      <CyDView className='flex flex-col justify-center items-center w-full'>
        <CyDImage
          // width='350'
          // height='214'
          className='w-[286px] h-[241px]'
          source={AppImages.CARD_ONBOARDING_2}
        />
      </CyDView>
      <CyDView>
        <CyDText className='font-bold text-[30px] text-white'>
          {t('Use With')}
        </CyDText>
        <CyDText className='font-bold text-[30px] text-white'>
          {t('Apple Pay & Google Pay')}
        </CyDText>
      </CyDView>
      {/* <CyDImage source={AppImages.RC_VIRTUAL} /> */}
    </CyDView>
  );
}
