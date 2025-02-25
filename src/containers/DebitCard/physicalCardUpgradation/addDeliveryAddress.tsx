import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDTouchView,
  CyDTextInput,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDIcons,
} from '../../../styles/tailwindComponents';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import {
  ButtonType,
  CardProviders,
  PhysicalCardType,
} from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import ChooseCountryModal from '../../../components/v2/ChooseCountryModal';
import { ICountry } from '../../../models/cardApplication.model';
import { Formik } from 'formik';
import * as yup from 'yup';
import clsx from 'clsx';
import { IKycPersonDetail } from '../../../models/kycPersonal.interface';
import { CyDIconsPack } from '../../../customFonts';

interface RouteParams {
  currentCardProvider: CardProviders;
  userData: IKycPersonDetail;
  physicalCardType?: PhysicalCardType;
}

export default function AddDeliveryAddress() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const [selectCountryModalVisible, setSelectCountryModalVisible] =
    useState<boolean>(false);
  const [
    selectCountryModalForDialCodeVisible,
    setSelectCountryModalForDialCodeVisible,
  ] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<ICountry>();
  const [selectedCountryForDialCode, setSelectedCountryForDialCode] =
    useState<ICountry>({
      name: 'United States',
      dialCode: '+1',
      flag: '🇺🇸',
      Iso2: 'US',
      Iso3: 'USA',
      currency: 'USD',
    });
  const { t } = useTranslation();
  const { currentCardProvider, userData, physicalCardType } = route.params;

  useEffect(() => {
    if (selectedCountry) {
      setSelectedCountryForDialCode(selectedCountry);
    }
  }, [selectedCountry]);

  const shippingDetailsValidationSchema = yup.object({
    addressLine1: yup
      .string()
      .required(t('ADDRESS_LINE_1_REQUIRED'))
      .max(50, t('ADDRESS_LINE_1_TOO_LONG'))
      .matches(/^[^;:!?<>~'%^@{}[\]]*$/, t('SPECIAL_CHARACTERS_NOT_ALLOWED')),
    addressLine2: yup
      .string()
      .nullable()
      .max(50, t('ADDRESS_LINE_2_TOO_LONG'))
      .matches(/^[^;:!?<>~'%^@{}[\]]*$/, t('SPECIAL_CHARACTERS_NOT_ALLOWED')),
    city: yup
      .string()
      .required(t('CITY_REQUIRED'))
      .max(20, t('CITY_TOO_LONG'))
      .matches(/^[^;:!?<>~'%^@{}[\]]*$/, t('SPECIAL_CHARACTERS_NOT_ALLOWED')),
    postalCode: yup
      .string()
      .required(t('POSTAL_CODE_REQUIRED'))
      .max(10, t('POSTAL_CODE_TOO_LONG'))
      .matches(/^[0-9A-Za-z\s-]*$/, t('POSTAL_CODE_INVALID_CHARACTERS')),
    state: yup
      .string()
      .required(t('STATE_REQUIRED'))
      .max(20, t('STATE_TOO_LONG'))
      .matches(/^[^;:!?<>~'%^@{}[\]]*$/, t('SPECIAL_CHARACTERS_NOT_ALLOWED')),
    phoneNumber: yup
      .string()
      .required(t('PHONE_NUMBER_REQUIRED'))
      .matches(/^[0-9]*$/, t('PHONE_NUMBER_INVALID_CHARACTERS')),
  });

  const initialValues = {
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    country: 'US',
    city: '',
    state: '',
    phoneNumber: '',
  };

  const onSubmit = (values: typeof initialValues) => {
    const formattedValues = {
      country: selectedCountry.Iso2,
      line1: values.addressLine1,
      line2: values.addressLine2,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      phoneNumber: selectedCountryForDialCode.dialCode + values.phoneNumber,
    };

    navigation.navigate(screenTitle.NAME_ON_CARD_SCREEN, {
      userData,
      shippingAddress: formattedValues,
      currentCardProvider,
      ...(physicalCardType && { physicalCardType }),
    });
  };

  return (
    <CyDSafeAreaView className='flex flex-1 bg-n20 h-full'>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <ChooseCountryModal
        isModalVisible={selectCountryModalVisible}
        setModalVisible={setSelectCountryModalVisible}
        selectedCountryState={[selectedCountry, setSelectedCountry]}
      />
      <ChooseCountryModal
        isModalVisible={selectCountryModalForDialCodeVisible}
        setModalVisible={setSelectCountryModalForDialCodeVisible}
        selectedCountryState={[
          selectedCountryForDialCode,
          setSelectedCountryForDialCode,
        ]}
      />
      <CyDView className='flex flex-col justify-between h-full bg-transparent'>
        <CyDView className='h-full'>
          <CyDView className='flex-row items-center justify-between mx-[16px]'>
            <CyDTouchView
              onPress={() => {
                navigation.goBack();
              }}
              className='w-[36px] h-[36px]'>
              <CyDIcons name='arrow-left' size={24} className='text-base400' />
            </CyDTouchView>
          </CyDView>
          <CyDText className='text-[26px] font-bold mx-[16px]'>
            {t('ADD_DELIVERY_ADDRESS')}
          </CyDText>
          <Formik
            initialValues={initialValues}
            validationSchema={shippingDetailsValidationSchema}
            onSubmit={onSubmit}>
            {({ values, errors, handleBlur, handleChange, handleSubmit }) => (
              <CyDKeyboardAwareScrollView
                className='mt-[24px]'
                enableOnAndroid={true}
                showsVerticalScrollIndicator={false}>
                <CyDView className='mx-[16px]'>
                  <CyDText className='text-[16px] font-semibold'>
                    {t('COUNTRY_INIT_CAPS')}
                  </CyDText>
                  <CyDTouchView
                    className={
                      'bg-n0 h-[60px] py-[4px] px-[10px] mt-[2px]  rounded-[8px] flex flex-row justify-between items-center'
                    }
                    onPress={() => setSelectCountryModalVisible(true)}>
                    <CyDView
                      className={clsx(
                        'flex flex-row justify-between items-center',
                        { 'border-redOffColor': !selectedCountry },
                      )}>
                      {selectedCountry ? (
                        <CyDView className={'flex flex-row items-center'}>
                          <CyDText className='text-center text-[18px] ml-[8px]'>
                            {selectedCountry?.flag}
                          </CyDText>
                          <CyDText className='text-center text-[18px] ml-[8px]'>
                            {selectedCountry?.name}
                          </CyDText>
                        </CyDView>
                      ) : (
                        <CyDText className='text-center text-[18px] ml-[8px]'>
                          {t('SELECT_COUNTRY')}
                        </CyDText>
                      )}
                    </CyDView>
                    <CyDMaterialDesignIcons
                      name={'chevron-down'}
                      size={16}
                      className={'text-base400'}
                    />
                  </CyDTouchView>
                  <CyDView className=' mt-[20px] flex flex-row items-center'>
                    <CyDText className='text-[16px] font-semibold'>
                      {t('PHONE_NUMBER_INIT_CAPS')}
                    </CyDText>
                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                      {errors.phoneNumber ?? ''}
                    </CyDText>
                  </CyDView>
                  <CyDView
                    className={
                      'bg-n0 h-[60px]  py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
                    }>
                    <CyDView
                      className={clsx(
                        'flex flex-row justify-between items-center',
                        { 'border-redOffColor': !selectedCountryForDialCode },
                      )}>
                      <CyDTouchView
                        onPress={() =>
                          setSelectCountryModalForDialCodeVisible(true)
                        }
                        className={'flex w-[20%] flex-row items-center'}>
                        <CyDText className={'text-center text-[16px] mx-[4px]'}>
                          {selectedCountryForDialCode.dialCode}
                        </CyDText>
                        <CyDMaterialDesignIcons
                          name={'chevron-down'}
                          size={16}
                          className={'text-base400'}
                        />
                      </CyDTouchView>
                      <CyDTextInput
                        className='h-full w-[80%] text-[16px] border-l px-[20px] border-base80'
                        inputMode='tel'
                        placeholderTextColor={'#ccc'}
                        onChangeText={handleChange('phoneNumber')}
                        onBlur={handleBlur('phoneNumber')}
                        value={values.phoneNumber}
                      />
                    </CyDView>
                  </CyDView>
                  <CyDView className='mt-[20px] flex flex-row items-center'>
                    <CyDText className='text-[16px] font-semibold'>
                      {t('ADDRESS_LINE_1_INIT_CAPS')}
                    </CyDText>
                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                      {errors.addressLine1 ?? ''}
                    </CyDText>
                  </CyDView>
                  <CyDView
                    className={
                      'bg-n0 h-[60px]  py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
                    }>
                    <CyDView className='flex flex-row justify-between items-center'>
                      <CyDTextInput
                        className='h-full w-[100%] text-[16px]'
                        inputMode='text'
                        placeholder='Line #1'
                        placeholderTextColor={'#ccc'}
                        onChangeText={handleChange('addressLine1')}
                        onBlur={handleBlur('addressLine1')}
                        value={values.addressLine1}
                      />
                    </CyDView>
                  </CyDView>
                  <CyDView className=' mt-[20px] flex flex-row items-center'>
                    <CyDText className='text-[16px] font-semibold'>
                      {t('ADDRESS_LINE_2_INIT_CAPS')}
                    </CyDText>
                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                      {errors.addressLine2 ?? ''}
                    </CyDText>
                  </CyDView>
                  <CyDView
                    className={
                      'bg-n0 h-[60px]  py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
                    }>
                    <CyDView className='flex flex-row justify-between items-center'>
                      <CyDTextInput
                        className='h-full w-[100%] text-[16px]'
                        inputMode='text'
                        placeholder='Line #2'
                        placeholderTextColor={'#ccc'}
                        onChangeText={handleChange('addressLine2')}
                        onBlur={handleBlur('addressLine2')}
                        value={values.addressLine2}
                      />
                    </CyDView>
                  </CyDView>
                  <CyDView className=' mt-[20px] flex flex-row items-center'>
                    <CyDText className='text-[16px] font-semibold'>
                      {t('CITY_INIT_CAPS')}
                    </CyDText>
                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                      {errors.city ?? ''}
                    </CyDText>
                  </CyDView>
                  <CyDView
                    className={
                      'bg-n0 h-[60px]  py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
                    }>
                    <CyDView className='flex flex-row justify-between items-center'>
                      <CyDTextInput
                        className='h-full w-[100%] text-[16px]'
                        inputMode='text'
                        placeholder='City'
                        placeholderTextColor={'#ccc'}
                        onChangeText={handleChange('city')}
                        onBlur={handleBlur('city')}
                        value={values.city}
                      />
                    </CyDView>
                  </CyDView>
                  <CyDView className=' mt-[20px] flex flex-row items-center'>
                    <CyDText className='text-[16px] font-semibold'>
                      {t('STATE_INIT_CAPS')}
                    </CyDText>
                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                      {errors.city ?? ''}
                    </CyDText>
                  </CyDView>
                  <CyDView
                    className={
                      'bg-n0 h-[60px]  py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
                    }>
                    <CyDView className='flex flex-row justify-between items-center'>
                      <CyDTextInput
                        className='h-full w-[100%] text-[16px]'
                        inputMode='text'
                        placeholder='state'
                        placeholderTextColor={'#ccc'}
                        onChangeText={handleChange('state')}
                        onBlur={handleBlur('state')}
                        value={values.state}
                      />
                    </CyDView>
                  </CyDView>
                  <CyDView className=' mt-[20px] flex flex-row items-center'>
                    <CyDText className='text-[16px] font-semibold'>
                      {t('ZIPCODE_INIT_CAPS')}
                    </CyDText>
                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                      {errors.postalCode ?? ''}
                    </CyDText>
                  </CyDView>
                  <CyDView
                    className={
                      'bg-n0 h-[60px]  py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
                    }>
                    <CyDView className='flex flex-row justify-between items-center'>
                      <CyDTextInput
                        className='h-full w-[100%] text-[16px]'
                        inputMode='text'
                        placeholder='000000'
                        placeholderTextColor={'#ccc'}
                        onChangeText={handleChange('postalCode')}
                        onBlur={handleBlur('postalCode')}
                        value={values.postalCode}
                      />
                    </CyDView>
                  </CyDView>
                </CyDView>
                <CyDView className='w-full py-[22px] px-[16px] mt-[12px]'>
                  <Button
                    onPress={handleSubmit}
                    type={ButtonType.PRIMARY}
                    title={t('CONTINUE')}
                    style={'h-[60px] w-full py-[10px]'}
                  />
                </CyDView>
              </CyDKeyboardAwareScrollView>
            )}
          </Formik>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
