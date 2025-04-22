import React, { useState } from 'react';
import { useField } from 'formik';
import {
  CyDText,
  CyDView,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDScrollView,
} from '../../styles/tailwindComponents';
import { StyleSheet, Dimensions, ScrollView } from 'react-native';
import clsx from 'clsx';

interface Option {
  label: string;
  value: string;
}

interface FormikSelectProps {
  name: string;
  label: string;
  options: Option[];
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  errorClassName?: string;
  placeholder?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_DROPDOWN_HEIGHT = SCREEN_HEIGHT * 0.3; // 30% of screen height

const FormikSelect: React.FC<FormikSelectProps> = ({
  name,
  label,
  options,
  containerClassName = '',
  labelClassName = 'text-[12px] font-bold text-base400',
  selectClassName = 'p-[16px] rounded-[8px] bg-n0 font-semibold border-[1px] border-n40 mt-[2px]',
  errorClassName = 'text-red200 text-[12px] mt-[2px] text-end w-full',
  placeholder = 'Select an option',
}) => {
  const [field, meta, helpers] = useField(name);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.value === field.value);

  const handleOptionSelect = (value: string) => {
    void helpers.setValue(value);
    setIsOpen(false);
  };

  return (
    <CyDView className={containerClassName}>
      <CyDText className={labelClassName}>{label}</CyDText>
      <CyDView style={styles.container}>
        <CyDTouchView
          onPress={() => setIsOpen(!isOpen)}
          className={clsx(selectClassName, {
            'text-base400 border-n40': !meta.error,
            'text-red200 border-red200': meta.touched && meta.error,
            'rounded-b-none': isOpen,
          })}>
          <CyDView className='flex-row justify-between items-center'>
            <CyDText className={!selectedOption ? 'text-n200' : ''}>
              {selectedOption ? selectedOption.label : placeholder}
            </CyDText>
            <CyDMaterialDesignIcons
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              className='text-base400'
            />
          </CyDView>
        </CyDTouchView>

        {isOpen && (
          <CyDView
            className='bg-n0 border-x border-b border-n40 rounded-b-[8px]'
            style={styles.dropdownContainer}>
            <CyDScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              bounces={false}
              onTouchStart={e => {
                // Prevent parent scroll view from handling this touch
                e.stopPropagation();
              }}
              onTouchMove={e => {
                // Prevent parent scroll view from handling this touch
                e.stopPropagation();
              }}>
              {options.map(option => (
                <CyDTouchView
                  key={option.value}
                  onPress={() => handleOptionSelect(option.value)}
                  className={clsx('p-[16px]', {
                    'border-t border-n40': option !== options[0],
                  })}>
                  <CyDText>{option.label}</CyDText>
                </CyDTouchView>
              ))}
            </CyDScrollView>
          </CyDView>
        )}
      </CyDView>
      {meta.touched && meta.error && (
        <CyDText className={errorClassName}>{meta.error}</CyDText>
      )}
    </CyDView>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 999,
  },
  dropdownContainer: {
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: MIN_DROPDOWN_HEIGHT,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

export default FormikSelect;
