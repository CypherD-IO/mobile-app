import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { useField } from 'formik';
import React, { useState } from 'react';
import { Keyboard } from 'react-native';
import DatePickerModal from 'react-native-modal-datetime-picker';
import { CyDText, CyDTextInput, CyDView } from '../../styles/tailwindStyles';

interface FormikDateInputProps {
  name: string;
  label: string;
  placeholder?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
}

const FormikDateInput: React.FC<FormikDateInputProps> = ({
  name,
  label,
  placeholder,
  containerClassName = '',
  labelClassName = 'text-[12px] font-bold text-black',
  inputClassName = 'p-[16px] rounded-[8px] bg-n0 font-semibold border-[1px] border-white',
  errorClassName = 'text-red-500 text-[12px] mt-[2px] text-end w-full',
}) => {
  const [field, meta, helpers] = useField(name);
  const [show, setShow] = useState(false);

  const onChangeDate = (selectedDate?: Date) => {
    const currentDate = selectedDate ?? field.value;
    const formattedDate = currentDate.toISOString().split('T')[0];
    helpers
      .setValue(formattedDate ?? null)
      .catch(error => Sentry.captureException(error));
    setShow(false);
  };

  const showDatepicker = () => {
    setShow(true);
    Keyboard.dismiss();
  };

  return (
    <CyDView className={containerClassName}>
      <CyDText className={labelClassName}>{label}</CyDText>
      <CyDView className='z-[100]'>
        <CyDTextInput
          placeholder={placeholder}
          onChangeText={field.onChange(name)}
          value={
            field.value && field.value instanceof Date
              ? field.value.toLocaleDateString()
              : field.value
                ? new Date(field.value).toLocaleDateString()
                : ''
          }
          className={clsx(inputClassName, {
            'text-black border-white': !meta.error,
            'text-red-500 border-red-500': meta.touched && meta.error,
          })}
          onFocus={showDatepicker}
          showSoftInputOnFocus={false}
          placeholderTextColor={'#A6AEBB'}
        />
      </CyDView>
      <DatePickerModal
        isVisible={show}
        mode='date'
        date={field.value ? new Date(field.value) : new Date()}
        onConfirm={onChangeDate}
        onCancel={() => setShow(false)}
      />
      {meta.touched && meta.error && (
        <CyDText
          className={clsx(
            'text-red-500 text-[10px] mt-[2px] text-end w-full',
            errorClassName,
          )}>
          {meta.error}
        </CyDText>
      )}
    </CyDView>
  );
};

export default FormikDateInput;
