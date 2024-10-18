import clsx from 'clsx';
import React, { useRef, useEffect } from 'react';
import { CyDView, CyDTextInput } from '../../styles/tailwindStyles';

export const PinInput = ({
  value,
  onChange,
  error,
  onBlur,
  length,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  error: boolean;
  onBlur: () => void;
  length: number;
}) => {
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (index: number, digit: string) => {
    if (/^\d$/.test(digit) || digit === '') {
      const newValue = [...value];
      newValue[index] = digit;
      onChange(newValue);

      if (digit !== '' && index < length - 1) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newValue = [...value];
      newValue[index] = '';
      onChange(newValue);

      if ((value[index] === '' || value[index] === undefined) && index > 0) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  return (
    <CyDView className='flex-row justify-center'>
      {Array.from({ length }, (_, index) => (
        <CyDTextInput
          key={index}
          ref={el => (inputRefs.current[index] = el)}
          className={clsx(
            'h-[64px] w-[50px] text-center rounded-[5px] border-[1px] border-inputBorderColor bg-white',
            'mx-[6px]',
            {
              'border-redCyD': error,
            },
          )}
          keyboardType='numeric'
          maxLength={1}
          value={value[index] || ''}
          onChangeText={digit => handleChange(index, digit)}
          onKeyPress={e => handleKeyDown(index, e)}
          secureTextEntry={false}
          onBlur={onBlur}
        />
      ))}
    </CyDView>
  );
};
