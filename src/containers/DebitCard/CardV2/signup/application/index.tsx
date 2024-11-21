import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  CyDFastImage,
  CyDSafeAreaView,
  CyDTouchView,
  CyDView,
} from '../../../../../styles/tailwindStyles';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import BasicDetails from './basicDetails';
import * as Yup from 'yup';
import { Formik, FormikHelpers } from 'formik';
import BillingAddress from './billingAddress';
import Button from '../../../../../components/v2/button';
import useAxios from '../../../../../core/HttpRequest';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { rcSupportedCountries } from '../../../../../../assets/datasets/rcSupportedCountries';
import Loading from '../../../../../components/v2/loading';
import {
  CardProviders,
  GlobalContextType,
} from '../../../../../constants/enum';
import { t } from 'i18next';
import AppImages from '../../../../../../assets/images/appImages';
import useCardUtilities from '../../../../../hooks/useCardUtilities';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../core/globalContext';
import { screenTitle } from '../../../../../constants';
import { useGlobalModalContext } from '../../../../../components/v2/GlobalModal';
import { CardProfile } from '../../../../../models/cardProfile.model';
import { StyleSheet } from 'react-native';
import { isEqual, isUndefined, omitBy, set } from 'lodash';
import CardProviderSwitch from '../../../../../components/cardProviderSwitch';

// Add this type definition
interface SupportedCountry {
  name: string;
  Iso2: string;
  Iso3: string;
  currency: string;
  unicode_flag: string;
  flag: string;
  dial_code: string;
}

