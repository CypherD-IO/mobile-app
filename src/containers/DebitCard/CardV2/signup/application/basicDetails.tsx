import React from 'react';
import {
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDView,
} from '../../../../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';

import FormikTextInput from '../../../../../components/v2/formikInput';
import FormikDateInput from '../../../../../components/v2/formikDatePicker';
import FormikSelect from '../../../../../components/v2/formikSelect';
import { OCCUPATION_LABEL_TO_CODE_MAP } from '../../../../../constants/data';
import { Platform } from 'react-native';

export default function BasicDetails() {
  const { t } = useTranslation();

  const occupationOptions = Object.entries(OCCUPATION_LABEL_TO_CODE_MAP).map(
    ([label, value]) => ({
      label,
      value,
    }),
  );

  return (
    <CyDKeyboardAwareScrollView
      className='flex-1'
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={Platform.OS === 'ios' ? 0 : 0}
      keyboardShouldPersistTaps='handled'
      keyboardOpeningTime={0}>
      <CyDView className='px-[16px]'>
        <CyDText className='font-bold text-[28px] mb-[24px]'>
          {t('BASIC_DETAILS')}
        </CyDText>
        <FormikTextInput
          name='firstName'
          label='First Name'
          containerClassName='mb-[17px]'
        />
        <FormikTextInput
          name='lastName'
          label='Last Name'
          containerClassName='mb-[17px]'
        />
        <FormikDateInput
          name='dateOfBirth'
          label='Date of Birth'
          placeholder='DD MM YYYY'
          containerClassName='mb-[17px]'
        />
        <FormikTextInput name='email' label='Email' containerClassName='' />
        <CyDText className='text-n200 mb-[17px]'>
          {t(
            'An email address is necessary for verification, updates and further communication',
          )}
        </CyDText>
        <FormikSelect
          name='occupation'
          label='Occupation'
          options={occupationOptions}
          containerClassName='mb-[17px]'
          placeholder='Select your occupation'
        />
        <FormikTextInput
          name='annualSalary'
          label='Annual Income'
          containerClassName='mb-[17px]'
          placeholder='Annual Income in USD'
          keyboardType='numeric'
        />
        <FormikTextInput
          name='expectedMonthlyVolume'
          label='Expected Monthly Spend'
          containerClassName='mb-[17px]'
          placeholder='Expected Monthly Spend in USD'
          keyboardType='numeric'
        />
      </CyDView>
    </CyDKeyboardAwareScrollView>
  );
}
