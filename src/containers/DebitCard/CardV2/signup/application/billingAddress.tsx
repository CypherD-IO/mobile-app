import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FormikTextInput from '../../../../../components/v2/formikInput';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../../styles/tailwindStyles';
import CyDModalLayout from '../../../../../components/v2/modal';
import AppImages from '../../../../../../assets/images/appImages';
import { StyleSheet } from 'react-native';
import { FormikHelpers } from 'formik';
import Loading from '../../../../../components/v2/loading';
import { FormInitalValues } from '.';
import { Colors } from '../../../../../constants/theme';

export default function BillingAddress({
  supportedCountries,
  setFieldValue,
  values,
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
}) {
  const { t } = useTranslation();
  const [showCountries, setShowCountries] = useState(false);
  const [countryFilterText, setCountryFilter] = useState('');
  const [countryList, setCountryList] = useState(supportedCountries);
  const [country, setCountry] = useState(values.country);

  useEffect(() => {
    if (countryFilterText === '') {
      setCountryList(supportedCountries);
    } else {
      const filteredCountries = supportedCountries.filter(country =>
        country.name.toLowerCase().includes(countryFilterText.toLowerCase()),
      );
      setCountryList(filteredCountries);
    }
  }, [supportedCountries, countryFilterText]);

  if (supportedCountries.length === 0) return <Loading />;
  return (
    <CyDKeyboardAwareScrollView className='px-[16px] h-[86%]'>
      <CyDModalLayout
        style={styles.modalLayout}
        isModalVisible={showCountries}
        setModalVisible={setShowCountries}>
        <CyDView className={'bg-white h-[70%] rounded-t-[20px] p-[16px]'}>
          <CyDView className={'flex flex-row justify-between items-center'}>
            <CyDText className='text-[18px] font-bold'>
              {t('SELECT_COUNTRY')}
            </CyDText>
            <CyDTouchView
              onPress={() => {
                setShowCountries(false);
              }}
              className={'text-black'}>
              <CyDView className='w-[24px] h-[24px] z-[50]'>
                <CyDImage
                  source={AppImages.CLOSE}
                  className={'w-[16px] h-[16px]'}
                />
              </CyDView>
            </CyDTouchView>
          </CyDView>
          <CyDView
            className={'flex flex-row mt-[20px] justify-center items-center'}>
            <CyDTextInput
              className={
                'border-[1px] border-inputBorderColor rounded-[8px] p-[10px] text-[14px] w-[95%] font-nunito text-primaryTextColor'
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
      <CyDKeyboardAwareScrollView>
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
        <CyDTouchView className='' onPress={() => setShowCountries(true)}>
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
          <FormikTextInput
            name='dialCode'
            label='Phone'
            containerClassName='mb-[17px] w-[20%]'
            placeholder=''
            editable={false}
          />
          <FormikTextInput
            name='phone'
            label=''
            containerClassName='mb-[17px] ml-[6px] mt-[2px] w-[78%]'
            placeholder='Your Phone Number'
            keyboardType='number-pad'
          />
        </CyDView>
      </CyDKeyboardAwareScrollView>
    </CyDKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
