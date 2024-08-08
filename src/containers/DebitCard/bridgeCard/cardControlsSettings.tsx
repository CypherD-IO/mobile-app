import React, { useEffect, useState } from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDSwitch,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import {
  ButtonType,
  CARD_LIMIT_TYPE,
  CardControlTypes,
  ImagePosition,
} from '../../../constants/enum';
import ChooseMultipleCountryModal from '../../../components/v2/chooseMultipleCountryModal';
import { ICountry } from '../../../models/cardApplication.model';
import useAxios from '../../../core/HttpRequest';
import { compact, get } from 'lodash';
import EditLimitModal from './editLimitModal';
import { Loader } from '../../../components/v2/walletConnectV2Views/SigningModals/SigningModalComponents';
import { t } from 'i18next';
import axios from '../../../core/Http';

export default function CardControlsSettings({ route, navigation }) {
  const { cardControlType, currentCardProvider, card } = route.params;
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countries, setCountries] = useState([]);
  const [allowedCountries, setAllowedCountries] = useState([]);
  const { getWithAuth, patchWithAuth, getWithoutAuth } = useAxios();
  const [limits, setLimits] = useState();
  const [limitsByControlType, setLimitsByControlType] = useState({
    pos: 0,
    tap: 0,
    atm: 0,
    ecom: 0,
    wal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editModalData, setEditModalData] = useState({
    isEditLimitModalVisible: false,
    limitType: CARD_LIMIT_TYPE.ATM,
    limit: 0,
  });

  const defaultAtmLimit = 2000;

  useEffect(() => {
    void fetchCountriesList();
    void getCardLimits();
  }, []);

  const fetchCountriesList = async () => {
    const response = await axios.get(
      `https://public.cypherd.io/js/countryMaster.js?${String(new Date())}`,
    );
    if (response?.data) {
      const tempCountries = response.data;
      setCountries(tempCountries);
    }
  };

  useEffect(() => {
    const tempCountryList = get(limits, ['cusL', cardControlType, 'cLs'], []);
    if (tempCountryList.length) {
      const tempAllowedCountries = countries.filter(country => {
        return tempCountryList.includes(country.Iso2);
      });
      setAllowedCountries(tempAllowedCountries);
    }
  }, [limits, countries]);

  useEffect(() => {
    if (allowedCountries.length) {
      const postData = async () => {
        try {
          void updateAllowedCountries();
        } catch (error) {}
      };

      // Debounce the API call
      const timer = setTimeout(() => {
        void postData();
      }, 2000);

      // Cleanup previous timer
      return () => clearTimeout(timer);
    }
  }, [allowedCountries]);

  const updateAllowedCountries = async () => {
    const countryList = allowedCountries?.map((country, index) => {
      return country.Iso2;
    });

    const payload = {
      cusL: {
        ...get(limits, 'cusL'),
        intl: {
          ...get(limits, ['cusL', cardControlType]),
          cLs: compact(countryList),
        },
      },
    };
    const response = await patchWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/limits`,
      payload,
    );
    if (response.isError) {
      await errorModal({
        titleText:
          response.error.message ?? 'Error while updating allowed cuntries',
      });
    }
  };

  const initiateEditLimit = (limitType: string) => {
    console.group(
      'mimit type : ',
      limitType,
      get(limitsByControlType, limitType) === 0,
    );
    if (get(limitsByControlType, limitType) === 0) {
      if (limitType === CARD_LIMIT_TYPE.ATM) {
        void editLimit(limitType, defaultAtmLimit);
      } else {
        void editLimit(limitType, get(limits, ['planLimit', 'd'], 0));
      }
    } else {
      void editLimit(limitType, 0);
    }
  };

  const openEditLimitModal = (limitType: CARD_LIMIT_TYPE) => {
    setEditModalData({
      isEditLimitModalVisible: true,
      limitType,
      limit: get(limitsByControlType, limitType, 0),
    });
  };

  const editLimit = async (limitType: string, newLimit: number) => {
    const payload = {
      cusL: {
        ...get(limits, 'cusL'),
        [cardControlType]: {
          ...get(limits, ['cusL', cardControlType]),
          [limitType]: newLimit,
        },
      },
    };
    const response = await patchWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/limits`,
      payload,
    );
    if (!response.isError) {
      void getCardLimits();
    }
  };

  const getCardLimits = async () => {
    setLoading(true);
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/limits`,
    );

    if (!response.isError) {
      setLimits(response.data);
    }
    setLoading(false);
  };

  const getEditModalTitleByLimitType = () => {
    switch (editModalData.limitType) {
      case CARD_LIMIT_TYPE.ONLINE:
        return t('ONLINE_TRANSACTIONS');
      case CARD_LIMIT_TYPE.CONTACTLESS:
        return t('CONTACTLESS_TRANSACTIONS');
      case CARD_LIMIT_TYPE.CARD_PIN:
        return t('CARD_PIN_TRANSACTIONS');
      case CARD_LIMIT_TYPE.MOBILE_WALLET:
        return t('MOBILE_WALLETS');
      default:
        return t('ONLINE_TRANSACTIONS');
    }
  };

  const getAllowedCountiesText = () => {
    if (allowedCountries.length > 2) {
      return `${allowedCountries[0].name}, ${allowedCountries[1].name} + ${allowedCountries.length - 2}`;
    } else if (allowedCountries.length === 2) {
      return `${allowedCountries[0].name}, ${allowedCountries[1].name}`;
    } else if (allowedCountries.length === 1) {
      return `${allowedCountries[0].name}`;
    } else {
      return 'All Countries';
    }
  };

  useEffect(() => {
    setLimitsByControlType({
      pos: get(limits, ['cusL', cardControlType, CARD_LIMIT_TYPE.CARD_PIN], 0),
      tap: get(
        limits,
        ['cusL', cardControlType, CARD_LIMIT_TYPE.CONTACTLESS],
        0,
      ),
      atm: get(limits, ['cusL', cardControlType, CARD_LIMIT_TYPE.ATM], 0),
      wal: get(
        limits,
        ['cusL', cardControlType, CARD_LIMIT_TYPE.MOBILE_WALLET],
        0,
      ),
      ecom: get(limits, ['cusL', cardControlType, CARD_LIMIT_TYPE.ONLINE], 0),
    });
  }, [limits]);

  return loading ? (
    <Loader />
  ) : (
    <>
      <CyDSafeAreaView className={'h-full bg-cardBgFrom pt-[10px]'}>
        <ChooseMultipleCountryModal
          isModalVisible={countryModalVisible}
          setModalVisible={setCountryModalVisible}
          selectedCountryState={[allowedCountries, setAllowedCountries]}
        />
        <EditLimitModal
          isModalVisible={editModalData.isEditLimitModalVisible}
          setShowModal={(isModalVisible: boolean) => {
            setEditModalData({
              ...editModalData,
              isEditLimitModalVisible: isModalVisible,
            });
          }}
          title={getEditModalTitleByLimitType()}
          currentLimit={editModalData.limit}
          onChangeLimit={(newLimit: number) => {
            setEditModalData({
              ...editModalData,
              isEditLimitModalVisible: false,
            });
            void editLimit(editModalData.limitType, newLimit);
          }}
        />

        <CyDScrollView>
          <CyDView className='mx-[16px] mt-[16px]'>
            {cardControlType === CardControlTypes.INTERNATIONAL && (
              <CyDView className='bg-white flex flex-col px-[12px] py-[12px] mb-[12px] rounded-[8px]'>
                <CyDView className='flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.COUNTRIES}
                    className='h-[32px] w-[32px] mr-[8px]'
                  />
                  <CyDText className='text-[16px] font-semibold mt-[4px]'>
                    {'Countries'}
                  </CyDText>
                </CyDView>
                <CyDView className='felx flex-row items-center justify-between mt-[12px]'>
                  <CyDText className='text-[12px] text-n200'>
                    {'Selected Countries'}
                  </CyDText>
                  <CyDText className='text-[12px] text-n200'>{`Total Countries: ${countries.length}`}</CyDText>
                </CyDView>
                <CyDTouchView
                  className='flex flex-row justify-between items-center rounded-[8px] border-[1px] border-b400 p-[12px] mt-[6px]'
                  onPress={() => {
                    setCountryModalVisible(true);
                  }}>
                  <CyDView>
                    <CyDText>{getAllowedCountiesText()}</CyDText>
                  </CyDView>
                  <CyDImage
                    source={AppImages.DOWN_ARROW}
                    className='w-[12px] h-[6px] mr-[12px]'
                  />
                </CyDTouchView>
              </CyDView>
            )}
            <CyDView className='bg-white flex flex-col px-[12px] py-[12px] rounded-[8px]'>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDImage
                  source={AppImages.ATM_WITHDRAWALS}
                  className='h-[32px] w-[32px]'
                />
                <CyDSwitch
                  id='withdrawal'
                  value={get(limitsByControlType, CARD_LIMIT_TYPE.ATM, 0) > 0}
                  onValueChange={() => {
                    initiateEditLimit(CARD_LIMIT_TYPE.ATM);
                  }}
                />
              </CyDView>
              <CyDText className='text-[16px] font-semibold mt-[4px]'>
                {'ATM withdrawals'}
              </CyDText>
            </CyDView>
            <CyDView className='bg-white flex flex-col px-[12px] py-[12px] mt-[12px] rounded-[8px]'>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDImage
                  source={AppImages.ONLINE_TRANSACTIONS}
                  className='h-[32px] w-[32px]'
                />
                <CyDSwitch
                  value={
                    get(limitsByControlType, CARD_LIMIT_TYPE.ONLINE, 0) > 0
                  }
                  onValueChange={() => {
                    initiateEditLimit(CARD_LIMIT_TYPE.ONLINE);
                  }}
                  id={CARD_LIMIT_TYPE.ONLINE}
                />
              </CyDView>
              <CyDText className='text-[16px] font-semibold mt-[4px]'>
                {'Online Transactions'}
              </CyDText>
              {get(limitsByControlType, CARD_LIMIT_TYPE.ONLINE, 0) > 0 && (
                <CyDView className='flex flex-row justify-between items-center mt-[12px]'>
                  <CyDView>
                    <CyDText className='text-[10px] font-normal'>
                      {'Limit per transactions'}
                    </CyDText>
                    <CyDText className='text-[16px] font-bold'>
                      {`$${get(limitsByControlType, CARD_LIMIT_TYPE.ONLINE, 0)}`}
                    </CyDText>
                  </CyDView>
                  <Button
                    title={'Change'}
                    onPress={() => {
                      openEditLimitModal(CARD_LIMIT_TYPE.ONLINE);
                    }}
                    imagePosition={ImagePosition.LEFT}
                    paddingY={6}
                    image={AppImages.CHANGE_ICON}
                    type={ButtonType.GREY_FILL}
                    imageStyle={'h-[16px] w-[16px] mr-[6px]'}
                    titleStyle={'text-xs'}
                  />
                </CyDView>
              )}
            </CyDView>
            <CyDView className='bg-white flex flex-col px-[12px] py-[12px] mt-[12px] rounded-[8px]'>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDImage
                  source={AppImages.CONTACTLESS_TRANSACTIONS}
                  className='h-[32px] w-[32px]'
                />
                <CyDSwitch
                  value={
                    get(limitsByControlType, CARD_LIMIT_TYPE.CONTACTLESS, 0) > 0
                  }
                  onValueChange={() => {
                    initiateEditLimit(CARD_LIMIT_TYPE.CONTACTLESS);
                  }}
                  id={CARD_LIMIT_TYPE.CONTACTLESS}
                />
              </CyDView>
              <CyDText className='text-[16px] font-semibold mt-[4px]'>
                {'Contactless Transactions'}
              </CyDText>
              {get(limitsByControlType, CARD_LIMIT_TYPE.CONTACTLESS, 0) > 0 && (
                <>
                  <CyDView className='flex flex-row mt-[12px]'>
                    <CyDImage
                      source={AppImages.INFO_CIRCLE}
                      className='h-[14px] w-[14px] mr-[6px]'
                    />
                    <CyDText className='text-[10px] text-n200'>
                      {
                        'Maximum limit per contactless transaction is limited to $100'
                      }
                    </CyDText>
                  </CyDView>
                  <CyDView className='flex flex-row mt-[12px] justify-between items-center'>
                    <CyDView>
                      <CyDText className='text-[10px] font-normal'>
                        {'Limit per transactions'}
                      </CyDText>
                      <CyDText className='text-[16px] font-bold'>
                        {`$${get(limitsByControlType, CARD_LIMIT_TYPE.CONTACTLESS, 0)}`}
                      </CyDText>
                    </CyDView>
                    <Button
                      title={'Change'}
                      onPress={() => {
                        openEditLimitModal(CARD_LIMIT_TYPE.CONTACTLESS);
                      }}
                      imagePosition={ImagePosition.LEFT}
                      paddingY={6}
                      image={AppImages.CHANGE_ICON}
                      type={ButtonType.GREY_FILL}
                      imageStyle={'h-[16px] w-[16px] mr-[6px]'}
                      titleStyle={'text-xs'}
                    />
                  </CyDView>
                </>
              )}
            </CyDView>
            <CyDView className='bg-white flex flex-col px-[12px] py-[12px] mt-[12px] rounded-[8px]'>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDImage
                  source={AppImages.CARD_AND_PIN_TRANSACTIONS}
                  className='h-[32px] w-[32px]'
                />
                <CyDSwitch
                  value={
                    get(limitsByControlType, CARD_LIMIT_TYPE.CARD_PIN, 0) > 0
                  }
                  onValueChange={() => {
                    initiateEditLimit(CARD_LIMIT_TYPE.CARD_PIN);
                  }}
                  id={CARD_LIMIT_TYPE.CARD_PIN}
                />
              </CyDView>
              <CyDText className='text-[16px] font-semibold mt-[4px]'>
                {'Card and PIN Transactions'}
              </CyDText>
              {get(limitsByControlType, CARD_LIMIT_TYPE.CARD_PIN, 0) > 0 && (
                <CyDView className='flex flex-row justify-between items-center mt-[12px]'>
                  <CyDView>
                    <CyDText className='text-[10px] font-normal'>
                      {'Limit per transactions'}
                    </CyDText>
                    <CyDText className='text-[16px] font-bold'>
                      {`$${get(limitsByControlType, CARD_LIMIT_TYPE.CARD_PIN, 0)}`}
                    </CyDText>
                  </CyDView>
                  <Button
                    title={'Change'}
                    onPress={() => {
                      openEditLimitModal(CARD_LIMIT_TYPE.CARD_PIN);
                    }}
                    imagePosition={ImagePosition.LEFT}
                    paddingY={6}
                    image={AppImages.CHANGE_ICON}
                    type={ButtonType.GREY_FILL}
                    imageStyle={'h-[16px] w-[16px] mr-[6px]'}
                    titleStyle={'text-xs'}
                  />
                </CyDView>
              )}
            </CyDView>

            <CyDView className='bg-white flex flex-col px-[12px] py-[12px] mt-[12px] rounded-[8px]'>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDImage
                  source={AppImages.MOBILE_WALLETS}
                  className='h-[32px] w-[32px]'
                />
                <CyDSwitch
                  value={
                    get(limitsByControlType, CARD_LIMIT_TYPE.MOBILE_WALLET, 0) >
                    0
                  }
                  onValueChange={() => {
                    initiateEditLimit(CARD_LIMIT_TYPE.MOBILE_WALLET);
                  }}
                  id={CARD_LIMIT_TYPE.MOBILE_WALLET}
                />
              </CyDView>
              <CyDText className='text-[16px] font-semibold mt-[4px]'>
                {'Mobile Wallets'}
              </CyDText>
              {get(limitsByControlType, CARD_LIMIT_TYPE.MOBILE_WALLET, 0) >
                0 && (
                <CyDView className='flex flex-row justify-between items-center mt-[12px]'>
                  <CyDView>
                    <CyDText className='text-[10px] font-normal'>
                      {'Limit per transactions'}
                    </CyDText>
                    <CyDText className='text-[16px] font-bold'>
                      {`$${get(limitsByControlType, CARD_LIMIT_TYPE.MOBILE_WALLET, 0)}`}
                    </CyDText>
                  </CyDView>
                  <Button
                    title={'Change'}
                    onPress={() => {
                      openEditLimitModal(CARD_LIMIT_TYPE.MOBILE_WALLET);
                    }}
                    imagePosition={ImagePosition.LEFT}
                    paddingY={6}
                    image={AppImages.CHANGE_ICON}
                    type={ButtonType.GREY_FILL}
                    imageStyle={'h-[16px] w-[16px] mr-[6px]'}
                    titleStyle={'text-xs'}
                  />
                </CyDView>
              )}
            </CyDView>
          </CyDView>
        </CyDScrollView>
      </CyDSafeAreaView>
    </>
  );
}
