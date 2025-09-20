import React from 'react';
import { CyDImage, CyDText, CyDView } from '../styles/tailwindComponents';
import AppImages from '../../assets/images/appImages';
import { t } from 'i18next';

export default function EmptyContent({ content }: { content: string }) {
  return (
    <CyDView>
      <CyDImage
        source={AppImages.EMPTY_PERSON}
        className='w-[340px] h-[300px] self-center'
      />
      <CyDText>{t(content)}</CyDText>
    </CyDView>
  );
}
