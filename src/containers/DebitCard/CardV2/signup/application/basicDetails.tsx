import React, { useRef } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CyDView, CyDText } from '../../../../../styles/tailwindComponents';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { screenTitle } from '../../../../../constants';
import FormikTextInput from '../../../../../components/v2/formikInput';
import FormikDateInput from '../../../../../components/v2/formikDatePicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ReturnKeyTypeOptions } from 'react-native';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { useFormContext } from './FormContext';
import { t } from 'i18next';

// Validation schema for the basic details form
const BasicDetailsSchema = Yup.object().shape({
  firstName: Yup.string()
    .required('First name is required')
    .matches(/^[A-Za-z\s]+$/, 'Only alphabets and spaces are allowed'),
  lastName: Yup.string()
    .required('Last name is required')
    .matches(/^[A-Za-z\s]+$/, 'Only alphabets and spaces are allowed'),
  dateOfBirth: Yup.string()
    .required('Date of birth is required')
    .test('isValidAge', 'You must be at least 18 years old', dateOfBirth => {
      if (!dateOfBirth) return false;

      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age >= 18;
    }),
  email: Yup.string().email(t('INVALID_EMAIL')).required(t('EMAIL_REQUIRED')),
});

interface FormValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
}

const BasicDetails = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const currentStep = 1;
  const totalSteps = 3;
  const { formState, setFormState } = useFormContext();

  // Add refs for each input
  const firstNameRef = useRef<any>(null);
  const lastNameRef = useRef<any>(null);
  const dobRef = useRef<any>(null);
  const emailRef = useRef<any>(null);

  const handleSubmit = (values: FormValues) => {
    // Update form state
    const updatedFormState = {
      ...formState,
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      email: values.email,
    };

    setFormState(updatedFormState);

    // Navigate to shipping address
    navigation.navigate(screenTitle.SHIPPING_ADDRESS);
  };

  const initialValues: FormValues = {
    firstName: formState.firstName || '',
    lastName: formState.lastName || '',
    dateOfBirth: formState.dateOfBirth || '',
    email: formState.email || '',
  };

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <CardApplicationHeader />

      <Formik
        initialValues={initialValues}
        validationSchema={BasicDetailsSchema}
        onSubmit={handleSubmit}>
        {({ handleSubmit, isValid, dirty }) => (
          <>
            <KeyboardAwareScrollView
              className='flex-1 px-4'
              enableOnAndroid={true}
              keyboardShouldPersistTaps='handled'>
              {/* Title and Description */}
              <CyDView className='mt-6 mb-8'>
                <CyDText className='text-[32px] mb-[6px]'>
                  {t('BASIC_DETAILS')}
                </CyDText>
                <CyDText className='text-[14px] font-medium text-n200'>
                  {t(
                    'Please provide a few details about yourself so we can get your account set up smoothly.',
                  )}
                </CyDText>
              </CyDView>

              {/* Form Fields */}
              <FormikTextInput
                name='firstName'
                label={t('FIRST_NAME_INIT_CAPS')}
                containerClassName='mb-[4px]'
                labelClassName='text-[14px] text-n200'
                inputClassName='py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold border-[1px] border-transparent mt-[2px] focus:border-base400'
                ref={firstNameRef}
                returnKeyType={'next' as ReturnKeyTypeOptions}
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />

              <FormikTextInput
                name='lastName'
                label={t('LAST_NAME_INIT_CAPS')}
                containerClassName='mb-[4px]'
                labelClassName='text-[14px] text-n200'
                inputClassName='py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold border-[1px] border-transparent mt-[2px] focus:border-base400'
                ref={lastNameRef}
                returnKeyType={'next' as ReturnKeyTypeOptions}
                onSubmitEditing={() => dobRef.current?.openDatePicker?.()}
              />

              <FormikDateInput
                name='dateOfBirth'
                label={t('DATE_OF_BIRTH')}
                placeholder='DD - MM - YYYY'
                containerClassName='mb-[4px]'
                labelClassName='text-[14px] text-n200'
                inputClassName='py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold border-[1px] border-transparent mt-[2px] focus:border-base400'
                onDateSelected={() => emailRef.current?.focus()}
                ref={dobRef}
              />

              <FormikTextInput
                name='email'
                label={t('EMAIL_ADDRESS_INIT_CAPS')}
                containerClassName='mb-[4px]'
                labelClassName='text-[14px] text-n200'
                inputClassName='py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold border-[1px] border-transparent mt-[2px] focus:border-base400'
                autoCapitalize='none'
                ref={emailRef}
                returnKeyType={'done' as ReturnKeyTypeOptions}
                onSubmitEditing={() => emailRef.current?.blur()}
              />

              {/* <CyDText className='text-n200 text-[12px] mb-[17px]'>
                {t(
                  'An email address is necessary for verification, updates and further communication',
                )}
              </CyDText> */}
            </KeyboardAwareScrollView>

            {/* Footer */}
            <CardApplicationFooter
              currentStep={currentStep}
              totalSteps={totalSteps}
              currentSectionProgress={60}
              buttonConfig={{
                title: t('NEXT'),
                onPress: () => handleSubmit(),
                disabled: !isValid,
              }}
            />
          </>
        )}
      </Formik>
    </CyDView>
  );
};

export default BasicDetails;
