import React, { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FormikTextInput from '../../../../../components/v2/formikInput';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../../styles/tailwindStyles';
import CyDModalLayout from '../../../../../components/v2/modal';
import AppImages from '../../../../../../assets/images/appImages';
import { StyleSheet } from 'react-native';
import { FormikErrors } from 'formik';
import Loading from '../../../../../components/v2/loading';
import { FormInitalValues } from '.';

export default function BillingAddress({
  setIndex,
  supportedCountries,
  setFieldValue,
  values,
}: {
  setIndex: Dispatch<SetStateAction<number>>;
  values: FormInitalValues;
  supportedCountries: Array<{
    name: string;
    Iso2: string;
    Iso3: string;
    currency: string;
    unicode_flag: string;
    flag: string;
    dial_code: string;
  }>;
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean,
  ) => Promise<FormikErrors<FormInitalValues>> | Promise<void>;
}) {
  const { t } = useTranslation();
  const [showCountries, setShowCountries] = useState(false);

  if (supportedCountries.length === 0) return <Loading />;
  return (
    <CyDView className='px-[16px] h-[86%]'>
      <CyDModalLayout
        style={styles.modalLayout}
        isModalVisible={showCountries}
        setModalVisible={setShowCountries}>
        <CyDView className={'bg-n30 h-[70%] rounded-t-[20px] p-[16px]'}>
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
          <CyDScrollView className='my-[16px]'>
            {supportedCountries.map(country => {
              return (
                <CyDTouchView
                  key={country.Iso2 + country.name}
                  onPress={() => {
                    void setFieldValue('country', country.name);
                    void setFieldValue('dialCode', country.dial_code);
                    setShowCountries(false);
                  }}
                  className='flex flex-row justify-between p-[12px] rounded-[8px] my-[4px] border-b border-n50'>
                  <CyDText className='text-[16px] font-semibold '>
                    {country.unicode_flag} {country.name}
                  </CyDText>
                  <CyDView>
                    <CyDImage
                      className='w-[24px] h-[24px]'
                      source={
                        values.country === country.name
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
          {t('DELIVERY_ADDRESS')}
        </CyDText>
        <FormikTextInput
          name='line1'
          label='Address line 1'
          containerClassName='mb-[17px]'
        />
        <FormikTextInput
          name='line2'
          label='Address Line 2'
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
    </CyDView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
