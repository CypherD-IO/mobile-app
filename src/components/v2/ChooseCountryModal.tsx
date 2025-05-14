import React, { memo, useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import CyDModalLayout from './modal';
import Loading from './loading';
import {
  CyDFastImage,
  CyDFlatList,
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
import { CountryCodesWithFlags } from '../../models/CountryCodesWithFlags.model';
import countryMaster from '../../../assets/datasets/countryMaster';
import { Colors } from '../../constants/theme';
import { ICountry } from '../../models/cardApplication.model';
import clsx from 'clsx';
import { StyleSheet } from 'react-native';
import { isAndroid } from '../../misc/checkers';
import Fuse from 'fuse.js';
import CyDSkeleton from './skeleton';

interface Props {
  isModalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCountryState: [
    ICountry | undefined,
    React.Dispatch<React.SetStateAction<ICountry | undefined>>,
  ];
  showDialCode?: boolean;
  showRadioButton?: boolean;
  countryListFetchUrl?: string;
}

const ChooseCountryModal = ({
  isModalVisible,
  setModalVisible,
  selectedCountryState,
  showDialCode = true,
  showRadioButton = false,
  countryListFetchUrl = 'https://public.cypherd.io/js/countryMaster.js',
}: Props) => {
  const [selectedCountry, setSelectedCountry] = selectedCountryState;
  const [countryFilterText, setCountryFilter] = useState('');
  const [countries, setCountries] = useState<
    Record<string, CountryCodesWithFlags[]>
  >({
    originalCountries: Array(10).fill({}),
    filteredCountries: Array(10).fill({}),
  });

  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
    keys: ['name', 'symbol'],
  };
  const fuse = new Fuse(countries.originalCountries, searchOptions);

  const getCountryData = async () => {
    try {
      const response = await axios.get(
        `${countryListFetchUrl}?${String(new Date())}`,
      );
      if (response?.data) {
        const countryData = response.data;
        setCountries({
          originalCountries: countryData,
          filteredCountries: countryData,
        });
      } else {
        setCountries({
          originalCountries: countryMaster,
          filteredCountries: countryMaster,
        });
      }
    } catch (error) {
      setCountries({
        originalCountries: countryMaster,
        filteredCountries: countryMaster,
      });
      Sentry.captureException(error);
    }
  };

  useEffect(() => {
    // if (isModalVisible) {
    void getCountryData();
    // }
  }, [isModalVisible]);

  useEffect(() => {
    if (countryFilterText !== '') {
      const filteredCountries = fuse
        .search(countryFilterText)
        .map(country => country.item);
      setCountries({ ...countries, filteredCountries });
    } else {
      setCountries({
        ...countries,
        filteredCountries: countries.originalCountries,
      });
    }
  }, [countryFilterText]);

  const CountryItem = useCallback(
    ({ country }: { country: CountryCodesWithFlags }) => {
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
              'bg-blue20': country.name === selectedCountry?.name,
            },
          )}
          key={country?.name}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDSkeleton height={36} width={36} value={country.unicode_flag}>
              <CyDText className={'text-[36px]'}>
                {country.unicode_flag}
              </CyDText>
            </CyDSkeleton>
            <CyDSkeleton
              height={36}
              width={126}
              value={country.name}
              className='ml-[22px]'>
              <CyDText className={'font-semibold text-[16px]'}>
                {country.name}
              </CyDText>
            </CyDSkeleton>
          </CyDView>
          {showDialCode && (
            <CyDView className={'flex flex-row justify-end'}>
              <CyDSkeleton height={36} width={56} value={country.dial_code}>
                <CyDText
                  className={'text-[14px] font-extrabold text-subTextColor'}>
                  {country.dial_code}
                </CyDText>
              </CyDSkeleton>
            </CyDView>
          )}
          {showRadioButton && (
            <CyDView
              className={
                'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-base100 flex flex-row justify-center items-center'
              }>
              {country.name === selectedCountry?.name ? (
                <CyDView className={'h-[10px] w-[10px] rounded-[5px] bg-p50'} />
              ) : null}
            </CyDView>
          )}
        </CyDTouchView>
      );
    },
    [setSelectedCountry, setModalVisible, selectedCountry],
  );

  return (
    <CyDModalLayout
      setModalVisible={setModalVisible}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDKeyboardAvoidingView
        behavior={isAndroid() ? 'height' : 'padding'}
        className='flex flex-col justify-end h-full'>
        <CyDView className={'bg-n20 h-[70%] rounded-t-[24px]'}>
          <CyDView
            className={'flex flex-row mt-[20px] justify-center items-center'}>
            <CyDTextInput
              className={
                'border-[1px] border-base80 rounded-[8px] p-[10px] text-[14px] w-[80%]'
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
              <CyDMaterialDesignIcons
                name={'close'}
                size={24}
                className='text-base400 z-[50] right-[0px]'
              />
            </CyDTouchView>
          </CyDView>
          {/* <CyDScrollView className={'mt-[12px]'}> */}
          <CyDView className='mb-[100px]'>
            <CyDFlatList
              className={'mt-[10px]'}
              data={countries.filteredCountries}
              keyExtractor={item => item.name}
              renderItem={(item: any) =>
                CountryItem({
                  country: item.item,
                })
              }
              showsVerticalScrollIndicator={false}
            />
            {/* {countries.filteredCountries.map(country => {
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
                    key={country?.name}>
                    <CyDView className={'flex flex-row items-center'}>
                      <CyDSkeleton
                        height={36}
                        width={36}
                        value={country.unicode_flag}>
                        <CyDText className={'text-[36px]'}>
                          {country.unicode_flag}
                        </CyDText>
                      </CyDSkeleton>
                      <CyDSkeleton
                        height={36}
                        width={126}
                        value={country.name}
                        className='ml-[22px]'>
                        <CyDText className={'font-semibold text-[16px]'}>
                          {country.name}
                        </CyDText>
                      </CyDSkeleton>
                    </CyDView>
                    {showDialCode && (
                      <CyDView className={'flex flex-row justify-end'}>
                        <CyDSkeleton
                          height={36}
                          width={56}
                          value={country.dial_code}>
                          <CyDText
                            className={
                              'text-[14px] font-extrabold text-subTextColor'
                            }>
                            {country.dial_code}
                          </CyDText>
                        </CyDSkeleton>
                      </CyDView>
                    )}
                    {showRadioButton && (
                      <CyDView
                        className={
                          'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-base100 flex flex-row justify-center items-center'
                        }>
                        {country.name === selectedCountry?.name ? (
                          <CyDView
                            className={
                              'h-[10px] w-[10px] rounded-[5px] bg-p50'
                            }
                          />
                        ) : null}
                      </CyDView>
                    )}
                  </CyDTouchView>
                );
              })} */}
          </CyDView>
          {/* </CyDScrollView> */}
        </CyDView>
      </CyDKeyboardAvoidingView>
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
