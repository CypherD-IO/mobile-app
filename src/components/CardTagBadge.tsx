import React from 'react';
import clsx from 'clsx';
import { CyDView, CyDText } from '../styles/tailwindComponents';
import { parseCardTag } from '../constants/cardTags';
import { truncateText } from '../utils/textUtils';

interface CardTagBadgeProps {
  tag: string;
  className?: string;
}

export default function CardTagBadge({
  tag,
  className,
}: CardTagBadgeProps): React.ReactElement | null {
  if (!tag) return null;

  const { emoji, name } = parseCardTag(tag);

  return (
    <CyDView
      className={clsx(
        'bg-white rounded-full flex-row items-center border border-[#EEEEEE] py-[4px] px-[6px] gap-x-[2px]',
        className,
      )}>
      <CyDText className='text-[14px]'>{emoji}</CyDText>
      <CyDText className='font-medium text-[14px] leading-[140%] tracking-[-0.4px] text-gray-800'>
        {truncateText(name, 10)}
      </CyDText>
    </CyDView>
  );
}
