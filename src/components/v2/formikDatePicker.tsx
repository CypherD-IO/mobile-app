import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { useField } from 'formik';
import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { Keyboard } from 'react-native';
import DatePickerModal from 'react-native-modal-datetime-picker';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../styles/tailwindComponents';

interface FormikDateInputProps {
  name: string;
  label: string;
  placeholder?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  onDateSelected?: () => void;
}

const FormikDateInput = forwardRef<any, FormikDateInputProps>(
  (
    {
      name,
      label,
      placeholder,
      containerClassName = '',
      labelClassName = 'text-[12px] font-bold text-base400',
      inputClassName = 'p-[16px] rounded-[8px] bg-n0 font-semibold border-[1px] border-n40',
      errorClassName = 'text-red200 text-[12px] mt-[2px] text-end w-full',
      onDateSelected,
    },
    ref,
  ) => {
    const [field, meta, helpers] = useField(name);
    const [show, setShow] = useState(false);
    const [selectedDateTemp, setSelectedDateTemp] = useState<Date | null>(null);

    const openDatePicker = useCallback(() => {
      setShow(true);
      Keyboard.dismiss();
    }, []);

    useImperativeHandle(ref, () => ({
      openDatePicker,
    }));

    const onChangeDate = useCallback((selectedDate?: Date) => {
      setSelectedDateTemp(selectedDate ?? null);
      setShow(false);
    }, []);

    const handleModalHide = useCallback(() => {
      if (selectedDateTemp) {
        const formattedDate = selectedDateTemp.toISOString().split('T')[0];
        helpers
          .setValue(formattedDate)
          .catch(error => Sentry.captureException(error));
        setSelectedDateTemp(null);

        // Call onDateSelected after a short delay to ensure the modal is fully hidden
        if (onDateSelected) {
          setTimeout(onDateSelected, 100);
        }
      }
    }, [selectedDateTemp, helpers, onDateSelected]);

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
              'text-base400 border-n40': !meta.error,
              'text-red200 border-red200': meta.touched && meta.error,
            })}
            onFocus={openDatePicker}
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
          onHide={handleModalHide}
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

FormikDateInput.displayName = 'FormikDateInput';

export default FormikDateInput;
