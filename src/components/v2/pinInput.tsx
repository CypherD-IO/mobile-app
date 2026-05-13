import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import {
  CyDText,
  CyDTextInput,
  CyDTouchView,
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

  useEffect(() => {
    if (!isOtp) return;
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [isOtp]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    const next = Array.from({ length }, (_, i) => digits[i] ?? '');
    onChange(next);
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <CyDView className={className}>
      <CyDTextInput
        ref={inputRef as React.Ref<TextInput>}
        style={styles.hiddenInput}
        keyboardType='numeric'
        maxLength={length}
        value={joined}
        onChangeText={handleChangeText}
        onBlur={onBlur}
        autoFocus={isOtp}
        autoComplete={isOtp ? 'sms-otp' : 'off'}
        textContentType={isOtp ? 'oneTimeCode' : 'none'}
        importantForAutofill={isOtp ? 'yes' : 'no'}
        caretHidden
      />
      {Array.from({ length }, (_, index) => {
        const filled = !!value[index];
        const display = filled
          ? isSecureTextEntry
            ? '•'
            : value[index]
          : '';
        const isActive = joined.length === index;
        return (
          <CyDTouchView
            key={index}
            activeOpacity={0.8}
            onPress={focusInput}
            className={clsx(
              'h-[64px] w-[50px] mx-[4px] rounded-[8px] border-[1px] bg-n0 items-center justify-center',
              {
                'border-redCyD': error,
                'border-base400': !error && isActive,
                'border-base200': !error && !isActive,
              },
            )}>
            <CyDText className='text-[22px] font-bold font-manrope text-base400'>
              {display}
            </CyDText>
          </CyDTouchView>
        );
      })}
    </CyDView>
  );
};

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
