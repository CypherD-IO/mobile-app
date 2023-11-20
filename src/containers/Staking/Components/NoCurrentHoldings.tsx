import React from 'react';
import { CyDFastImage, CyDText, CyDView } from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';

const NoCurrentHoldings = () => {
  const { t } = useTranslation();
  return (
    <CyDView className={'flex flex-row justify-center'}>
      <CyDView className={'mt-[15%]'}>
        <CyDFastImage
          source={AppImages.STAKING_EMPTY_ILLUSTRATION}
          className='h-[250px] w-[350px]'
          resizeMode='contain'
        />
        <CyDText className={'text-center text-[24px] font-semibold mt-[20px]'}>
          {t('NO_CURRENT_HOLDINGS')}
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

export default NoCurrentHoldings;
