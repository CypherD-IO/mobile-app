import clsx from 'clsx';
import React, { useRef } from 'react';
import { TextInput } from 'react-native';
import {
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../styles/tailwindComponents';

export const PinInput = ({
  value,
  onChange,
  error,
  onBlur,
  length,
  isSecureTextEntry = false,
  isOtp = false,
  className = 'flex-row justify-center',
}: {
  value: string[];
  onChange: (value: string[]) => void;
  error: boolean;
  onBlur: () => void;
  length: number;
  isSecureTextEntry?: boolean;
  isOtp?: boolean;
  className?: string;
}) => {
  const inputRef = useRef<TextInput>(null);
  const joined = value.join('');

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    const next = Array.from({ length }, (_, i) => digits[i] ?? '');
    onChange(next);
  };

  return (
    <CyDView className={className}>
      {Array.from({ length }, (_, index) => {
        const filled = !!value[index];
        const display = filled
          ? isSecureTextEntry
            ? '•'
            : value[index]
          : '';
        return (
          <CyDView
            key={index}
            className={clsx(
              'h-[64px] w-[50px] mx-[4px] rounded-[8px] border-[1px] bg-n0 items-center justify-center',
              {
                'border-redCyD': error,
                'border-base200': !error,
              },
            )}>
            <CyDText className='text-[22px] font-bold font-manrope text-base400'>
              {display}
            </CyDText>
          </CyDView>
        );
      })}
      <CyDTextInput
        ref={inputRef as React.Ref<TextInput>}
        className='absolute top-0 left-0 right-0 bottom-0 opacity-0'
        keyboardType='numeric'
        maxLength={length}
        value={joined}
        onChangeText={handleChangeText}
        onBlur={onBlur}
        autoComplete={isOtp ? 'sms-otp' : 'off'}
        textContentType={isOtp ? 'oneTimeCode' : 'none'}
        importantForAutofill={isOtp ? 'yes' : 'no'}
        caretHidden
      />
    </CyDView>
  );
};
