import React, { useContext, useEffect, useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useIsFocused } from '@react-navigation/native';
import { CyDImage, CyDText, CyDTextInput, CyDView, CyDScrollView, CyDSafeAreaView, CyDTouchView, CyDKeyboardAvoidingView } from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { Formik } from 'formik';
import * as yup from 'yup';
import { t } from 'i18next';
import CyDModalLayout from '../../components/v2/modal';
import { CountryCodesWithFlags } from '../../models/CountryCodesWithFlags.model';
import { isValidEmailID, isValidPassportNumber, isValidSSN } from '../../core/util';
import DatePickerModal from 'react-native-modal-datetime-picker';
import { isAndroid } from '../../misc/checkers';
import * as Sentry from '@sentry/react-native';
import moment from 'moment';
import Loading from '../../components/v2/loading';
import { GlobalContext } from '../../core/globalContext';
import axios from '../../core/Http';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { getWalletProfile } from '../../core/card';
import { GlobalContextType, IdTypes, OtherIdTypes } from '../../constants/enum';
import { hostWorker } from '../../global';
import { countryMaster } from '../../../assets/datasets/countryMaster';
import CyDDropDown from '../../components/v2/dropdown';
import { Colors } from '../../constants/theme';

export default function CardSignupScreen({ navigation, route }) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const globalContext = useContext<any>(GlobalContext);
  const inviteCode = route?.params?.inviteCode;
  const selectedCountry = route?.params?.selectedCountry;
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();
  const [screenIndex, setScreenIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [isDOBModalVisible, setDOBModalVisible] = useState<boolean>(false);
  const [isSSNModalVisibile, setSSNModalVisible] = useState<boolean>(false);
  const [isChangeNumberModalVisible, setChangeNumberModalVisible] = useState<boolean>(false);
  const [isChangeEmailModalVisible, setChangeEmailModalVisible] = useState<boolean>(false);
  const [updatedPhoneNumber, setUpdatedPhoneNumber] = useState<string>('');
  const [updatedEmail, setUpdatedEmail] = useState<string>('');
  const [countryFilterText, setCountryFilter] = useState<string>('');
  const [copyCountriesWithFlagAndDialcodes, setCopyCountriesWithFlagAndDialcodes] = useState<CountryCodesWithFlags[]>([]);
  const [isCountriesDataLoading, setIsCountriesDataLoading] = useState(true);
  const [origCountriesWithFlagAndDialcodes, setOrigCountryList] = useState<CountryCodesWithFlags[]>([]);
  const [userBasicDetails, setUserBasicDetails] = useState({
    country: 'United States',
    dialCode: '+1',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    flag: '🇺🇸'
  });

  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: ''
  });

  const [userIdentity, setUserIdentity] = useState({
    dateOfBirth: '',
    idNumber: ''
  });

  const [selectedIdType, setSelectedIdType] = useState('passport');
  const idTypeData = [
    { label: OtherIdTypes.PASSPORT_LABEL, value: OtherIdTypes.PASSPORT },
    { label: OtherIdTypes.DRIVING_LICENCE_LABEL, value: OtherIdTypes.DRIVING_LICENCE },
    { label: OtherIdTypes.TAX_ID_LABEL, value: OtherIdTypes.TAX_ID },
    { label: OtherIdTypes.NATIONAL_ID_LABEL, value: OtherIdTypes.NATIONAL_ID }
  ];

  const userBasicDetailsValidationSchema = yup.object({
    firstName: yup.string().required(t('FIRST_NAME_REQUIRED')),
    country: yup.string().test('isValidCountryForInviteCode', `${t('INVALID_COUNTRY_FOR_INVITE_CODE')}${selectedCountry.name}`, (country) => {
      if (inviteCode && inviteCode !== '') {
        if (inviteCode === 'USM6G5') {
          return true;
        }
        return selectedCountry.Iso2 === inviteCode.substring(0, 2);
      } else {
        return true;
      }
    }),
    email: yup.string().required(t('EMAIL_REQUIRED')).test('isValidEmail', t('INVALID_EMAIL'), (email) => {
      if (email) {
        return isValidEmailID(email);
      } else {
        return true;
      }
    }),
    lastName: yup.string().required(t('LAST_NAME_REQUIRED')),
    phoneNumber: yup.string().required(t('PHONE_NUMBER_REQUIRED'))
  });

  const userBillingAddressValidationSchema = yup.object({
    line1: yup.string().required(t('LINE1_REQUIRED')),
    city: yup.string().required(t('CITY_REQUIRED')),
    state: yup.string().required(t('STATE_REQUIRED')),
    postalCode: yup.string().required(t('POSTAL_CODE_REQUIRED'))
  });

  const userIdentityValidationSchema = yup.object({
    dateOfBirth: yup.string().required(t('DOB_REQUIRED')).test('isValidAge', t('AGE_SHOULD_GT_18'), (dateOfBirth) => {
      if (dateOfBirth) {
        const endDate = new Date().getTime();
        const startDate = new Date(dateOfBirth).getTime();
        const diff = new Date(endDate - startDate);
        if (diff.getUTCFullYear() - 1970 >= 18) {
          return true;
        } else {
          return false;
        }
      }
    }),
    idNumber: yup.string().required(userBasicDetails.country === 'United States' ? t('SSN_REQUIRED') : t('PASSPORT_NUMBER_REQUIRED')).test('isValidIDNumber', userBasicDetails.country === 'United States' ? t('INVALID_SSN') : t('INVALID_ID_NUMBER'), (idNumber) => {
      if (idNumber) {
        if (userBasicDetails.country === 'United States') {
          return isValidSSN(idNumber);
        } else {
          return isValidPassportNumber(idNumber);
        }
      } else {
        return true;
      }
    })
  });

  const getIDBasedOnCountry = (): string => {
    return userBasicDetails.country === 'United States' ? 'SSN Number is invalid' : 'Passport Number is invalid';
  };

  const cardResponseMapping = {
    firstName: 'First name',
    lastName: 'Last name',
    middleName: 'Middle name',
    phone: 'Phone number',
    email: 'Email ID',
    passportNo: 'Passport number',
    ssn: 'SSN',
    line1: 'Line 1',
    line2: 'Line 2',
    city: 'City',
    state: 'State',
    country: 'Country',
    postalCode: 'Zipcode',
    'Person invalid ID number': getIDBasedOnCountry()
  };

  const mapCardResponse = (responseString: string): string => {
    return cardResponseMapping[responseString] || responseString;
  };

  const concatFieldErrorMessages = (array: []): string => {
    let errorMessage = array.length > 1 ? 'The following fields are invalid: ' : 'The following field is invalid: ';
    array.forEach((messageObject: { field: string, message: string }, index) => {
      if (messageObject?.field) {
        errorMessage += mapCardResponse(messageObject.field);
        if (index !== array.length - 1) errorMessage += ', ';
      } else {
        errorMessage = mapCardResponse(messageObject.message);
        return errorMessage;
      }
    });
    return errorMessage;
  };

  useEffect(() => {
    setScreenIndex(0);
    if (inviteCode && inviteCode !== '') {
      setUserBasicDetails({ ...userBasicDetails, country: selectedCountry.name, dialCode: selectedCountry.dialCode, flag: selectedCountry.flag });
    }
  }, [isFocused]);

  useEffect(() => {
    setUpdatedPhoneNumber(userBasicDetails.phoneNumber);
    setUpdatedEmail(userBasicDetails.email);
  }, [userBasicDetails]);

  useEffect(() => {
    if (userIdentity.dateOfBirth !== '' && userIdentity.idNumber !== '') {
      void createApplication();
    }
  }, [userIdentity]);

  useEffect(() => {
    if (countryFilterText === '') {
      setOrigCountryList(copyCountriesWithFlagAndDialcodes);
    } else {
      const filteredCountries = copyCountriesWithFlagAndDialcodes.filter((country) => country.name.toLowerCase().includes(countryFilterText.toLowerCase()));
      setOrigCountryList(filteredCountries);
    }
  }, [countryFilterText]);

  useEffect(() => {
    void getCountryData();
  }, []);

  const getCountryData = async () => {
    try {
      const response = await axios.get(`https://public.cypherd.io/js/countryMaster.js?${String(new Date().getDay())}`);
      if (response?.data) {
        setCopyCountriesWithFlagAndDialcodes(response.data);
        setOrigCountryList(response.data);
        setIsCountriesDataLoading(false);
      } else {
        setCopyCountriesWithFlagAndDialcodes(countryMaster);
        setOrigCountryList(countryMaster);
        setIsCountriesDataLoading(false);
      }
    } catch (error) {
      setCopyCountriesWithFlagAndDialcodes(countryMaster);
      setOrigCountryList(countryMaster);
      setIsCountriesDataLoading(false);
      Sentry.captureException(error);
    }
  };

  const confirmDate = (date) => {
    setUserIdentity({ ...userIdentity, dateOfBirth: moment(date).format('YYYY-MM-DD') });
    setDOBModalVisible(false);
  };

  const createApplication = async () => {
    setLoading(true);
    const payload = { dateOfBirth: userIdentity.dateOfBirth, idType: userBasicDetails.country === 'United States' ? IdTypes.SSN : IdTypes.PASSPORT, firstName: userBasicDetails.firstName, lastName: userBasicDetails.lastName, phone: userBasicDetails.dialCode + userBasicDetails.phoneNumber, email: userBasicDetails.email, ...billingAddress, country: selectedCountry.Iso2, ssn: '', passportNo: '', inviteCode };
    if (userBasicDetails.country === 'United States') {
      payload.ssn = userIdentity.idNumber;
      delete payload.passportNo;
    } else {
      if (selectedIdType === IdTypes.PASSPORT) {
        payload.passportNo = userIdentity.idNumber;
      } else {
        payload.idType = IdTypes.OTHER;
        payload.otherIdName = selectedIdType;
        payload.otherId = userIdentity.idNumber;
        delete payload.passportNo;
      }
      delete payload.ssn;
    }
    if (!inviteCode) {
      delete payload.inviteCode;
    }
    const createApplicationUrl = `${ARCH_HOST}/v1/cards/application`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}`, 'Content-Type': 'application/json' }
    };
    try {
      await axios.post(createApplicationUrl, payload, config);
      const data = await getWalletProfile(globalContext.globalState.token);
      globalContext.globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: data });
      setLoading(false);
    } catch (e) {
      showModal('state', { type: 'error', title: e.response.data.code.includes('400') ? t('INVALID_USER_DETAILS') : t('SOMETHING_WENT_WRONG'), description: e.response.data.code.includes('400') ? concatFieldErrorMessages(e.response.data.errors) : e.response.data.message, onSuccess: hideModal, onFailure: hideModal });
      setLoading(false);
      Sentry.captureException(e);
    }
  };

  const proceedToNextScreen = (screen, values) => {
    if (screen === 'USER_BASIC_DETAILS') {
      setUserBasicDetails({ ...userBasicDetails, ...values });
    } else if (screen === 'BILLING_ADDRESS') {
      setBillingAddress({ ...billingAddress, ...values });
    } else if (screen === 'USER_IDENTITY') {
      setUserIdentity({ ...userIdentity, ...values });
    }
    if (screenIndex < screens.length - 1) setScreenIndex(screenIndex + 1);
  };

  const goToPreviousScreen = () => {
    if (screenIndex > 0) setScreenIndex(screenIndex - 1);
  };

  const updatePhoneNumber = () => {
    setUserBasicDetails({ ...userBasicDetails, phoneNumber: updatedPhoneNumber });
    setChangeNumberModalVisible(false);
  };

  const updateEmailId = () => {
    setUserBasicDetails({ ...userBasicDetails, email: updatedEmail });
    setChangeEmailModalVisible(false);
  };

  const formatDOB = (DOB: string) => {
    if (DOB) {
      const [year, month, date] = DOB.split('-');
      if (userBasicDetails.country === 'United States') {
        return month + '-' + date + '-' + year;
      }
      return DOB;
    }
  };

  const onDialCodeModalOpen = (values) => {
    setUserBasicDetails({ ...userBasicDetails, ...values });
    setModalVisible(true);
  };

  const GetToKnowTheUserBetter = () => {
    return (
      <CyDScrollView>
        <CyDView>
          <CyDText className={'text-[30px] font-bold mx-[34px] mt-[26px] leading-[40px]'}>
            {t<string>('CARD_SIGNUP_PAGE1_TITLE')}
          </CyDText>
        </CyDView>
        <Formik
          enableReinitialize={true}
          initialValues={userBasicDetails}
          validationSchema={userBasicDetailsValidationSchema}
          onSubmit={(values) => proceedToNextScreen('USER_BASIC_DETAILS', values)}
        >
          {(formProps) => (
            <><CyDTouchView disabled={true} className={'ml-[30px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%]'} onPress={() => setModalVisible(true)}>
              <CyDView className={clsx('h-[50px] pl-[8px] pr-[12px] flex flex-row justify-between items-center', { 'border-redOffColor': formProps.touched.country && formProps.errors.country })}>
                <CyDView className={'flex flex-row items-center'}>
                  <CyDText className={'text-center text-black font-nunito text-[18px] ml-[8px]'}>
                    {formProps.values.country}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDTouchView>
              {formProps.touched.country && formProps.errors.country && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.country}</CyDText></CyDView>}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.firstName && formProps.errors.firstName })}
                  value={formProps.values.firstName}
                  autoCapitalize="none"
                  key="firstName"
                  autoCorrect={false}
                  onChangeText={formProps.handleChange('firstName')}
                  placeholderTextColor={'#C5C5C5'}
                  placeholder='First name' />
              </CyDView>
              {formProps.touched.firstName && formProps.errors.firstName && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.firstName}</CyDText></CyDView>}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.lastName && formProps.errors.lastName })}
                  value={formProps.values.lastName}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={formProps.handleChange('lastName')}
                  placeholderTextColor={'#C5C5C5'}
                  placeholder='Last name' />
              </CyDView>
              {formProps.touched.lastName && formProps.errors.lastName && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.lastName}</CyDText></CyDView>}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.email && formProps.errors.email })}
                  value={formProps.values.email}
                  key="email"
                  textContentType='emailAddress'
                  keyboardType='email-address'
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={formProps.handleChange('email')}
                  placeholderTextColor={'#C5C5C5'}
                  placeholder='Email' />
              </CyDView>
              {formProps.touched.email && formProps.errors.email && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.email}</CyDText></CyDView>}
              <CyDView className={clsx('h-[50px] ml-[30px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%] flex flex-row', { 'border-redOffColor': formProps.touched.phoneNumber && formProps.errors.phoneNumber })}>
                <CyDTouchView onPress={() => onDialCodeModalOpen(formProps.values)} className={'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white py-[13px] rounded-l-[16px] flex items-center'}>
                  <CyDView className={'mt-[-4px] ml-[-55px]'}>
                    <CyDText className={'text-[33px] mt-[-6px]'}>{formProps.values.flag}</CyDText>
                  </CyDView>
                  <CyDView className={'mt-[-20px] ml-[45px]'}>
                    <CyDText className={'text-[13px] font-extrabold text-center'}>{formProps.values.dialCode}</CyDText>
                  </CyDView>
                </CyDTouchView>
                <CyDView className={'flex flex-row items-center w-8/12'}>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDTextInput className={clsx('text-black font-nunito text-[16px] ml-[8px] w-[100%]', { 'mt-[-8px]': isAndroid() })}
                      value={formProps.values.phoneNumber}
                      autoCapitalize="none"
                      keyboardType={'numeric'}
                      maxLength={15}
                      key="phoneNumber"
                      autoCorrect={false}
                      placeholderTextColor={'#C5C5C5'}
                      onChangeText={formProps.handleChange('phoneNumber')}
                      placeholder='Phone Number' />
                  </CyDView>
                </CyDView>
              </CyDView>
              {formProps.touched.phoneNumber && formProps.errors.phoneNumber && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.phoneNumber}</CyDText></CyDView>}
              <CyDTouchView onPress={() => formProps.handleSubmit()}
                className={'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'}>
                <CyDText className={'text-center font-semibold'}>{t<string>('NEXT')}</CyDText>
              </CyDTouchView></>
          )}
        </Formik>
      </CyDScrollView>);
  };

  const UserBillingAddress = () => {
    return (
      <CyDScrollView>
        <CyDView>
          <CyDText className={'text-[27px] font-bold mx-[34px] mt-[26px] leading-[40px]'}>
            {t<string>('BILLING_ADDRESS')}
          </CyDText>
        </CyDView>
        <Formik
          initialValues={billingAddress}
          validationSchema={userBillingAddressValidationSchema}
          onSubmit={(values) => {
            proceedToNextScreen('BILLING_ADDRESS', values);
          }}>
          {(formProps) => (
            <>
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.line1 && formProps.errors.line1 })}
                  value={formProps.values.line1}
                  autoCapitalize="none"
                  key="line1"
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={formProps.handleChange('line1')}
                  placeholder='Line 1' />
              </CyDView>
              {formProps.touched.line1 && formProps.errors.line1 && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.line1}</CyDText></CyDView>}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor')}
                  value={formProps.values.line2}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={formProps.handleChange('line2')}
                  placeholder='Line 2' />
              </CyDView>
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.city && formProps.errors.city })}
                  value={formProps.values.city}
                  key="city"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={formProps.handleChange('city')}
                  placeholder='City' />
              </CyDView>
              {formProps.touched.city && formProps.errors.city && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.city}</CyDText></CyDView>}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.state && formProps.errors.state })}
                  value={formProps.values.state}
                  key="state"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={formProps.handleChange('state')}
                  placeholder='State' />
              </CyDView>
              {formProps.touched.state && formProps.errors.state && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.state}</CyDText></CyDView>}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.postalCode && formProps.errors.postalCode })}
                  value={formProps.values.postalCode}
                  key="zipcode"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={formProps.handleChange('postalCode')}
                  placeholder='Zipcode' />
              </CyDView>
              {formProps.touched.postalCode && formProps.errors.postalCode && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.postalCode}</CyDText></CyDView>}
              <CyDTouchView onPress={() => formProps.handleSubmit()}
                className={'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'}>
                <CyDText className={'text-center font-semibold'}>{t<string>('NEXT')}</CyDText>
              </CyDTouchView></>
          )}
        </Formik>
      </CyDScrollView>);
  };

  const ConfirmUserIdentity = () => {
    return (<CyDScrollView>
      <DatePickerModal
        isVisible={isDOBModalVisible}
        mode="date"
        date={new Date()}
        onConfirm={confirmDate}
        onCancel={() => setDOBModalVisible(false)}
      />
      <CyDView>
        <CyDText className={'text-[30px] font-bold mx-[34px] mt-[26px] leading-[40px]'}>
          {t<string>('CONFIRM_USER_IDENTITY')}
        </CyDText>
      </CyDView>
      <Formik
        initialValues={userIdentity}
        validationSchema={userIdentityValidationSchema}
        onSubmit={(values) => proceedToNextScreen('USER_IDENTITY', values)}
      >
        {(formProps) => (
          <><CyDTouchView className={clsx('ml-[30px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%]', { 'border-redOffColor': formProps.touched.dateOfBirth && formProps.errors.dateOfBirth })} onPress={() => setDOBModalVisible(true)}>
            <CyDView className={'h-[50px] pl-[8px] pr-[12px] flex flex-row justify-between items-center'}>
              <CyDView className={'flex flex-row items-center'}>
                <CyDText className={'text-center text-black font-nunito text-[18px] ml-[8px]'}>
                  {formatDOB(formProps.values.dateOfBirth)}
                </CyDText>
                {!formProps.values.dateOfBirth && <CyDText className={'font-nunito text-[18px] text-inputBorderColor'}>Date of Birth</CyDText>}
              </CyDView>

              <CyDImage source={AppImages.CALENDAR} />
            </CyDView>
          </CyDTouchView>
            {formProps.touched.dateOfBirth && formProps.errors.dateOfBirth && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.dateOfBirth}</CyDText></CyDView>}
            {selectedCountry.Iso2 !== 'US' && <CyDDropDown
              data={idTypeData}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder={'Select Id type'}
              searchPlaceholder="Search..."
              value={selectedIdType}
              onChange={item => {
                setSelectedIdType(item.value);
              }}
              className={'ml-[30px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] p-[7px] text-[18px] w-[85%] font-nunito text-secondaryTextColor'}
            />}
            <CyDView className={'mt-[20px] flex flex-row justify-center'}>
              <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.idNumber && formProps.errors.idNumber })}
                value={formProps.values.idNumber}
                autoCapitalize="none"
                keyboardType={userBasicDetails.country === 'United States' ? 'numeric' : 'default'}
                autoCorrect={false}
                placeholderTextColor={'#C5C5C5'}
                onChangeText={formProps.handleChange('idNumber')}
                placeholder={userBasicDetails.country === 'United States' ? 'Last 4 or 9 digits of your SSN' : 'Id number'} />
            </CyDView>
            {formProps.touched.idNumber && formProps.errors.idNumber && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.idNumber}</CyDText></CyDView>}
            <CyDTouchView onPress={() => { setSSNModalVisible(true); }} className={'flex flex-row mt-[28px] px-[30px] justify-start'}>
              <CyDView className={'mt-[2px] h-[20px] w-[20px]'}>
                <CyDImage className={'w-[20px] h-[20px] mt-[3px] ml-[3px]'} source={AppImages.INFO_CIRCLE} />
              </CyDView>
              <CyDView className={'mt-[3px] ml-[10px]'}><CyDText className={'text-[20px] font-bold'}> {userBasicDetails.country === 'United States' ? t('WHY_DOB_AND_SSN') : t('WHY_DOB_AND_PASSPORT_NUMBER')}</CyDText></CyDView>
            </CyDTouchView>
            <CyDTouchView onPress={() => formProps.handleSubmit()}
              className={'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'}>
              <CyDText className={'text-center font-semibold'}>{t<string>('SUBMIT')}</CyDText>
            </CyDTouchView></>
        )}
      </Formik>
    </CyDScrollView>);
  };

  const screens = [
    {
      index: 0,
      component: <GetToKnowTheUserBetter />
    },
    {
      index: 1,
      component: <UserBillingAddress />
    },
    {
      index: 2,
      component: <ConfirmUserIdentity />
    }
  ];

  return (
    <CyDSafeAreaView className={'h-full bg-white'}>
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        {isCountriesDataLoading
          ? <Loading />
          : <CyDKeyboardAvoidingView behavior={isAndroid() ? 'height' : 'padding'} className='flex flex-col justify-end h-full'>
            <CyDView className={'bg-white h-[50%] rounded-t-[20px]'}>
              <CyDView className={'flex flex-row mt-[20px] justify-center items-center'}>
                <CyDTextInput className={'border-[1px] border-inputBorderColor rounded-[50px] p-[10px] text-[14px] w-[80%] font-nunito text-primaryTextColor'}
                  value={countryFilterText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(text) => setCountryFilter(text)}
                  placeholderTextColor={Colors.subTextColor}
                  placeholder='Search Country' />
                <CyDTouchView onPress={() => { setModalVisible(false); }} className={'ml-[18px]'}>
                  <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] right-[0px] '} />
                </CyDTouchView>
              </CyDView>
              <CyDScrollView className={'mt-[12px]'}>
                <CyDView className='mb-[100px]'>
                  {origCountriesWithFlagAndDialcodes.map((country) => {
                    return (
                      <CyDTouchView onPress={() => {
                        setUserBasicDetails({
                          ...userBasicDetails,
                          dialCode: country.dial_code,
                          flag: country.unicode_flag
                        });
                        setModalVisible(false);
                      }} className={clsx('flex flex-row items-center justify-between px-[16px] py-[6px] mx-[12px] rounded-[26px]', { 'bg-paleBlue': country.name === selectedCountry.name })} key={country.name}>
                        <CyDView className={'flex flex-row items-center'}>
                          <CyDText className={'text-[36px]'}>{country.unicode_flag}</CyDText>
                          <CyDText className={'ml-[10px] font-semibold text-[16px]'}>{country.name}</CyDText>
                        </CyDView>
                        <CyDView className={'flex flex-row justify-end'}>
                          <CyDText className={'text-[14px] font-extrabold text-subTextColor'}>{country.dial_code}</CyDText>
                        </CyDView>
                      </CyDTouchView>
                    );
                  })}
                </CyDView>
              </CyDScrollView>
            </CyDView>
          </CyDKeyboardAvoidingView>}
      </CyDModalLayout>
      <CyDModalLayout
        setModalVisible={setSSNModalVisible}
        isModalVisible={isSSNModalVisibile}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDView className={'bg-white h-[50%] rounded-t-[20px]'}>
          <CyDView className={'flex flex-row mt-[20px] justify-end mr-[22px]'}>
            <CyDTouchView onPress={() => { setSSNModalVisible(false); }} className={'ml-[18px]'}>
              <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] right-[0px] '} />
            </CyDTouchView>
          </CyDView>
          <CyDView className={'px-[20px]'}>
            <CyDText className={'text-[18px] font-extrabold'}>{userBasicDetails.country === 'United States' ? t<string>('WHY_DOB_AND_SSN') : t<string>('WHY_DOB_AND_PASSPORT_NUMBER')}</CyDText>
            <CyDText className={'text-[15px] mt-[10px]'}>{t<string>('WHY_DOB_AND_SSN_CONTENT')}</CyDText>
          </CyDView>
          <CyDView className={'px-[20px] mt-[20px]'}>
            <CyDText className={'text-[18px] font-extrabold'}>{t<string>('WHAT_THIS_MEANS_FOR_USER_HEADING')}</CyDText>
            <CyDText className={'text-[15px] mt-[10px]'}>{t<string>('WHAT_THIS_MEANS_FOR_USER_CONTENT')}</CyDText>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      <CyDModalLayout
        setModalVisible={setChangeNumberModalVisible}
        isModalVisible={isChangeNumberModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDView className={'bg-white h-[30%] rounded-t-[20px]'}>
          <CyDView className={'flex flex-row mt-[20px] justify-end mr-[22px] z-50'}>
            <CyDTouchView onPress={() => { setChangeNumberModalVisible(false); }} className={'ml-[18px]'}>
              <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] right-[0px] '} />
            </CyDTouchView>
          </CyDView>
          <CyDView className={'mt-[-18px]'}>
            <CyDText className={'text-center text-[18px] font-bold'}>{t<string>('CHANGE_NUMBER_INIT_CAPS')}</CyDText>
          </CyDView>
          <CyDView className={clsx('h-[50px] ml-[30px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%] flex flex-row')}>
            <CyDTouchView onPress={() => setModalVisible(true)} className={'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white py-[13px] rounded-l-[16px] flex items-center'}>
              <CyDView className={'mt-[-4px] ml-[-55px]'}>
                <CyDText className={'text-[33px] mt-[-6px]'}>{userBasicDetails.flag}</CyDText>
              </CyDView>
              <CyDView className={'mt-[-20px] ml-[45px]'}>
                <CyDText className={'text-[13px] font-extrabold text-center'}>{userBasicDetails.dialCode}</CyDText>
              </CyDView>
            </CyDTouchView>
            <CyDView className={'flex flex-row items-center w-8/12'}>
              <CyDView className={'flex flex-row items-center'}>
                <CyDTextInput className={clsx('text-center text-black font-nunito text-[16px] ml-[8px]', { 'mt-[-8px]': isAndroid() })}
                  value={updatedPhoneNumber}
                  autoCapitalize="none"
                  keyboardType={'numeric'}
                  maxLength={15}
                  key="phoneNumber"
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={(value) => setUpdatedPhoneNumber(value)}
                  placeholder='Phone Number' />
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDTouchView onPress={() => updatePhoneNumber()}
            className={'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'}>
            <CyDText className={'text-[16px] text-center font-bold'}>{t<string>('UPDATE_INIT_CAPS')}</CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDModalLayout>

      <CyDModalLayout
        setModalVisible={setChangeEmailModalVisible}
        isModalVisible={isChangeEmailModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDView className={'bg-white h-[30%] rounded-t-[20px]'}>
          <CyDView className={'flex flex-row mt-[20px] justify-end mr-[22px] z-50'}>
            <CyDTouchView onPress={() => { setChangeEmailModalVisible(false); }} className={'ml-[18px]'}>
              <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] right-[0px] '} />
            </CyDTouchView>
          </CyDView>
          <CyDView className={'mt-[-18px]'}>
            <CyDText className={'text-center text-[18px] font-bold'}>{t<string>('CHANGE_EMAIL_INIT_CAPS')}</CyDText>
          </CyDView>
          <CyDView className={'mt-[20px] flex flex-row justify-center'}>
            <CyDTextInput className={'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor'}
              value={updatedEmail}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              onChangeText={(value) => setUpdatedEmail(value)}
              placeholder='Email Id' />
          </CyDView>
          <CyDTouchView onPress={() => updateEmailId()}
            className={'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'}>
            <CyDText className={'text-[16px] text-center font-bold'}>{t<string>('UPDATE_INIT_CAPS')}</CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDModalLayout>

      {loading
        ? <Loading />
        : <><CyDView className={'flex flex-row items-center justify-center mt-[20px] h-[20px]'}>
          {<CyDTouchView onPress={() => { screenIndex === 0 ? navigation.goBack() : goToPreviousScreen(); }}>
            <CyDImage source={AppImages.LEFT_ARROW} />
          </CyDTouchView>}
          <CyDView className={'flex flex-row justify-center'}>
            {screens.map((screen, index) => {
              return (
                <CyDView key={index} className={clsx('h-[3px] ml-[6px] w-[20%]', { 'bg-paleGrey': index !== screenIndex, 'bg-appColor': index === screenIndex })} />
              );
            })}
          </CyDView>
        </CyDView>
          <CyDKeyboardAvoidingView behavior={isAndroid() ? 'height' : 'padding'} enabled className={'h-full flex grow-1'}>
            <CyDScrollView className='mb-[45px]'>
              {screens[screenIndex].component}
            </CyDScrollView>
          </CyDKeyboardAvoidingView></>}
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
