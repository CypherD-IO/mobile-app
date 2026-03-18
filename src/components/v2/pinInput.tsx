import clsx from 'clsx';
import React, { useRef, useEffect } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { CyDView, CyDTextInput } from '../../styles/tailwindComponents';

export const PinInput = ({
  value,
  onChange,
  error,
  onBlur,
  length,
  isSecureTextEntry = false,
  className = 'flex-row justify-center',
}: {
  value: string[];
  onChange: (value: string[]) => void;
  error: boolean;
  onBlur: () => void;
  length: number;
  isSecureTextEntry?: boolean;
  className?: string;
}) => {
  const inputRefs = useRef([]);
  const keyPressedRef = useRef(false);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChangeText = async (
    text: string,
    index: number,
  ): Promise<void> => {
    if (keyPressedRef.current) {
      keyPressedRef.current = false;
      return;
    }
    keyPressedRef.current = false;

    try {
      const clipboardContent = await Clipboard.getString();
      const digits = clipboardContent.trim().replace(/\D/g, '');
      if (digits.length >= length) {
        onChange(digits.slice(0, length).split(''));
        inputRefs?.current[length - 1]?.focus();
        return;
      }
    } catch {}
    if (text.length === 1 && /^\d$/.test(text)) {
      const newValue = [...value];
      newValue[index] = text;
      onChange(newValue);
      if (index < length - 1) {
        inputRefs?.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, e: any): void => {
    keyPressedRef.current = true;
    const key = e.nativeEvent.key;

    if (/^\d$/.test(key)) {
      const newValue = [...value];

      // If current box is not empty and not the last box, move to next box
      if (newValue[index] !== '' && index < length - 1) {
        newValue[index + 1] = key;
        onChange(newValue);
        inputRefs?.current[index + 1]?.focus();
      } else {
        newValue[index] = key;
        onChange(newValue);
        // Move to the next box if not the last one
        if (index < length - 1) {
          inputRefs?.current[index + 1]?.focus();
        }
      }
    } else if (key === 'Backspace') {
      const newValue = [...value];
      newValue[index] = '';
      onChange(newValue);

      // Move to the previous box if not the first one
      if (index > 0) {
        inputRefs?.current[index - 1]?.focus();
      }
    }
  };

  return (
    <CyDView className={className}>
      {Array.from({ length }, (_, index) => (
        <CyDTextInput
          key={index}
          ref={el => (inputRefs.current[index] = el)}
          className={clsx(
            'h-[64px] w-[50px] text-[22px] font-bold text-center rounded-[8px] border-[1px] border-base200 bg-n0 font-manrope text-base400',
            'mx-[4px]',
            {
              'border-redCyD': error,
            },
          )}
          keyboardType='numeric'
          maxLength={1}
          value={value[index] || ''}
          onChangeText={text => {
            void handleChangeText(text, index);
          }}
          onKeyPress={e => handleKeyPress(index, e)}
          secureTextEntry={isSecureTextEntry}
          onBlur={onBlur}
          selectTextOnFocus
        />
      ))}
    </CyDView>
  );
};
