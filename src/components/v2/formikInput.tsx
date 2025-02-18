import React from 'react';
import { useField } from 'formik';
import { CyDText, CyDTextInput, CyDView } from '../../styles/tailwindStyles';
import clsx from 'clsx';

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
    return text.replace(/,/g, '');
  }
  return text;
};

const FormikTextInput: React.FC<FormikTextInputProps> = ({
  name,
  value,
  containerClassName = '',
  labelClassName = 'text-[12px] font-bold text-base400',
  inputClassName = 'p-[16px] rounded-[8px] bg-n0 font-semibold border-[1px] border-n40 mt-[2px]',
  errorClassName = 'text-red200 text-[12px] mt-[2px] text-end w-full',
  pointerEvents,
  keyboardType,
  ...props
}) => {
  const [field, meta] = useField(name);

  return (
    <CyDView className={containerClassName}>
      <CyDText className={labelClassName}>{props.label}</CyDText>
      <CyDTextInput
        {...props}
        pointerEvents={pointerEvents}
        onChangeText={text => {
          const formattedText = parseInputValue(text, keyboardType);
          field.onChange(name)(formattedText);
        }}
        onBlur={field.onBlur(name)}
        value={formatDisplayValue(value ?? field.value, keyboardType)}
        className={clsx(inputClassName, {
          'text-base400 border-n40 ': !meta.error,
          'text-red200 border-red200': meta.touched && meta.error,
        })}
        placeholder={props.placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={'#A6AEBB'}
        returnKeyType='done'
      />
      {meta.touched && meta.error && (
        <CyDText className={errorClassName}>{meta.error}</CyDText>
      )}
    </CyDView>
  );
};

export default FormikTextInput;
