import React from 'react';
import clsx from 'clsx';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { IconNames } from '../../../customFonts';
import WinddownActionButton from './WinddownActionButton';
import { WinddownBadgeTone, WinddownStepViewModel } from '../types';

type MdIconName = React.ComponentProps<typeof CyDMaterialDesignIcons>['name'];

const BADGE_TONE_STYLE: Record<
  WinddownBadgeTone,
  { container: string; text: string }
> = {
  red: { container: 'bg-red20', text: 'text-red400' },
  amber: { container: 'bg-yellow', text: 'text-orange700' },
  green: { container: 'bg-green20', text: 'text-green400' },
  gray: { container: 'bg-n20', text: 'text-n200' },
};

/**
 * Pure presentational card for a single winddown step. All four Figma states
 * (actionable / in-progress / completed / not-backed-up) are just prop
 * combinations — this component holds no logic.
 */
export default function WinddownStepCard({
  step,
}: {
  step: WinddownStepViewModel;
}) {
  const {
    icon,
    iconType,
    title,
    badge,
    description,
    detailLine,
    primaryAction,
    isPrimary,
  } = step;
  const tone = badge ? BADGE_TONE_STYLE[badge.tone] : null;
  const iconColor = isPrimary ? 'text-black' : 'text-base400';

  return (
    <CyDView className='bg-n0 rounded-[16px] p-[16px] mb-[12px]'>
      <CyDView className='flex-row items-start'>
        <CyDView
          className={clsx(
            'w-[42px] h-[42px] rounded-[10px] items-center justify-center mr-[12px]',
            isPrimary ? 'bg-[#FDF3D8]' : 'bg-base40',
          )}>
          {iconType === 'cyd' ? (
            <CyDIcons name={icon as IconNames} size={22} className={iconColor} />
          ) : (
            <CyDMaterialDesignIcons
              name={icon as MdIconName}
              size={22}
              className={iconColor}
            />
          )}
        </CyDView>

        <CyDView className='flex-1'>
          <CyDView className='flex-row items-center justify-between'>
            <CyDText className='font-bold text-[16px] text-base400 flex-1 mr-[8px]'>
              {title}
            </CyDText>
            {badge && tone ? (
              <CyDView
                className={clsx('px-[10px] py-[3px] rounded-full', tone.container)}>
                <CyDText
                  className={clsx('text-[11px] font-semibold', tone.text)}>
                  {badge.label}
                </CyDText>
              </CyDView>
            ) : null}
          </CyDView>

          <CyDText className='text-n200 text-[13px] mt-[4px] leading-[18px]'>
            {description}
          </CyDText>

          {detailLine ? (
            <CyDText className='text-n200 text-[13px] mt-[8px]'>
              {detailLine}
            </CyDText>
          ) : null}
        </CyDView>
      </CyDView>

      {primaryAction ? <WinddownActionButton action={primaryAction} /> : null}
    </CyDView>
  );
}
