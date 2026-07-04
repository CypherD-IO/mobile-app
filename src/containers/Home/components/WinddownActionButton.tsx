import React from 'react';
import clsx from 'clsx';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
} from '../../../styles/tailwindComponents';
import { WinddownStepAction } from '../types';

/**
 * Card action button matching the winddown Figma spec (node 1:233 / 1:260):
 * a pill (radius 41) with the label left-aligned and an 18px chevron on the
 * right (space-between). Primary = brand yellow #FFBF15 with black text;
 * secondary = neutral n20 fill with theme text.
 */
export default function WinddownActionButton({
  action,
}: {
  action: WinddownStepAction;
}) {
  const isPrimary = action.variant === 'primary';
  return (
    <CyDTouchView
      onPress={action.onPress}
      activeOpacity={0.8}
      accessibilityRole='button'
      className={clsx(
        'flex-row items-center justify-between px-[16px] py-[12px] rounded-[41px] mt-[14px]',
        isPrimary ? 'bg-[#FFBF15]' : 'bg-n20',
      )}>
      <CyDText
        className={clsx(
          'font-bold text-[13px]',
          isPrimary ? 'text-black' : 'text-base400',
        )}>
        {action.label}
      </CyDText>
      <CyDIcons
        name='chevron-right'
        size={18}
        className={isPrimary ? 'text-black' : 'text-base400'}
      />
    </CyDTouchView>
  );
}
