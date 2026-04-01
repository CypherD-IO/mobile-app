import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TextInput } from 'react-native';
import { useFormik } from 'formik';
import * as yup from 'yup';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import ChooseCountryModal from './ChooseCountryModal';
import AddressSuggestionsDropdown from './AddressSuggestionsDropdown';
import useGoogleAddressAutocomplete, {
  type AutofilledAddress,
  type GoogleAutocompleteSuggestion,
} from '../../hooks/useGoogleAddressAutocomplete';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import { ICountry } from '../../models/cardApplication.model';

const DEFAULT_COUNTRY: ICountry = {
  name: 'United States',
  dialCode: '+1',
  flag: '🇺🇸',
  Iso2: 'US',
  Iso3: 'USA',
  currency: 'USD',
};

type CardAddressFormVariant = 'shipping' | 'delivery';
type PhoneCountrySyncMode = 'always' | 'untilExplicit';
type FormFieldName = keyof CardAddressFormValuesInterface;

interface CardAddressFormValuesInterface {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  taxId: string;
}

export interface CardAddressFormOutputInterface {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  country?: ICountry;
  dialCode?: ICountry;
  taxId?: string;
  isPhoneCountryExplicitlySet: boolean;
}

export interface CardAddressFormRefInterface {
  submitForm: () => void;
  validateForm: () => Promise<boolean>;
}

interface CardAddressFormPropsInterface {
  variant: CardAddressFormVariant;
  layoutVariant?: CardAddressFormVariant;
  initialValues: Partial<CardAddressFormValuesInterface>;
  initialCountry?: ICountry;
  initialDialCode?: ICountry;
  includeTaxId?: boolean;
  countryListFetchUrl?: string;
  initialPhoneCountryExplicitlySet?: boolean;
  phoneCountrySyncMode?: PhoneCountrySyncMode;
  addressSectionLabel?: string;
  submitButtonTitle?: string;
  submitButtonStyle?: string;
  submitButtonContainerClassName?: string;
  onSubmit?: (values: CardAddressFormOutputInterface) => unknown;
  onValuesChange?: (values: CardAddressFormOutputInterface) => void;
  setDisableNext?: (disable: boolean) => void;
  onValidationStateChange?: (validating: boolean) => void;
}

const buildInitialValues = (
  initialValues: Partial<CardAddressFormValuesInterface>,
): CardAddressFormValuesInterface => ({
  addressLine1: initialValues.addressLine1 ?? '',
  addressLine2: initialValues.addressLine2 ?? '',
  city: initialValues.city ?? '',
  state: initialValues.state ?? '',
  postalCode: initialValues.postalCode ?? '',
  phoneNumber: initialValues.phoneNumber ?? '',
  taxId: initialValues.taxId ?? '',
});

const CardAddressForm = forwardRef<
  CardAddressFormRefInterface,
  CardAddressFormPropsInterface
