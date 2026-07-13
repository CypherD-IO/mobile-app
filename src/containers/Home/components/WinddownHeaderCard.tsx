import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { formatWindDownDate, WindDownDates } from '../../../constants/winddown';
import WinddownMiniTimeline from './WinddownMiniTimeline';

interface WinddownHeaderCardProps {
  daysRemaining: number;
  completedCount: number;
  totalCount: number;
  shutdownDate: string;
  dates: WindDownDates;
  onStepsPress?: () => void;
  onLearnMore: () => void;
}

function StatTile({
  value,
  label,
  onPress,
}: {
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const className =
    'flex-1 border-[1px] border-n40 rounded-[16px] px-[16px] py-[14px]';
  const body = (
    <>
      <CyDText className='text-[26px] font-bold text-base400'>{value}</CyDText>
      <CyDText className='text-[12px] text-n200 mt-[2px]'>{label}</CyDText>
    </>
  );
  return onPress ? (
    <CyDTouchView
      className={className}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole='button'>
      {body}
    </CyDTouchView>
  ) : (
    <CyDView className={className}>{body}</CyDView>
  );
}

/**
 * Top card on the winddown Home screen: sunset eyebrow, headline, wind-down
 * copy, the two stat tiles (days remaining / steps completed) and the Learn
 * more link. Copy is placeholder for Phase 1.
 */
export default function WinddownHeaderCard({
  daysRemaining,
  completedCount,
  totalCount,
  shutdownDate,
  dates,
  onStepsPress,
  onLearnMore,
}: WinddownHeaderCardProps) {
  const { t } = useTranslation();

  return (
    <CyDView className='bg-n0 rounded-[20px] p-[20px] mb-[16px]'>
      <CyDView className='flex-row items-center mb-[10px]'>
        <CyDIcons
          name='sunset'
          size={18}
          className='text-base400 mr-[6px]'
        />
        <CyDText className='text-[12px] font-semibold tracking-[1px] text-n200'>
          {t('WINDDOWN_EYEBROW', 'CYPHER IS SUNSETTING')}
        </CyDText>
      </CyDView>

      <CyDText className='text-[26px] font-bold text-base400 leading-[32px]'>
        {t('WINDDOWN_TITLE', "Let's secure everything that's yours.")}
      </CyDText>

      <CyDText className='text-[14px] text-n200 mt-[8px] leading-[20px]'>
        {t('WINDDOWN_SUBTITLE_LEAD', 'Cypher services wind down on ') +
          formatWindDownDate(shutdownDate) +
          t(
            'WINDDOWN_SUBTITLE_TAIL',
            '. Finish the steps below to move out your funds, rewards and wallet.',
          )}
      </CyDText>

      <CyDView className='flex-row gap-[12px] mt-[18px]'>
        <StatTile
          value={String(daysRemaining)}
          label={t('WINDDOWN_DAYS_REMAINING', 'Days remaining')}
        />
        <StatTile
          value={`${completedCount}/${totalCount}`}
          label={t('WINDDOWN_STEPS_COMPLETED', 'Steps Completed')}
          onPress={onStepsPress}
        />
      </CyDView>

      <WinddownMiniTimeline dates={dates} />

      <CyDTouchView
        className='self-center mt-[18px]'
        onPress={onLearnMore}
        accessibilityRole='button'>
        <CyDText className='text-[14px] font-semibold text-base400 underline'>
          {t('WINDDOWN_LEARN_MORE', 'Learn more')}
        </CyDText>
      </CyDTouchView>
    </CyDView>
  );
}
