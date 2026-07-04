import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { formatWindDownDate } from '../../../constants/winddown';
import { useWindDownDates } from '../hooks/useWindDownDates';

/**
 * Informational banner shown above the steps when the card/withdraw step is
 * applicable. Dates come from the wind-down config.
 */
export default function WinddownInfoBanner() {
  const { t } = useTranslation();
  const till = formatWindDownDate(useWindDownDates().cardSpendTill);

  return (
    <CyDView className='bg-[#3D6FE01A] rounded-[16px] p-[16px] mb-[16px] flex-row items-start'>
      <CyDMaterialDesignIcons
        name='information-outline'
        size={18}
        className='text-[#3D6FE0] mr-[10px] mt-[1px]'
      />
      <CyDView className='flex-1'>
        <CyDText className='text-[14px] font-semibold text-[#3D6FE0]'>
          {t('WINDDOWN_BANNER_TITLE_LEAD', 'Spend with Cypher card till ') +
            till}
        </CyDText>
        <CyDText className='text-[13px] text-[#3D6FE0] mt-[4px] leading-[18px]'>
          {t(
            'WINDDOWN_BANNER_BODY_LEAD',
            'Your Cypher card stays active and ready for spending until ',
          ) +
            till +
            t(
              'WINDDOWN_BANNER_BODY_TAIL',
              ' — make the most of it and enjoy your purchases!',
            )}
        </CyDText>
      </CyDView>
    </CyDView>
  );
}
