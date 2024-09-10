import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CyDView } from '../../../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import BasicDetails from './basicDetails';
import * as Yup from 'yup';
import { Formik } from 'formik';
import BillingAddress from './billingDetails';
import Button from '../../../../../components/v2/button';
import useAxios from '../../../../../core/HttpRequest';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { rcSupportedCountries } from '../../../../../../assets/datasets/rcSupportedCountries';
import Loading from '../../../../../components/v2/loading';
import { CardProviders } from '../../../../../constants/enum';

export interface FormInitalValues {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  line1: string;
  line2: string;
  postalCode: string;
  country: string;
  city: string;
  state: string;
  phone: string;
  dialCode: string;
}

const validationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  dateOfBirth: Yup.string().required('Date of birth is required'),
  line1: Yup.string().required('Address line 1 is required'),
  line2: Yup.string().required('Address line 1is required'),
  postalCode: Yup.string().required('postal code is required'),
  country: Yup.string().required('Country is required'),
  city: Yup.string().required('City is required'),
  state: Yup.string().required('State is required'),
  phone: Yup.string().required('Phone number required'),
  dialCode: Yup.string().required(''),
});

export default function CardApplicationV2() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { postWithAuth } = useAxios();

  const [index, setIndex] = useState<number>(1);
  const [supportedCountries, setSupportedCountries] = useState<
    Array<{
      name: string;
      Iso2: string;
      Iso3: string;
      currency: string;
      unicode_flag: string;
      flag: string;
      dial_code: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const getCountriesData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://public.cypherd.io/js/rcSupportedCountries.js?${String(new Date())}`,
      );
      if (response?.data) {
        // remove later
        setSupportedCountries(rcSupportedCountries as any);

        // setSupportedCountries(response.data);
      } else {
        setSupportedCountries(rcSupportedCountries as any);
      }
    } catch (err) {
      Sentry.captureException(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    void getCountriesData();
  }, []);

  const initialValues = {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    line1: '',
    line2: '',
    postalCode: '',
    country: '',
    city: '',
    state: '',
    phone: '',
    dialCode: '',
  };

  const _handleSubmit = async (values: FormInitalValues) => {
    setLoading(true);
    const payload = {
      dateOfBirth: values.dateOfBirth,
      firstName: values.lastName,
      lastName: values.lastName,
      phone: values.dialCode + values.phone,
      email: values.email,
      line1: values.line1,
      line2: values.line2,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      country: values.country,
      // pep: PEP_OPTIONS[userBasicDetails.pep].value,
      // ...latestBillingAddress,
      // country: userBasicDetails.Iso2,
      // ...(inviteCode ? { inviteCode } : {}),
    };

    const { isError, error, data } = await postWithAuth(
      `/v1/cards/${CardProviders.REAP_CARD}/application`,
      payload,
    );
  };

  if (loading) return <Loading />;

  return (
    <CyDView style={{ paddingTop: insets.top + 50 }}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={_handleSubmit}>
        {({
          handleSubmit,
          validateForm,
          setFieldTouched,
          setFieldValue,
          values,
        }) => (
          <CyDView className='bg-[#F1F0F5] flex flex-col justify-between h-[100%]'>
            {index === 0 && <BasicDetails setIndex={setIndex} />}
            {index === 1 && (
              <BillingAddress
                setIndex={setIndex}
                supportedCountries={supportedCountries}
                setFieldValue={setFieldValue}
                values={values}
              />
            )}
            {index === 0 && (
              <CyDView className='bg-white px-[16px] w-full pt-[16px] pb-[60px] '>
                <Button
                  title={t('NEXT')}
                  onPress={() => {
                    void setFieldTouched('lastName', true);
                    void setFieldTouched('fristName', true);
                    void setFieldTouched('email', true);
                    void setFieldTouched('dateOfBirth', true);
                    void validateForm().then(errors => {
                      if (
                        Object.keys(errors).length === 0 ||
                        (!errors.lastName && !errors.firstName && !errors.email)
                      ) {
                        setIndex(1);
                      }
                    });
                  }}
                />
              </CyDView>
            )}
            {index === 1 && (
              <CyDView className='bg-white px-[16px] w-full pt-[16px] pb-[60px]'>
                <Button title={t('CONTINUE')} onPress={handleSubmit} />
              </CyDView>
            )}
          </CyDView>
        )}
      </Formik>
    </CyDView>
  );
}
