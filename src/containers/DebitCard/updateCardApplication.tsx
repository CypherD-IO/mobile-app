/* eslint-disable react/jsx-no-undef */
import React, { useContext, useEffect, useState } from 'react';
import * as yup from 'yup';
import { t } from 'i18next';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { Formik } from 'formik';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import { CyDView, CyDText, CyDTouchView, CyDImage, CyDTextInput, CyDScrollView, CyDKeyboardAvoidingView, CyDDropDown } from '../../styles/tailwindStyles';
import { GlobalContext } from '../../core/globalContext';
import { useIsFocused } from '@react-navigation/native';
import { concatErrorMessagesFromArrayOneByOne, isValidPassportNumber, isValidSSN } from '../../core/util';
import { CardApplication } from '../../models/cardApplication.model';
import { isAndroid } from '../../misc/checkers';
import moment from 'moment';
import DatePickerModal from 'react-native-modal-datetime-picker';
import Loading from '../../components/v2/loading';
import Button from '../../components/v2/button';
import { screenTitle } from '../../constants';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { hostWorker } from '../../global';
import { countryMaster } from '../../../assets/datasets/countryMaster';
import { IdTypes, OtherIdTypes } from '../../constants/enum';

export default function UpdateCardApplicationScreen ({ navigation }) {
  const globalContext = useContext<any>(GlobalContext);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const isFocused = useIsFocused();
  const [isDOBModalVisible, setDOBModalVisible] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<CardApplication>({
    country: '',
    dialCode: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    flag: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
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

  const userInfoValidationSchema = yup.object({
    firstName: yup.string().required(t('FIRST_NAME_REQUIRED')),
    lastName: yup.string().required(t('LAST_NAME_REQUIRED')),
    line1: yup.string().required(t('LINE1_REQUIRED')),
    city: yup.string().required(t('CITY_REQUIRED')),
    state: yup.string().required(t('STATE_REQUIRED')),
    postalCode: yup.string().required(t('POSTAL_CODE_REQUIRED')),
    dateOfBirth: yup.string().required(t('DOB_REQUIRED')).test('isValidAge', t('AGE_SHOULD_GT_18'), (dateOfBirth) => {
      if (dateOfBirth) {
        const endDate = new Date().getTime();
        const startDate = new Date(dateOfBirth).getTime();
        const diff = new Date(endDate - startDate);
        if (diff.getUTCFullYear() - 1970 > 18) {
          return true;
        } else {
          return false;
        }
      }
    }),
    idNumber: yup.string().required(userInfo.country === 'United States' ? t('SSN_REQUIRED') : t('PASSPORT_NUMBER_REQUIRED')).test('isValidIDNumber', userInfo.country === 'United States' ? t('INVALID_SSN') : t('INVALID_PASSPORT_NUMBER'), (idNumber) => {
      if (idNumber) {
        if (userInfo.country === 'United States') {
          return isValidSSN(idNumber);
        } else {
          return isValidPassportNumber(idNumber);
        }
      } else {
        return true;
      }
    })
  });

  const getProfile = async () => {
    setLoading(true);
    const profileUrl = `${ARCH_HOST}/v1/cards/application`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
    };
    try {
      const { data } = await axios.get(profileUrl, config);
      const [selectedCountryWithDialCode] = countryMaster.filter((country) => country.Iso2 === data.country);
      const profileData = {
        country: selectedCountryWithDialCode.name,
        dialCode: selectedCountryWithDialCode.dial_code,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phone,
        email: data.email,
        flag: selectedCountryWithDialCode.unicode_flag,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        dateOfBirth: data.dateOfBirth,
        idNumber: ''
      };
      if (profileData.country === 'United States') {
        profileData.idNumber = data.ssn;
      } else {
        profileData.idNumber = data.idType === IdTypes.PASSPORT ? data.passportNo : data.otherId;
        if (data.IdType !== IdTypes.PASSPORT) {
          const filteredIdType = idTypeData.filter(idType => idType.value === data.otherIdName);
          setSelectedIdType(filteredIdType[0]?.value);
        }
      }
      setUserInfo(profileData);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      Sentry.captureException(e);
    }
  };

  useEffect(() => {
    void getProfile();
  }, [isFocused]);

  const formatDOB = (DOB: string) => {
    if (DOB) {
      const [year, month, date] = DOB.split('-');
      if (userInfo.country === 'United States') {
        return month + '-' + date + '-' + year;
      }
      return DOB;
    }
  };

  const updateApplication = async (profileData: CardApplication) => {
    setUpdating(true);
    const payload = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      line1: profileData.line1,
      line2: profileData.line2,
      city: profileData.city,
      state: profileData.state,
      postalCode: profileData.postalCode,
      dateOfBirth: profileData.dateOfBirth,
      ssn: '',
      passportNo: '',
      idType: userInfo.country === 'United States' ? 'ssn' : 'passport'
    };

    if (userInfo.country === 'United States') {
      payload.ssn = profileData.idNumber;
      delete payload.passportNo;
    } else {
      if (selectedIdType === IdTypes.PASSPORT) {
        payload.passportNo = profileData.idNumber;
      } else {
        payload.idType = IdTypes.OTHER;
        payload.otherIdName = selectedIdType;
        payload.otherId = profileData.idNumber;
        delete payload.passportNo;
      }
      delete payload.ssn;
    }
    const updateUrl = `${ARCH_HOST}/v1/cards/application`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
    };

    try {
      await axios.patch(updateUrl, payload, config);
      setUpdating(false);
      navigation.navigate(screenTitle.CARD_KYC_STATUS_SCREEN);
    } catch (e) {
      setUpdating(false);
      showModal('state', { type: 'error', title: e.response.status === 400 ? t('INVALID_USER_INPUT') : t('SOMETHING_WENT_WRONG'), description: e.response.status === 400 ? concatErrorMessagesFromArrayOneByOne(e.response.data.errors) : t('UPDATE_INFO_ERROR_MESSAGE'), onSuccess: hideModal, onFailure: hideModal });
      Sentry.captureException(e);
    }
  };

  const confirmDate = (date) => {
    setUserInfo({ ...userInfo, dateOfBirth: moment(date).format('YYYY-MM-DD') });
    setDOBModalVisible(false);
  };

  return (

      <>{loading && <Loading />}
          {!loading && <><DatePickerModal
              isVisible={isDOBModalVisible}
              mode="date"
              date={new Date()}
              onConfirm={confirmDate}
              onCancel={() => setDOBModalVisible(false)} /><CyDView className={'h-full bg-white'}>
                <CyDKeyboardAvoidingView behavior={isAndroid() ? 'height' : 'padding'} enabled className={'h-full flex grow-1'}>
                  <CyDScrollView className='mt-[32px]'>
                      <CyDView className={'flex flex-row items-center justify-center mt-[30px]'}>
                          <CyDTouchView className={'ml-[-20px]'} onPress={() => { navigation.navigate(screenTitle.CARD_KYC_STATUS_SCREEN); }}>
                              <CyDImage source={AppImages.LEFT_ARROW} />
                          </CyDTouchView>
                          <CyDView className={'flex flex-row justify-center ml-[30px]'}>
                              <CyDText className={'text-center font-bold text-[22px] mt-[20px] mb-[10px]'}>{t<string>('UPDATE_CARD_APPLICATION')}</CyDText>
                          </CyDView>
                      </CyDView>
                      <Formik
                          enableReinitialize={true}
                          initialValues={userInfo}
                          validationSchema={userInfoValidationSchema}
                          onSubmit={async (values) => await updateApplication(values)}
                      >
                          {(formProps) => (
                              <>
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('COUNTRY_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDTouchView disabled className={'ml-[30px] mt-[4px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%]'}>
                                      <CyDView className={clsx('h-[50px] pl-[8px] pr-[12px] flex flex-row justify-between items-center', { 'border-redOffColor': formProps.touched.country && formProps.errors.country })}>
                                          <CyDView className={'flex flex-row items-center'}>
                                              <CyDText className={'text-center text-black font-nunito text-[18px] ml-[8px]'}>
                                                  {formProps.values.country}
                                              </CyDText>
                                          </CyDView>
                                      </CyDView>
                                  </CyDTouchView>
                                  {formProps.touched.country && formProps.errors.country && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.country}</CyDText></CyDView>}
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('FIRST_NAME_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
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
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('LAST_NAME_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
                                      <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.lastName && formProps.errors.lastName })}
                                          value={formProps.values.lastName}
                                          autoCapitalize="none"
                                          autoCorrect={false}
                                          onChangeText={formProps.handleChange('lastName')}
                                          placeholderTextColor={'#C5C5C5'}
                                          placeholder='Last name' />
                                  </CyDView>
                                  {formProps.touched.lastName && formProps.errors.lastName && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.lastName}</CyDText></CyDView>}
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('EMAIL_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
                                      <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.email && formProps.errors.email })}
                                          value={formProps.values.email}
                                          editable={false}
                                          selectTextOnFocus={false}
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
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('PHONE_NUMBER_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={clsx('h-[50px] ml-[30px] mt-[4px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%] flex flex-row', { 'border-redOffColor': formProps.touched.phoneNumber && formProps.errors.phoneNumber })}>
                                      <CyDView className={'flex flex-row items-center w-8/12'}>
                                          <CyDView className={'flex flex-row items-center'}>
                                              <CyDTextInput className={clsx('text-black font-nunito text-[16px] ml-[8px] w-[100%]', { 'mt-[-8px]': isAndroid() })}
                                                  value={formProps.values.phoneNumber}
                                                  editable={false}
                                                  selectTextOnFocus={false}
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
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('ADDRESS_LINE_1_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
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
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('ADDRESS_LINE_2_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
                                      <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor')}
                                          value={formProps.values.line2}
                                          autoCapitalize="none"
                                          autoCorrect={false}
                                          placeholderTextColor={'#C5C5C5'}
                                          onChangeText={formProps.handleChange('line2')}
                                          placeholder='Line 2' />
                                  </CyDView>
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('CITY_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
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
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('STATE_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
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
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('ZIPCODE_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
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
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('DOB_INIT_CAPS')}
                                      </CyDText>
                                  </CyDView>
                                  <CyDTouchView className={clsx('ml-[30px] mt-[4px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%]', { 'border-redOffColor': formProps.touched.dateOfBirth && formProps.errors.dateOfBirth })} onPress={() => setDOBModalVisible(true)}>
                                      <CyDView className={'h-[50px] pl-[8px] pr-[12px] flex flex-row justify-between items-center'}>
                                          <CyDView className={'flex flex-row items-center'}>
                                              <CyDText className={'text-center text-black font-nunito text-[18px] ml-[8px]'}>
                                                  {formatDOB(formProps.values.dateOfBirth)}
                                              </CyDText>
                                              {!formProps.values.dateOfBirth && <CyDText className={'font-nunito text-[18px] text-inputBorderColor'}>{t<string>('DOB_INIT_CAPS')}</CyDText>}
                                          </CyDView>

                                          <CyDImage source={AppImages.CALENDAR} />
                                      </CyDView>
                                  </CyDTouchView>
                                  {formProps.touched.dateOfBirth && formProps.errors.dateOfBirth && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.dateOfBirth}</CyDText></CyDView>}
                                  {userInfo.country !== 'United States' &&
                                  <>
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                    <CyDText className={'text-[16px] font-bold'}>
                                    {t<string>('ID_TYPE')}
                                    </CyDText>
                                  </CyDView>
                                  <CyDDropDown
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
                                    className={'ml-[30px] border-[1px] border-inputBorderColor rounded-[5px] p-[7px] text-[18px] w-[85%] font-nunito text-primaryTextColor'}
                                  />
                                  </>}
                                  <CyDView className={'mt-[20px] ml-[33px]'}>
                                      {userInfo.country === 'United States' && <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('SSN_ALL_CAPS')}
                                      </CyDText>}
                                      {userInfo.country !== 'United States' && <CyDText className={'text-[16px] font-bold'}>
                                          {t<string>('ID_NUMBER')}
                                      </CyDText>}
                                  </CyDView>
                                  <CyDView className={'mt-[4px] flex flex-row justify-center'}>
                                      <CyDTextInput className={clsx('ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor', { 'border-redOffColor': formProps.touched.idNumber && formProps.errors.idNumber })}
                                          value={formProps.values.idNumber}
                                          autoCapitalize="none"
                                          keyboardType={userInfo.country === 'United States' ? 'numeric' : 'default'}
                                          autoCorrect={false}
                                          placeholderTextColor={'#C5C5C5'}
                                          onChangeText={formProps.handleChange('idNumber')}
                                          placeholder={userInfo.country === 'United States' ? 'Your 9 digit SSN' : 'Your passport number'} />
                                  </CyDView>
                                  {formProps.touched.idNumber && formProps.errors.idNumber && <CyDView className={'ml-[33px] mt-[6px] mb-[-11px]'}><CyDText className={'text-redOffColor font-semibold'}>{formProps.errors.idNumber}</CyDText></CyDView>}
                                  <CyDView className={'flex flex-row justify-center my-[18px]'}>
                                      <Button disabled={updating} onPress={() => {
                                        formProps.handleSubmit();
                                      }} title={t('UPDATE')} style={'py-[5%] mt-[15px] w-[86%]'} loading={updating} loaderStyle={{ height: 30 }} />
                                  </CyDView></>
                          )}
                      </Formik>
                  </CyDScrollView>
                </CyDKeyboardAvoidingView>
              </CyDView></>}
      </>
  );
}
