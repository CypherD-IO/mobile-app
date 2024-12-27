/**
 * @format
 * @flow
 */
import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import BottomTracker from '../../components/BottomTracker';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { ButtonWithOutImage } from '../Auth/Share';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { DynamicTouchView } from '../../styles/viewStyle';
import moment from 'moment';
import { Platform, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { HdWalletContext } from '../../core/util';
import axios from '../../core/Http';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../global';
const {
  SafeAreaView,
  DynamicView,
  DynamicImage,
  CText,
  WebsiteInput,
} = require('../../styles');

export default function personalDetailScreen(props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [line1, setLine1] = useState<string>('');
  const [line2, setLine2] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [ssn, setSSN] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [value, setValue] = useState(null);
  const hdWallet = useContext<any>(HdWalletContext);
  const ethereum = hdWallet.state.wallet.ethereum;

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  const submitUserDetails = () => {
    setErrorMessage('');
    axios
      .post(
        `${PORTFOLIO_HOST}/v1/card/mobile/submit_user_details`,
        {
          address: ethereum.address,
          email,
          dob: birthDate,
          fname: firstName,
          lname: lastName,
          street_one: line1,
          street_two: line2,
          city,
          state,
          postal_code: zipCode,
          ssn_id: ssn,
        },
        { headers: { uuid: hdWallet.state.pre_card_token }, timeout: 30000 },
      )
      .then(function (response) {
        if (response.status === 200) {
          analytics().logEvent('user_success', { from: ethereum.address });
          props.navigation.navigate(C.screenTitle.LEGAL_AGREEMENT_SCREEN);
        }
      })
      .catch(function (error) {
        // handle error
        Sentry.captureException(error);
        const message = error.response.data?.message;
        setError(true);
        setErrorMessage(message);
      });
  };

  // NOTE: HELPER METHOD 🍎🍎🍎🍎

  const stateName = [
    { label: 'Alabama', value: 'AL' },
    { label: 'Alaska', value: 'AK' },
    { label: 'Arizona', value: 'AZ' },
    { label: 'Arkansas', value: 'AR' },
    { label: 'California', value: 'CA' },
    { label: 'Colorado', value: 'CO' },
    { label: 'Connecticut', value: 'CT' },
    { label: 'Delaware', value: 'DE' },
    { label: 'District Of Columbia', value: 'DC' },
    { label: 'Florida', value: 'FL' },
    { label: 'Georgia', value: 'GA' },
    { label: 'Hawaii', value: 'HI' },
    { label: 'Idaho', value: 'ID' },
    { label: 'Illinois', value: 'IL' },
    { label: 'Indiana', value: 'IN' },
    { label: 'Iowa', value: 'IA' },
    { label: 'Kansas', value: 'KS' },
    { label: 'Kentucky', value: 'KY' },
    { label: 'Louisiana', value: 'LA' },
    { label: 'Maine', value: 'ME' },
    { label: 'Maryland', value: 'MD' },
    { label: 'Massachusetts', value: 'MA' },
    { label: 'Michigan', value: 'MI' },
    { label: 'Minnesota', value: 'MN' },
    { label: 'Mississippi', value: 'MS' },
    { label: 'Missouri', value: 'MO' },
    { label: 'Montana', value: 'MT' },
    { label: 'Nebraska', value: 'NE' },
    { label: 'Nevada', value: 'NV' },
    { label: 'New Hampshire', value: 'NH' },
    { label: 'New Jersey', value: 'NJ' },
    { label: 'New Mexico', value: 'NM' },
    { label: 'New York', value: 'NY' },
    { label: 'North Carolina', value: 'NC' },
    { label: 'North Dakota', value: 'ND' },
    { label: 'Ohio', value: 'OH' },
    { label: 'Oklahoma', value: 'OK' },
    { label: 'Oregon', value: 'OR' },
    { label: 'Pennsylvania', value: 'PA' },
    { label: 'Rhode Island', value: 'RI' },
    { label: 'South Carolina', value: 'SC' },
    { label: 'South Dakota', value: 'SD' },
    { label: 'Tennessee', value: 'TN' },
    { label: 'Texas', value: 'TX' },
    { label: 'Utah', value: 'UT' },
    { label: 'Vermont', value: 'VT' },
    { label: 'Virginia', value: 'VA' },
    { label: 'Washington', value: 'WA' },
    { label: 'West Virginia', value: 'WV' },
    { label: 'Wisconsin', value: 'WI' },
    { label: 'Wyoming', value: 'WY' },
  ];

  const checkError = () => {
    if (firstName.trim() == '') {
      setError(true);
      setErrorMessage(t('FIRSTNAME_ERROR'));
      return false;
    }
    if (lastName.trim() === '') {
      setError(true);
      setErrorMessage(t('LASTNAME_ERROR'));
      return false;
    }
    if (email.trim() === '' || !emailValidate()) {
      setError(true);
      setErrorMessage(t('EMAIL_ERROR'));
      return false;
    }
    if (line1.trim() === '') {
      setError(true);
      setErrorMessage(t('LINE1_ERROR'));
      return false;
    }
    if (zipCode.trim() === '') {
      setError(true);
      setErrorMessage(t('ZIPCODE_ERROR'));
      return false;
    }
    if (city.trim() === '') {
      setError(true);
      setErrorMessage(t('CITY_ERROR'));
      return false;
    }
    if (state?.trim() === '') {
      setError(true);
      setErrorMessage(t('STATE_ERROR'));
      return false;
    }
    if (birthDate.trim() === '') {
      setError(true);
      setErrorMessage(t('BIRTHDATE_ERROR'));
      return false;
    }
    if (ssn.trim() === '' || ssn.length !== 9) {
      setError(true);
      setErrorMessage(t('SSN_ERROR'));
      return false;
    }
    return true;
  };

  const emailValidate = () => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (!reg.test(email)) {
      setError(true);
      setErrorMessage(t('EMAIL_ERROR'));
      return false;
    }
    return true;
  };

  const onContinue = () => {
    if (checkError()) {
      submitUserDetails();
    }
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = date => {
    setError(false);
    const birthDate = moment(date).format('YYYY-MM-DD');
    setBirthDate(birthDate);
    hideDatePicker();
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <KeyboardAwareScrollView extraScrollHeight={100}>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode='date'
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
          maximumDate={new Date()}
          display={Platform.OS == 'android' ? 'default' : 'inline'}
        />
        <DynamicView
          dynamic
          dynamicWidth
          dynamicHeight
          height={100}
          width={100}
          jC='flex-start'
          aLIT={'flex-start'}>
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={100}
            width={100}
            pH={30}
            jC='flex-start'
            aLIT={'flex-start'}>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={22}
              mT={10}
              color={Colors.primaryTextColor}>
              {t('PERSONAL_DETAIL')}
            </CText>
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={15}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setFirstName(text);
                  setError(false);
                }}
                value={firstName}
                placeholderTextColor={Colors.subTextColor}
                placeholder='First Name'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setLastName(text);
                  setError(false);
                }}
                value={lastName}
                placeholderTextColor={Colors.subTextColor}
                placeholder='Last Name'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setEmail(text);
                  setError(false);
                }}
                value={email}
                placeholderTextColor={Colors.subTextColor}
                placeholder='Email'
                keyboardType='email-address'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={22}
              mT={20}
              color={Colors.primaryTextColor}>
              {t('PERSONAL_INFO')}
            </CText>
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setSSN(text);
                  setError(false);
                }}
                value={ssn}
                keyboardType='number-pad'
                placeholderTextColor={Colors.subTextColor}
                placeholder='SSN'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            <DynamicTouchView
              sentry-label='card-date-picker'
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}
              onPress={() => showDatePicker()}>
              <CText
                dynamic
                fF={
                  birthDate == ''
                    ? C.fontsName.FONT_BOLD
                    : C.fontsName.FONT_REGULAR
                }
                mL={10}
                fS={13}
                mT={10}
                color={birthDate == '' ? Colors.base20 : 'black'}>
                {birthDate == '' ? t('Birth date') : birthDate}
              </CText>
              <DynamicImage
                dynamic
                dynamicWidthFix
                mT={Platform.OS == 'android' ? 12 : 6}
                mR={8}
                height={20}
                width={20}
                resizemode='contain'
                source={AppImages.BIRTHDATE}
              />
            </DynamicTouchView>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={22}
              mT={20}
              color={Colors.primaryTextColor}>
              {t('HOME_ADDRESS')}
            </CText>
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setLine1(text);
                  setError(false);
                }}
                value={line1}
                placeholderTextColor={Colors.subTextColor}
                placeholder='Street Address Line 1'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setLine2(text);
                  setError(false);
                }}
                value={line2}
                placeholderTextColor={Colors.subTextColor}
                placeholder='Street Address Line 2'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setCity(text);
                  setError(false);
                }}
                value={city}
                placeholderTextColor={Colors.subTextColor}
                placeholder='City'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            <Dropdown
              style={[
                styles.dropdown,
                isFocus && { borderColor: Colors.primaryTextColor },
              ]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              data={stateName}
              search
              maxHeight={300}
              labelField='label'
              valueField='value'
              placeholder={!isFocus ? 'Select State' : ''}
              searchPlaceholder='Search...'
              value={value}
              onFocus={() => setIsFocus(true)}
              onBlur={() => setIsFocus(false)}
              onChange={item => {
                setValue(item.value);
                setState(item.value);
                setError(false);
                setIsFocus(false);
              }}
            />
            <DynamicView
              dynamic
              fD={'row'}
              bO={0.5}
              bR={5}
              bC={Colors.base20}
              mT={20}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}>
              <WebsiteInput
                onChangeText={text => {
                  setZipCode(text);
                  setError(false);
                }}
                value={zipCode}
                keyboardType='number-pad'
                placeholderTextColor={Colors.subTextColor}
                placeholder='Postal Code'
                style={{
                  width: '75%',
                  height: 35,
                  color: 'black',
                }}
              />
            </DynamicView>
            {error && (
              <CText
                dynamic
                fF={C.fontsName.FONT_REGULAR}
                fS={14}
                mT={20}
                color={Colors.red}>
                {errorMessage}
              </CText>
            )}
            <DynamicView
              dynamic
              dynamicWidth
              dynamicHeight
              height={10}
              width={100}
              jC='center'
              aLIT={'center'}>
              <ButtonWithOutImage
                sentry-label='card-enter-personal-details'
                wT={100}
                bR={10}
                fE={C.fontsName.FONT_BOLD}
                hE={45}
                mT={25}
                bG={Colors.appColor}
                vC={Colors.appColor}
                text={t('NEXT')}
                onPress={() => {
                  onContinue();
                }}
              />
            </DynamicView>
            <DynamicView
              dynamic
              fD={'row'}
              bR={5}
              bC={Colors.base20}
              mT={50}
              dynamicHeightFix
              dynamicWidth
              height={40}
              width={100}
              aLIT={'flex-start'}
            />
          </DynamicView>
        </DynamicView>
      </KeyboardAwareScrollView>
      <DynamicView dynamic style={{ position: 'absolute', bottom: 0 }}>
        <BottomTracker index={3} />
      </DynamicView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    marginTop: 20,
    height: 50,
    borderColor: Colors.primaryTextColor,
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    width: '100%',
  },
  placeholderStyle: {
    fontSize: 16,
    color: 'gray',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});
