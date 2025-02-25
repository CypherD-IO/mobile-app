import React, { memo, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import CyDModalLayout from './modal';
import Loading from './loading';
import {
  CyDFastImage,
  CyDImage,
  CyDKeyboardAvoidingView,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
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
  allCountriesSelectedState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
}

const ChooseMultipleCountryModal = ({
  isModalVisible,
  setModalVisible,
  selectedCountryState,
  allCountriesSelectedState,
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
  const [allCountriesSelected, setAllCountriesSelected] =
    allCountriesSelectedState;

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
  }, [copyCountriesWithFlagAndDialcodes, countryFilterText]);

  const handleAllCountriesSelected = (isAllCountriesSelected: boolean) => {
    if (!isAllCountriesSelected) {
      setSelectedCountry([]);
    } else {
      setSelectedCountry(origCountriesWithFlagAndDialcodes);
    }
    setAllCountriesSelected(isAllCountriesSelected);
  };

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
          <CyDView className={'bg-n20 h-[70%] rounded-t-[24px] '}>
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
                <CyDMaterialDesignIcons
                  name={'close'}
                  size={24}
                  className='text-base400 '
                />
              </CyDTouchView>
            </CyDView>
            <CyDTextInput
              className={
                'border-[1px] border-n40 rounded-[8px] p-[10px] mt-[10px] text-[14px] ml-[5%] w-[90%]'
              }
              value={countryFilterText}
              autoCapitalize='none'
              autoCorrect={false}
              onChangeText={text => setCountryFilter(text)}
              placeholder='Search Country'
              placeholderTextColor={Colors.subTextColor}
            />
            <CyDView className='h-[1px] bg-n40 mt-[8px]' />
            <CyDScrollView>
              <CyDView className='mb-[100px]'>
                {countryFilterText === '' && (
                  <CyDView>
                    <CyDTouchView
                      onPress={() => {
                        const isAllCountriesSelected = allCountriesSelected;
                        handleAllCountriesSelected(!isAllCountriesSelected);
                      }}
                      className={clsx(
                        'flex flex-row items-center justify-between px-[16px] py-[4px] my-[6px] mx-[12px] rounded-[8px] bg-n10/80',
                        {
                          'bg-blue20': allCountriesSelected,
                        },
                      )}>
                      <CyDView className={'flex flex-row items-center'}>
                        <CyDText className={'text-[30px]'}>{'🌎'}</CyDText>
                        <CyDText
                          className={'ml-[10px] font-semibold text-[16px]'}>
                          {'All countries'}
                        </CyDText>
                      </CyDView>
                      <CyDView className={'flex flex-row justify-end'}>
                        <CyDView
                          className={clsx(
                            'h-[21px] w-[21px] rounded-[4px] border-[1.5px] border-n40 flex flex-row justify-center items-center',
                            {
                              'bg-p50': allCountriesSelected,
                            },
                          )}>
                          <CyDMaterialDesignIcons
                            name='check-bold'
                            size={18}
                            className='text-n20'
                          />
                        </CyDView>
                      </CyDView>
                    </CyDTouchView>
                  </CyDView>
                )}
                {origCountriesWithFlagAndDialcodes.map(country => {
                  return (
                    <React.Fragment key={country.Iso2}>
                      <CyDTouchView
                        onPress={() => {
                          if (some(selectedCountry, { name: country.name })) {
                            const updatedSelection =
                              reject(selectedCountry, { name: country.name }) ??
                              [];
                            setSelectedCountry(updatedSelection);
                            setAllCountriesSelected(
                              updatedSelection.length ===
                                origCountriesWithFlagAndDialcodes.length,
                            );
                          } else {
                            const updatedSelection = [
                              ...selectedCountry,
                              country,
                            ];
                            setSelectedCountry(updatedSelection);
                            setAllCountriesSelected(
                              updatedSelection.length ===
                                origCountriesWithFlagAndDialcodes.length,
                            );
                          }
                        }}
                        className={clsx(
                          'flex flex-row items-center justify-between px-[16px] my-[6px] mx-[12px] rounded-[8px] bg-n10/80',
                          {
                            'bg-blue20': some(selectedCountry, {
                              name: country.name,
                            }),
                          },
                        )}
                        key={country.Iso2 + country.name}>
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
                          <CyDView
                            className={`h-[21px] w-[21px] ${some(selectedCountry, { name: country.name }) ? 'bg-p50' : ''} rounded-[4px] border-[1.5px] border-n40 flex flex-row justify-center items-center`}>
                            <CyDMaterialDesignIcons
                              name='check-bold'
                              size={18}
                              className='text-n20'
                            />
                          </CyDView>
                        </CyDView>
                      </CyDTouchView>
                      {/* <CyDView
                        key={`${country.Iso2}-divider`}
                        className='h-[1px] bg-[#DFE2E6]'
                      /> */}
                    </React.Fragment>
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
