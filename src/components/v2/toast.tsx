import React from 'react';
import AppImages from '../../../assets/images/appImages';
import { CyDImage, CyDText, CyDView } from '../../styles/tailwindStyles';

export const toastConfig = {
  simpleToast: ({ text1, props }: { text1: string; props: any }) => (
    <CyDView className='h-[36px] w-[80px] flex flex-row justify-center items-center'>
      <CyDImage
        source={AppImages.CORRECT}
        className='h-[18px] w-[18px]'
        resizeMode='cover'
      />
      <CyDText>{props.text}</CyDText>
    </CyDView>
  ),
};
