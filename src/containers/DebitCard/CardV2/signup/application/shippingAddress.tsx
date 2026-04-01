import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
} from '../../../../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import { screenTitle } from '../../../../../constants';
import { ICountry } from '../../../../../models/cardApplication.model';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { useFormContext } from './FormContext';
import { ApplicationData } from '../../../../../models/applicationData.interface';
import OfferTagComponent from '../../../../../components/v2/OfferTagComponent';
import { Platform } from 'react-native';
import {
  getCountryObjectByDialCode,
  getCountryObjectById,
} from '../../../../../core/util';
import CardAddressForm, {
  CardAddressFormOutputInterface,
  CardAddressFormRefInterface,
} from '../../../../../components/v2/CardAddressForm';

const ShippingAddress = (): React.JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { formState, setFormState } = useFormContext();
  const [disableNext, setDisableNext] = useState(true);
  const [validatingState, setValidatingState] = useState(false);
  const formRef = useRef<CardAddressFormRefInterface>(null);

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
    return initialCountry;
  }, [formState.dialCode, initialCountry]);

  const currentStep = 1;
  const totalSteps = 3;

  const mapFormValuesToState = useCallback(
    (
      values: CardAddressFormOutputInterface,
    ): Partial<ApplicationData> => ({
      line1: values.addressLine1,
      line2: values.addressLine2,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      phone: values.phoneNumber,
      country: values.country?.Iso2 ?? '',
      dialCode: values.dialCode?.dialCode ?? '',
      isPhoneCountryExplicitlySet: values.isPhoneCountryExplicitlySet,
    }),
    [],
  );

  const handleValuesChange = useCallback(
    (values: CardAddressFormOutputInterface) => {
      setFormState(prev => ({
        ...prev,
        ...mapFormValuesToState(values),
      }));
    },
    [mapFormValuesToState, setFormState],
  );

  const handleSubmit = useCallback(
    async (values: CardAddressFormOutputInterface) => {
      setFormState(prev => ({
        ...prev,
        ...mapFormValuesToState(values),
      }));
      navigation.navigate(screenTitle.ADDITIONAL_DETAILS);
    },
    [mapFormValuesToState, navigation, setFormState],
  );

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <CardApplicationHeader />

      <KeyboardAwareScrollView
        className='flex-1 px-4'
        enableOnAndroid={true}
        keyboardShouldPersistTaps='handled'>
        <CyDText className='text-[32px] my-6'>{t('Billing Address')}</CyDText>

        <CardAddressForm
          ref={formRef}
          variant='shipping'
          initialValues={{
            addressLine1: formState.line1 ?? '',
            addressLine2: formState.line2 ?? '',
            city: formState.city ?? '',
            state: formState.state ?? '',
            postalCode: formState.postalCode ?? '',
            phoneNumber: formState.phone ?? '',
          }}
          initialCountry={initialCountry}
          initialDialCode={initialPhoneCountry}
          initialPhoneCountryExplicitlySet={Boolean(
            formState.isPhoneCountryExplicitlySet,
          )}
          phoneCountrySyncMode='untilExplicit'
          countryListFetchUrl='https://public.cypherd.io/js/rcSupportedCountries.js'
          onValuesChange={handleValuesChange}
          onSubmit={handleSubmit}
          setDisableNext={setDisableNext}
          onValidationStateChange={setValidatingState}
        />
      </KeyboardAwareScrollView>

      <OfferTagComponent
        position={{
          bottom: Platform.OS === 'android' ? 118 : 146,
          left: 16,
          right: 16,
        }}
        collapsed={true}
      />

      <CardApplicationFooter
        currentStep={currentStep}
        totalSteps={totalSteps}
        currentSectionProgress={80}
        buttonConfig={{
          title: t('NEXT'),
          onPress: () => {
            formRef.current?.submitForm();
          },
          disabled: disableNext,
          loading: validatingState,
        }}
      />
    </CyDView>
  );
};

export default ShippingAddress;
