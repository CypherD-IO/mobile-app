import clsx from 'clsx';
import { title } from 'process';
import React from 'react';
import { CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';

export default function SwitchView (props) {
  const { titles, index, setIndexChange, length = 60 } = props;
  return (
        <CyDView className={clsx('flex flex-row justify-between items-center mt-[10px] px-[6px] pb-[5px] pt-[5px] bg-switchColor h-[42px] rounded-[8px]', {
        })}>
            {
                titles.map((item, itemIndex) => (
                     <CyDTouchView onPress={() => { setIndexChange(itemIndex); }} className={clsx({
                       'bg-buttonColor': index === itemIndex,
                       'rounded-[8px]': index === itemIndex,
                       'px-[8px]': index === itemIndex,
                       'z-[10]': index === itemIndex
                     })} key={itemIndex}>
                        <CyDText className={'px-[15px] py-[8px] font-bold'}>{item}</CyDText>
                    </CyDTouchView>
                ))
            }
        </CyDView>
  );
}
