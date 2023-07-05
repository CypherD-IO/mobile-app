import React, { useState } from 'react';
import { CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';

export default function RadioButtons (props: any) {
  const { radioButtonsData, onPressRadioButton, initialValue = undefined, containerStyle }: {
    radioButtonsData: string[]
    onPressRadioButton: any
    initialValue: string | undefined
    containerStyle?: string
  } = props;

  const [current, setCurrent] = useState<string | undefined>(initialValue);
  const onPressData = (value: string) => {
    onPressRadioButton(value);
    setCurrent(value);
  };

  return (
    <CyDView className={containerStyle ?? 'justify-around mt-[10px] ml-[20px]'} >
      {radioButtonsData.map((data, index) => (
        <CyDTouchView key={index}
          className='flex flex-row mb-[23px]'
          onPress={(e) => { onPressData(data); }}
          >
          <CyDView
            className={'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-borderColor flex flex-row justify-center items-center'}>
            {current === data
              ? <CyDView
                className={'h-[10px] w-[10px] rounded-[5px] bg-appColor'}>
              </CyDView>
              : null}
          </CyDView>
          <CyDText className={'text-center ml-[10px] text-[16px] font-semibold'}>{data}</CyDText>
        </CyDTouchView>
      ))}
    </CyDView>
  );
}
