import clsx from 'clsx';
import { title } from 'process';
import React from 'react';
import { CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';

export default function SwitchView (props) {
  const { titles, index, setIndexChange } = props;

  return (
        <CyDView className={clsx('flex flex-row justify-between items-center mt-[10px] px-[6px] pb-[5px] pt-[5px] bg-switchColor h-[42px] ml-[4%] rounded-[16px]', {
          'w-[92%]': titles.length === 3,
          'w-[67%]': titles.length === 2
        })}>
            {
                titles.map((item, itemIndex) => (
                     <CyDTouchView onPress={() => { setIndexChange(itemIndex); }} className={clsx({
                       'bg-appColor': index === itemIndex,
                       'rounded-[14px]': index === itemIndex,
                       'px-[8px]': index === itemIndex,
                       'z-[10]': index === itemIndex
                     })} key={itemIndex}>
                        <CyDText className={'px-[10px] py-[8px] font-bold'}>{item}</CyDText>
                    </CyDTouchView>
                ))
            }
        </CyDView>
  );
}
