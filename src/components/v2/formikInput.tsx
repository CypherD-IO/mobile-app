import React, { forwardRef } from 'react';
import { useField } from 'formik';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../styles/tailwindComponents';
import clsx from 'clsx';
import { ReturnKeyTypeOptions } from 'react-native';

interface FormikTextInputProps {
  name: string;
  value?: string;
  placeholder?: string;
  label: string;
  secureTextEntry?: boolean;
  keyboardType?:
    | 'default'
    | 'number-pad'
    | 'decimal-pad'
    | 'numeric'
    | 'email-address'
    | 'phone-pad';
  style?: object;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  editable?: boolean;
  pointerEvents?: 'none' | 'auto' | 'box-only' | 'box-none';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
}

// Helper function to format the display value
const formatDisplayValue = (
  value: string | undefined,
  keyboardType: string | undefined,
) => {
  if ((keyboardType === 'numeric' || keyboardType === 'decimal-pad') && value) {
    return Number(value).toLocaleString();
  }
  return value;
};

// Helper function to parse the input value

const parseInputValue = (text: string, keyboardType: string | undefined) => {
  if (keyboardType === 'numeric' || keyboardType === 'decimal-pad') {
    // Remove all non-numeric characters except decimal point and minus sign
    const cleaned = text.replace(/[^\d.-]/g, '');

    // Handle decimal points based on keyboard type
    if (keyboardType === 'numeric') {
      return cleaned.replace(/[.-]/g, '');
    }

    // For decimal-pad, ensure only one decimal point and handle negative numbers
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  }
  return text;
};

const FormikTextInput = forwardRef<any, FormikTextInputProps>(
  (
    {
      name,
      value,
      containerClassName = '',
      labelClassName = 'text-[12px] font-bold text-base400',
      inputClassName = 'p-[16px] rounded-[8px] bg-n0 font-semibold border-[1px] border-n40 mt-[2px]',
      errorClassName = 'text-red200 text-[12px] mt-[2px] text-end w-full',
      pointerEvents,
      keyboardType,
      onSubmitEditing,
      returnKeyType,
      ...props
    },
    ref,
  ) => {
    const [field, meta] = useField(name);

    return (
      <CyDView className={containerClassName}>
        <CyDText className={labelClassName}>{props.label}</CyDText>
        <CyDTextInput
          {...props}
          ref={ref}
          pointerEvents={pointerEvents}
          onChangeText={text => {
            const formattedText = parseInputValue(text, keyboardType);
            field.onChange(name)(formattedText);
          }}
          onBlur={field.onBlur(name)}
          value={formatDisplayValue(value ?? field.value, keyboardType)}
          className={clsx(inputClassName, {
            'text-base400 border-n40 ': !meta.error,
            'bg-red20': meta.touched && meta.error,
          })}
          placeholder={props.placeholder}
          keyboardType={keyboardType}
          placeholderTextColor={'#A6AEBB'}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          placeholderClassName='text-[400]'
          autoCapitalize={props.autoCapitalize}
        />
        {meta.touched && meta.error ? (
          <CyDView className='flex-row items-center'>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={14}
              className='text-red200 mr-1 mt-[2px]'
            />
            <CyDText className={errorClassName}>{meta.error}</CyDText>
          </CyDView>
        ) : (
          <CyDText className={errorClassName}>{'\u00A0'}</CyDText>
        )}
      </CyDView>
    );
  },
);

FormikTextInput.displayName = 'FormikTextInput';

export default FormikTextInput;
