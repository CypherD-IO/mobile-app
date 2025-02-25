import React from 'react';
import { CyDText, CyDView, CyDImage } from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';

export default function Empty() {
  return (
    <CyDView className={'h-full w-full bg-n0 flex items-center justify-center'}>
      <CyDImage source={AppImages.EMPTY} />
      <CyDText className={'mt-[24px] text-[24px] '}>
        {'Oops is empty !'}
      </CyDText>
    </CyDView>
  );
}
