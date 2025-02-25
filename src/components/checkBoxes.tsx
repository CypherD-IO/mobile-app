import React, { useEffect, useState } from 'react';
import { CyDText, CyDTouchView, CyDView } from '../styles/tailwindComponents';

export default function CheckBoxes(props: any) {
  const {
    radioButtonsData,
    onPressRadioButton,
    initialValues = [],
  }: {
    radioButtonsData: string[];
    onPressRadioButton: any;
    initialValues: string[];
  } = props;

  const [current, setCurrent] = useState<string[]>(initialValues);
  const onPressData = (value: string) => {
    const state = current.includes(value)
      ? current.filter(val => val !== value)
      : [...current, value];
    onPressRadioButton(state);
    setCurrent(state);
  };

  useEffect(() => {
    setCurrent(initialValues);
  }, [initialValues]);

  return (
    <CyDView className={'justify-around mt-[10px] ml-[20px]'}>
      {radioButtonsData.map((data, id) => (
        <CyDTouchView
          key={id + data}
          onPress={e => {
            onPressData(data);
          }}
          className='flex flex-row mb-[23px]'>
          <CyDView
            className={`h-[21px] w-[21px] ${current.includes(data) ? 'bg-p50' : ''} rounded-[4px] border-[1.5px] border-base100 flex flex-row justify-center items-center`}
          />
          <CyDText
            className={'text-center ml-[10px] text-[16px] font-semibold'}>
            {data}
          </CyDText>
        </CyDTouchView>
      ))}
    </CyDView>
  );
}
