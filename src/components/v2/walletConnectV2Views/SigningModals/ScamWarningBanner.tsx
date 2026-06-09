import React from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { ApproveRiskLevel } from '../../../../utils/approveGuard';

export const ScamWarningBanner = ({
  level,
  title,
  message,
}: {
  level: ApproveRiskLevel;
  title: string;
  message: string;
}) => {
  if (level === 'none' || !message) return null;

  const isDanger = level === 'danger';
  const containerClass = isDanger
    ? 'bg-errorRed border-errorTextRed'
    : 'bg-warningYellow border-warningTextYellow';
  const textColor = isDanger ? 'text-errorTextRed' : 'text-warningTextYellow';
  const iconName = isDanger ? 'alert-octagon' : 'alert';

  return (
    <CyDView
      className={`rounded-[10px] my-[10px] px-[12px] py-[10px] border-[1px] ${containerClass}`}>
      <CyDView className='flex flex-row items-start'>
        <CyDMaterialDesignIcons
          name={iconName}
          size={20}
          className={`${textColor} mr-[8px] mt-[1px]`}
        />
        <CyDView className='flex-1'>
          <CyDText className={`font-extrabold text-[14px] ${textColor}`}>
            {title}
          </CyDText>
          <CyDText className={`text-[13px] font-medium mt-[2px] ${textColor}`}>
            {message}
          </CyDText>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};
