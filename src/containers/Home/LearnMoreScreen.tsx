import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import { IconNames } from '../../customFonts';
import PageHeader from '../../components/PageHeader';
import {
  buildWinddownDetails,
  buildWinddownTimeline,
  getDaysRemaining,
  WinddownDetail,
} from '../../constants/winddown';
import { useWindDownDates } from './hooks/useWindDownDates';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format an ISO yyyy-mm-dd date as "Month D, YYYY" (UTC, Hermes-safe). */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

function BulletList({ points }: { points: string[] }) {
  return (
    <CyDView className='mt-[8px]'>
      {points.map(point => (
        <CyDView key={point} className='flex-row items-start mb-[6px]'>
          <CyDText className='text-n200 text-[13px] mr-[6px]'>•</CyDText>
          <CyDText className='flex-1 text-n200 text-[13px] leading-[18px]'>
            {point}
          </CyDText>
        </CyDView>
      ))}
    </CyDView>
  );
}

function DetailBadge({ detail }: { detail: WinddownDetail }) {
  const { t } = useTranslation();
  if (!detail.endsOn) return null;
  const days = getDaysRemaining(detail.endsOn);
  // Derived from the fetched milestone date: past/today → Ended, else a countdown.
  if (days === 0) {
    return (
      <CyDView className='px-[10px] py-[3px] rounded-full bg-n20'>
        <CyDText className='text-[11px] font-semibold text-n200'>
          {t('WINDDOWN_ENDED', 'Ended')}
        </CyDText>
      </CyDView>
    );
  }
  // A countdown to a deadline is a warning, not good news → amber, not green.
  return (
    <CyDView className='px-[10px] py-[3px] rounded-full bg-warningYellow'>
      <CyDText className='text-[11px] font-semibold text-warningTextYellow'>
        {t('WINDDOWN_ENDS_IN_DAYS', 'Ends in {{days}} days', { days })}
      </CyDText>
    </CyDView>
  );
}

/**
 * Static Learn More screen: winddown timeline + detail cards. Content and dates
 * come from src/constants/winddown.ts (placeholder for Phase 1).
 */
export default function LearnMoreScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const dates = useWindDownDates();
  const timeline = buildWinddownTimeline(dates);
  const details = buildWinddownDetails(dates);
  const lastIndex = timeline.length - 1;

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <PageHeader title={t('WINDDOWN_LEARN_MORE_HEADER', 'Learn More')} navigation={navigation} />
      <CyDScrollView
        className='flex-1 bg-n20 px-[16px]'
        showsVerticalScrollIndicator={false}>
        <CyDView className='h-[12px]' />

        {/* Timeline */}
        <CyDView className='bg-n0 rounded-[16px] p-[16px] mb-[16px]'>
          <CyDText className='font-bold text-[16px] text-base400 mb-[12px]'>
            {t('WINDDOWN_TIMELINE_TITLE', 'Timeline')}
          </CyDText>
          {timeline.map((milestone, index) => {
            const days = getDaysRemaining(milestone.date);
            const done = days === 0; // date has passed
            return (
              <CyDView key={milestone.date} className='flex-row'>
                <CyDView className='items-center mr-[12px]'>
                  {done ? (
                    <CyDView className='w-[28px] h-[28px] rounded-[10px] bg-base400 items-center justify-center'>
                      <CyDIcons name='tick' size={16} className='text-n0' />
                    </CyDView>
                  ) : (
                    <CyDView className='w-[28px] h-[28px] rounded-full border-[1px] border-n40 bg-n0 items-center justify-center'>
                      <CyDIcons
                        name={milestone.icon as IconNames}
                        size={15}
                        className='text-base400'
                      />
                    </CyDView>
                  )}
                  {index !== lastIndex ? (
                    <CyDView className='w-[1px] flex-1 bg-n40 my-[4px]' />
                  ) : null}
                </CyDView>
                <CyDView className='flex-1 pb-[16px]'>
                  <CyDView className='flex-row items-center'>
                    <CyDText className='font-semibold text-[14px] text-base400'>
                      {formatDate(milestone.date)}
                    </CyDText>
                    {!done ? (
                      <CyDView className='ml-[8px] px-[8px] py-[2px] rounded-full bg-n20'>
                        <CyDText className='text-[11px] font-medium text-n200'>
                          {t('WINDDOWN_IN_DAYS', 'In {{days}} days', { days })}
                        </CyDText>
                      </CyDView>
                    ) : null}
                  </CyDView>
                  <BulletList points={milestone.items} />
                </CyDView>
              </CyDView>
            );
          })}
        </CyDView>

        {/* Detail cards */}
        {details.map(detail => (
          <CyDView
            key={detail.key}
            className='bg-n0 rounded-[16px] p-[16px] mb-[12px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='font-bold text-[15px] text-base400 flex-1 mr-[8px]'>
                {detail.title}
              </CyDText>
              <DetailBadge detail={detail} />
            </CyDView>
            <BulletList points={detail.points} />
          </CyDView>
        ))}

        <CyDView className='h-[24px]' />
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
