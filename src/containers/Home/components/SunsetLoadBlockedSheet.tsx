import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { formatWindDownDate } from '../../../constants/winddown';
import { useWindDownDates } from '../hooks/useWindDownDates';

/**
 * Bottom-sheet content shown when a user taps "Load Card" while the sunset is
 * active (Figma 1-577). Card loading is disabled; offers a Learn more CTA.
 */
export default function SunsetLoadBlockedSheet({
  onLearnMore,
}: {
  close: () => void;
  onLearnMore: () => void;
}) {
  const { t } = useTranslation();
  const dates = useWindDownDates();
  const start = formatWindDownDate(dates.windDownStart);
  const till = formatWindDownDate(dates.cardSpendTill);
  const shutdown = formatWindDownDate(dates.shutdown);

  return (
    <CyDView className='bg-n0 px-[24px] pb-[24px] pt-[16px]'>
      <CyDView className='items-center'>
        <CyDView className='w-[84px] h-[84px] rounded-[24px] bg-[#FDF3D8] items-center justify-center mb-[14px]'>
          {/* Fixed dark tone (not theme base400, which flips to white in dark
              mode and disappears on the pale-yellow tile). */}
          <CyDIcons name='sunset' size={44} className='text-[#483400]' />
        </CyDView>
        <CyDText className='text-[13px] font-semibold tracking-[1px] text-n200 mb-[8px]'>
          {t('WINDDOWN_EYEBROW', 'CYPHER IS SUNSETTING')}
        </CyDText>
        <CyDText className='text-[14px] text-n200 text-center leading-[20px]'>
          {t(
            'SUNSET_LOAD_BLOCKED_DESC_LEAD',
            'Cypher services will begin to gradually wind down starting ',
          ) +
            start +
            t(
              'SUNSET_LOAD_BLOCKED_DESC_TAIL',
              '. As part of this process, card loading will be disabled from that date onward.',
            )}
        </CyDText>
      </CyDView>

      <CyDView className='bg-[#F5A6231F] rounded-[14px] px-[15px] py-[12px] flex-row items-center mt-[16px]'>
        <CyDIcons name='lock' size={18} className='text-[#C77A12] mr-[10px]' />
        <CyDText className='flex-1 text-[13px] font-bold text-[#C77A12]'>
          {t('SUNSET_LOAD_DISABLED_BANNER_LEAD', 'Card loads are disabled from ') +
            start}
        </CyDText>
      </CyDView>

      <CyDView className='bg-n20 rounded-[14px] px-[15px] py-[14px] mt-[12px]'>
        <CyDText className='text-[14px] font-bold text-base400'>
          {t(
            'SUNSET_BALANCE_QUESTION',
            'What happens to available card balance?',
          )}
        </CyDText>
        <CyDText className='text-[12px] text-n200 mt-[4px] leading-[18px]'>
          {t(
            'SUNSET_BALANCE_ANSWER_LEAD',
            'You can use your Cypher Card balance until ',
          ) +
            till +
            t(
              'SUNSET_BALANCE_ANSWER_MID',
              ', or withdraw any remaining funds anytime before ',
            ) +
            shutdown +
            '.'}
        </CyDText>
      </CyDView>

      <CyDTouchView
        onPress={onLearnMore}
        activeOpacity={0.85}
        accessibilityRole='button'
        className='bg-[#F7C645] rounded-[56px] py-[15px] items-center justify-center mt-[20px]'>
        <CyDText className='text-[15px] font-bold text-black'>
          {t('WINDDOWN_LEARN_MORE', 'Learn more')}
        </CyDText>
      </CyDTouchView>
    </CyDView>
  );
}
