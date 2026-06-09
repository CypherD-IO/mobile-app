import React from 'react';
import { t } from 'i18next';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';

export const RiskAlertFooter = ({
  onIgnoreAll,
}: {
  onIgnoreAll: () => void;
}) => {
  return (
    <CyDView className='mx-[25px] mb-[12px] flex flex-row items-center justify-between rounded-[8px] border-[1px] border-errorTextRed bg-errorRed px-[12px] py-[10px]'>
      <CyDView className='flex flex-row items-center flex-1 pr-[10px]'>
        <CyDMaterialDesignIcons
          name='alert-circle'
          size={18}
          className='text-errorTextRed mr-[8px]'
        />
        <CyDText className='text-errorTextRed text-[13px] font-medium flex-1'>
          {t<string>('RISK_FOOTER_MESSAGE')}
        </CyDText>
      </CyDView>
      <CyDTouchView activeOpacity={0.7} onPress={onIgnoreAll}>
        <CyDText className='text-errorTextRed text-[13px] font-bold underline'>
          {t<string>('RISK_FOOTER_IGNORE_ALL')}
        </CyDText>
      </CyDTouchView>
    </CyDView>
  );
};
