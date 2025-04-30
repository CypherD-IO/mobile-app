import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../../../../styles/tailwindComponents';
import { Formik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { screenTitle } from '../../../../../constants';
import FormikSelect from '../../../../../components/v2/formikSelect';
import FormikInput from '../../../../../components/v2/formikInput';
import { OCCUPATION_LABEL_TO_CODE_MAP } from '../../../../../constants/data';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { ApplicationData } from './basicDetails';
import { useGlobalModalContext } from '../../../../../components/v2/GlobalModal';
import useAxios from '../../../../../core/HttpRequest';
import { getReferralCode } from '../../../../../core/asyncStorage';
import { CardProviders } from '../../../../../constants/enum';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../../core/globalContext';
import clsx from 'clsx';
import { omit } from 'lodash';
import { useFormContext } from './FormContext';

// Validation schema for the additional details form
const AdditionalDetailsSchema = Yup.object().shape({
  occupation: Yup.string().required('Occupation is required'),
  annualIncome: Yup.string().optional(),
  expectedMonthlySpend: Yup.string().optional(),
});

interface FormValues {
  occupation: string;
  annualIncome?: string;
  expectedMonthlySpend?: string;
}

const AnnualIncomeOptions = [
  { label: '$0 - $50,000', value: '$0 - $50,000' },
  { label: '$50,000 - $100,000', value: '$50,000 - $100,000' },
  { label: '$100,000 - $250,000', value: '$100,000 - $250,000' },
  { label: '$250,000 - $500,000', value: '$250,000 - $500,000' },
  { label: '$500,000+', value: '$500,000+' },
];

const MonthlySpendOptions = [
  { label: '$0 - $1,000', value: '$0 - $1,000' },
  { label: '$1,000 - $5,000', value: '$1,000 - $5,000' },
  { label: '$5,000 - $10,000', value: '$5,000 - $10,000' },
  { label: '$10,000 - $25,000', value: '$10,000 - $25,000' },
  { label: '$25,000+', value: '$25,000+' },
];

const AdditionalDetails = (): JSX.Element => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { formState, setFormState } = useFormContext();

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      // Get referral code if exists
      const referralCode = await getReferralCode();

      // Prepare final form state
      const updatedFormState: ApplicationData = {
        ...formState,
        occupation: values.occupation,
        annualSalary: values.annualIncome ?? '',
        expectedMonthlyVolume: values.expectedMonthlySpend ?? '',
      };

      // Update form state
      setFormState(updatedFormState);

      // Only proceed with API submission if all required fields are filled
      if (values.occupation) {
        const payload = {
          ...omit(updatedFormState, 'dialCode'),
          phone: updatedFormState.dialCode + updatedFormState.phone,
          ...(referralCode && { referralCodeV2: referralCode }),
        };

        // Submit application
        const { isError, error } = await postWithAuth(
          `/v1/cards/${CardProviders.REAP_CARD}/application`,
          payload,
        );

        if (isError) {
          showModal('state', {
            type: 'error',
            title: t('Application Failed'),
            description:
              error?.message ?? 'Error in submitting your application',
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        } else {
          // Navigate to OTP verification
          navigation.navigate(screenTitle.EMAIL_VERIFICATION);
        }
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('Application Failed'),
        description: 'An unexpected error occurred',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize form values from form state
  const initialValues: FormValues = {
    occupation: formState.occupation ?? '',
    annualIncome: formState.annualSalary ?? '',
    expectedMonthlySpend: formState.expectedMonthlyVolume ?? '',
  };

  const occupationOptions = Object.entries(OCCUPATION_LABEL_TO_CODE_MAP).map(
    ([label, value]) => ({
      label,
      value,
    }),
  );

  // Initialize form values from applicationFormData
  const formikRef = React.useRef<FormikProps<FormValues>>(null);

  useEffect(() => {
    if (formState && formikRef.current) {
      const updatedValues = {
        occupation: formState.occupation || '',
        annualIncome: formState.annualSalary || '',
        expectedMonthlySpend: formState.expectedMonthlyVolume || '',
      };
      void formikRef.current.setValues(updatedValues);
    }
  }, [formState]);

  return (
    <CyDView
      className='flex-1 bg-n0'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Header */}
      <CardApplicationHeader />

      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        validationSchema={AdditionalDetailsSchema}
        onSubmit={handleSubmit}
        enableReinitialize={true}>
        {({ handleSubmit, isValid, dirty }) => (
          <>
            <KeyboardAwareScrollView
              className='flex-1 px-4'
              enableOnAndroid={true}
              keyboardShouldPersistTaps='handled'>
              {/* Title and Description */}
              <CyDView className='mt-6 mb-8'>
                <CyDText className='text-[32px] mb-[6px]'>
                  {t('Additional Details')}
                </CyDText>
                <CyDText className='text-[14px] font-medium text-n200'>
                  {t(
                    'This input helps us get to know our users better and ensures the cypher stays secure for everyone.',
                  )}
                </CyDText>
              </CyDView>

              {/* Terms and Consent */}
              {/* <CyDView className='mb-4'>
                <CyDView className='flex flex-row items-center mb-2'>
                  <CyDTouchView
                    className='flex flex-row items-center p-[8px] -m-[8px]'
                    onPress={() => setAcceptTerms(!acceptTerms)}>
                    <CyDView
                      className={clsx(
                        'h-[20px] w-[20px] border-[1px] rounded-[4px] border-base100',
                        {
                          'bg-p150 border-p150': acceptTerms,
                        },
                      )}>
                      {acceptTerms && (
                        <CyDMaterialDesignIcons
                          name='check-bold'
                          size={16}
                          className='text-n0'
                        />
                      )}
                    </CyDView>
                  </CyDTouchView>
                  <CyDText className='text-[14px] text-n400 ml-2'>
                    {t('I accept the terms and conditions')}
                  </CyDText>
                </CyDView> */}

              {/* {
                  <CyDView className='flex flex-row items-center'>
                    <CyDTouchView
                      className='flex flex-row items-center p-[8px] -m-[8px]'
                      onPress={() => setAcceptConsent(!acceptConsent)}>
                      <CyDView
                        className={clsx(
                          'h-[20px] w-[20px] border-[1px] rounded-[4px] border-base100',
                          {
                            'bg-p150 border-p150': acceptConsent,
                          },
                        )}>
                        {acceptConsent && (
                          <CyDMaterialDesignIcons
                            name='check-bold'
                            size={16}
                            className='text-n0'
                          />
                        )}
                      </CyDView>
                    </CyDTouchView>
                    <CyDText className='text-[14px] text-n400 ml-2'>
                      {t('I consent to the processing of my personal data')}
                    </CyDText>
                  </CyDView>
                } 
              </CyDView> */}

              {/* Form Fields */}
              <CyDView className='mb-4'>
                <FormikSelect
                  name='occupation'
                  label='Your Occupation'
                  options={occupationOptions}
                  containerClassName='mb-[4px]'
                  labelClassName='text-[14px] text-n200'
                  selectClassName='py-[16px] px-[12px] rounded-[8px] bg-n20 font-semibold border-[1px] border-transparent mt-[2px] focus:border-base400'
                  placeholder='Select your occupation'
                />
              </CyDView>

              <CyDView className='mb-4'>
                <CyDText className='text-[14px] text-n200 mb-[4px]'>
                  Annual Income
                </CyDText>
                <CyDView className='relative'>
                  <CyDView className='absolute left-3 top-0 bottom-0 justify-center z-10'>
                    <CyDMaterialDesignIcons
                      name='currency-usd'
                      size={20}
                      className='text-n400 mt-[-6px]'
                    />
                  </CyDView>
                  <FormikInput
                    name='annualIncome'
                    label=''
                    containerClassName='w-full'
                    inputClassName='py-[16px] pl-[32px] pr-[12px] rounded-[8px] bg-n20 font-semibold border-[1px] border-transparent focus:border-base400'
                    placeholder='Enter your annual income (approx)'
                    keyboardType='numeric'
                  />
                </CyDView>
              </CyDView>

              <CyDView className='mb-4'>
                <CyDText className='text-[14px] text-n200 mb-[4px]'>
                  Expected Monthly spend
                </CyDText>
                <CyDView className='relative'>
                  <CyDView className='absolute left-3 top-0 bottom-0 justify-center z-10'>
                    <CyDMaterialDesignIcons
                      name='currency-usd'
                      size={20}
                      className='text-n400 mt-[-6px]'
                    />
                  </CyDView>
                  <FormikInput
                    name='expectedMonthlySpend'
                    label=''
                    containerClassName='w-full'
                    inputClassName='py-[16px] pl-[32px] pr-[12px] rounded-[8px] bg-n20 font-semibold border-[1px] border-transparent focus:border-base400'
                    placeholder='Enter your expected monthly spend (approx)'
                    keyboardType='numeric'
                  />
                </CyDView>
              </CyDView>
            </KeyboardAwareScrollView>

            {/* Footer */}
            <CardApplicationFooter
              currentStep={1}
              totalSteps={3}
              currentSectionProgress={100}
              buttonConfig={{
                title: 'Next',
                onPress: () => handleSubmit(),
                loading: isSubmitting,
                disabled: !isValid,
              }}
            />
          </>
        )}
      </Formik>
    </CyDView>
  );
};

export default AdditionalDetails;
