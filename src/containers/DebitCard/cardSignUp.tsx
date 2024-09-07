import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useIsFocused } from '@react-navigation/native';
import {
  CyDImage,
  CyDText,
  CyDTextInput,
  CyDView,
  CyDScrollView,
  CyDSafeAreaView,
  CyDTouchView,
  CyDKeyboardAvoidingView,
  CyDKeyboardAwareScrollView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { Formik } from 'formik';
import * as yup from 'yup';
import { t } from 'i18next';
import CyDModalLayout from '../../components/v2/modal';
import { CountryCodesWithFlags } from '../../models/CountryCodesWithFlags.model';
import { isEnglish, isValidEmailID } from '../../core/util';
import DatePickerModal from 'react-native-modal-datetime-picker';
import { isAndroid } from '../../misc/checkers';
import * as Sentry from '@sentry/react-native';
import moment from 'moment';
import Loading from '../../components/v2/loading';
import { GlobalContext } from '../../core/globalContext';
import axios from '../../core/Http';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { CardProviders, GlobalContextType } from '../../constants/enum';
import { countryMaster } from '../../../assets/datasets/countryMaster';
import { Colors } from '../../constants/theme';
import useAxios from '../../core/HttpRequest';
import Button from '../../components/v2/button';
import { screenTitle } from '../../constants';
import { ICountry, IState } from '../../models/cardApplication.model';
import { stateMaster as backupStateMaster } from '../../../assets/datasets/stateMaster';
import ChooseStateFromCountryModal from '../../components/v2/ChooseStateFromCountryModal';
import ChooseCountryModal from '../../components/v2/ChooseCountryModal';
import RadioButtons from '../../components/radioButtons';
import Tooltip from 'react-native-walkthrough-tooltip';
import { PEP_OPTIONS } from '../../constants/data';
import { CardProfile } from '../../models/cardProfile.model';
import useCardUtilities from '../../hooks/useCardUtilities';
import { get } from 'lodash';

export default function CardSignupScreen({ navigation, route }) {
  const globalContext = useContext<any>(GlobalContext);
  const inviteCode = route?.params?.inviteCode;
  const [selectedCountry, setSelectedCountry] = useState(
    route?.params?.selectedCountry ?? {
      country: 'United States',
      dialCode: '+1',
      flag: '🇺🇸',
    },
  );
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();
  const [screenIndex, setScreenIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [isDialCodeModalVisible, setIsDialCodeModalVisible] =
    useState<boolean>(false);
  const [isDOBModalVisible, setDOBModalVisible] = useState<boolean>(false);
  const [isSSNModalVisibile, setSSNModalVisible] = useState<boolean>(false);
  const [isChangeNumberModalVisible, setChangeNumberModalVisible] =
    useState<boolean>(false);
  const [isChangeEmailModalVisible, setChangeEmailModalVisible] =
    useState<boolean>(false);
  const [updatedPhoneNumber, setUpdatedPhoneNumber] = useState<string>('');
  const [updatedEmail, setUpdatedEmail] = useState<string>('');
  const [countryFilterText, setCountryFilter] = useState<string>('');
  const [stateMaster, setStateMaster] = useState<IState[]>(backupStateMaster);
  const [
    copyCountriesWithFlagAndDialcodes,
    setCopyCountriesWithFlagAndDialcodes,
  ] = useState<CountryCodesWithFlags[]>([]);
  const [isCountriesDataLoading, setIsCountriesDataLoading] = useState(true);
  const [origCountriesWithFlagAndDialcodes, setOrigCountryList] = useState<
    CountryCodesWithFlags[]
  >([]);
  const [selectStateModalVisible, setSelectStateModalVisible] =
    useState<boolean>(false);
  const [userBasicDetails, setUserBasicDetails] = useState({
    country: 'United States',
    dialCode: '+1',
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    email: '',
    flag: '🇺🇸',
    Iso2: 'US',
    pep: undefined,
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
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { getWalletProfile, checkIsRCEnabled } = useCardUtilities();

  const selectedCountryStates = useMemo(() => {
    return stateMaster.filter(
      state => state.country_code === userBasicDetails.Iso2,
    );
  }, [userBasicDetails.Iso2, stateMaster, selectedCountry]);

  const [selectedState, setSelectedState] = useState<IState>(
    selectedCountryStates[0],
  );

  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const [showPepToolTip, setPepToolTip] = useState<boolean>(false);

  const { postWithAuth } = useAxios();

  const userBasicDetailsValidationSchema = yup.object({
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
    country: yup.string().required(),
    dateOfBirth: yup
      .string()
      .required(t('DOB_REQUIRED'))
      .test('isValidAge', t('AGE_SHOULD_GT_18'), dateOfBirth => {
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
    email: yup
      .string()
      .required(t('EMAIL_REQUIRED'))
      .test('isValidEmail', t('INVALID_EMAIL'), email => {
        if (email) {
          return isValidEmailID(email);
        } else {
          return true;
        }
      }),
    phoneNumber: yup
      .string()
      .required(t('PHONE_NUMBER_REQUIRED'))
      .test('isValidPhoneNumber', t('INVALID_PHONE_NUMBER'), phoneNumber =>
        /^\d+$/.test(phoneNumber),
      ),
    pep: yup.boolean().required(t('PEP_REQUIRED')),
  });

  const userBillingAddressValidationSchema = yup.object({
    line1: yup.string().required(t('LINE1_REQUIRED')),
    city: yup.string().required(t('CITY_REQUIRED')),
    postalCode: yup.string().required(t('POSTAL_CODE_REQUIRED')),
  });

  const getIDBasedOnCountry = (): string => {
    return userBasicDetails.country === 'United States'
      ? 'SSN Number is invalid'
      : 'Passport Number is invalid';
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
    'Person invalid ID number': getIDBasedOnCountry(),
  };

  const mapCardResponse = (responseString: string): string => {
    return cardResponseMapping[responseString] || responseString;
  };

  const concatFieldErrorMessages = (array: []): string => {
    let errorMessage =
      array.length > 1
        ? 'The following fields are invalid: '
        : 'The following field is invalid: ';
    array.forEach(
      (messageObject: { field: string; message: string }, index) => {
        if (messageObject?.field) {
          errorMessage += mapCardResponse(messageObject.field);
          if (index !== array.length - 1) errorMessage += ', ';
        } else {
          errorMessage = mapCardResponse(messageObject.message);
          return errorMessage;
        }
      },
    );
    return errorMessage;
  };

  useEffect(() => {
    setScreenIndex(0);
  }, [isFocused]);

  useEffect(() => {
    setUpdatedPhoneNumber(userBasicDetails.phoneNumber);
    setUpdatedEmail(userBasicDetails.email);
  }, [userBasicDetails]);

  useEffect(() => {
    setSelectedState(selectedCountryStates?.[0]);
  }, [selectedCountry]);

  useEffect(() => {
    if (countryFilterText === '') {
      setOrigCountryList(copyCountriesWithFlagAndDialcodes);
    } else {
      const filteredCountries = copyCountriesWithFlagAndDialcodes.filter(
        country =>
          country.name.toLowerCase().includes(countryFilterText.toLowerCase()),
      );
      setOrigCountryList(filteredCountries);
    }
  }, [countryFilterText]);

  useEffect(() => {
    void getCountryData();
    void getStateMaster();
  }, []);

  const getCountryData = async () => {
    try {
      const response = await axios.get(
        `https://public.cypherd.io/js/rcSupportedCountries.js?${String(new Date())}`,
      );
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

  const confirmDate = (date: string) => {
    setUserBasicDetails({
      ...userBasicDetails,
      dateOfBirth: moment(date).format('YYYY-MM-DD'),
    });
    setDOBModalVisible(false);
  };

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

  const createApplication = async (latestBillingAddress: any) => {
    setLoading(true);
    const { firstName, lastName } = getFirstAndLastName(
      userBasicDetails.fullName,
    );
    const payload = {
      dateOfBirth: userBasicDetails.dateOfBirth,
      firstName,
      lastName,
      phone: selectedCountryForDialCode.dialCode + userBasicDetails.phoneNumber,
      email: userBasicDetails.email,
      pep: PEP_OPTIONS[userBasicDetails.pep].value,
      ...latestBillingAddress,
      country: userBasicDetails.Iso2,
      ...(inviteCode ? { inviteCode } : {}),
    };
    try {
      const response = await postWithAuth(
        `/v1/cards/${CardProviders.REAP_CARD}/application`,
        payload,
      );
      if (!response.isError) {
        const data = await getWalletProfile(globalContext.globalState.token);
        data.provider = CardProviders.REAP_CARD;
        globalContext.globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: data,
        });
        navigation.navigate(screenTitle.CARD_SIGNUP_OTP_VERIFICATION_SCREEN);
        setLoading(false);
      } else {
        showModal('state', {
          type: 'error',
          title: t('INVALID_USER_DETAILS'),
          description: response.error?.message ?? '',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        setLoading(false);
        throw new Error(response.error);
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const proceedToNextScreen = (screen, values) => {
    if (screen === 'USER_BASIC_DETAILS') {
      setUserBasicDetails({ ...userBasicDetails, ...values });
    } else if (screen === 'BILLING_ADDRESS') {
      setBillingAddress({
        ...billingAddress,
        ...values,
        state: selectedState.name,
      });
      void createApplication({
        ...billingAddress,
        ...values,
        state: selectedState.name,
      });
    }
    if (screenIndex < screens.length - 1) setScreenIndex(screenIndex + 1);
  };

  const goToPreviousScreen = () => {
    if (screenIndex > 0) setScreenIndex(screenIndex - 1);
  };

  const updatePhoneNumber = () => {
    setUserBasicDetails({
      ...userBasicDetails,
      phoneNumber: updatedPhoneNumber,
    });
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

  const onDialCodeModalOpen = values => {
    setUserBasicDetails({ ...userBasicDetails, ...values });
    setIsDialCodeModalVisible(true);
  };

  const onPepValueSet = (values, curPepValue) => {
    setUserBasicDetails({
      ...values,
      pep: curPepValue,
    });
  };

  const GetToKnowTheUserBetter = useCallback(() => {
    return (
      <CyDScrollView>
        <CyDView>
          <CyDText
            className={
              'text-[30px] font-bold ml-[9%] mt-[26px] leading-[40px]'
            }>
            {t<string>('CARD_SIGNUP_PAGE1_TITLE')}
          </CyDText>
        </CyDView>
        <Formik
          enableReinitialize={true}
          initialValues={userBasicDetails}
          validationSchema={userBasicDetailsValidationSchema}
          onSubmit={values =>
            proceedToNextScreen('USER_BASIC_DETAILS', values)
          }>
          {formProps => (
            <CyDKeyboardAwareScrollView className='mx-[9%]'>
              <DatePickerModal
                isVisible={isDOBModalVisible}
                mode='date'
                date={new Date()}
                onConfirm={(date: Date) => confirmDate(String(date))}
                onCancel={() => setDOBModalVisible(false)}
              />
              <ChooseCountryModal
                isModalVisible={isDialCodeModalVisible}
                setModalVisible={setIsDialCodeModalVisible}
                selectedCountryState={[
                  selectedCountryForDialCode,
                  setSelectedCountryForDialCode,
                ]}
              />
              <CyDTouchView
                className={
                  'mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] w-full'
                }
                onPress={() => setModalVisible(true)}>
                <CyDView
                  className={clsx(
                    'h-[50px] pl-[8px] pr-[12px] flex flex-row justify-between items-center',
                    {
                      'border-redOffColor':
                        formProps.touched.country && formProps.errors.country,
                    },
                  )}>
                  <CyDView
                    className={
                      'flex flex-row justify-between items-center w-full'
                    }>
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDText className='text-center text-[18px] ml-[8px]'>
                        {userBasicDetails.flag}
                      </CyDText>
                      <CyDText className='text-center text-[18px] ml-[8px]'>
                        {userBasicDetails.country}
                      </CyDText>
                    </CyDView>
                    <CyDImage source={AppImages.DOWN_ARROW} />
                  </CyDView>
                </CyDView>
              </CyDTouchView>
              {formProps.touched.country && formProps.errors.country && (
                <CyDView className={'mt-[6px] mb-[-11px]'}>
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.country}
                  </CyDText>
                </CyDView>
              )}
              <CyDView
                className={clsx(
                  'h-[50px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] flex flex-row w-full',
                  {
                    'border-redOffColor':
                      formProps.touched.phoneNumber &&
                      formProps.errors.phoneNumber,
                  },
                )}>
                <CyDTouchView
                  onPress={() => onDialCodeModalOpen(formProps.values)}
                  className={
                    'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white py-[13px] rounded-l-[16px] flex items-center'
                  }>
                  <CyDView className={'mt-[-4px] ml-[-55px]'}>
                    <CyDText className={'text-[33px] mt-[-6px]'}>
                      {selectedCountryForDialCode.flag}
                    </CyDText>
                  </CyDView>
                  <CyDView className={'mt-[-20px] ml-[45px]'}>
                    <CyDText
                      className={'text-[13px] font-extrabold text-center'}>
                      {selectedCountryForDialCode.dialCode}
                    </CyDText>
                  </CyDView>
                </CyDTouchView>
                <CyDView className={'flex flex-row items-center w-8/12'}>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDTextInput
                      className={clsx(
                        'text-black font-nunito text-[16px] ml-[8px] w-[100%]',
                        { 'mt-[-8px]': isAndroid() },
                      )}
                      value={formProps.values.phoneNumber}
                      autoCapitalize='none'
                      keyboardType={'numeric'}
                      maxLength={15}
                      key='phoneNumber'
                      autoCorrect={false}
                      placeholderTextColor={'#C5C5C5'}
                      onChangeText={formProps.handleChange('phoneNumber')}
                      placeholder='Phone Number'
                    />
                  </CyDView>
                </CyDView>
              </CyDView>
              {formProps.touched.phoneNumber &&
                formProps.errors.phoneNumber && (
                  <CyDView className={'mt-[6px] mb-[-11px]'}>
                    <CyDText className={'text-redOffColor font-semibold'}>
                      {formProps.errors.phoneNumber}
                    </CyDText>
                  </CyDView>
                )}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput
                  className={clsx(
                    'border-[1px] border-inputBorderColor w-full rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor',
                    {
                      'border-redOffColor':
                        formProps.touched.fullName && formProps.errors.fullName,
                    },
                  )}
                  value={formProps.values.fullName}
                  autoCapitalize='none'
                  key='fullName'
                  autoCorrect={false}
                  onChangeText={formProps.handleChange('fullName')}
                  placeholderTextColor={'#C5C5C5'}
                  placeholder='Full Name * (same as in KYC Doc.)'
                />
              </CyDView>
              {formProps.touched.fullName && formProps.errors.fullName && (
                <CyDView className={'mt-[6px] mb-[-11px]'}>
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.fullName}
                  </CyDText>
                </CyDView>
              )}
              <CyDTouchView
                className={clsx(
                  'mt-[20px] border-[1px] border-inputBorderColor rounded-[5px]',
                  {
                    'border-redOffColor':
                      formProps.touched.dateOfBirth &&
                      formProps.errors.dateOfBirth,
                  },
                )}
                onPress={() => {
                  setUserBasicDetails({
                    ...userBasicDetails,
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
                        'text-center text-black font-nunito text-[18px] ml-[8px]'
                      }>
                      {formatDOB(formProps.values.dateOfBirth)}
                    </CyDText>
                    {!formProps.values.dateOfBirth && (
                      <CyDText
                        className={
                          'font-nunito text-[18px] text-inputBorderColor'
                        }>
                        {t('DATE_OF_BIRTH')}
                      </CyDText>
                    )}
                  </CyDView>

                  <CyDImage source={AppImages.CALENDAR} />
                </CyDView>
              </CyDTouchView>
              {formProps.touched.dateOfBirth &&
                formProps.errors.dateOfBirth && (
                  <CyDView className={'mt-[6px] mb-[-11px]'}>
                    <CyDText className={'text-redOffColor font-semibold'}>
                      {formProps.errors.dateOfBirth}
                    </CyDText>
                  </CyDView>
                )}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput
                  className={clsx(
                    'border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] font-nunito text-primaryTextColor w-full',
                    {
                      'border-redOffColor':
                        formProps.touched.email && formProps.errors.email,
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
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.email}
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
                        <CyDText className={'mb-[5px] font-bold text-[15px]'}>
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
                      <CyDImage
                        source={AppImages.INFO_ICON}
                        resizeMode='contain'
                        className={'w-[14px] h-[14px] ml-[4px]'}
                      />
                    </CyDTouchView>
                  </Tooltip>
                </CyDView>
              </CyDView>
              <RadioButtons
                radioButtonsData={PEP_OPTIONS}
                onPressRadioButton={async (value: number) => {
                  onPepValueSet(formProps.values, value);
                }}
                currentValue={userBasicDetails.pep}
                containerStyle={'flex flex-row justify-around ml-[-21%]'}
              />
              {formProps.touched.pep && formProps.errors.pep && (
                <CyDView className={'mt-[-15px] mb-[11px]'}>
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.pep}
                  </CyDText>
                </CyDView>
              )}
              {/* <CyDTouchView
                onPress={() => formProps.handleSubmit()}
                className={
                  'bg-appColor py-[20px] flex flex-row items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'
                }>
                <CyDText className={'text-center font-semibold'}>
                  {t<string>('NEXT')}
                </CyDText>
              </CyDTouchView> */}
              <Button
                title={t<string>('NEXT')}
                onPress={() => {
                  formProps.handleSubmit();
                }}
                style='h-[55px] mt-[20px] mx-auto justify-center items-center px-[55px] w-full'
                isPrivateKeyDependent={false}
              />
            </CyDKeyboardAwareScrollView>
          )}
        </Formik>
      </CyDScrollView>
    );
  }, [
    isDOBModalVisible,
    userBasicDetails,
    isDialCodeModalVisible,
    selectedCountryForDialCode,
    showPepToolTip,
  ]);

  const UserBillingAddress = useCallback(() => {
    return (
      <CyDScrollView>
        <CyDView>
          <CyDText
            className={
              'text-[27px] font-bold mx-[34px] mt-[26px] leading-[40px]'
            }>
            {t<string>('BILLING_ADDRESS')}
          </CyDText>
        </CyDView>
        <Formik
          initialValues={billingAddress}
          validationSchema={userBillingAddressValidationSchema}
          onSubmit={values => {
            proceedToNextScreen('BILLING_ADDRESS', values);
          }}>
          {formProps => (
            <CyDView className='mx-[9%]'>
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput
                  className={clsx(
                    'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-full font-nunito text-primaryTextColor',
                    {
                      'border-redOffColor':
                        formProps.touched.line1 && formProps.errors.line1,
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
              {formProps.touched.line1 && formProps.errors.line1 && (
                <CyDView className={'mt-[6px] mb-[-11px]'}>
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.line1}
                  </CyDText>
                </CyDView>
              )}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput
                  className={clsx(
                    'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-full font-nunito text-primaryTextColor',
                  )}
                  value={formProps.values.line2}
                  autoCapitalize='none'
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={formProps.handleChange('line2')}
                  placeholder='Line 2'
                />
              </CyDView>
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput
                  className={clsx(
                    'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-full font-nunito text-primaryTextColor',
                    {
                      'border-redOffColor':
                        formProps.touched.city && formProps.errors.city,
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
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.city}
                  </CyDText>
                </CyDView>
              )}
              <CyDTouchView
                className={'mt-[20px] flex flex-row justify-center'}
                onPress={() => {
                  setBillingAddress({ ...billingAddress, ...formProps.values });
                  setSelectStateModalVisible(true);
                }}>
                <CyDView
                  className={clsx(
                    'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-full font-nunito text-primaryTextColor',
                    {
                      'border-redOffColor':
                        formProps.touched.state && formProps.errors.state,
                    },
                  )}>
                  <CyDText className='font-nunito text-[18px]'>
                    {selectedState.name}
                  </CyDText>
                </CyDView>
              </CyDTouchView>
              {formProps.touched.state && formProps.errors.state && (
                <CyDView className={'mt-[6px] mb-[-11px]'}>
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.state}
                  </CyDText>
                </CyDView>
              )}
              <CyDView className={'mt-[20px] flex flex-row justify-center'}>
                <CyDTextInput
                  className={clsx(
                    'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-full font-nunito text-primaryTextColor',
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
                  onChangeText={formProps.handleChange('postalCode')}
                  placeholder='Zipcode'
                />
              </CyDView>
              {formProps.touched.postalCode && formProps.errors.postalCode && (
                <CyDView className={'mt-[6px] mb-[-11px]'}>
                  <CyDText className={'text-redOffColor font-semibold'}>
                    {formProps.errors.postalCode}
                  </CyDText>
                </CyDView>
              )}
              <Button
                title={t<string>('NEXT')}
                onPress={() => {
                  formProps.handleSubmit();
                }}
                style='h-[55px] mt-[20px] mx-auto justify-center items-center w-full'
                isPrivateKeyDependent={false}
              />
            </CyDView>
          )}
        </Formik>
      </CyDScrollView>
    );
  }, [
    userBasicDetails,
    billingAddress,
    selectedState,
    selectStateModalVisible,
    selectedCountryStates,
  ]);

  const screens = [
    {
      index: 0,
      component: <GetToKnowTheUserBetter />,
    },
    {
      index: 1,
      component: <UserBillingAddress />,
    },
  ];

  const onPressBack = () => {
    if (screenIndex === 0) {
      Keyboard.dismiss();
      setTimeout(() => {
        navigation.goBack();
      }, 100);
    } else {
      goToPreviousScreen();
    }
  };

  return (
    <CyDSafeAreaView className={'flex-1 bg-white mb-[75px]'}>
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        {isCountriesDataLoading ? (
          <Loading />
        ) : (
          <CyDKeyboardAvoidingView
            behavior={isAndroid() ? 'height' : 'padding'}
            className='flex flex-col justify-end h-full'>
            <CyDView className={'bg-white h-[50%] rounded-t-[20px]'}>
              <CyDView
                className={
                  'flex flex-row mt-[20px] justify-center items-center'
                }>
                <CyDTextInput
                  className={
                    'border-[1px] border-inputBorderColor rounded-[50px] p-[10px] text-[14px] w-[80%] font-nunito text-primaryTextColor'
                  }
                  value={countryFilterText}
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={text => setCountryFilter(text)}
                  placeholderTextColor={Colors.subTextColor}
                  placeholder='Search Country'
                />
                <CyDTouchView
                  onPress={() => {
                    setModalVisible(false);
                  }}
                  className={'ml-[18px]'}>
                  <CyDImage
                    source={AppImages.CLOSE}
                    className={' w-[22px] h-[22px] z-[50] right-[0px] '}
                  />
                </CyDTouchView>
              </CyDView>
              <CyDScrollView className={'mt-[12px]'}>
                <CyDView className='mb-[100px]'>
                  {origCountriesWithFlagAndDialcodes.map(country => {
                    return (
                      <CyDTouchView
                        onPress={() => {
                          setUserBasicDetails({
                            ...userBasicDetails,
                            country: country.name,
                            dialCode: country.dial_code,
                            flag: country.unicode_flag,
                            Iso2: country.Iso2,
                          });
                          setSelectedCountryForDialCode({
                            ...selectedCountry,
                            name: country.name,
                            dialCode: country.dial_code ?? '',
                            flag: country.unicode_flag,
                            Iso2: country.Iso2 ?? '',
                            Iso3: country.Iso3 ?? '',
                            currency: country.currency ?? '',
                          });
                          setSelectedCountry(country);
                          setModalVisible(false);
                        }}
                        className={clsx(
                          'flex flex-row items-center justify-between px-[16px] py-[6px] mx-[12px] rounded-[26px]',
                          {
                            'bg-paleBlue':
                              country.name === selectedCountry.name,
                          },
                        )}
                        key={country.name}>
                        <CyDView className={'flex flex-row items-center'}>
                          <CyDText className={'text-[36px]'}>
                            {country.unicode_flag}
                          </CyDText>
                          <CyDText
                            className={'ml-[10px] font-semibold text-[16px]'}>
                            {country.name}
                          </CyDText>
                        </CyDView>
                        <CyDView className={'flex flex-row justify-end'}>
                          <CyDText
                            className={
                              'text-[14px] font-extrabold text-subTextColor'
                            }>
                            {country.dial_code}
                          </CyDText>
                        </CyDView>
                      </CyDTouchView>
                    );
                  })}
                </CyDView>
              </CyDScrollView>
            </CyDView>
          </CyDKeyboardAvoidingView>
        )}
      </CyDModalLayout>
      <CyDModalLayout
        setModalVisible={setSSNModalVisible}
        isModalVisible={isSSNModalVisibile}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className={'bg-white h-[50%] rounded-t-[20px]'}>
          <CyDView className={'flex flex-row mt-[20px] justify-end mr-[22px]'}>
            <CyDTouchView
              onPress={() => {
                setSSNModalVisible(false);
              }}
              className={'ml-[18px]'}>
              <CyDImage
                source={AppImages.CLOSE}
                className={' w-[22px] h-[22px] z-[50] right-[0px] '}
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className={'px-[20px]'}>
            <CyDText className={'text-[18px] font-extrabold'}>
              {userBasicDetails.country === 'United States'
                ? t<string>('WHY_DOB_AND_SSN')
                : t<string>('WHY_DOB_AND_PASSPORT_NUMBER')}
            </CyDText>
            <CyDText className={'text-[15px] mt-[10px]'}>
              {t<string>('WHY_DOB_AND_SSN_CONTENT')}
            </CyDText>
          </CyDView>
          <CyDView className={'px-[20px] mt-[20px]'}>
            <CyDText className={'text-[18px] font-extrabold'}>
              {t<string>('WHAT_THIS_MEANS_FOR_USER_HEADING')}
            </CyDText>
            <CyDText className={'text-[15px] mt-[10px]'}>
              {t<string>('WHAT_THIS_MEANS_FOR_USER_CONTENT')}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      <CyDModalLayout
        setModalVisible={setChangeNumberModalVisible}
        isModalVisible={isChangeNumberModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className={'bg-white h-[30%] rounded-t-[20px]'}>
          <CyDView
            className={'flex flex-row mt-[20px] justify-end mr-[22px] z-50'}>
            <CyDTouchView
              onPress={() => {
                setChangeNumberModalVisible(false);
              }}
              className={'ml-[18px]'}>
              <CyDImage
                source={AppImages.CLOSE}
                className={' w-[22px] h-[22px] z-[50] right-[0px] '}
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className={'mt-[-18px]'}>
            <CyDText className={'text-center text-[18px] font-bold'}>
              {t<string>('CHANGE_NUMBER_INIT_CAPS')}
            </CyDText>
          </CyDView>
          <CyDView
            className={clsx(
              'h-[50px] ml-[30px] mt-[20px] border-[1px] border-inputBorderColor rounded-[5px] w-[85%] flex flex-row',
            )}>
            <CyDTouchView
              onPress={() => setModalVisible(true)}
              className={
                'w-4/12 border-r-[1px] border-[#EBEBEB] bg-white py-[13px] rounded-l-[16px] flex items-center'
              }>
              <CyDView className={'mt-[-4px] ml-[-55px]'}>
                <CyDText className={'text-[33px] mt-[-6px]'}>
                  {userBasicDetails.flag}
                </CyDText>
              </CyDView>
              <CyDView className={'mt-[-20px] ml-[45px]'}>
                <CyDText className={'text-[13px] font-extrabold text-center'}>
                  {userBasicDetails.dialCode}
                </CyDText>
              </CyDView>
            </CyDTouchView>
            <CyDView className={'flex flex-row items-center w-8/12'}>
              <CyDView className={'flex flex-row items-center'}>
                <CyDTextInput
                  className={clsx(
                    'text-center text-black font-nunito text-[16px] ml-[8px]',
                    { 'mt-[-8px]': isAndroid() },
                  )}
                  value={updatedPhoneNumber}
                  autoCapitalize='none'
                  keyboardType={'numeric'}
                  maxLength={15}
                  key='phoneNumber'
                  autoCorrect={false}
                  placeholderTextColor={'#C5C5C5'}
                  onChangeText={value => setUpdatedPhoneNumber(value)}
                  placeholder='Phone Number'
                />
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDTouchView
            onPress={() => updatePhoneNumber()}
            className={
              'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'
            }>
            <CyDText className={'text-[16px] text-center font-bold'}>
              {t<string>('UPDATE_INIT_CAPS')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDModalLayout>

      <CyDModalLayout
        setModalVisible={setChangeEmailModalVisible}
        isModalVisible={isChangeEmailModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className={'bg-white h-[30%] rounded-t-[20px]'}>
          <CyDView
            className={'flex flex-row mt-[20px] justify-end mr-[22px] z-50'}>
            <CyDTouchView
              onPress={() => {
                setChangeEmailModalVisible(false);
              }}
              className={'ml-[18px]'}>
              <CyDImage
                source={AppImages.CLOSE}
                className={' w-[22px] h-[22px] z-[50] right-[0px] '}
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className={'mt-[-18px]'}>
            <CyDText className={'text-center text-[18px] font-bold'}>
              {t<string>('CHANGE_EMAIL_INIT_CAPS')}
            </CyDText>
          </CyDView>
          <CyDView className={'mt-[20px] flex flex-row justify-center'}>
            <CyDTextInput
              className={
                'ml-[4px] border-[1px] border-inputBorderColor rounded-[5px] p-[12px] text-[18px] w-[85%] font-nunito text-primaryTextColor'
              }
              value={updatedEmail}
              autoCapitalize='none'
              autoCorrect={false}
              placeholderTextColor={'#C5C5C5'}
              onChangeText={value => setUpdatedEmail(value)}
              placeholder='Email Id'
            />
          </CyDView>
          <CyDTouchView
            onPress={() => updateEmailId()}
            className={
              'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[86%] mx-auto mt-[25px]'
            }>
            <CyDText className={'text-[16px] text-center font-bold'}>
              {t<string>('UPDATE_INIT_CAPS')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDModalLayout>

      <ChooseStateFromCountryModal
        isModalVisible={selectStateModalVisible}
        setModalVisible={setSelectStateModalVisible}
        selectedCountry={{ ...selectedCountry, flag: userBasicDetails.flag }}
        selectedCountryStates={selectedCountryStates}
        selectedStateState={[selectedState, setSelectedState]}
      />

      {loading ? (
        <Loading />
      ) : (
        <>
          <CyDView
            className={
              'flex flex-row items-center justify-start w-full mt-[20px]'
            }>
            {
              <CyDTouchView
                onPress={() => {
                  onPressBack();
                }}
                className='w-[30px] pl-[12px]'>
                <CyDImage
                  source={AppImages.BACK_ARROW_GRAY}
                  className='w-[32px] h-[32px]'
                />
              </CyDTouchView>
            }
            <CyDView
              className={'flex flex-1 flex-row justify-center ml-[-30px]'}>
              {screens.map((screen, index) => {
                return (
                  <CyDView
                    key={index}
                    className={clsx('h-[3px] ml-[6px] w-[20%]', {
                      'bg-paleGrey': index !== screenIndex,
                      'bg-appColor': index === screenIndex,
                    })}
                  />
                );
              })}
            </CyDView>
          </CyDView>
          <CyDKeyboardAwareScrollView className={'h-full flex grow-1'}>
            <CyDScrollView className='mb-[45px]'>
              {screens[screenIndex].component}
            </CyDScrollView>
          </CyDKeyboardAwareScrollView>
        </>
      )}
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
