import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FormikTextInput from '../../../../../components/v2/formikInput';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../../styles/tailwindComponents';
import CyDModalLayout from '../../../../../components/v2/modal';
import AppImages from '../../../../../../assets/images/appImages';
import { StyleSheet, Linking } from 'react-native';
import { FormikHelpers } from 'formik';
import Loading from '../../../../../components/v2/loading';
import { FormInitalValues } from '.';
import { Colors } from '../../../../../constants/theme';
import clsx from 'clsx';
import {
  LEGAL_CYPHERHQ,
  TERMS_PRIVACY_POLICY_URL,
} from '../../../../../constants/data';

export default function BillingAddress({
  supportedCountries,
  setFieldValue,
  values,
  isRainCard,
  acceptTerms,
  acceptConsent,
  setAcceptTerms,
  setAcceptConsent,
}: {
  supportedCountries: Array<{
    name: string;
    Iso2: string;
    Iso3: string;
    currency: string;
    unicode_flag: string;
    flag: string;
    dial_code: string;
  }>;
  setFieldValue: FormikHelpers<FormInitalValues>['setFieldValue'];
  values: FormInitalValues;
  isRainCard: boolean;
  acceptTerms: boolean;
  acceptConsent: boolean;
  setAcceptTerms: (acceptTerms: boolean) => void;
  setAcceptConsent: (acceptConsent: boolean) => void;
}) {
  const { t } = useTranslation();
  const [showCountries, setShowCountries] = useState(false);
  const [showDialCodeCountry, setShowDialCodeCountry] = useState(false);
  const [countryFilterText, setCountryFilter] = useState('');
  const [dialCodeFilterText, setDialCodeFilter] = useState('');
  const [countryList, setCountryList] = useState(supportedCountries);
  const [dialCodeList, setDialCodeList] = useState(supportedCountries);
  const [country, setCountry] = useState(values.country);
  const [dialCode, setDialCode] = useState(values.dialCode);
  useEffect(() => {
    if (countryFilterText === '') {
      setCountryList(supportedCountries);
    } else {
      const filteredCountries = supportedCountries.filter(_country =>
        _country.name.toLowerCase().includes(countryFilterText.toLowerCase()),
      );
      setCountryList(filteredCountries);
    }
  }, [supportedCountries, countryFilterText]);

  useEffect(() => {
    if (dialCodeFilterText === '') {
      setDialCodeList(supportedCountries);
    } else {
      const filteredDialCodes = supportedCountries.filter(_country =>
        _country.name.toLowerCase().includes(dialCodeFilterText.toLowerCase()),
      );
      setDialCodeList(filteredDialCodes);
    }
  }, [supportedCountries, dialCodeFilterText]);

  if (supportedCountries.length === 0) return <Loading />;
  return (
    <>
      <CyDModalLayout
        style={styles.modalLayout}
        isModalVisible={showCountries}
        setModalVisible={setShowCountries}>
        <CyDView className={'bg-n0 h-[70%] rounded-t-[20px] p-[16px]'}>
          <CyDView className={'flex flex-row justify-between items-center'}>
            <CyDText className='text-[18px] font-bold'>
              {t('SELECT_COUNTRY')}
            </CyDText>
            <CyDTouchView
              onPress={() => {
                setShowCountries(false);
              }}
              className={''}>
              <CyDView className='w-[24px] h-[24px] z-[50]'>
                <CyDMaterialDesignIcons
                  name={'close'}
                  size={24}
                  className='text-base400'
                />
              </CyDView>
            </CyDTouchView>
          </CyDView>
          <CyDView
            className={'flex flex-row mt-[20px] justify-center items-center'}>
            <CyDTextInput
              className={
                'border-[1px] border-n40 rounded-[8px] p-[10px] text-[14px] w-[95%] font-nunito'
              }
              value={countryFilterText}
              autoCapitalize='none'
              autoCorrect={false}
              onChangeText={text => setCountryFilter(text)}
              placeholder='Search Country'
              placeholderTextColor={Colors.subTextColor}
            />
          </CyDView>
          <CyDScrollView className='my-[16px]'>
            {countryList.map(_country => {
              return (
                <CyDTouchView
                  key={_country.Iso2 + _country.name}
                  onPress={() => {
                    setCountry(_country.unicode_flag + _country.name);
                    setDialCode(_country.dial_code);
                    void setFieldValue('country', _country.Iso2);
                    void setFieldValue('dialCode', _country.dial_code);
                    setShowCountries(false);
                  }}
                  className='flex flex-row justify-between p-[12px] rounded-[8px] my-[4px] border-b border-n30'>
                  <CyDText className='text-[16px] font-semibold '>
                    {_country.unicode_flag} {_country.name}
                  </CyDText>
                  <CyDView>
                    <CyDImage
                      className='w-[24px] h-[24px]'
                      source={
                        values.country === _country.Iso2
                          ? AppImages.RADIO_CHECK
                          : AppImages.RADIO_UNCHECK
                      }
                    />
                  </CyDView>
                </CyDTouchView>
              );
            })}
          </CyDScrollView>
        </CyDView>
      </CyDModalLayout>
      <CyDModalLayout
        style={styles.modalLayout}
        isModalVisible={showDialCodeCountry}
        setModalVisible={setShowDialCodeCountry}>
        <CyDView className={'bg-n0 h-[70%] rounded-t-[20px] p-[16px]'}>
          <CyDView className={'flex flex-row justify-between items-center'}>
            <CyDText className='text-[18px] font-bold'>
              {t('SELECT_COUNTRY')}
            </CyDText>
            <CyDTouchView
              onPress={() => {
                setShowDialCodeCountry(false);
              }}
              className={''}>
              <CyDView className='w-[24px] h-[24px] z-[50]'>
                <CyDMaterialDesignIcons
                  name={'close'}
                  size={24}
                  className='text-base400'
                />
              </CyDView>
            </CyDTouchView>
          </CyDView>
          <CyDView
            className={'flex flex-row mt-[20px] justify-center items-center'}>
            <CyDTextInput
              className={
                'border-[1px] border-base80 rounded-[8px] p-[10px] text-[14px] w-[95%] font-nunito'
              }
              value={dialCodeFilterText}
              autoCapitalize='none'
              autoCorrect={false}
              onChangeText={text => setDialCodeFilter(text)}
              placeholder='Search Country'
              placeholderTextColor={Colors.subTextColor}
            />
          </CyDView>
          <CyDScrollView className='my-[16px]'>
            {dialCodeList.map(_country => {
              return (
                <CyDTouchView
                  key={_country.Iso2 + _country.dial_code}
                  onPress={() => {
                    setDialCode(_country.dial_code);
                    void setFieldValue('dialCode', _country.dial_code);
                    setShowDialCodeCountry(false);
                  }}
                  className='flex flex-row justify-between p-[12px] rounded-[8px] my-[4px] border-b border-n30'>
                  <CyDText className='text-[16px] font-semibold '>
                    {_country.unicode_flag} {_country.name}
                  </CyDText>
                  <CyDView>
                    <CyDImage
                      className='w-[24px] h-[24px]'
                      source={
                        values.dialCode === _country.dial_code
                          ? AppImages.RADIO_CHECK
                          : AppImages.RADIO_UNCHECK
                      }
                    />
                  </CyDView>
                </CyDTouchView>
              );
            })}
          </CyDScrollView>
        </CyDView>
      </CyDModalLayout>

      <CyDView className='px-[16px]'>
        <CyDText className='font-bold text-[28px] mb-[24px]'>
          {t('BILLING_ADDRESS_TITLE')}
        </CyDText>
        <FormikTextInput
          name='line1'
          label='Address line 1'
          containerClassName='mb-[17px]'
        />
        <FormikTextInput
          name='line2'
          label='Address Line 2'
          placeholder='(optional)'
          containerClassName='mb-[17px]'
        />
        <FormikTextInput
          name='postalCode'
          label='Postal Code/Zip Code'
          containerClassName='mb-[17px]'
        />
        <CyDTouchView onPress={() => setShowCountries(true)}>
          <FormikTextInput
            name='country'
            label='Country'
            containerClassName='mb-[17px]'
            editable={false}
            pointerEvents='none'
            value={country}
          />
        </CyDTouchView>
        <FormikTextInput
          name='city'
          label='City'
          containerClassName='mb-[17px]'
        />
        <FormikTextInput
          name='state'
          label='State'
          containerClassName='mb-[17px]'
        />
        <CyDView className='flex flex-row w-full'>
          <CyDTouchView
            className='w-[20%]'
            onPress={() => setShowDialCodeCountry(true)}>
            <FormikTextInput
              name='dialCode'
              label='Phone'
              containerClassName='mb-[17px]'
              placeholder=''
              editable={false}
              pointerEvents='none'
              value={dialCode}
            />
          </CyDTouchView>
          <FormikTextInput
            name='phone'
            label=''
            containerClassName='mb-[17px] ml-[6px] mt-[2px] w-[78%]'
            placeholder='Your Phone Number'
            keyboardType='number-pad'
          />
        </CyDView>
        <CyDView className='flex flex-col bg-n0 rounded-[12px] p-[14px] gap-y-[10px] border border-n30 mb-[16px]'>
          <CyDView className='flex flex-row w-full'>
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

            <CyDText className='px-[12px] text-[12px] text-primaryText'>
              By continuing, I agree to{' '}
              <CyDText
                className='text-blue-800'
                onPress={() => void Linking.openURL(LEGAL_CYPHERHQ)}>
                Terms and Conditions
              </CyDText>{' '}
              and{' '}
              <CyDText
                className='text-blue-800'
                onPress={() => void Linking.openURL(TERMS_PRIVACY_POLICY_URL)}>
                Privacy Policy
              </CyDText>
            </CyDText>
          </CyDView>

          {!isRainCard && values.country === 'US' && (
            <CyDView className='flex flex-row w-full'>
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

              <CyDText className='px-[12px] text-[12px] text-primaryText'>
                {t('RC_APPLICATION_CONSENT_TEXT')}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
