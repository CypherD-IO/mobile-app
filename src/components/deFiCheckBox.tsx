import React, { useEffect, useState } from 'react';
import AppImages from '../../assets/images/appImages';
import {
  CyDFastImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindComponents';
import clsx from 'clsx';

export default function DeFiCheckBox(props: any) {
  const {
    radioButtonsData,
    onPressRadioButton,
    initialValues = [],
  }: {
    radioButtonsData: Array<{
      logo: { uri: string };
      label: string;
      value: string;
    }>;
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
    <CyDScrollView className={'mt-[10px] ml-[20px]'}>
      {radioButtonsData.map((data, id) => (
        <CyDTouchView
          key={`${id}_${data.value}`}
          onPress={e => {
            onPressData(data.value);
          }}
          className='flex flex-row mb-[23px]'>
          <CyDView
            className={clsx(
              'h-[21px] w-[21px]  rounded-[4px] border-[1.5px] border-base100 flex flex-row justify-center items-center',
              {
                'bg-p50': current.includes(data.value),
              },
            )}
          />
          <CyDFastImage
            source={data.logo}
            className='h-[20px] w-[20px] ml-[12px] rounded-full'
            resizeMode='contain'
          />
          <CyDText className={'text-center ml-[6px] text-[16px] font-semibold'}>
            {data.label}
          </CyDText>
        </CyDTouchView>
      ))}
    </CyDScrollView>
  );
}
