import React from 'react';
import { CyDText, CyDView } from '../../../styles/tailwindComponents';

interface ReviewCardProps {
  title: string;
  rows: { label: string; value: string }[];
}

/**
 * Grouped review card matching the Figma "Verify Details" pattern.
 * White card with border + shadow, bold title, labeled value rows.
 */
export default function ReviewCard({ title, rows }: ReviewCardProps) {
  const visibleRows = rows.filter(r => r.value && r.value !== '—');
  if (visibleRows.length === 0) return null;

  return (
    <CyDView className='bg-n10 border border-n40 rounded-[12px] p-[16px] gap-[6px]'>
      <CyDText className='text-[14px] font-semibold text-base400 mb-[2px]'>
        {title}
      </CyDText>
      {visibleRows.map((row, idx) => (
        <CyDView
          key={`${row.label}-${idx}`}
          className='flex-row items-center justify-between'>
          <CyDText className='text-[14px] font-normal text-n70 tracking-[-0.6px]'>
            {row.label}
          </CyDText>
          <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
            {row.value}
          </CyDText>
        </CyDView>
      ))}
    </CyDView>
  );
}