>(
  (
    {
      variant,
      layoutVariant = variant,
      initialValues,
      initialCountry,
      initialDialCode,
      includeTaxId = false,
      countryListFetchUrl,
      initialPhoneCountryExplicitlySet = false,
      phoneCountrySyncMode = 'always',
      addressSectionLabel,
      submitButtonTitle,
      submitButtonStyle = 'h-[60px] w-full py-[10px]',
      submitButtonContainerClassName = 'w-full pt-[16px] pb-[32px] mt-[12px]',
      onSubmit,
      onValuesChange,
      setDisableNext,
      onValidationStateChange,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const [selectCountryModalVisible, setSelectCountryModalVisible] =
      useState(false);
    const [selectPhoneCountryModalVisible, setSelectPhoneCountryModalVisible] =
      useState(false);
    const [selectedCountry, setSelectedCountry] = useState<
      ICountry | undefined
    >(initialCountry);
    const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<
      ICountry | undefined
    >(initialDialCode ?? initialCountry ?? DEFAULT_COUNTRY);
    const [isPhoneCountryExplicitlySet, setIsPhoneCountryExplicitlySet] =
      useState(initialPhoneCountryExplicitlySet);
    const [validatingState, setValidatingState] = useState(false);
    const [hasSubmitAttempt, setHasSubmitAttempt] = useState(false);
    const previousValuesRef = useRef<string | null>(null);
    const isInitialMount = useRef(true);

    const addressLine1Ref = useRef<TextInput>(null);
    const addressLine2Ref = useRef<TextInput>(null);
    const cityRef = useRef<TextInput>(null);
    const stateRef = useRef<TextInput>(null);
    const postalCodeRef = useRef<TextInput>(null);
    const phoneNumberRef = useRef<TextInput>(null);
    const taxIdRef = useRef<TextInput>(null);

    const validationSchema = useMemo(() => {
      const baseAddressLine1 =
        variant === 'shipping'
          ? yup
              .string()
              .required('Street address is required')
              .max(50, 'Address is too long')
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                'Special characters not allowed',
              )
          : yup
              .string()
              .required(t('ADDRESS_LINE_1_REQUIRED'))
              .max(50, t('ADDRESS_LINE_1_TOO_LONG'))
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                t('SPECIAL_CHARACTERS_NOT_ALLOWED'),
              );

      const baseAddressLine2 =
        variant === 'shipping'
          ? yup
              .string()
              .nullable()
              .max(50, 'Address line 2 is too long')
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                'Special characters not allowed',
              )
          : yup
              .string()
              .nullable()
              .max(50, t('ADDRESS_LINE_2_TOO_LONG'))
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                t('SPECIAL_CHARACTERS_NOT_ALLOWED'),
              );

      const baseCity =
        variant === 'shipping'
          ? yup
              .string()
              .required('City is required')
              .max(20, 'City name is too long')
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                'Special characters not allowed',
              )
          : yup
              .string()
              .required(t('CITY_REQUIRED'))
              .max(20, t('CITY_TOO_LONG'))
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                t('SPECIAL_CHARACTERS_NOT_ALLOWED'),
              );

      const baseState =
        variant === 'shipping'
          ? yup
              .string()
              .required('State is required')
              .max(20, 'State name is too long')
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                'Special characters not allowed',
              )
          : yup
              .string()
              .required(t('STATE_REQUIRED'))
              .max(20, t('STATE_TOO_LONG'))
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                t('SPECIAL_CHARACTERS_NOT_ALLOWED'),
              );

      const basePostalCode =
        variant === 'shipping'
          ? yup
              .string()
              .required('ZIP/PIN Code is required')
              .max(10, 'ZIP/PIN Code is too long')
              .matches(
                /^[^;:!?<>~'%^@{}[\]]*$/,
                'Special characters not allowed',
              )
          : yup
              .string()
              .required(t('POSTAL_CODE_REQUIRED'))
              .max(10, t('POSTAL_CODE_TOO_LONG'))
              .matches(
                /^[0-9A-Za-z\s-]*$/,
                t('POSTAL_CODE_INVALID_CHARACTERS'),
              );

      const basePhoneNumber =
        variant === 'shipping'
          ? yup
              .string()
              .required('Phone number is required')
              .matches(/^[0-9]*$/, 'Only numbers are allowed')
          : yup
              .string()
              .required(t('PHONE_NUMBER_REQUIRED'))
              .matches(/^[0-9]*$/, t('PHONE_NUMBER_INVALID_CHARACTERS'));

      return yup.object({
        addressLine1: baseAddressLine1,
        addressLine2: baseAddressLine2,
        city: baseCity,
        state: baseState,
        postalCode: basePostalCode,
        phoneNumber: basePhoneNumber,
        taxId: yup.string().when([], {
          is: () => includeTaxId && selectedCountry?.Iso2 === 'MX',
          then: schema => schema.required(t('TAX_ID_REQUIRED')),
          otherwise: schema => schema.optional().nullable(),
        }),
      });
    }, [includeTaxId, selectedCountry?.Iso2, t, variant]);

    const buildAddressInput = useCallback(
      (values: CardAddressFormValuesInterface): AutofilledAddress => ({
        line1: values.addressLine1.trim(),
        line2: values.addressLine2.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        postalCode: values.postalCode.trim(),
      }),
      [],
    );

    const buildOutputValues = useCallback(
      (
        values: CardAddressFormValuesInterface,
      ): CardAddressFormOutputInterface => ({
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
        phoneNumber: values.phoneNumber,
        country: selectedCountry,
        dialCode: selectedPhoneCountry,
        ...(includeTaxId && selectedCountry?.Iso2 === 'MX' && values.taxId
          ? {
              taxId: values.taxId,
            }
          : {}),
        isPhoneCountryExplicitlySet,
      }),
      [
        includeTaxId,
        isPhoneCountryExplicitlySet,
        selectedCountry,
        selectedPhoneCountry,
      ],
    );

    const formik = useFormik<CardAddressFormValuesInterface>({
      initialValues: buildInitialValues(initialValues),
      validationSchema,
      validateOnMount: true,
      onSubmit: async (
        values,
        { setFieldError, setFieldTouched: setTouched },
      ) => {
        setValidatingState(true);
        const isStateValid = await validateStateWithGoogle(
          buildAddressInput(values),
        );
        setValidatingState(false);

        if (!isStateValid) {
          void setTouched('state', true, false);
          setFieldError('state', t('VALID_STATE_REQUIRED'));
          stateRef.current?.focus();
          return;
        }

        if (onSubmit) {
          await onSubmit(buildOutputValues(values));
        }
      },
    });

    const {
      suggestions,
      showSuggestions,
      loading: autocompleteLoading,
      loadFailed,
      isAvailable: autocompleteAvailable,
      selectSuggestion,
      validateStateWithGoogle,
      openSuggestions,
      closeSuggestions,
      setShowSuggestions,
    } = useGoogleAddressAutocomplete({
      countryIso2: selectedCountry?.Iso2 ?? '',
      addressLine1: formik.values.addressLine1,
    });

    const currentOutputValues = useMemo(
      () => buildOutputValues(formik.values),
      [buildOutputValues, formik.values],
    );

    const shouldShowFieldError = useCallback(
      (fieldName: FormFieldName) =>
        Boolean(
          (hasSubmitAttempt ||
            formik.submitCount > 0 ||
            formik.touched[fieldName]) &&
            formik.errors[fieldName],
        ),
      [formik.errors, formik.submitCount, formik.touched, hasSubmitAttempt],
    );

    const getFieldError = useCallback(
      (fieldName: FormFieldName) => {
        if (!shouldShowFieldError(fieldName)) {
          return '';
        }

        return String(formik.errors[fieldName] ?? '');
      },
      [formik.errors, shouldShowFieldError],
    );

    const handleSelectSuggestion = useCallback(
      async (suggestion: GoogleAutocompleteSuggestion) => {
        const address = await selectSuggestion(
          suggestion,
          buildAddressInput(formik.values),
        );
        if (!address) {
          return;
        }

        void formik.setValues(
          {
            ...formik.values,
            addressLine1: address.line1,
            addressLine2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          },
          true,
        );

        addressLine2Ref.current?.focus();
      },
      [buildAddressInput, formik, selectSuggestion],
    );

    const submitForm = useCallback(() => {
      setHasSubmitAttempt(true);
      void formik.submitForm();
    }, [formik]);

    const validateForm = useCallback(async () => {
      setHasSubmitAttempt(true);
      const errors = await formik.validateForm();

      if (Object.keys(errors).length > 0) {
        return false;
      }

      setValidatingState(true);
      const isStateValid = await validateStateWithGoogle(
        buildAddressInput(formik.values),
      );
      setValidatingState(false);

      if (!isStateValid) {
        void formik.setFieldTouched('state', true, false);
        formik.setFieldError('state', t('VALID_STATE_REQUIRED'));
        stateRef.current?.focus();
      }

      return isStateValid;
    }, [buildAddressInput, formik, t, validateStateWithGoogle]);

    useImperativeHandle(
      ref,
      () => ({
        submitForm,
        validateForm,
      }),
      [submitForm, validateForm],
    );

    useEffect(() => {
      if (!setDisableNext) {
        return;
      }

      setDisableNext(!formik.isValid);
    }, [formik.isValid, setDisableNext]);

    useEffect(() => {
      onValidationStateChange?.(validatingState);
    }, [onValidationStateChange, validatingState]);

    useEffect(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        previousValuesRef.current = JSON.stringify(currentOutputValues);
        return;
      }

      const nextSerializedValues = JSON.stringify(currentOutputValues);
      if (
        onValuesChange &&
        previousValuesRef.current !== nextSerializedValues
      ) {
        previousValuesRef.current = nextSerializedValues;
        onValuesChange(currentOutputValues);
      }
    }, [currentOutputValues, onValuesChange]);

    useEffect(() => {
      if (!includeTaxId) {
        return;
      }

      void formik.validateForm();
    }, [includeTaxId, selectedCountry?.Iso2]);

    const updateSelectedCountry = useCallback(
      (value: React.SetStateAction<ICountry | undefined>) => {
        setSelectedCountry(previousCountry => {
          const nextCountry =
            typeof value === 'function' ? value(previousCountry) : value;

          if (
            phoneCountrySyncMode === 'always' ||
            !isPhoneCountryExplicitlySet
          ) {
            setSelectedPhoneCountry(nextCountry);
          }

          return nextCountry;
        });
      },
      [isPhoneCountryExplicitlySet, phoneCountrySyncMode],
    );

    const updateSelectedPhoneCountry = useCallback(
      (value: React.SetStateAction<ICountry | undefined>) => {
        setSelectedPhoneCountry(previousCountry =>
          typeof value === 'function' ? value(previousCountry) : value,
        );
        setIsPhoneCountryExplicitlySet(true);
      },
      [],
    );

    const renderShippingErrorMessage = (errorMsg: string) => (
      <CyDView className='flex-row items-center mb-1'>
        <CyDMaterialDesignIcons
          name='information-outline'
          size={14}
          className='text-red200 mr-1'
        />
        <CyDText className='text-red200 text-[13px]'>{errorMsg}</CyDText>
      </CyDView>
    );

    const renderDeliveryLabel = (
      label: string,
      fieldName: FormFieldName,
    ) => (
      <CyDView className='mt-[20px] flex flex-row items-center'>
        <CyDText className='text-[12px] font-bold'>{label}</CyDText>
        {getFieldError(fieldName) ? (
          <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
            {getFieldError(fieldName)}
          </CyDText>
        ) : null}
      </CyDView>
    );

    const renderAddressSuggestions = () => {
      if (
        !showSuggestions ||
        formik.values.addressLine1.trim().length < 3 ||
        getFieldError('addressLine1')
      ) {
        return null;
      }

      return (
        <AddressSuggestionsDropdown
          suggestions={suggestions}
          loading={autocompleteLoading}
          loadFailed={loadFailed}
          onSelect={suggestion => {
            void handleSelectSuggestion(suggestion);
          }}
        />
      );
    };

    const renderAutocompleteHint = (
      className = 'text-[11px] text-n200 mt-[4px] ml-[2px]',
    ) => {
      if (
        !autocompleteAvailable ||
        showSuggestions ||
        getFieldError('addressLine1')
      ) {
        return null;
      }

      return (
        <CyDText className={className}>
          Start typing for address suggestions
        </CyDText>
      );
    };

    const resolvedAddressSectionLabel =
      addressSectionLabel ??
      (variant === 'delivery'
        ? t('DELIVERY_ADDRESS')
        : t('BILLING_ADDRESS_TITLE'));

    const renderShippingVariant = () => (
      <>
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
              {selectedCountry?.name ?? t('SELECT_COUNTRY')}
            </CyDText>
            <CyDIcons
              name='chevron-down'
              size={20}
              className='text-n400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDView className='mb-6'>
          <CyDText className='text-[14px] text-n200 mb-1'>
            {resolvedAddressSectionLabel}
          </CyDText>
          {renderAutocompleteHint('text-[11px] text-n200 mb-[6px] ml-[2px]')}
          <CyDView>
            <CyDView className='z-10'>
              <CyDTextInput
                ref={addressLine1Ref}
                value={formik.values.addressLine1}
                onChangeText={(text: string) => {
                  formik.handleChange('addressLine1')(text);
                  setShowSuggestions(true);
                }}
                onBlur={() => {
                  void formik.setFieldTouched('addressLine1', true);
                  setTimeout(() => closeSuggestions(), 200);
                }}
                onFocus={openSuggestions}
                placeholder={t('Street Address')}
                className='py-[16px] px-[12px] rounded-t-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
                returnKeyType='next'
                placeholderTextColor={'#A6AEBB'}
                onSubmitEditing={() => addressLine2Ref.current?.focus()}
              />
              {renderAddressSuggestions()}
            </CyDView>

            <CyDTextInput
              ref={addressLine2Ref}
              value={formik.values.addressLine2}
              onChangeText={formik.handleChange('addressLine2')}
              onBlur={() => {
                void formik.setFieldTouched('addressLine2', true);
              }}
              placeholder={t('Apartment, Suite, etc (if applicable)')}
              className='py-[16px] px-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
              returnKeyType='next'
              placeholderTextColor={'#A6AEBB'}
              onSubmitEditing={() => cityRef.current?.focus()}
            />

            <CyDTextInput
              ref={cityRef}
              value={formik.values.city}
              onChangeText={formik.handleChange('city')}
              onBlur={() => {
                void formik.setFieldTouched('city', true);
              }}
              placeholder={t('City')}
              className='py-[16px] px-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
              returnKeyType='next'
              placeholderTextColor={'#A6AEBB'}
              onSubmitEditing={() => stateRef.current?.focus()}
            />

            <CyDTextInput
              ref={stateRef}
              value={formik.values.state}
              onChangeText={formik.handleChange('state')}
              onBlur={() => {
                void formik.setFieldTouched('state', true);
              }}
              placeholder={t('State or province')}
              className='py-[16px] px-[12px] bg-n20 font-semibold border-n40 border-b-[1px]'
              returnKeyType='next'
              placeholderTextColor={'#A6AEBB'}
              onSubmitEditing={() => postalCodeRef.current?.focus()}
            />

            <CyDTextInput
              ref={postalCodeRef}
              value={formik.values.postalCode}
              onChangeText={formik.handleChange('postalCode')}
              onBlur={() => {
                void formik.setFieldTouched('postalCode', true);
              }}
              placeholder={t('ZIP / PIN Code')}
              className='py-[16px] px-[12px] rounded-b-[12px] bg-n20 font-semibold'
              placeholderTextColor={'#A6AEBB'}
              returnKeyType='next'
              onSubmitEditing={() => phoneNumberRef.current?.focus()}
            />
          </CyDView>
        </CyDView>

        <CyDView className='mb-2'>
          {getFieldError('addressLine1')
            ? renderShippingErrorMessage(getFieldError('addressLine1'))
            : null}
          {getFieldError('addressLine2')
            ? renderShippingErrorMessage(getFieldError('addressLine2'))
            : null}
          {getFieldError('city')
            ? renderShippingErrorMessage(getFieldError('city'))
            : null}
          {getFieldError('state')
            ? renderShippingErrorMessage(getFieldError('state'))
            : null}
          {getFieldError('postalCode')
            ? renderShippingErrorMessage(getFieldError('postalCode'))
            : null}
        </CyDView>

        <CyDView className='mb-4'>
          <CyDText className='text-[14px] text-n200 mb-1'>
            {t('Phone Number')}
          </CyDText>
          <CyDView className='flex-row'>
            <CyDTouchView
              className='h-[62px] px-4 rounded-lg bg-n20 flex-row items-center justify-center mr-2 w-[90px]'
              onPress={() => setSelectPhoneCountryModalVisible(true)}>
              <CyDText>
                {selectedPhoneCountry?.dialCode ?? DEFAULT_COUNTRY.dialCode}
              </CyDText>
              <CyDIcons
                name='chevron-down'
                size={16}
                className='text-n400 ml-1'
              />
            </CyDTouchView>

            <CyDTextInput
              value={formik.values.phoneNumber}
              onChangeText={formik.handleChange('phoneNumber')}
              onBlur={() => {
                void formik.setFieldTouched('phoneNumber', true);
              }}
              placeholder={t('Your Phone number')}
              className='flex-1 py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold'
              keyboardType='phone-pad'
              ref={phoneNumberRef}
              placeholderTextColor={'#A6AEBB'}
              returnKeyType={
                includeTaxId && selectedCountry?.Iso2 === 'MX'
                  ? 'next'
                  : 'done'
              }
              onSubmitEditing={() =>
                includeTaxId && selectedCountry?.Iso2 === 'MX'
                  ? taxIdRef.current?.focus()
                  : phoneNumberRef.current?.blur()
              }
            />
          </CyDView>
        </CyDView>

        <CyDView className='mb-2'>
          {getFieldError('phoneNumber')
            ? renderShippingErrorMessage(getFieldError('phoneNumber'))
            : null}
        </CyDView>

        {includeTaxId && selectedCountry?.Iso2 === 'MX' ? (
          <>
            <CyDView className='mb-4'>
              <CyDText className='text-[14px] text-n200 mb-1'>
                {t('TAX_RFC')}
              </CyDText>
              <CyDTextInput
                ref={taxIdRef}
                value={formik.values.taxId}
                onChangeText={formik.handleChange('taxId')}
                onBlur={() => {
                  void formik.setFieldTouched('taxId', true);
                }}
                placeholder='RFC #'
                className='py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold'
                placeholderTextColor={'#A6AEBB'}
                returnKeyType='done'
                onSubmitEditing={() => taxIdRef.current?.blur()}
              />
            </CyDView>

            <CyDView className='mb-2'>
              {getFieldError('taxId')
                ? renderShippingErrorMessage(getFieldError('taxId'))
                : null}
            </CyDView>
          </>
        ) : null}

        {submitButtonTitle ? (
          <CyDView className={submitButtonContainerClassName}>
            <Button
              onPress={submitForm}
              type={ButtonType.PRIMARY}
              title={submitButtonTitle}
              loading={validatingState}
              style={submitButtonStyle}
            />
          </CyDView>
        ) : null}
      </>
    );

    const renderDeliveryVariant = () => (
      <>
        <CyDText className='text-[12px] font-bold'>
          {t('COUNTRY_INIT_CAPS')}
        </CyDText>
        <CyDTouchView
          className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
          onPress={() => setSelectCountryModalVisible(true)}>
          <CyDView
            className={clsx('flex flex-row justify-between items-center', {
              'border-redOffColor': !selectedCountry,
            })}>
            {selectedCountry ? (
              <CyDView className='flex flex-row items-center'>
                <CyDText className='text-center text-[18px] ml-[8px]'>
                  {selectedCountry.flag}
                </CyDText>
                <CyDText className='text-center text-[18px] ml-[8px]'>
                  {selectedCountry.name}
                </CyDText>
              </CyDView>
            ) : (
              <CyDText className='text-n70 text-[16px] ml-[8px]'>
                {t('SELECT_COUNTRY')}
              </CyDText>
            )}
          </CyDView>
          <CyDMaterialDesignIcons
            name='chevron-down'
            size={16}
            className='text-base400'
          />
        </CyDTouchView>

        {renderDeliveryLabel(t('ADDRESS_LINE_1_INIT_CAPS'), 'addressLine1')}
        <CyDView className='z-10'>
          <CyDView className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'>
            <CyDView className='flex flex-row justify-between items-center'>
              <CyDTextInput
                ref={addressLine1Ref}
                className='h-full w-[100%] text-[16px]'
                inputMode='text'
                placeholder='Line #1'
                placeholderTextColor={'#ccc'}
                onChangeText={(text: string) => {
                  formik.handleChange('addressLine1')(text);
                  setShowSuggestions(true);
                }}
                onBlur={() => {
                  void formik.setFieldTouched('addressLine1', true);
                  setTimeout(() => closeSuggestions(), 200);
                }}
                onFocus={openSuggestions}
                onSubmitEditing={() => addressLine2Ref.current?.focus()}
                value={formik.values.addressLine1}
              />
            </CyDView>
          </CyDView>
          {renderAddressSuggestions()}
          {renderAutocompleteHint()}
        </CyDView>

        {renderDeliveryLabel(t('ADDRESS_LINE_2_INIT_CAPS'), 'addressLine2')}
        <CyDView className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDTextInput
              ref={addressLine2Ref}
              className='h-full w-[100%] text-[16px]'
              inputMode='text'
              placeholder='Line #2'
              placeholderTextColor={'#ccc'}
              onChangeText={formik.handleChange('addressLine2')}
              onBlur={() => {
                void formik.setFieldTouched('addressLine2', true);
              }}
              onSubmitEditing={() => cityRef.current?.focus()}
              value={formik.values.addressLine2}
            />
          </CyDView>
        </CyDView>

        {renderDeliveryLabel(t('CITY_INIT_CAPS'), 'city')}
        <CyDView className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDTextInput
              ref={cityRef}
              className='h-full w-[100%] text-[16px]'
              inputMode='text'
              placeholder='City'
              placeholderTextColor={'#ccc'}
              onChangeText={formik.handleChange('city')}
              onBlur={() => {
                void formik.setFieldTouched('city', true);
              }}
              onSubmitEditing={() => stateRef.current?.focus()}
              value={formik.values.city}
            />
          </CyDView>
        </CyDView>

        {renderDeliveryLabel(t('STATE_INIT_CAPS'), 'state')}
        <CyDView className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDTextInput
              ref={stateRef}
              className='h-full w-[100%] text-[16px]'
              inputMode='text'
              placeholder='state'
              placeholderTextColor={'#ccc'}
              onChangeText={formik.handleChange('state')}
              onBlur={() => {
                void formik.setFieldTouched('state', true);
              }}
              onSubmitEditing={() => postalCodeRef.current?.focus()}
              value={formik.values.state}
            />
          </CyDView>
        </CyDView>

        {renderDeliveryLabel(t('ZIPCODE_INIT_CAPS'), 'postalCode')}
        <CyDView className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDTextInput
              ref={postalCodeRef}
              className='h-full w-[100%] text-[16px]'
              inputMode='text'
              placeholder='000000'
              placeholderTextColor={'#ccc'}
              onChangeText={formik.handleChange('postalCode')}
              onBlur={() => {
                void formik.setFieldTouched('postalCode', true);
              }}
              onSubmitEditing={() => phoneNumberRef.current?.focus()}
              value={formik.values.postalCode}
            />
          </CyDView>
        </CyDView>

        {renderDeliveryLabel(t('PHONE_NUMBER_INIT_CAPS'), 'phoneNumber')}
        <CyDView className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'>
          <CyDView
            className={clsx('flex flex-row justify-between items-center', {
              'border-redOffColor': !selectedPhoneCountry,
            })}>
            <CyDTouchView
              onPress={() => setSelectPhoneCountryModalVisible(true)}
              className='flex w-[20%] flex-row items-center'>
              <CyDText className='text-center text-[16px] mx-[4px]'>
                {selectedPhoneCountry?.dialCode ?? DEFAULT_COUNTRY.dialCode}
              </CyDText>
              <CyDMaterialDesignIcons
                name='chevron-down'
                size={16}
                className='text-base400'
              />
            </CyDTouchView>

            <CyDTextInput
              ref={phoneNumberRef}
              className='h-full w-[80%] text-[16px] border-l px-[20px] border-base80'
              inputMode='tel'
              keyboardType='phone-pad'
              placeholderTextColor={'#ccc'}
              onChangeText={formik.handleChange('phoneNumber')}
              onBlur={() => {
                void formik.setFieldTouched('phoneNumber', true);
              }}
              returnKeyType={
                includeTaxId && selectedCountry?.Iso2 === 'MX'
                  ? 'next'
                  : 'done'
              }
              onSubmitEditing={() =>
                includeTaxId && selectedCountry?.Iso2 === 'MX'
                  ? taxIdRef.current?.focus()
                  : phoneNumberRef.current?.blur()
              }
              value={formik.values.phoneNumber}
            />
          </CyDView>
        </CyDView>

        {includeTaxId && selectedCountry?.Iso2 === 'MX' ? (
          <>
            {renderDeliveryLabel(t('TAX_RFC'), 'taxId')}
            <CyDView className='bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDTextInput
                  ref={taxIdRef}
                  className='h-full w-[100%] text-[16px]'
                  inputMode='text'
                  placeholder='RFC #'
                  placeholderTextColor={'#ccc'}
                  onChangeText={formik.handleChange('taxId')}
                  onBlur={() => {
                    void formik.setFieldTouched('taxId', true);
                  }}
                  returnKeyType='done'
                  onSubmitEditing={() => taxIdRef.current?.blur()}
                  value={formik.values.taxId}
                />
              </CyDView>
            </CyDView>
          </>
        ) : null}

        {submitButtonTitle ? (
          <CyDView className={submitButtonContainerClassName}>
            <Button
              onPress={submitForm}
              type={ButtonType.PRIMARY}
              title={submitButtonTitle}
              loading={validatingState}
              style={submitButtonStyle}
            />
          </CyDView>
        ) : null}
      </>
    );

    return (
      <>
        <ChooseCountryModal
          isModalVisible={selectCountryModalVisible}
          setModalVisible={setSelectCountryModalVisible}
          selectedCountryState={[selectedCountry, updateSelectedCountry]}
          countryListFetchUrl={countryListFetchUrl}
        />
        <ChooseCountryModal
          isModalVisible={selectPhoneCountryModalVisible}
          setModalVisible={setSelectPhoneCountryModalVisible}
          selectedCountryState={[
            selectedPhoneCountry,
            updateSelectedPhoneCountry,
          ]}
          countryListFetchUrl={countryListFetchUrl}
        />
        {layoutVariant === 'shipping'
          ? renderShippingVariant()
          : renderDeliveryVariant()}
      </>
    );
  },
);

CardAddressForm.displayName = 'CardAddressForm';

export default CardAddressForm;
