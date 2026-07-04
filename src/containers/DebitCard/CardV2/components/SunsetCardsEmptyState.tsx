import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';

/**
 * Empty state shown in the card-deck area of the Card screen when the sunset is
 * active and there are no active cards. Copy differs by whether the user ever
 * had a card (cancelled) or never did (no new cards being issued).
 */
export default function SunsetCardsEmptyState({
  everHadCard,
}: {
  everHadCard: boolean;
}) {
  const { t } = useTranslation();
  return (
    <CyDView className='items-center justify-center py-[48px] px-[24px]'>
      <CyDView className='w-[80px] h-[80px] rounded-[24px] bg-[#FDF3D8] items-center justify-center mb-[16px]'>
        <CyDMaterialDesignIcons
          name='credit-card-off-outline'
          size={40}
          className='text-[#C77A12]'
        />
      </CyDView>
      <CyDText className='text-[16px] font-bold text-base400'>
        {everHadCard
          ? t('SUNSET_NO_ACTIVE_CARDS', 'No active cards')
          : t('SUNSET_NO_NEW_CARDS', 'New cards unavailable')}
      </CyDText>
      <CyDText className='text-[13px] text-n200 text-center mt-[6px] leading-[18px]'>
        {everHadCard
          ? t(
              'SUNSET_NO_ACTIVE_CARDS_BODY',
              'Your Cypher cards have been cancelled as part of the wind-down.',
            )
          : t(
              'SUNSET_NO_NEW_CARDS_BODY',
              'Cypher is winding down and is no longer issuing new cards.',
            )}
      </CyDText>
    </CyDView>
  );
}