export interface FormInitalValues {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
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
  firstName: Yup.string()
    .required('First name is required')
    .matches(/^\S*$/, 'No space allowed'),
  lastName: Yup.string()
    .required('Last name is required')
    .matches(/^\S*$/, 'No space allowed'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  dateOfBirth: Yup.string()
    .required(t('DOB_REQUIRED'))
    .test('isValidAge', t('AGE_SHOULD_GT_18'), dateOfBirth => {
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
  line1: Yup.string().required(t('LINE1_REQUIRED')),
  // line2: Yup.string().required('Address line 2 is required'),
  postalCode: Yup.string().required(t('POSTAL_CODE_REQUIRED')),
  country: Yup.string().required('Country is required'),
  city: Yup.string().required(t('CITY_REQUIRED')),
  state: Yup.string().required('State is required'),
  phone: Yup.string()
    .required(t('PHONE_NUMBER_REQUIRED'))
    .test('isValidPhoneNumber', t('INVALID_PHONE_NUMBER'), phoneNumber => {
      return phoneNumber !== undefined ? /^\d+$/.test(phoneNumber) : false;
    }),
  dialCode: Yup.string().required(''),
});

export default function CardApplicationV2() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { globalDispatch, globalState } = useContext(
    GlobalContext,
  ) as GlobalContextDef;
  const { postWithAuth, patchWithAuth, getWithAuth } = useAxios();
  const { getWalletProfile } = useCardUtilities();
  const { showModal, hideModal } = useGlobalModalContext();

  const [index, setIndex] = useState<number>(0);
  const [supportedCountries, setSupportedCountries] = useState<
    SupportedCountry[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [applicationData, setApplicationData] =
    useState<FormInitalValues | null>(null);

  const cardProfile = globalState.cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void getCountriesData();
      setLoading(false);
    }, []),
  );

  useEffect(() => {
    setLoading(true);
    void fetchApplicationData();
    setLoading(false);
  }, [supportedCountries]);

  const getCountriesData = async () => {
    try {
      const response = await axios.get(
        `https://public.cypherd.io/js/rcSupportedCountries.js?${String(new Date())}`,
      );
      if (response?.data) {
        const sortedCountries = [...response.data].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setSupportedCountries(sortedCountries as SupportedCountry[]);
      } else {
        const sortedCountries = [...rcSupportedCountries].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setSupportedCountries(sortedCountries as SupportedCountry[]);
      }
    } catch (err) {
      Sentry.captureException(err);
    }
  };

  const fetchApplicationData = async () => {
    if (provider) {
      const { isError, data } = await getWithAuth(
        `/v1/cards/${provider}/application`,
      );

      if (!isError && data) {
        const phoneCountry = supportedCountries
          .filter(country => data.phone?.startsWith(country.dial_code))
          .sort((a, b) => b.dial_code.length - a.dial_code.length)[0];

        const dialCode = phoneCountry?.dial_code ?? '';
        setApplicationData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth)
            : new Date(),
          line1: data.line1 || '',
          line2: data.line2 || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          city: data.city || '',
          state: data.state || '',
          phone: data.phone ? data.phone.replace(dialCode, '') : '',
          dialCode,
        });
      }
    }
  };

  const _handleSubmit = async (
    values: FormInitalValues,
    { setSubmitting, setFieldError }: FormikHelpers<FormInitalValues>,
  ) => {
    if (provider) {
      setSubmitting(true);

      // Use Lodash to compare values and return only changed fields
      const changedFields = applicationData
        ? omitBy(values, (value, key) =>
            isEqual(value, applicationData[key as keyof FormInitalValues]),
          )
        : values;

      const payload = {
        ...changedFields,
        phone:
          changedFields.phone?.trim() && changedFields.dialCode
            ? changedFields.dialCode + changedFields.phone
            : undefined,
        dateOfBirth: changedFields.dateOfBirth ?? undefined,
      };
      // Remove undefined fields and dialCode
      const cleanPayload = omitBy(
        payload,
        (value, key) => isUndefined(value) || key === 'dialCode',
      );

      const { isError, error } = applicationData
        ? await patchWithAuth(
            `/v1/cards/${CardProviders.REAP_CARD}/application`,
            cleanPayload,
          )
        : await postWithAuth(
            `/v1/cards/${CardProviders.REAP_CARD}/application`,
            cleanPayload,
          );

      if (isError) {
        if (error.field) {
          setFieldError(error.field, error.message);

          // Check which page contains the error and update index if necessary
          const firstPageFields = [
            'firstName',
            'lastName',
            'email',
            'dateOfBirth',
          ];
          if (firstPageFields.includes(error.field) && index === 1) {
            setIndex(0);
          }
        } else {
          showModal('state', {
            type: 'error',
            title: t('INVALID_USER_DETAILS'),
            description: error ?? 'Error in submitting your application',
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        const data = await getWalletProfile(globalState.token);
        set(data as CardProfile, 'provider', CardProviders.REAP_CARD);
        globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: data,
        });
        applicationData
          ? navigation.goBack()
          : navigation.navigate(screenTitle.CARD_SIGNUP_OTP_VERIFICATION);
      }

      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <CyDSafeAreaView className='my-[40px] '>
      {/* remove the CardProviderSwitch after sunsetting PC */}
      <CyDTouchView
        className='w-[60px] ml-[16px] mb-[10px]'
        onPress={() => {
          if (index === 0) {
            // navigation.reset({
            //   index: 0,
            //   routes: [{ name: screenTitle.PORTFOLIO }],
            // });
            navigation.goBack();
          } else setIndex(0);
        }}>
        <CyDFastImage
          className={'w-[32px] h-[32px]'}
          resizeMode='cover'
          source={AppImages.BACK_ARROW_GRAY}
        />
      </CyDTouchView>

      <Formik
        initialValues={
          applicationData ?? {
            firstName: '',
            lastName: '',
            email: '',
            dateOfBirth: new Date(),
            line1: '',
            line2: '',
            postalCode: '',
            country: '',
            city: '',
            state: '',
            phone: '',
            dialCode: '',
          }
        }
        validationSchema={validationSchema}
        enableReinitialize={!!applicationData}
        onSubmit={_handleSubmit}>
        {({
          handleSubmit,
          validateForm,
          setFieldTouched,
          setFieldValue,
          values,
          isSubmitting,
        }) => (
          <CyDView className='bg-[#F1F0F5] flex flex-col justify-between h-full'>
            {index === 0 && <BasicDetails setIndex={setIndex} />}
            {index === 1 && (
              <BillingAddress
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
                    void setFieldTouched('firstName', true);
                    void setFieldTouched('email', true);
                    void setFieldTouched('dateOfBirth', true);
                    void validateForm().then(_errors => {
                      if (
                        Object.keys(_errors).length === 0 ||
                        (!_errors.lastName &&
                          !_errors.firstName &&
                          !_errors.email &&
                          !_errors.dateOfBirth)
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
                <Button
                  title={t('CONTINUE')}
                  onPress={handleSubmit}
                  loaderStyle={styles.loading}
                  loading={isSubmitting}
                />
              </CyDView>
            )}
          </CyDView>
        )}
      </Formik>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    height: 22,
    width: 22,
  },
});
