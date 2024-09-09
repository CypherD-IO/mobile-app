/* eslint-disable @typescript-eslint/quotes */
import * as React from 'react';
import { CyDText, CyDTouchView } from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../../misc/checkers';

export default function ReadOnlySeedPhraseBlock({
  content,
  onBlockTouch,
  clickEvent,
  index = 0,
  backgroundColor = 'white',
  disabled = true,
}) {
  return (
    <CyDTouchView
      disabled={disabled}
      onPress={() => onBlockTouch(clickEvent)}
      className={clsx(
        `w-[30%] flex flex-row items-center align-sub p-[12px] border-[1px] m-[5px] border-dashed border-inputBorderColor rounded-[4px] bg-${backgroundColor}`,
        { 'justify-center': index === 0 },
      )}>
      {index !== 0 && (
        <CyDText className={'text-[12px] font-manrope font-semibold'}>
          {index}.
        </CyDText>
      )}
      <CyDText
        className={clsx(
          'text-[14px] font-manrope ml-[5px] font-bold h-[21px]',
          {
            'pt-[4px]': content.includes('****') && isIOS(),
            'pt-[3px]': !content.includes('****') && isAndroid(),
            'pt-[5px]': content.includes('****') && isAndroid(),
            'ml-[-1px]': index === 0,
          },
        )}>
        {content}
      </CyDText>
    </CyDTouchView>
  );
}
