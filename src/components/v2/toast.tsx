import React from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';

export const toastConfig = {
  simpleToast: ({ props }: { props: any }) => (
    <CyDView className='h-[36px] w-[80px] flex flex-row justify-center items-center'>
      <CyDMaterialDesignIcons
        name='check-bold'
        size={16}
        className='text-base400'
      />
      <CyDText>{props.text}</CyDText>
    </CyDView>
  ),
};
