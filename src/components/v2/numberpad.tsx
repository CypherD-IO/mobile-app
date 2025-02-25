import React, { Dispatch, SetStateAction } from 'react';
import {
  CyDFlatList,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

export default function CyDNumberPad({
  value,
  setValue,
}: {
  value: string;
  setValue: (amt: string) => void;
}) {
  const numberPadValues = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '.',
    '0',
    '<',
  ];

  const renderItem = ({ item }: { item: string }) => {
    return (
      <CyDTouchView
        className='w-[33.3%] h-[82px] justify-center items-center'
        onPress={() => {
          if (item === '<') {
            setValue(value.slice(0, -1));
          } else {
            setValue(value.concat(item));
          }
        }}>
        <CyDText className='text-[22px] font-extrabold'>{item}</CyDText>
      </CyDTouchView>
    );
  };

  return (
    <CyDView className='w-[86%] self-center'>
      <CyDFlatList
        data={numberPadValues}
        numColumns={3}
        renderItem={renderItem as any}
      />
    </CyDView>
  );
}
