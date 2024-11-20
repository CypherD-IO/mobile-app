import React, { memo, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import CyDModalLayout from './modal';
import Loading from './loading';
import {
  CyDFastImage,
  CyDImage,
  CyDKeyboardAvoidingView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import axios from '../../core/Http';
import countryMaster from '../../../assets/datasets/countryMaster';
import { Colors } from '../../constants/theme';
import { ICountry } from '../../models/cardApplication.model';
import clsx from 'clsx';
import { StyleSheet } from 'react-native';
import { isAndroid } from '../../misc/checkers';
import { reject, some } from 'lodash';

interface Props {
  isModalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCountryState: [
    ICountry[],
    React.Dispatch<React.SetStateAction<ICountry[]>>,
  ];
}

const ChooseMultipleCountryModal = ({
  isModalVisible,
  setModalVisible,
  selectedCountryState,
}: Props) => {
  const [selectedCountry, setSelectedCountry] = selectedCountryState;
  const [
    copyCountriesWithFlagAndDialcodes,
    setCopyCountriesWithFlagAndDialcodes,
  ] = useState<ICountry[]>([]);
  const [isCountriesDataLoading, setIsCountriesDataLoading] = useState(true);
  const [countryFilterText, setCountryFilter] = useState('');
  const [origCountriesWithFlagAndDialcodes, setOrigCountryList] = useState<
    ICountry[]
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
    if (isModalVisible && copyCountriesWithFlagAndDialcodes.length > 0) {
      const sortedCountries = [...copyCountriesWithFlagAndDialcodes].sort(
        (a, b) => {
          const isASelected = some(selectedCountry, { name: a.name });
          const isBSelected = some(selectedCountry, { name: b.name });

          if (isASelected && !isBSelected) return -1;
          if (!isASelected && isBSelected) return 1;
          if (isASelected && isBSelected) return a.name.localeCompare(b.name);
          return a.name.localeCompare(b.name);
        },
      );
      setOrigCountryList(sortedCountries);
    }
  }, [isModalVisible, copyCountriesWithFlagAndDialcodes]);

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
          <CyDView className={'bg-white h-[70%] rounded-t-[24px] '}>
            <CyDView
              className={
                'flex flex-row justify-between mt-[24px] mx-[5%] items-center'
              }>
              <CyDText className=' text-[16px] font-bold'>
                {'Select Countries'}
              </CyDText>
              <CyDTouchView
                onPress={() => {
                  setModalVisible(false);
                }}
                className={'ml-[18px]'}>
                <CyDFastImage
                  source={AppImages.CLOSE_CIRCLE}
                  className={' w-[22px] h-[22px] z-[50] right-[0px] '}
                />
              </CyDTouchView>
            </CyDView>
            <CyDTextInput
              className={
                'border-[1px] border-inputBorderColor rounded-[8px] p-[10px] mt-[10px] text-[14px] ml-[5%] w-[90%]'
              }
              value={countryFilterText}
              autoCapitalize='none'
              autoCorrect={false}
              onChangeText={text => setCountryFilter(text)}
              placeholder='Search Country'
              placeholderTextColor={Colors.subTextColor}
            />
            <CyDView className='h-[1px] bg-[#DFE2E6] mt-[8px]' />
            <CyDScrollView>
              <CyDView className='mb-[100px]'>
                {origCountriesWithFlagAndDialcodes.map(country => {
                  return (
                    <>
                      <CyDTouchView
                        onPress={() => {
                          if (some(selectedCountry, { name: country.name })) {
                            setSelectedCountry(
                              reject(selectedCountry, { name: country.name }) ??
                                [],
                            );
                          } else {
                            setSelectedCountry([...selectedCountry, country]);
                          }
                        }}
                        className={clsx(
                          'flex flex-row items-center justify-between px-[16px] py-[6px] mx-[12px] rounded-[8px]',
                          {
                            'bg-paleBlue':
                              country.name === selectedCountry?.name,
                          },
                        )}
                        key={country.Iso2}>
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
                          <CyDTouchView
                            onPress={() => {
                              if (
                                some(selectedCountry, { name: country.name })
                              ) {
                                setSelectedCountry(
                                  reject(selectedCountry, {
                                    name: country.name,
                                  }) ?? [],
                                );
                              } else {
                                setSelectedCountry([
                                  ...selectedCountry,
                                  country,
                                ]);
                              }
                            }}
                            className='flex flex-row my-[8px]'>
                            <CyDView
                              className={`h-[21px] w-[21px] ${some(selectedCountry, { name: country.name }) ? 'bg-appColor' : ''} rounded-[4px] border-[1.5px] border-borderColor flex flex-row justify-center items-center`}>
                              <CyDImage
                                source={AppImages.WHITE_CHECK_MARK}
                                className='h-[18px] w-[18px]'
                              />
                            </CyDView>
                          </CyDTouchView>
                        </CyDView>
                      </CyDTouchView>
                      <CyDView className='h-[1px] bg-[#DFE2E6]' />
                    </>
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

export default memo(ChooseMultipleCountryModal);
