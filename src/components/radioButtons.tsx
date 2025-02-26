import React, { useState } from 'react';
import { CyDText, CyDTouchView, CyDView } from '../styles/tailwindComponents';

export default function RadioButtons(props: any) {
  const {
    radioButtonsData,
    onPressRadioButton,
    currentValue,
    containerStyle,
  }: {
    radioButtonsData: Array<{ id: number | string; label: string; value: any }>;
    onPressRadioButton: any;
    currentValue: string | number;
    containerStyle?: string;
  } = props;
  const onPressData = (value: string | number) => {
    onPressRadioButton(value);
  };

  return (
    <CyDView className={containerStyle ?? 'justify-around mt-[10px] ml-[20px]'}>
      {radioButtonsData.map((data, index) => (
        <CyDTouchView
          key={index}
          className='flex flex-row mb-[23px]'
          onPress={e => {
            onPressData(data.id);
          }}>
          <CyDView
            className={
              'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-base100 flex flex-row justify-center items-center'
            }>
            {currentValue === data.id ? (
              <CyDView className={'h-[10px] w-[10px] rounded-[5px] bg-p50'} />
            ) : null}
          </CyDView>
          <CyDText
            className={'text-center ml-[10px] text-[16px] font-semibold'}>
            {data.label}
          </CyDText>
        </CyDTouchView>
      ))}
    </CyDView>
  );
}
