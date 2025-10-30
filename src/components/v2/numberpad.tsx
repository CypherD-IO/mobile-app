import React from 'react';
import {
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

/**
 * CyDNumberPad component - A numeric keypad for amount entry
 * Uses a flex-based layout instead of FlatList to avoid VirtualizedList nesting warnings
 * when used inside ScrollViews
 * @param value - Current value displayed
 * @param setValue - Callback function to update the value
 */
export default function CyDNumberPad({
  value,
  setValue,
}: {
  value: string;
  setValue: (amt: string) => void;
}): JSX.Element {
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

  /**
   * Handles number pad button press
   * @param item - The button value pressed
   */
  const handlePress = (item: string): void => {
    if (item === '<') {
      // Remove last character (backspace functionality)
      setValue(value.slice(0, -1));
    } else {
      // Append the pressed character
      setValue(value.concat(item));
    }
  };

  /**
   * Renders a single number pad button
   * @param item - The button value to render
   */
  const renderButton = (item: string): JSX.Element => {
    return (
      <CyDTouchView
        key={item}
        className='w-[33.3%] h-[82px] justify-center items-center'
        onPress={() => handlePress(item)}>
        <CyDText className='text-[22px] font-extrabold'>{item}</CyDText>
      </CyDTouchView>
    );
  };

  return (
    <CyDView className='w-[86%] self-center'>
      {/* Using flex layout with rows instead of FlatList to avoid VirtualizedList nesting issues */}
      <CyDView className='flex-row flex-wrap'>
        {numberPadValues.map(renderButton)}
      </CyDView>
    </CyDView>
  );
}
