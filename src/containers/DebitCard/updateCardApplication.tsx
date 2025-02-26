import React, { useContext, useEffect, useMemo, useState } from 'react';
import * as yup from 'yup';
import { t } from 'i18next';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import { Formik } from 'formik';
import clsx from 'clsx';
import AppImages from '../../../assets/images/appImages';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDTextInput,
  CyDScrollView,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDIcons,
} from '../../styles/tailwindComponents';
import { GlobalContext } from '../../core/globalContext';
import { useIsFocused } from '@react-navigation/native';
import { isEnglish } from '../../core/util';
import { CardApplication, IState } from '../../models/cardApplication.model';
import { isAndroid } from '../../misc/checkers';
import moment from 'moment';
import DatePickerModal from 'react-native-modal-datetime-picker';
import Loading from '../../components/v2/loading';
import Button from '../../components/v2/button';
import { screenTitle } from '../../constants';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { hostWorker } from '../../global';
import { countryMaster } from '../../../assets/datasets/countryMaster';
import { CardProviders, IdTypes, OtherIdTypes } from '../../constants/enum';
import useAxios from '../../core/HttpRequest';
import { stateMaster as backupStateMaster } from '../../../assets/datasets/stateMaster';
import ChooseStateFromCountryModal from '../../components/v2/ChooseStateFromCountryModal';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import RadioButtons from '../../components/radioButtons';
import { PEP_OPTIONS } from '../../constants/data';
import Tooltip from 'react-native-walkthrough-tooltip';
import { findIndex } from 'lodash';
import { CardProfile } from '../../models/cardProfile.model';

