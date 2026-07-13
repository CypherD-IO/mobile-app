import React from 'react';
import { CyDText, CyDView } from '../../../styles/tailwindComponents';
import {
  buildWinddownTimeline,
  formatWindDownDate,
  getDaysRemaining,
  WindDownDates,
} from '../../../constants/winddown';

/**
 * Crisp, at-a-glance version of the wind-down timeline for the Home screen —
 * the three key dates (start / cards cancelled / shutdown) with a one-line
 * label each. The full, detailed timeline lives on the Learn more screen.
 */
export default function WinddownMiniTimeline({
  dates,
}: {
  dates: WindDownDates;
}) {
  const milestones = buildWinddownTimeline(dates).filter(m => m.date);
  if (milestones.length === 0) return null;

  return (
    <CyDView className='mt-[16px]'>
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const days = getDaysRemaining(milestone.date);
        return (
          <CyDView key={milestone.date} className='flex-row'>
            {/* Dot + connector rail */}
            <CyDView className='items-center mr-[12px]'>
              <CyDView className='w-[10px] h-[10px] rounded-full border-[2px] border-n200 mt-[3px]' />
              {!isLast ? (
                <CyDView className='w-[1.5px] flex-1 bg-n40 my-[2px]' />
              ) : null}
            </CyDView>

            <CyDView className={isLast ? 'flex-1' : 'flex-1 pb-[14px]'}>
              <CyDView className='flex-row items-center'>
                <CyDText className='text-[13px] font-bold text-base400 mr-[8px]'>
                  {formatWindDownDate(milestone.date)}
                </CyDText>
                {days > 0 ? (
                  <CyDView className='px-[8px] py-[2px] rounded-full bg-n20'>
                    <CyDText className='text-[11px] font-semibold text-n200'>
                      {`In ${days} days`}
                    </CyDText>
                  </CyDView>
                ) : null}
              </CyDView>
              <CyDText className='text-[12px] text-n200 mt-[2px] leading-[18px]'>
                {milestone.items[0]}
              </CyDText>
            </CyDView>
          </CyDView>
        );
      })}
    </CyDView>
  );
}
