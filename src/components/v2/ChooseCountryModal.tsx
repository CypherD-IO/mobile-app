import React, { memo, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import CyDModalLayout from './modal';
import Loading from './loading';
import {
  CyDFastImage,
  CyDKeyboardAvoidingView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import axios from '../../core/Http';
import { CountryCodesWithFlags } from '../../models/CountryCodesWithFlags.model';
import countryMaster from '../../../assets/datasets/countryMaster';
import { Colors } from '../../constants/theme';
import { ICountry } from '../../models/cardApplication.model';
import clsx from 'clsx';
import { StyleSheet } from 'react-native';
import { isAndroid } from '../../misc/checkers';

interface Props {
  isModalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCountryState: [
    ICountry | undefined,
    React.Dispatch<React.SetStateAction<ICountry | undefined>>,
  ];
  showDialCode?: boolean;
  showRadioButton?: boolean;
}

const ChooseCountryModal = ({
  isModalVisible,
  setModalVisible,
  selectedCountryState,
  showDialCode = true,
  showRadioButton = false,
}: Props) => {
  const [selectedCountry, setSelectedCountry] = selectedCountryState;

  const [
    copyCountriesWithFlagAndDialcodes,
    setCopyCountriesWithFlagAndDialcodes,
  ] = useState<CountryCodesWithFlags[]>([]);
  const [isCountriesDataLoading, setIsCountriesDataLoading] = useState(true);
  const [countryFilterText, setCountryFilter] = useState('');
  const [origCountriesWithFlagAndDialcodes, setOrigCountryList] = useState<
    CountryCodesWithFlags[]
  >([]);

  const getCountryData = async () => {
    try {
      const response = await axios.get(
        `https://public.cypherd.io/js/countryMaster.js?${String(new Date())}`,
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

  useEffect(() => {
    void getCountryData();
  }, []);

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
  }, [copyCountriesWithFlagAndDialcodes, countryFilterText]);

  return (
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
          <CyDView className={'bg-white h-[70%] rounded-t-[24px]'}>
            <CyDView
              className={'flex flex-row mt-[20px] justify-center items-center'}>
              <CyDTextInput
                className={
                  'border-[1px] border-inputBorderColor rounded-[8px] p-[10px] text-[14px] w-[80%]  text-primaryTextColor'
                }
                value={countryFilterText}
                autoCapitalize='none'
                autoCorrect={false}
                onChangeText={text => setCountryFilter(text)}
                placeholder='Search Country'
                placeholderTextColor={Colors.subTextColor}
              />
              <CyDTouchView
                onPress={() => {
                  setModalVisible(false);
                }}
                className={'ml-[18px]'}>
                <CyDFastImage
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
                        setSelectedCountry({
                          ...selectedCountry,
                          name: country.name,
                          dialCode: country.dial_code ?? '',
                          flag: country.unicode_flag,
                          Iso2: country.Iso2 ?? '',
                          Iso3: country.Iso3 ?? '',
                          currency: country.currency ?? '',
                          unicode_flag: country.unicode_flag ?? '',
                        });
                        setModalVisible(false);
                      }}
                      className={clsx(
                        'flex flex-row items-center justify-between px-[16px] py-[6px] mx-[12px] rounded-[8px]',
                        {
                          'bg-paleBlue': country.name === selectedCountry?.name,
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
                      {showDialCode && (
                        <CyDView className={'flex flex-row justify-end'}>
                          <CyDText
                            className={
                              'text-[14px] font-extrabold text-subTextColor'
                            }>
                            {country.dial_code}
                          </CyDText>
                        </CyDView>
                      )}
                      {showRadioButton && (
                        <CyDView
                          className={
                            'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-borderColor flex flex-row justify-center items-center'
                          }>
                          {country.name === selectedCountry?.name ? (
                            <CyDView
                              className={
                                'h-[10px] w-[10px] rounded-[5px] bg-appColor'
                              }
                            />
                          ) : null}
                        </CyDView>
                      )}
                    </CyDTouchView>
                  );
                })}
              </CyDView>
            </CyDScrollView>
          </CyDView>
        </CyDKeyboardAvoidingView>
      )}
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default memo(ChooseCountryModal);