export default function UpdateCardApplicationScreen({ navigation }) {
  const globalContext = useContext<any>(GlobalContext);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const isFocused = useIsFocused();
  const [isDOBModalVisible, setDOBModalVisible] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [stateMaster, setStateMaster] = useState<IState[]>(backupStateMaster);
  const [isFullNameFocused, setIsFullNameFocused] = useState(false);
  const [selectStateModalVisible, setSelectStateModalVisible] =
    useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<CardApplication>({
    country: '',
    dialCode: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    flag: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    dateOfBirth: '',
    idNumber: '',
    pep: undefined,
  });
  const [selectedIdType, setSelectedIdType] = useState('passport');
  const [showPepToolTip, setPepToolTip] = useState<boolean>(false);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;
  const [selectedCountryStates, setSelectedCountryStates] = useState<IState[]>(
    [],
  );
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'United States',
    Iso2: '',
    Iso3: '',
    dialCode: '+1',
    currency: '',
    flag: '🇺🇸',
  });
  const [selectedState, setSelectedState] = useState<IState>(
    selectedCountryStates?.[0],
  );
  const { getWithAuth, patchWithAuth } = useAxios();
  const idTypeData = [
    { label: OtherIdTypes.PASSPORT_LABEL, value: OtherIdTypes.PASSPORT },
    {
      label: OtherIdTypes.DRIVING_LICENCE_LABEL,
      value: OtherIdTypes.DRIVING_LICENCE,
    },
    { label: OtherIdTypes.TAX_ID_LABEL, value: OtherIdTypes.TAX_ID },
    { label: OtherIdTypes.NATIONAL_ID_LABEL, value: OtherIdTypes.NATIONAL_ID },
  ];

  const userInfoValidationSchema = yup.object({
    fullName: yup
      .string()
      .required(t('FULL_NAME_REQUIRED'))
      .test(
        'First name and last name should be separated by space',
        'Enter First name and Last name with spaces inbetween',
        fname => /\S\s+\S/.test(fname),
      )
      .test(
        'Full name must be in english',
        'Unrecognized characters found. Please enter your full name in english',
        fName => isEnglish(fName ?? ''),
      ),
    line1: yup.string().required(t('LINE1_REQUIRED')),
    city: yup.string().required(t('CITY_REQUIRED')),
    postalCode: yup.string().required(t('POSTAL_CODE_REQUIRED')),
    dateOfBirth: yup
      .string()
      .required(t('DOB_REQUIRED'))
      .test('isValidAge', t('AGE_SHOULD_GT_18'), dateOfBirth => {
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
    pep: yup.boolean().required(t('PEP_REQUIRED')),
  });

  const getProfile = async () => {
    setLoading(true);
    try {
      const { isError, data } = await getWithAuth(
        `/v1/cards/${provider}/application`,
      );
      if (!isError) {
        const [selectedCountryWithDialCode] = countryMaster.filter(
          country => country.Iso2 === data.country,
        );
        setSelectedCountry({
          ...selectedCountry,
          name: selectedCountryWithDialCode.name,
          dialCode: selectedCountryWithDialCode.dial_code,
          flag: selectedCountryWithDialCode.unicode_flag,
        });
        const tempSelectedCountryStates = stateMaster.filter(
          state => state.country_code === data.country,
        );
        if (tempSelectedCountryStates.length) {
          setSelectedCountryStates(tempSelectedCountryStates);
          setSelectedState(tempSelectedCountryStates[0]);
        }
        const profileData = {
          country: selectedCountryWithDialCode.name,
          dialCode: selectedCountryWithDialCode.dial_code,
          fullName: data.firstName + ' ' + data.lastName,
          phoneNumber: data.phone,
          email: data.email,
          flag: selectedCountryWithDialCode.unicode_flag,
          line1: data.line1,
          line2: data.line2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          dateOfBirth: data.dateOfBirth,
          idNumber: '',
          pep: findIndex(PEP_OPTIONS, option => {
            return option.value === data.pep;
          }),
        };
        if (profileData.country === 'United States') {
          profileData.idNumber = data.ssn;
        } else {
          profileData.idNumber =
            data.idType === IdTypes.PASSPORT ? data.passportNo : data.otherId;
          if (data.IdType !== IdTypes.PASSPORT) {
            const filteredIdType = idTypeData.filter(
              idType => idType.value === data.otherIdName,
            );
            setSelectedIdType(filteredIdType[0]?.value);
          }
        }
        setUserInfo(profileData);
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
      Sentry.captureException(e);
    }
  };
  const getStateMaster = async () => {
    try {
      const response = await axios.get(
        `https://public.cypherd.io/js/stateMaster.js?${String(new Date())}`,
      );
      if (response?.data) {
        const stateData = response.data;
        setStateMaster(stateData);
      } else {
        const errorObject = {
          response,
          message:
            'Response data was not undefined when trying to fetch stateMaster',
        };
        Sentry.captureException(errorObject);
      }
    } catch (e) {
      const errorObject = {
        e,
        message: 'Error when trying to fetch stateMaster',
      };
      Sentry.captureException(errorObject);
    }
  };

  useEffect(() => {
    void getProfile();
    void getStateMaster();
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

  function onModalHide(type = '') {
    hideModal();
    setTimeout(() => {
      navigation.navigate(screenTitle.CARD_KYC_STATUS_SCREEN);
    }, MODAL_HIDE_TIMEOUT);
  }

  const getFirstAndLastName = (fullName: string) => {
    const trimmedFullName = fullName.trim().replace(/\s+/g, ' ');

    const firstSpaceIndex = trimmedFullName.indexOf(' ');

    const firstName = trimmedFullName.substring(0, firstSpaceIndex);
    let lastName = trimmedFullName.substring(firstSpaceIndex + 1);

    if (firstName.length + lastName.length > 22) {
      lastName = lastName.slice(0, 22 - firstName.length);
    }
    return { firstName, lastName };
  };

  const updateApplication = async (profileData: CardApplication) => {
    setUpdating(true);
    const { firstName, lastName } = getFirstAndLastName(profileData.fullName);
    const payload = {
      firstName,
      lastName,
      line1: profileData.line1,
      line2: profileData.line2,
      city: profileData.city,
      state: selectedState.name,
      postalCode: profileData.postalCode,
      dateOfBirth: profileData.dateOfBirth,
      pep: PEP_OPTIONS[userInfo.pep].value,
    };
    try {
      const response = await patchWithAuth(
        `/v1/cards/${provider}/application`,
        payload,
      );
      if (!response.isError) {
        setUpdating(false);
        showModal('state', {
          type: 'success',
          title: t('UPDATED_SUCCESSFULLY'),
          description: '',
          onSuccess: onModalHide,
          onFailure: onModalHide,
        });
      } else {
        showModal('state', {
          type: 'error',
          title:
            response.status === 400
              ? t('INVALID_USER_INPUT')
              : t('SOMETHING_WENT_WRONG'),
          description:
            response.error?.message ?? t('UPDATE_INFO_ERROR_MESSAGE'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        throw new Error(response.error);
      }
    } catch (e) {
      setUpdating(false);
      Sentry.captureException(e);
    }
  };

  const confirmDate = date => {
    setUserInfo({
      ...userInfo,
      dateOfBirth: moment(date).format('YYYY-MM-DD'),
    });
    setDOBModalVisible(false);
  };

  const handleFullNameFocus = () => {
    setIsFullNameFocused(true);
  };

  const handleFullNameBlur = () => {
    setIsFullNameFocused(false);
  };

  const onPepValueSet = (values, curPepValue) => {
    setUserInfo({
      ...values,
      pep: curPepValue,
    });
  };

  return (
    <>
      {loading && <Loading />}
      {!loading && (
        <>
          <DatePickerModal
            isVisible={isDOBModalVisible}
            mode='date'
            date={new Date()}
            onConfirm={confirmDate}
            onCancel={() => setDOBModalVisible(false)}
          />
          <ChooseStateFromCountryModal
            isModalVisible={selectStateModalVisible}
            setModalVisible={setSelectStateModalVisible}
            selectedCountry={{
              ...selectedCountry,
              flag: userInfo.flag,
            }}
            selectedCountryStates={selectedCountryStates}
            selectedStateState={[selectedState, setSelectedState]}
          />
          <CyDView className={'h-full bg-n0'}>
            <CyDView className={'h-full flex grow-1'}>
              <CyDScrollView className='my-[24px]'>
                <CyDKeyboardAwareScrollView>
                  <Formik
                    enableReinitialize={true}
                    initialValues={userInfo}
                    validationSchema={userInfoValidationSchema}
                    onSubmit={async values => await updateApplication(values)}>
                    {formProps => (
                      <CyDView className='mx-[9%]'>
                        <DatePickerModal
                          isVisible={isDOBModalVisible}
                          mode='date'
                          date={new Date()}
                          onConfirm={(date: Date) => confirmDate(String(date))}
                          onCancel={() => setDOBModalVisible(false)}
                        />
                        <CyDTouchView
                          className={
                            'mt-[20px] border-[1px] border-base80 rounded-[5px] w-full'
                          }
                          onPress={() => setModalVisible(true)}>
                          <CyDView
                            className={clsx(
                              'h-[50px] pl-[8px] pr-[12px] flex flex-row justify-between items-center',
                              {
                                'border-redOffColor':
                                  formProps.touched.country &&
                                  formProps.errors.country,
                              },
                            )}>
                            <CyDView
                              className={
                                'flex flex-row justify-between items-center w-full'
                              }>
                              <CyDView className={'flex flex-row items-center'}>
                                <CyDText className='text-center text-[18px] ml-[8px]'>
                                  {userInfo.flag}
                                </CyDText>
                                <CyDText className='text-center text-[18px] ml-[8px]'>
                                  {userInfo.country}
                                </CyDText>
                              </CyDView>
                              <CyDMaterialDesignIcons
                                name={'chevron-down'}
                                size={16}
                                className={'text-base400'}
                              />
                            </CyDView>
                          </CyDView>
                        </CyDTouchView>
                        {formProps.touched.country &&
                          formProps.errors.country && (
                            <CyDView className={'mt-[6px] mb-[-11px]'}>
                              <CyDText
                                className={'text-redOffColor font-semibold'}>
                                {formProps.errors.country}
                              </CyDText>
                            </CyDView>
                          )}
                        <CyDView
                          className={clsx(
                            'h-[50px] mt-[20px] border-[1px] border-base80 rounded-[5px] w-full flex flex-row',
                            {
                              'border-redOffColor':
                                formProps.touched.phoneNumber &&
                                formProps.errors.phoneNumber,
                            },
                          )}>
                          <CyDView
                            className={
                              'w-4/12 border-r-[1px] border-[#EBEBEB] bg-n0 py-[13px] rounded-l-[16px] flex items-center'
                            }>
                            <CyDView className={'mt-[-4px] ml-[-55px]'}>
                              <CyDText className={'text-[33px] mt-[-6px]'}>
                                {formProps.values.flag}
                              </CyDText>
                            </CyDView>
                            <CyDView className={'mt-[-20px] ml-[45px]'}>
                              <CyDText
                                className={
                                  'text-[13px] font-extrabold text-center'
                                }>
                                {formProps.values.dialCode}
                              </CyDText>
                            </CyDView>
                          </CyDView>
                          <CyDView
                            className={'flex flex-row items-center w-8/12'}>
                            <CyDView className={'flex flex-row items-center'}>
                              <CyDTextInput
                                className={clsx(
                                  'text-black  text-[16px] ml-[8px] w-[100%]',
                                  { 'mt-[-8px]': isAndroid() },
                                )}
                                value={formProps.values.phoneNumber}
                                autoCapitalize='none'
                                keyboardType={'numeric'}
                                maxLength={15}
                                key='phoneNumber'
                                autoCorrect={false}
                                placeholderTextColor={'#C5C5C5'}
                                onChangeText={formProps.handleChange(
                                  'phoneNumber',
                                )}
                                placeholder='Phone Number'
                              />
                            </CyDView>
                          </CyDView>
                        </CyDView>
                        {formProps.touched.phoneNumber &&
                          formProps.errors.phoneNumber && (
                            <CyDView className={'mt-[6px] mb-[-11px]'}>
                              <CyDText
                                className={'text-redOffColor font-semibold'}>
                                {formProps.errors.phoneNumber}
                              </CyDText>
                            </CyDView>
                          )}
                        <CyDView
                          className={'mt-[20px] flex flex-row justify-center'}>
                          <CyDTextInput
                            className={clsx(
                              'ml-[4px] border-[1px] border-base80 rounded-[5px] p-[12px] text-[18px] w-full  ',
                              {
                                'border-redOffColor':
                                  formProps.touched.fullName &&
                                  formProps.errors.fullName,
                              },
                            )}
                            value={formProps.values.fullName}
                            autoCapitalize='none'
                            key='fullName'
                            autoCorrect={false}
                            onFocus={handleFullNameFocus}
                            onBlur={handleFullNameBlur}
                            onChangeText={formProps.handleChange('fullName')}
                            placeholderTextColor={'#C5C5C5'}
                            placeholder='Full Name * (same as in KYC Doc.)'
                          />
                        </CyDView>
                        {formProps.touched.fullName &&
                          formProps.errors.fullName && (
                            <CyDView className={'mt-[6px] mb-[-11px]'}>
                              <CyDText
                                className={'text-redOffColor font-semibold'}>
                                {formProps.errors.fullName}
                              </CyDText>
                            </CyDView>
                          )}
                        {isFullNameFocused && (
                          <CyDView className={'mt-[6px] mb-[-11px]'}>
                            <CyDText
                              className={'text-yellow-600 font-semibold'}>
                              {t('FULL_NAME_DISCLAIMER')}
                            </CyDText>
                          </CyDView>
                        )}
                        <CyDTouchView
                          className={clsx(
                            'mt-[20px] border-[1px] border-base80 rounded-[5px] w-full',
                            {
                              'border-redOffColor':
                                formProps.touched.dateOfBirth &&
                                formProps.errors.dateOfBirth,
                            },
                          )}
                          onPress={() => {
                            setUserInfo({
                              ...userInfo,
                              ...formProps.values,
                            });
                            setDOBModalVisible(true);
                          }}>
                          <CyDView
                            className={
                              'h-[50px] pl-[8px] pr-[12px] flex flex-row justify-between items-center'
                            }>
                            <CyDView className={'flex flex-row items-center'}>
                              <CyDText
                                className={
                                  'text-center text-black  text-[18px] ml-[8px]'
                                }>
                                {formatDOB(formProps.values.dateOfBirth)}
                              </CyDText>
                              {!formProps.values.dateOfBirth && (
                                <CyDText className={' text-[18px] text-base80'}>
                                  {t('DATE_OF_BIRTH')}
                                </CyDText>
                              )}
                            </CyDView>

                            <CyDMaterialDesignIcons
                              name='calendar-blank'
                              size={20}
                              className='text-base400 self-center items-center'
                            />
                          </CyDView>
                        </CyDTouchView>
                        {formProps.touched.dateOfBirth &&
                          formProps.errors.dateOfBirth && (
                            <CyDView className={'mt-[6px] mb-[-11px]'}>
                              <CyDText
                                className={'text-redOffColor font-semibold'}>
                                {formProps.errors.dateOfBirth}
                              </CyDText>
                            </CyDView>
                          )}
                        <CyDView
                          className={'mt-[20px] flex flex-row justify-center'}>
                          <CyDTextInput
                            className={clsx(
                              'ml-[4px] border-[1px] border-base80 rounded-[5px] p-[12px] text-[18px] w-full  ',
                              {
                                'border-redOffColor':
                                  formProps.touched.email &&
                                  formProps.errors.email,
                              },
                            )}
                            value={formProps.values.email}
                            key='email'
                            textContentType='emailAddress'
                            keyboardType='email-address'
                            autoCapitalize='none'
                            autoCorrect={false}
                            onChangeText={formProps.handleChange('email')}
                            placeholderTextColor={'#C5C5C5'}
                            placeholder='Email'
                          />
                        </CyDView>
                        {formProps.touched.email && formProps.errors.email && (
                          <CyDView className={'mt-[6px] mb-[-11px]'}>
                            <CyDText
                              className={'text-redOffColor font-semibold'}>
                              {formProps.errors.email}
                            </CyDText>
                          </CyDView>
                        )}
                        {/* <CyDTouchView
                onPress={() => formProps.handleSubmit()}
                className={
                  'bg-p50 py-[20px] flex flex-row items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'
                }>
                <CyDText className={'text-center font-semibold'}>
                  {t<string>('NEXT')}
                </CyDText>
              </CyDTouchView> */}
                        <>
                          <CyDView
                            className={
                              'mt-[20px] flex flex-row justify-center'
                            }>
                            <CyDTextInput
                              className={clsx(
                                'ml-[4px] border-[1px] border-base80 rounded-[5px] p-[12px] text-[18px] w-full  ',
                                {
                                  'border-redOffColor':
                                    formProps.touched.line1 &&
                                    formProps.errors.line1,
                                },
                              )}
                              value={formProps.values.line1}
                              autoCapitalize='none'
                              key='line1'
                              autoCorrect={false}
                              placeholderTextColor={'#C5C5C5'}
                              onChangeText={formProps.handleChange('line1')}
                              placeholder='Line 1'
                            />
                          </CyDView>
                          {formProps.touched.line1 &&
                            formProps.errors.line1 && (
                              <CyDView className={'mt-[6px] mb-[-11px]'}>
                                <CyDText
                                  className={'text-redOffColor font-semibold'}>
                                  {formProps.errors.line1}
                                </CyDText>
                              </CyDView>
                            )}
                          <CyDView
                            className={
                              'mt-[20px] flex flex-row justify-center'
                            }>
                            <CyDTextInput
                              className={clsx(
                                'ml-[4px] border-[1px] border-base80 rounded-[5px] p-[12px] text-[18px] w-full  ',
                              )}
                              value={formProps.values.line2}
                              autoCapitalize='none'
                              autoCorrect={false}
                              placeholderTextColor={'#C5C5C5'}
                              onChangeText={formProps.handleChange('line2')}
                              placeholder='Line 2'
                            />
                          </CyDView>
                          <CyDView
                            className={
                              'mt-[20px] flex flex-row justify-center'
                            }>
                            <CyDTextInput
                              className={clsx(
                                'ml-[4px] border-[1px] border-base80 rounded-[5px] p-[12px] text-[18px] w-full  ',
                                {
                                  'border-redOffColor':
                                    formProps.touched.city &&
                                    formProps.errors.city,
                                },
                              )}
                              value={formProps.values.city}
                              key='city'
                              autoCapitalize='none'
                              autoCorrect={false}
                              placeholderTextColor={'#C5C5C5'}
                              onChangeText={formProps.handleChange('city')}
                              placeholder='City'
                            />
                          </CyDView>
                          {formProps.touched.city && formProps.errors.city && (
                            <CyDView className={'mt-[6px] mb-[-11px]'}>
                              <CyDText
                                className={'text-redOffColor font-semibold'}>
                                {formProps.errors.city}
                              </CyDText>
                            </CyDView>
                          )}
                          <CyDTouchView
                            className={'mt-[20px] flex flex-row justify-center'}
                            onPress={() => {
                              setSelectStateModalVisible(true);
                            }}>
                            <CyDView
                              className={clsx(
                                'ml-[4px] border-[1px] border-base80 rounded-[5px] p-[12px] text-[18px] w-full  ',
                                {
                                  'border-redOffColor':
                                    formProps.touched.state &&
                                    formProps.errors.state,
                                },
                              )}>
                              <CyDText className=' text-[18px]'>
                                {selectedState?.name}
                              </CyDText>
                            </CyDView>
                          </CyDTouchView>
                          {formProps.touched.state &&
                            formProps.errors.state && (
                              <CyDView className={'mt-[6px] mb-[-11px]'}>
                                <CyDText
                                  className={'text-redOffColor font-semibold'}>
                                  {formProps.errors.state}
                                </CyDText>
                              </CyDView>
                            )}
                          <CyDView
                            className={
                              'mt-[20px] flex flex-row justify-center'
                            }>
                            <CyDTextInput
                              className={clsx(
                                'ml-[4px] border-[1px] border-base80 rounded-[5px] p-[12px] text-[18px] w-full  ',
                                {
                                  'border-redOffColor':
                                    formProps.touched.postalCode &&
                                    formProps.errors.postalCode,
                                },
                              )}
                              value={formProps.values.postalCode}
                              key='zipcode'
                              autoCapitalize='none'
                              autoCorrect={false}
                              placeholderTextColor={'#C5C5C5'}
                              onChangeText={formProps.handleChange(
                                'postalCode',
                              )}
                              placeholder='Zipcode'
                            />
                          </CyDView>
                          {formProps.touched.postalCode &&
                            formProps.errors.postalCode && (
                              <CyDView className={'mt-[6px] mb-[-11px]'}>
                                <CyDText
                                  className={'text-redOffColor font-semibold'}>
                                  {formProps.errors.postalCode}
                                </CyDText>
                              </CyDView>
                            )}
                          <CyDView className='flex flex-row items-center'>
                            <CyDText className='mt-[20] mb-[10px] text-[16px]'>
                              {t('PEP_QUESTION')}
                            </CyDText>
                            <CyDView>
                              <Tooltip
                                isVisible={showPepToolTip}
                                disableShadow={true}
                                content={
                                  <CyDView className={'p-[5px]'}>
                                    <CyDText
                                      className={
                                        'mb-[5px] font-bold text-[15px]'
                                      }>
                                      {t<string>('PEP_EXPLAINATION')}
                                    </CyDText>
                                  </CyDView>
                                }
                                onClose={() => setPepToolTip(false)}
                                placement='top'>
                                <CyDTouchView
                                  onPress={() => {
                                    setPepToolTip(true);
                                  }}>
                                  <CyDIcons
                                    name='information'
                                    size={16}
                                    className='text-base400 ml-[4px]'
                                  />
                                </CyDTouchView>
                              </Tooltip>
                            </CyDView>
                          </CyDView>
                          <RadioButtons
                            radioButtonsData={PEP_OPTIONS}
                            onPressRadioButton={(value: number) => {
                              onPepValueSet(formProps.values, value);
                            }}
                            currentValue={userInfo.pep}
                            containerStyle={
                              'flex flex-row justify-around ml-[-21%]'
                            }
                          />
                          {formProps.touched.pep && formProps.errors.pep && (
                            <CyDView className={'mt-[-15px] mb-[11px]'}>
                              <CyDText
                                className={'text-redOffColor font-semibold'}>
                                {formProps.errors.pep}
                              </CyDText>
                            </CyDView>
                          )}
                          <Button
                            title={t<string>('NEXT')}
                            loading={updating}
                            onPress={() => {
                              formProps.handleSubmit();
                            }}
                            style='h-[55px] mt-[20px] mx-auto justify-center items-center w-full'
                            isPrivateKeyDependent={false}
                          />
                        </>
                      </CyDView>
                    )}
                  </Formik>
                </CyDKeyboardAwareScrollView>
              </CyDScrollView>
            </CyDView>
          </CyDView>
        </>
      )}
    </>
  );
}
