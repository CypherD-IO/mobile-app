import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';

/**
 * Inline banner shown at the top of the Card screen when the sunset is active
 * and there are no active cards — replaces the lockdown warning. Copy differs by
 * whether the user ever had a card (cancelled) or never did (no new cards).
 */
export default function SunsetCardsCancelledBanner({
  everHadCard,
}: {
  everHadCard: boolean;
}) {
  const { t } = useTranslation();
  return (
    <CyDView className='rounded-[16px] bg-[#FDF3D8] border-[1px] border-[#F5A623] p-[14px] m-[16px] flex-row items-start'>
      <CyDIcons
        name='sunset'
        size={22}
        className='text-[#C77A12] mr-[10px] mt-[2px]'
      />
      <CyDView className='flex-1'>
        <CyDText className='text-[16px] font-bold text-[#C77A12]'>
          {t('SUNSET_CARDS_CANCELLED_TITLE', 'Cypher is winding down')}
        </CyDText>
        <CyDText className='text-[13px] font-medium text-n200 mt-[4px] leading-[18px]'>
          {everHadCard
            ? t(
                'SUNSET_CARDS_CANCELLED_BODY',
                'No new cards will be issued and all existing cards have been cancelled.',
              )
            : t(
                'SUNSET_CARDS_NO_NEW_BODY',
                'Cypher is no longer issuing new cards.',
              )}
        </CyDText>
      </CyDView>
    </CyDView>
  );
}
