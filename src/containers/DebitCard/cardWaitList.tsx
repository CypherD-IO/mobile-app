import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import axios from '../../core/Http';
import { isAndroid } from '../../misc/checkers';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { hostWorker } from '../../global';
import { isValidEmailID, HdWalletContext } from '../../core/util';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import clsx from 'clsx';
import CyDModalLayout from '../../components/v2/modal';
import { CountryCodesWithFlags } from '../../models/CountryCodesWithFlags.model';
import Loading from '../../components/v2/loading';
import { countryMaster } from '../../../assets/datasets/countryMaster';
import { Colors } from '../../constants/theme';

const cardBenefits = [
  'Instantly swap crypto to USD',
  'Receive free lifetime access',
  'Spend crypto from 11 different chains - more coming soon!',
  'Use your card anywhere in the world',
];

export default function CardWailtList({ navigation }) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const [joiningWaitlist, setJoiningWaitlist] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const hdWallet = useContext<any>(HdWalletContext);
  const [isValidUserEmail, setIsValidUserEmail] = useState<boolean>(false);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [showWaitlist, setShowWaitlist] = useState<boolean>(false);
  const [countryFilterText, setCountryFilter] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<{
    name?: string;
    dialCode?: string;
    flag?: string;
    Iso2?: string;
    Iso3?: string;
    currency?: string;
  }>({
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    Iso2: 'US',
    Iso3: 'USA',
    currency: 'USD',
  });
  const [
    copyCountriesWithFlagAndDialcodes,
    setCopyCountriesWithFlagAndDialcodes,
  ] = useState<CountryCodesWithFlags[]>([]);
  const [isCountriesDataLoading, setIsCountriesDataLoading] = useState(true);
  const [origCountriesWithFlagAndDialcodes, setOrigCountryList] = useState<
    CountryCodesWithFlags[]
  >([]);
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();

  const ethereum = hdWallet.state.wallet.ethereum;

  useEffect(() => {
    if (countryFilterText === '') {
      setOrigCountryList(copyCountriesWithFlagAndDialcodes);
    } else {
      const filteredCountries = copyCountriesWithFlagAndDialcodes.filter(
        (country) =>
          country.name.toLowerCase().includes(countryFilterText.toLowerCase())
      );
      setOrigCountryList(filteredCountries);
    }
  }, [countryFilterText]);

  useEffect(() => {
    void getCountryData();
  }, []);

  const getCountryData = async () => {
    try {
      const response = await axios.get(
        'https://public.cypherd.io/js/countryMaster.js'
      );
      if (response?.data) {
        const countryData = response.data;
        setCopyCountriesWithFlagAndDialcodes(countryData);
        setOrigCountryList(countryData);
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

  async function joinWaitlist() {
    if (userEmail && userEmail !== '') {
      if (isValidEmailID(userEmail)) {
        try {
          setIsValidUserEmail(true);
          setJoiningWaitlist(true);
          const payload = {
            email: userEmail,
            ethAddress: ethereum.address,
            country: selectedCountry.Iso2,
          };
          const response = await axios.post(
            `${ARCH_HOST}/v1/cards/waitlist`,
            payload
          );
          if (
            response.status === 201 &&
            (response.data.status === 'REGISTERED' ||
              response.data.status === 'PRESENT')
          ) {
            setJoiningWaitlist(false);
            showModal('state', {
              type: 'success',
              title: '',
              description: t('JOIN_WAITLIST_SUCCESS_TOAST'),
              onSuccess: () => {
                setShowWaitlist(false);
                setUserEmail('');
                hideModal();
              },
              onFailure: hideModal,
            });
          }
        } catch (error) {
          Sentry.captureException(error);
          setJoiningWaitlist(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: t('JOINING_WAITLIST_ERROR'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        setJoiningWaitlist(false);
        setIsValidUserEmail(false);
      }
    } else {
      showModal('state', {
        type: 'error',
        title: '',
        description: t('EMPTY_EMAIL_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  }

  const onCountryUpdate = () => {
    // if (selectedCountry.name === 'United States') {
    //   navigation.navigate(C.screenTitle.CARD_SIGNUP_LANDING_SCREEN, { navigation, selectedCountry });
    // } else {
    setShowWaitlist(true);
    // }
  };

  return (
    <CyDScrollView className='flex-1 pt-[32px] bg-white'>
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        {isCountriesDataLoading ? (
          <Loading />
        ) : (
          <CyDView className='flex flex-col justify-end h-full'>
            <CyDView className={'bg-white h-[50%] rounded-t-[20px]'}>
              <CyDView
                className={
                  'flex flex-row mt-[20px] justify-center items-center'
                }
              >
                <CyDTextInput
                  className={
                    'border-[1px] border-inputBorderColor rounded-[50px] p-[10px] text-[14px] w-[80%] font-nunito text-primaryTextColor'
                  }
                  value={countryFilterText}
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={(text) => setCountryFilter(text)}
                  placeholder='Search Country'
                  placeholderTextColor={Colors.subTextColor}
                />
                <CyDTouchView
                  onPress={() => {
                    setModalVisible(false);
                  }}
                  className={'ml-[18px]'}
                >
                  <CyDImage
                    source={AppImages.CLOSE}
                    className={' w-[22px] h-[22px] z-[50] right-[0px] '}
                  />
                </CyDTouchView>
              </CyDView>
              <CyDScrollView className={'mt-[12px]'}>
                <CyDView className='mb-[100px]'>
                  {origCountriesWithFlagAndDialcodes.map((country) => {
                    return (
                      <CyDTouchView
                        onPress={() => {
                          setSelectedCountry({
                            ...selectedCountry,
                            name: country.name,
                            dialCode: country.dial_code,
                            flag: country.unicode_flag,
                            Iso2: country.Iso2,
                            Iso3: country.Iso3,
                            currency: country.currency,
                          });
                          setModalVisible(false);
                        }}
                        className={clsx(
                          'flex flex-row items-center justify-between px-[16px] py-[6px] mx-[12px] rounded-[26px]',
                          {
                            'bg-paleBlue':
                              country.name === selectedCountry.name,
                          }
                        )}
                        key={country.name}
                      >
                        <CyDView className={'flex flex-row items-center'}>
                          <CyDText className={'text-[36px]'}>
                            {country.unicode_flag}
                          </CyDText>
                          <CyDText
                            className={'ml-[10px] font-semibold text-[16px]'}
                          >
                            {country.name}
                          </CyDText>
                        </CyDView>
                        <CyDView className={'flex flex-row justify-end'}>
                          <CyDText
                            className={
                              'text-[14px] font-extrabold text-subTextColor'
                            }
                          >
                            {country.dial_code}
                          </CyDText>
                        </CyDView>
                      </CyDTouchView>
                    );
                  })}
                </CyDView>
              </CyDScrollView>
            </CyDView>
          </CyDView>
        )}
      </CyDModalLayout>
      <CyDView className={'w-screen'}>
        <CyDText
          className={'text-center font-bold text-[22px] mt-[20px] mb-[10px]'}
        >
          {t<string>('SIGNUP_CARD_WAITLIST_TITLE')}
        </CyDText>
        {/* <CyDText className={'text-center font-bold text-[14px] mt-[-6px] mb-[6px]'}>{`(${t('AVAILABLE_ONLY_IN_USA')})`}</CyDText> */}
        <CyDView>
          <CyDView className={'flex items-center text-center z-50'}>
            <CyDImage source={AppImages.DEBIT_SHOW_CARD} />
          </CyDView>
          <CyDView
            className={
              'flex justify-center items-center text-center relative mt-[-130px]'
            }
          >
            <CyDView
              className={
                'w-[85%] bg-white px-[50px] pt-[100px] pb-[30px] rounded-[18px] shadow-lg'
              }
            >
              {!showWaitlist ? (
                <>
                  <CyDTouchView
                    className={
                      'mt-[5px] mb-[5px] border-[1px] border-inputBorderColor py-[12px] px-[10px] rounded-[5px] flex w-[100%]'
                    }
                    onPress={() => setModalVisible(true)}
                  >
                    <CyDView
                      className={clsx(
                        'flex flex-row justify-between items-center',
                        { 'border-redOffColor': !selectedCountry }
                      )}
                    >
                      <CyDView className={'flex flex-row items-center'}>
                        <CyDText
                          className={
                            'text-center text-black font-nunito text-[18px] ml-[8px]'
                          }
                        >
                          {selectedCountry.flag} {selectedCountry.name}
                        </CyDText>
                      </CyDView>
                      <CyDImage source={AppImages.DOWN_ARROW} />
                    </CyDView>
                  </CyDTouchView>
                  <Button
                    onPress={() => {
                      onCountryUpdate();
                    }}
                    loading={joiningWaitlist}
                    style={'rounded-[8px] h-[50px] my-[15px]'}
                    title={t<string>('CONTINUE_ALL_CAPS')}
                  ></Button>
                </>
              ) : (
                <CyDView>
                  <CyDTextInput
                    value={userEmail}
                    textContentType='emailAddress'
                    autoFocus={true}
                    keyboardType='email-address'
                    autoCapitalize='none'
                    autoCorrect={false}
                    onChangeText={(text: string) => {
                      setUserEmail(text);
                      setIsValidUserEmail(true);
                    }}
                    placeholderTextColor={'#C5C5C5'}
                    className={clsx(
                      'border-[1px] border-[#C5C5C5] h-[50px] rounded-[8px] text-center text-black',
                      {
                        'pb-[10px]': isAndroid(),
                      }
                    )}
                    placeholder='Enter your email'
                  ></CyDTextInput>
                  <Button
                    disabled={!isValidUserEmail && userEmail !== ''}
                    onPress={async () => await joinWaitlist()}
                    loading={joiningWaitlist}
                    style={'rounded-[8px] h-[50px] mt-[20px]'}
                    title={t<string>('CTA_JOIN_WAITLIST')}
                  />
                  {!isValidUserEmail && userEmail !== '' && (
                    <CyDText className='text-center mt-[18px] mb-[-28px] text-red-500'>
                      {t<string>('VALID_EMAIL_ERROR')}
                    </CyDText>
                  )}
                  <CyDView className={'flex flex-row justify-between'}>
                    <CyDTouchView
                      className={'mt-[20px]'}
                      onPress={() => setShowWaitlist(false)}
                    >
                      <CyDText
                        className={
                          'text-center text-blue-700 underline underline-offset-2'
                        }
                      >
                        {t<string>('BACK')}
                      </CyDText>
                    </CyDTouchView>
                    <CyDTouchView
                      className={'mt-[20px]'}
                      onPress={() =>
                        navigation.navigate(C.screenTitle.BROWSER, {
                          screen: C.screenTitle.BROWSER_SCREEN,
                          params: {
                            url: 'https://app.cypherwallet.io/#/?cardSignup=true',
                          },
                        })
                      }
                    >
                      <CyDText
                        className={
                          'text-center text-blue-700 underline underline-offset-2 font-semibold'
                        }
                      >
                        {t<string>('I_HAVE_AN_INVITE_CODE')}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                </CyDView>
              )}
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
      <CyDView>
        <CyDText className={'mt-[25px] mx-[40px] text-[20px] font-bold'}>
          {t<string>('CARD_WAITLIST_PAGE_CAPTION')}
        </CyDText>
      </CyDView>
      <CyDView className={'mx-[40px] my-[10px]'}>
        {cardBenefits.map((item) => {
          return (
            <CyDView className={'flex flex-row my-[4px]'} key={item}>
              <CyDImage
                className={'mt-[6px]'}
                source={AppImages.RIGHT_ARROW_BULLET}
              />
              <CyDText className={'ml-[10px] leading-[25px]'}>{item}</CyDText>
            </CyDView>
          );
        })}
      </CyDView>
      <CyDView className={'flex items-center text-center'}>
        <CyDImage
          source={AppImages.DOTS_ILLUSTRATION}
          className={'w-[200px] h-[90px]'}
        />
      </CyDView>
    </CyDScrollView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
