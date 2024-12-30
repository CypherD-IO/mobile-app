import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  CyDFastImage,
  CyDImageBackground,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { Formik } from 'formik';
import * as yup from 'yup';
import * as Sentry from '@sentry/react-native';
import AppImages from '../../../../assets/images/appImages';
import { StyleSheet } from 'react-native';
import clsx from 'clsx';
import { ICountry, IState } from '../../../models/cardApplication.model';
import ChooseCountryModal from '../../../components/v2/ChooseCountryModal';
import Button from '../../../components/v2/button';
import { useTranslation } from 'react-i18next';
import { stateMaster } from '../../../../assets/datasets/stateMaster';
import ChooseStateFromCountryModal from '../../../components/v2/ChooseStateFromCountryModal';
import axios from '../../../core/Http';
import Loading from '../../../components/v2/loading';
import { screenTitle } from '../../../constants';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

const ShippingDetailsValidationSchema = yup.object().shape({
  phoneNumber: yup.string().required('Phone number is required'),
  line1: yup
    .string()
    .required('Address line 1 is required')
    .matches(/^[a-zA-Z0-9.,!?'/\-\s]*$/, 'Invalid characters'),
  line2: yup
    .string()
    .matches(/^[a-zA-Z0-9.,!?'/\-\s]*$/, 'Invalid characters.'),
  city: yup
    .string()
    .required('City is required')
    .matches(/^[a-zA-Z0-9.,!?'/\-\s]*$/, 'Invalid characters'),
  postalCode: yup.string().required('Postal code is required'),
});

const initialValues = {
  phoneNumber: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
};

interface RouteParams {
  currentCardProvider: string;
}
const UpgradeToPhysicalCardScreen = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { currentCardProvider } = route.params;

  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [selectCountryModalVisible, setSelectCountryModalVisible] =
    useState<boolean>(false);
  const [selectStateModalVisible, setSelectStateModalVisible] =
    useState<boolean>(false);
  const [
    selectCountryModalForDialCodeVisible,
    setSelectCountryModalForDialCodeVisible,
  ] = useState<boolean>(false);
  const [stateMasterData, setStateMasterData] = useState<IState[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<ICountry>({
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    Iso2: 'US',
    Iso3: 'USA',
    currency: 'USD',
  });
  const [selectedCountryForDialCode, setSelectedCountryForDialCode] =
    useState<ICountry>({
      name: 'United States',
      dialCode: '+1',
      flag: '🇺🇸',
      Iso2: 'US',
      Iso3: 'USA',
      currency: 'USD',
    });

  const selectedCountryStates = useMemo(() => {
    return stateMasterData.filter(
      state => state.country_code === selectedCountry.Iso2,
    );
  }, [selectedCountry.Iso2, stateMasterData]);

  const [selectedState, setSelectedState] = useState<IState>(
    selectedCountryStates[0],
  );

  // Initial fetching of stateMaster
  useEffect(() => {
    void getStateMaster();
  }, []);

  useEffect(() => {
    setSelectedCountryForDialCode(selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    setSelectedState(selectedCountryStates[0]);
  }, [selectedCountryStates]);

  const getStateMaster = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://public.cypherd.io/js/stateMaster.js?${String(new Date())}`,
      );
      if (response?.data) {
        const stateData = response.data;
        setStateMasterData(stateData);
      } else {
        setStateMasterData(stateMaster);
        const errorObject = {
          response,
          message:
            'Response data was not undefined when trying to fetch stateMaster',
        };
        Sentry.captureException(errorObject);
      }
      setLoading(false);
    } catch (e) {
      setStateMasterData(stateMaster);
      const errorObject = {
        e,
        message: 'Error when trying to fetch stateMaster',
      };
      Sentry.captureException(errorObject);
      setLoading(false);
    }
  };

  const onSubmit = async (values: typeof initialValues) => {
    const phoneNumber =
      selectedCountryForDialCode.dialCode + values.phoneNumber;
    const shippingDetails: Record<string, string | number | boolean> = {
      country: selectedCountry.Iso2,
      line1: values.line1.trim(),
      line2: values.line2.trim(),
      city: values.city.trim(),
      state: selectedState.name,
      postalCode: values.postalCode,
      isUserChargeable: true,
    };

    if (values.phoneNumber) {
      shippingDetails.phoneNumber = phoneNumber;
    }

    navigation.navigate(screenTitle.SHIPPING_DETAILS_OTP_SCREEN, {
      currentCardProvider,
      shippingDetails,
    });
  };

  return (
    <CyDSafeAreaView className='bg-n0 flex-1'>
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
      <ChooseStateFromCountryModal
        isModalVisible={selectStateModalVisible}
        setModalVisible={setSelectStateModalVisible}
        selectedCountry={selectedCountry}
        selectedCountryStates={selectedCountryStates}
        selectedStateState={[selectedState, setSelectedState]}
      />
      <Formik
        initialValues={initialValues}
        validationSchema={ShippingDetailsValidationSchema}
        onSubmit={onSubmit}>
        {({ values, errors, handleBlur, handleChange, handleSubmit }) => (
          <CyDImageBackground
            className='h-full w-full'
            source={AppImages.CARD_KYC_BACKGROUND}
            resizeMode='cover'
            imageStyle={styles.imageBackground}>
            {loading ? (
              <Loading />
            ) : (
              <CyDScrollView className='h-full w-full'>
                <CyDText className='font-medium text-center my-[4px] p-[8px]'>
                  {t('ADD_SHIPPING_DETAILS_SUBTEXT')}
                </CyDText>
                <CyDText className='font-bold mx-[20px]'>
                  {t('COUNTRY_INIT_CAPS')}
                </CyDText>
                <CyDTouchView
                  className={
                    'bg-n0 h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                  }
                  onPress={() => setSelectCountryModalVisible(true)}>
                  <CyDView
                    className={clsx(
                      'flex flex-row justify-between items-center',
                      { 'border-redOffColor': !selectedCountry },
                    )}>
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDText className='text-center text-[18px] ml-[8px]'>
                        {selectedCountry.flag}
                      </CyDText>
                      <CyDText className='text-center text-[18px] ml-[8px]'>
                        {selectedCountry.name}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                  <CyDFastImage
                    className='h-[12px] w-[12px]'
                    source={AppImages.DOWN_ARROW}
                    resizeMode='contain'
                  />
                </CyDTouchView>
                <CyDView className='mx-[20px] mt-[20px] flex flex-row items-center'>
                  <CyDText className='font-bold pr-[4px]'>
                    {t('PHONE_NUMBER_INIT_CAPS')}
                  </CyDText>
                  <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                    {errors.phoneNumber ?? ''}
                  </CyDText>
                </CyDView>
                <CyDView
                  className={
                    'bg-n0 h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
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
                      <CyDFastImage
                        className='h-[12px] w-[12px]'
                        source={AppImages.DOWN_ARROW}
                        resizeMode='contain'
                      />
                    </CyDTouchView>
                    <CyDTextInput
                      className='h-full w-[80%] text-[16px] border-l px-[20px] border-inputBorderColor'
                      inputMode='tel'
                      placeholderTextColor={'#ccc'}
                      onChangeText={handleChange('phoneNumber')}
                      onBlur={handleBlur('phoneNumber')}
                      value={values.phoneNumber}
                    />
                  </CyDView>
                </CyDView>
                <CyDView className='mx-[20px] mt-[20px] flex flex-row items-center'>
                  <CyDText className='font-bold pr-[4px]'>
                    {t('ADDRESS_LINE_1_INIT_CAPS')}
                  </CyDText>
                  <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                    {errors.line1 ?? ''}
                  </CyDText>
                </CyDView>
                <CyDView
                  className={
                    'bg-n0 h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                  }>
                  <CyDView className='flex flex-row justify-between items-center'>
                    <CyDTextInput
                      className='h-full w-[100%] text-[16px]'
                      inputMode='text'
                      placeholder='Line #1'
                      placeholderTextColor={'#ccc'}
                      onChangeText={handleChange('line1')}
                      onBlur={handleBlur('line1')}
                      value={values.line1}
                    />
                  </CyDView>
                </CyDView>
                <CyDView className='mx-[20px] mt-[20px] flex flex-row items-center'>
                  <CyDText className='font-bold pr-[4px]'>
                    {t('ADDRESS_LINE_2_INIT_CAPS')}
                  </CyDText>
                  <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                    {errors.line2 ?? ''}
                  </CyDText>
                </CyDView>
                <CyDView
                  className={
                    'bg-n0 h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                  }>
                  <CyDView className='flex flex-row justify-between items-center'>
                    <CyDTextInput
                      className='h-full w-[100%] text-[16px]'
                      inputMode='text'
                      placeholder='Line #2'
                      placeholderTextColor={'#ccc'}
                      onChangeText={handleChange('line2')}
                      onBlur={handleBlur('line2')}
                      value={values.line2}
                    />
                  </CyDView>
                </CyDView>
                <CyDView className='mx-[20px] mt-[20px] flex flex-row items-center'>
                  <CyDText className='font-bold pr-[4px]'>
                    {t('CITY_INIT_CAPS')}
                  </CyDText>
                  <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                    {errors.city ?? ''}
                  </CyDText>
                </CyDView>
                <CyDView
                  className={
                    'bg-n0 h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
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
                <CyDText className='font-bold mt-[20px] mx-[20px]'>
                  {t('STATE_INIT_CAPS')}
                </CyDText>
                <CyDTouchView
                  className={
                    'bg-n0 h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                  }
                  onPress={() => setSelectStateModalVisible(true)}>
                  <CyDView
                    className={clsx(
                      'flex flex-row justify-between items-center',
                      { 'border-redOffColor': !selectedState },
                    )}>
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDText
                        className={
                          'text-center text-black  text-[18px] ml-[8px]'
                        }>
                        {selectedState.name}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                  <CyDFastImage
                    className='h-[12px] w-[12px]'
                    source={AppImages.DOWN_ARROW}
                    resizeMode='contain'
                  />
                </CyDTouchView>
                <CyDView className='mx-[20px] mt-[20px] flex flex-row items-center'>
                  <CyDText className='font-bold pr-[4px]'>
                    {t('ZIPCODE_INIT_CAPS')}
                  </CyDText>
                  <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>
                    {errors.postalCode ?? ''}
                  </CyDText>
                </CyDView>
                <CyDView
                  className={
                    'bg-n0 h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
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
                <CyDText className='font-bold mx-[20px] my-[10px]'>
                  {t('SEND_OTP_TEXT')}
                </CyDText>
                <CyDView className='h-[60px] w-full flex justify-center items-center my-[10px] px-[10px] py-[5px]'>
                  <Button
                    onPress={handleSubmit}
                    style='h-[60px] w-[85%]'
                    title={t('ENTER_OTP')}
                  />
                </CyDView>
              </CyDScrollView>
            )}
          </CyDImageBackground>
        )}
      </Formik>
    </CyDSafeAreaView>
  );
};

const styles = StyleSheet.create({
  imageBackground: {
    opacity: 0.04,
  },
});

export default memo(UpgradeToPhysicalCardScreen);
