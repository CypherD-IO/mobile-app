import React, { SetStateAction, Dispatch } from 'react';
import {
  CyDKeyboardAwareScrollView,
  CyDText,
} from '../../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';

import FormikTextInput from '../../../../../components/v2/formikInput';
import FormikDateInput from '../../../../../components/v2/formikDatePicker';

export default function BasicDetails({
  setIndex,
}: {
  setIndex: Dispatch<SetStateAction<number>>;
}) {
  const { t } = useTranslation();

  return (
    <CyDKeyboardAwareScrollView className='px-[16px]'>
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
      <CyDText className='text-n200'>
        {t(
          'An email address is necessary for verification, updates and further communication',
        )}
      </CyDText>
    </CyDKeyboardAwareScrollView>
  );
}
