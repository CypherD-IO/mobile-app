import React, { useState } from 'react';
import { Button, Keyboard, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useField } from 'formik';
import { CyDText, CyDTextInput, CyDView } from '../../styles/tailwindStyles';
import clsx from 'clsx';

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
  inputClassName = 'p-[16px] rounded-[8px] bg-white font-semibold border-[1px] border-white',
  errorClassName = 'text-red-500 text-[12px] mt-[2px] text-end w-full',
}) => {
  const [field, meta, helpers] = useField(name);
  const [show, setShow] = useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate ?? field.value;
    setShow(Platform.OS === 'ios');

    // Handle the Promise returned by setValue
    helpers
      .setValue(currentDate)
      .catch(error => console.error('Error setting date value:', error));
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
          value={field.value ? field.value.toLocaleDateString() : ''}
          className={clsx(inputClassName, {
            'text-black border-white': !meta.error,
            'text-red-500 border-red-500': meta.touched && meta.error,
          })}
          onFocus={showDatepicker}
          showSoftInputOnFocus={false}
          placeholderTextColor={'#A6AEBB'}
        />
        {meta.touched && meta.error && (
          <CyDText className={errorClassName}>{meta.error}</CyDText>
        )}
      </CyDView>
      {Platform.OS === 'ios' && show && (
        <Modal
          transparent={true}
          animationType='slide'
          visible={show}
          onRequestClose={() => setShow(false)}>
          <CyDView className='flex flex-col h-full justify-end'>
            <CyDView className='bg-white p-[10px] rounded-t-p[10px]'>
              <CyDView className='flex flex-row justify-end'>
                <Button
                  title='Done'
                  onPress={() => {
                    setShow(false);
                  }}
                />
              </CyDView>
              <DateTimePicker
                testID='dateTimePicker'
                value={field.value || new Date()}
                mode='date'
                display='spinner'
                onChange={onChangeDate}
              />
            </CyDView>
          </CyDView>
        </Modal>
      )}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          testID='dateTimePicker'
          value={field.value || new Date()}
          mode='date'
          display='default'
          onChange={onChangeDate}
        />
      )}
      {meta.touched && meta.error && (
        <CyDText className='text-red-500 text-[10px] mt-[2px] text-end w-full'>
          {meta.error}
        </CyDText>
      )}
    </CyDView>
  );
};

export default FormikDateInput;
