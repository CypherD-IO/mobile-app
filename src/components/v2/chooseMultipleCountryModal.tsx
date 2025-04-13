import React, { memo, useEffect, useState, useRef } from 'react';
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
import { StyleSheet, Animated } from 'react-native';
import { isAndroid } from '../../misc/checkers';
import { reject, some } from 'lodash';
import Button from './button';

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
  onSaveChanges?: () => void;
}

const ChooseMultipleCountryModal = ({
  isModalVisible,
  setModalVisible,
  selectedCountryState,
  allCountriesSelectedState,
  onSaveChanges,
}: Props) => {
  const [selectedCountry, setSelectedCountry] = selectedCountryState;
  const [isFullHeight, setIsFullHeight] = useState(false);
  const heightAnim = useRef(new Animated.Value(80)).current;
  const [backdropOpacity, setBackdropOpacity] = useState(0.5);
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
  const [initialSelectedCountry, setInitialSelectedCountry] = useState<
    ICountry[]
  >([]);
  const [initialAllCountriesSelected, setInitialAllCountriesSelected] =
    useState(false);

  const getCountryMasterWithDialCode = (countries: any[]) => {
    return countries.map(country => ({
      ...country,
      dialCode: country.dial_code, // Map dial_code to dialCode to match ICountry interface
    }));
  };

  const getCountryData = async () => {
    try {
      const response = await axios.get(
        `https://public.cypherd.io/js/countryMaster.js?${String(new Date())}`,
      );
      if (response?.data) {
        const countryData = getCountryMasterWithDialCode(response.data);
        setCopyCountriesWithFlagAndDialcodes(countryData);
        setOrigCountryList(countryData);
        setIsCountriesDataLoading(false);
      } else {
        const countryData = getCountryMasterWithDialCode(countryMaster);
        setCopyCountriesWithFlagAndDialcodes(countryData);
        setOrigCountryList(countryData);
        setIsCountriesDataLoading(false);
      }
    } catch (error) {
      const countryData = getCountryMasterWithDialCode(countryMaster);
      setCopyCountriesWithFlagAndDialcodes(countryData);
      setOrigCountryList(countryData);
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

  // Store initial state when modal opens
  useEffect(() => {
    if (isModalVisible) {
      setInitialSelectedCountry([...selectedCountry]);
      setInitialAllCountriesSelected(allCountriesSelected);
      // If selectedCountry is empty and allCountriesSelected is true, it means "ALL" was selected
      if (selectedCountry.length === 0 && allCountriesSelected) {
        setAllCountriesSelected(true);
      }
    }
  }, [isModalVisible]);

  const handleAllCountriesSelected = (isAllCountriesSelected: boolean) => {
    if (isAllCountriesSelected) {
      setSelectedCountry([]);
      setAllCountriesSelected(true);
    } else {
      setSelectedCountry([]);
      setAllCountriesSelected(false);
    }
  };

  const handleCountrySelect = (country: ICountry) => {
    if (allCountriesSelected) {
      setAllCountriesSelected(false);
      setSelectedCountry([country]);
    } else {
      // Remove duplicates and update selection
      const isSelected = selectedCountry.some(c => c.Iso2 === country.Iso2);
      if (isSelected) {
        const newSelectedCountries = selectedCountry.filter(
          c => c.Iso2 !== country.Iso2,
        );
        setSelectedCountry(newSelectedCountries);
        // If no countries are selected after removal, set allCountriesSelected to false
        if (newSelectedCountries.length === 0) {
          setAllCountriesSelected(false);
        }
      } else {
        setSelectedCountry([...selectedCountry, country]);
      }
    }
  };

  const animateToFullHeight = () => {
    if (!isFullHeight) {
      setIsFullHeight(true);
      setBackdropOpacity(0);

      Animated.timing(heightAnim, {
        toValue: 95,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleScroll = (event: any) => {
    if (event.nativeEvent.contentOffset.y > 0) {
      animateToFullHeight();
    }
  };

  const handleModalClose = () => {
    // Restore initial state when closing without saving
    setSelectedCountry([...initialSelectedCountry]);
    setAllCountriesSelected(initialAllCountriesSelected);
    setIsFullHeight(false);
    setBackdropOpacity(0.5);
    heightAnim.setValue(80);
    setModalVisible(false);
  };

  const handleSaveChanges = () => {
    if (onSaveChanges) {
      // Remove any duplicates before saving
      const uniqueCountries = selectedCountry.filter(
        (country, index, self) =>
          index === self.findIndex(c => c.Iso2 === country.Iso2),
      );
      setSelectedCountry(uniqueCountries);
      onSaveChanges();
    }
    handleModalClose();
  };

  return (
    <CyDModalLayout
      setModalVisible={handleModalClose}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      backdropOpacity={backdropOpacity}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      swipeDirection={['down']}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          handleModalClose();
        }
      }}
      propagateSwipe={true}>
      <CyDKeyboardAvoidingView
        behavior={isAndroid() ? 'height' : 'padding'}
        className='flex flex-col justify-end h-full'>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              height: heightAnim.interpolate({
                inputRange: [80, 95],
                outputRange: ['80%', '100%'],
              }),
            },
          ]}
          className={clsx('bg-n20', {
            'rounded-t-[24px]': !isFullHeight,
          })}>
          <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mt-[16px] mb-[8px]' />

          <CyDView className='flex flex-row justify-between mt-[24px] mx-[5%] items-center'>
            <CyDText className='text-[16px] font-bold'>
              {'Select Countries'}
            </CyDText>
            <CyDTouchView onPress={handleModalClose} className='ml-[18px]'>
              <CyDMaterialDesignIcons
                name='close'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>

          <CyDTextInput
            className='border-[1px] border-n40 rounded-[8px] p-[10px] mt-[10px] text-[14px] ml-[5%] w-[90%]'
            value={countryFilterText}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={text => setCountryFilter(text)}
            placeholder='Search Country'
            placeholderTextColor={Colors.subTextColor}
          />

          <CyDView className='h-[1px] bg-n40 mt-[8px]' />

          <CyDScrollView
            onScroll={handleScroll}
            scrollEventThrottle={16}
            className='flex-1'
            contentContainerClassName='pb-[100px]'>
            {isCountriesDataLoading ? (
              <Loading />
            ) : (
              <CyDView>
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
                      <CyDView className='flex flex-row items-center'>
                        <CyDText className='text-[30px]'>{'🌎'}</CyDText>
                        <CyDText className='ml-[10px] font-semibold text-[16px]'>
                          {'All countries'}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row justify-end'>
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
                  const isSelected =
                    allCountriesSelected ||
                    selectedCountry.some(c => c.Iso2 === country.Iso2);
                  return (
                    <React.Fragment key={country.Iso2}>
                      <CyDTouchView
                        onPress={() => handleCountrySelect(country)}
                        className={clsx(
                          'flex flex-row items-center justify-between px-[16px] my-[6px] mx-[12px] rounded-[8px] bg-n10/80',
                          {
                            'bg-blue20': isSelected,
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
                            className={`h-[21px] w-[21px] ${isSelected ? 'bg-p50' : ''} rounded-[4px] border-[1.5px] border-n40 flex flex-row justify-center items-center`}>
                            <CyDMaterialDesignIcons
                              name='check-bold'
                              size={18}
                              className='text-n20'
                            />
                          </CyDView>
                        </CyDView>
                      </CyDTouchView>
                    </React.Fragment>
                  );
                })}
              </CyDView>
            )}
          </CyDScrollView>

          {/* Sticky Save Changes Button */}
          <CyDView className='absolute bottom-0 left-0 right-0 px-[16px] py-[16px] bg-n20 border-t-[1px] border-n40 pb-[32px]'>
            <Button
              title={`Save Changes${allCountriesSelected ? ' (All)' : selectedCountry.length ? ` (${selectedCountry.length})` : ''}`}
              onPress={handleSaveChanges}
              disabled={!allCountriesSelected && selectedCountry.length === 0}
            />
          </CyDView>
        </Animated.View>
      </CyDKeyboardAvoidingView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
});

export default memo(ChooseMultipleCountryModal);
