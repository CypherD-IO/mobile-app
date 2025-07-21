/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDTextInput,
} from '../../../../../styles/tailwindComponents';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { screenTitle } from '../../../../../constants';
import ChooseCountryModal from '../../../../../components/v2/ChooseCountryModal';
import { ICountry } from '../../../../../models/cardApplication.model';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { useFormContext } from './FormContext';
import {
  getCountryObjectByDialCode,
  getCountryObjectById,
} from '../../../../../core/util';
import { ApplicationData } from '../../../../../models/applicationData.interface';
import OfferTagComponent from '../../../../../components/v2/OfferTagComponent';
import { Platform } from 'react-native';

// Validation schema for the shipping address form
const ShippingAddressSchema = Yup.object().shape({
  line1: Yup.string()
    .required('Street address is required')
    .max(50, 'Address is too long')
    .matches(/^[^;:!?<>~'%^@{}[\]]*$/, 'Special characters not allowed'),
  line2: Yup.string()
    .nullable()
    .max(50, 'Address line 2 is too long')
    .matches(/^[^;:!?<>~'%^@{}[\]]*$/, 'Special characters not allowed'),
  city: Yup.string()
    .required('City is required')
    .max(20, 'City name is too long')
    .matches(/^[^;:!?<>~'%^@{}[\]]*$/, 'Special characters not allowed'),
  state: Yup.string()
    .required('State is required')
    .max(20, 'State name is too long')
    .matches(/^[^;:!?<>~'%^@{}[\]]*$/, 'Special characters not allowed'),
  postalCode: Yup.string()
    .required('ZIP/PIN Code is required')
    .max(10, 'ZIP/PIN Code is too long')
    .matches(/^[^;:!?<>~'%^@{}[\]]*$/, 'Special characters not allowed'),
  phoneNumber: Yup.string()
    .required('Phone number is required')
    .matches(/^[0-9]*$/, 'Only numbers are allowed'),
});

interface FormValues {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  dialCode: string;
}

const ShippingAddress = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { formState, setFormState } = useFormContext();
  const [selectCountryModalVisible, setSelectCountryModalVisible] =
    useState<boolean>(false);
  const [selectPhoneCountryModalVisible, setSelectPhoneCountryModalVisible] =
    useState<boolean>(false);
  // Check if user has manually set phone country (persisted in form state)
  const isPhoneCountrySet = Boolean(formState.isPhoneCountryExplicitlySet);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Initialize selectedCountry and selectedPhoneCountry from form context if available
  const initialCountry: ICountry | undefined = useMemo(() => {
    if (formState.country) {
      return getCountryObjectById(formState.country);
    }
    const defaultCountry: ICountry = {
      name: 'United States',
      dialCode: '+1',
      flag: '🇺🇸',
      Iso2: 'US',
      Iso3: 'USA',
      currency: 'USD',
    };
    return defaultCountry;
  }, [formState.country]);

  const initialPhoneCountry: ICountry | undefined = useMemo(() => {
    if (formState.dialCode) {
      return getCountryObjectByDialCode(formState.dialCode);
    }
    return initialCountry; // default to address country
  }, [formState.dialCode, initialCountry]);

  const [selectedCountry, setSelectedCountry] = useState<ICountry | undefined>(
    initialCountry,
  );

  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<
    ICountry | undefined
  >(initialPhoneCountry);

  const currentStep = 1;
  const totalSteps = 3;

  // Add refs for each address input
  const line1Ref = useRef<any>(null);
  const line2Ref = useRef<any>(null);
  const cityRef = useRef<any>(null);
  const stateRef = useRef<any>(null);
  const postalCodeRef = useRef<any>(null);
  const phoneNumberRef = useRef<any>(null);

  const handleSubmit = (values: FormValues) => {
    // Update form state with shipping address values
    const updatedFormState = {
      ...formState,
      line1: values.line1,
      line2: values.line2,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      phone: values.phoneNumber,
      country: selectedCountry?.Iso2 ?? '',
      dialCode: selectedPhoneCountry?.dialCode ?? '',
    };

    setFormState(updatedFormState);

    // Navigate to additional details
    navigation.navigate(screenTitle.ADDITIONAL_DETAILS);
  };

  const initialValues: FormValues = {
    line1: formState.line1 ?? '',
    line2: formState.line2 ?? '',
    city: formState.city ?? '',
    state: formState.state ?? '',
    postalCode: formState.postalCode ?? '',
    phoneNumber: formState.phone ?? '',
    dialCode: formState.dialCode ?? '',
  };

  // Handle address country selection
  const handleAddressCountrySelect = (country: ICountry | undefined) => {
    setSelectedCountry(country);
    // Only set phone country if it hasn't been explicitly set by user
    if (!isPhoneCountrySet && country) {
      setSelectedPhoneCountry(country);
    }
  };

  // Handle phone country selection
  const handlePhoneCountrySelect = (country: ICountry | undefined) => {
    setSelectedPhoneCountry(country);
    // Mark that user has explicitly set phone country
    setFormState((prev: ApplicationData) => ({
      ...prev,
      isPhoneCountryExplicitlySet: true,
    }));
  };

  // Persist selectedCountry to form context whenever it changes
  useEffect(() => {
    if (selectedCountry?.Iso2) {
      setFormState((prev: ApplicationData) => ({
        ...prev,
        country: selectedCountry.Iso2,
      }));
    }
  }, [selectedCountry, setFormState]);

  // Persist selectedPhoneCountry dial code to form context whenever it changes
  useEffect(() => {
    if (selectedPhoneCountry?.dialCode) {
      setFormState((prev: ApplicationData) => ({
        ...prev,
        dialCode: selectedPhoneCountry.dialCode,
      }));
    }
  }, [selectedPhoneCountry, setFormState]);

  // Helper function to render error message
  const renderErrorMessage = (errorMsg: string) => (
    <CyDView className='flex-row items-center mb-1'>
      <CyDMaterialDesignIcons
        name='information-outline'
        size={14}
        className='text-red200 mr-1'
      />
      <CyDText className='text-red200 text-[13px]'>{errorMsg}</CyDText>
    </CyDView>
  );

  // Removed keyboard visibility tracking; OfferTagComponent now handles its own animation

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Country Selection Modals */}
      <ChooseCountryModal
        isModalVisible={selectCountryModalVisible}
        setModalVisible={setSelectCountryModalVisible}
        selectedCountryState={[selectedCountry, setSelectedCountry]}
        countryListFetchUrl={
          'https://public.cypherd.io/js/rcSupportedCountries.js'
        }
      />
      <ChooseCountryModal
        isModalVisible={selectPhoneCountryModalVisible}
        setModalVisible={setSelectPhoneCountryModalVisible}
        selectedCountryState={[selectedPhoneCountry, setSelectedPhoneCountry]}
        countryListFetchUrl={
          'https://public.cypherd.io/js/rcSupportedCountries.js'
        }
      />

      {/* Header */}
      <CardApplicationHeader />

      <Formik
        initialValues={initialValues}
        validationSchema={ShippingAddressSchema}
        onSubmit={handleSubmit}>
        {({
          values,
          errors,
          handleChange,
          handleBlur,
          handleSubmit,
          touched,
          isValid,
          dirty,
          setFieldTouched,
          setFieldValue,
        }) => (
          <>
            <KeyboardAwareScrollView
              className='flex-1 px-4'
              enableOnAndroid={true}
              keyboardShouldPersistTaps='handled'>
              {/* Title */}
              <CyDText className='text-[32px] my-6'>
                {t('Billing Address')}
              </CyDText>

              {/* Country Selection */}
              <CyDView className='mb-6'>
                <CyDText className='text-[14px] text-n200 mb-1'>
                  {t('Country/ region')}
                </CyDText>
                <CyDTouchView
                  className='bg-n20 rounded-lg flex-row items-center px-4 py-3'
                  onPress={() => setSelectCountryModalVisible(true)}>
                  <CyDMaterialDesignIcons
                    name='earth'
                    size={20}
                    className='text-n400 mr-2'
                  />
                  <CyDText className='text-[16px] mr-2'>
                    {selectedCountry?.flag}
                  </CyDText>
                  <CyDText className='text-[16px] font-semibold flex-1'>
                    {selectedCountry?.name}
                  </CyDText>
                  <CyDIcons
                    name='chevron-down'
                    size={20}
                    className='text-n400'
                  />
                </CyDTouchView>
              </CyDView>

              {/* Address Fields */}
              <CyDView className='mb-6'>
                <CyDText className='text-[14px] text-n200 mb-1'>
                  {t('BILLING_ADDRESS_TITLE')}
                </CyDText>
                <CyDView>
                  <CyDTextInput
                    ref={line1Ref}
                    value={values.line1}
                    onChangeText={handleChange('line1')}
                    onBlur={() => setFieldTouched('line1', true)}
                    placeholder={t('Street Address')}
                    className='py-[16px] px-[12px] rounded-t-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
                    returnKeyType='next'
                    placeholderTextColor={'#A6AEBB'}
                    onSubmitEditing={() => line2Ref.current?.focus()}
                  />
                  <CyDTextInput
                    ref={line2Ref}
                    value={values.line2}
                    onChangeText={handleChange('line2')}
                    onBlur={() => setFieldTouched('line2', true)}
                    placeholder={t('Apartment, Suite, etc (if applicable)')}
                    className='py-[16px] px-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
                    returnKeyType='next'
                    placeholderTextColor={'#A6AEBB'}
                    onSubmitEditing={() => cityRef.current?.focus()}
                  />
                  <CyDTextInput
                    ref={cityRef}
                    value={values.city}
                    onChangeText={handleChange('city')}
                    onBlur={() => setFieldTouched('city', true)}
                    placeholder={t('City')}
                    className='py-[16px] px-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
                    returnKeyType='next'
                    placeholderTextColor={'#A6AEBB'}
                    onSubmitEditing={() => stateRef.current?.focus()}
                  />
                  <CyDTextInput
                    ref={stateRef}
                    value={values.state}
                    onChangeText={handleChange('state')}
                    onBlur={() => setFieldTouched('state', true)}
                    placeholder={t('State or province')}
                    className='py-[16px] px-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
                    returnKeyType='next'
                    placeholderTextColor={'#A6AEBB'}
                    onSubmitEditing={() => postalCodeRef.current?.focus()}
                  />
                  <CyDTextInput
                    ref={postalCodeRef}
                    value={values.postalCode}
                    onChangeText={handleChange('postalCode')}
                    onBlur={() => setFieldTouched('postalCode', true)}
                    placeholder={t('ZIP / PIN Code')}
                    className='py-[16px] px-[12px] rounded-b-[12px] bg-n20 font-semibold'
                    placeholderTextColor={'#A6AEBB'}
                    returnKeyType='next'
                    onSubmitEditing={() => phoneNumberRef.current?.focus()}
                  />
                </CyDView>
              </CyDView>

              {/* Address Fields Error Messages */}
              <CyDView className='mb-2'>
                {touched.line1 && errors.line1
                  ? renderErrorMessage(errors.line1)
                  : null}
                {touched.line2 && errors.line2
                  ? renderErrorMessage(errors.line2)
                  : null}
                {touched.city && errors.city
                  ? renderErrorMessage(errors.city)
                  : null}
                {touched.state && errors.state
                  ? renderErrorMessage(errors.state)
                  : null}
                {touched.postalCode && errors.postalCode
                  ? renderErrorMessage(errors.postalCode)
                  : null}
              </CyDView>

              {/* Phone Number */}
              <CyDView className='mb-4'>
                <CyDText className='text-[14px] text-n200 mb-1'>
                  {t('Phone Number')}
                </CyDText>
                <CyDView className='flex-row'>
                  <CyDTouchView
                    className='h-[62px] px-4 rounded-lg bg-n20 flex-row items-center justify-center mr-2 w-[90px]'
                    onPress={() => setSelectPhoneCountryModalVisible(true)}>
                    <CyDText>{selectedPhoneCountry?.dialCode}</CyDText>
                    <CyDIcons
                      name='chevron-down'
                      size={16}
                      className='text-n400 ml-1'
                    />
                  </CyDTouchView>
                  <CyDTextInput
                    value={values.phoneNumber}
                    onChangeText={text => setFieldValue('phoneNumber', text)}
                    onBlur={() => setFieldTouched('phoneNumber', true)}
                    placeholder={t('Your Phone number')}
                    className='flex-1 py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold'
                    keyboardType='phone-pad'
                    ref={phoneNumberRef}
                    placeholderTextColor={'#A6AEBB'}
                    returnKeyType='done'
                    onSubmitEditing={() => phoneNumberRef.current?.blur()}
                  />
                </CyDView>
              </CyDView>

              {/* Phone Number Error Message */}
              <CyDView className='mb-2'>
                {touched.phoneNumber && errors.phoneNumber
                  ? renderErrorMessage(errors.phoneNumber)
                  : null}
              </CyDView>
            </KeyboardAwareScrollView>

            <OfferTagComponent
              position={{
                bottom: Platform.OS === 'android' ? 118 : 146,
                left: 16,
                right: 16,
              }}
            />

            {/* Footer */}
            <CardApplicationFooter
              currentStep={currentStep}
              totalSteps={totalSteps}
              currentSectionProgress={80}
              buttonConfig={{
                title: t('NEXT'),
                onPress: () => {
                  handleSubmit();
                },
                disabled: !isValid,
              }}
            />
          </>
        )}
      </Formik>
    </CyDView>
  );
};

export default ShippingAddress;
