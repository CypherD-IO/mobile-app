import { RouteProp, useIsFocused, useRoute } from '@react-navigation/native';
import { t } from 'i18next';
import { compact, find, get, isEqual, pick } from 'lodash';
import React, { useContext, useEffect, useState } from 'react';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import ChooseCountryModal from '../../../components/v2/ChooseCountryModal';
import ChooseMultipleCountryModal from '../../../components/v2/chooseMultipleCountryModal';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import {
  ButtonType,
  CARD_LIMIT_TYPE,
  CardControlTypes,
  CardProviders,
  CardType,
  NavigateToScreenOnOpen,
} from '../../../constants/enum';
import axios from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import {
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDSwitch,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import EditLimitModal from './editLimitModal';
import { ICountry } from '../../../models/cardApplication.model';
import Loading from '../../../components/v2/loading';
import { GlobalContextDef, GlobalContext } from '../../../core/globalContext';
import { Card } from '../../../models/card.model';
import SaveChangesModal from '../../../components/v2/saveChangesModal';

interface RouteParams {
  cardControlType: string;
  currentCardProvider: string;
  cardId: string;
  navigateToOnOpen: NavigateToScreenOnOpen;
  isShowAllCards?: boolean;
}

interface CardOption {
  id: string;
  title: string;
  icon: any;
  limitType: CARD_LIMIT_TYPE;
  description?: string;
}

export default function CardControlsSettings() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const {
    cardControlType,
    currentCardProvider,
    cardId,
    navigateToOnOpen,
    isShowAllCards = false,
  } = route.params;
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [allowedCountries, setAllowedCountries] = useState<ICountry[]>([]);
  const [selectedAllowedCountries, setSelectedAllowedCountries] = useState<
    ICountry[]
  >([]);
  const [allCountriesSelected, setAllCountriesSelected] = useState(false);
  const { getWithAuth, patchWithAuth } = useAxios();
  const [limits, setLimits] = useState({});
  const [editedLimits, setEditedLimits] = useState({});
  const [limitsByControlType, setLimitsByControlType] = useState({
    dis: true,
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
  const [
    isChooseDomesticCountryModalVisible,
    setIsChooseDomesticCountryModalVisible,
  ] = useState(false);
  const [domesticCountry, setDomesticCountry] = useState<ICountry>({});
  const [selectedDomesticCountry, setSelectedDomesticCountry] =
    useState<ICountry>({});
  const { showModal, hideModal } = useGlobalModalContext();
  const defaultAtmLimit = 2000;
  const [limitApplicable, setLimitApplicable] = useState('planLimit');
  const isFocused = useIsFocused();
  const [isDetailsChanged, setIsDetailsChanged] = useState(false);
  const [disableOptions, setDisableOptions] = useState(true);
  const activeCards =
    get(globalState?.cardProfile, currentCardProvider)?.cards ?? [];
  const [isSaveChangesModalVisible, setIsSaveChangesModalVisible] =
    useState(false);

  const card: Card | undefined = find(activeCards, { cardId });

  useEffect(() => {
    if (
      cardControlType === CardControlTypes.INTERNATIONAL &&
      get(limitsByControlType, CARD_LIMIT_TYPE.DISABLED, true)
    ) {
      setDisableOptions(true);
    } else {
      setDisableOptions(false);
    }
  }, [limitsByControlType]);

  useEffect(() => {
    setEditedLimits(limits);
  }, [isFocused]);

  useEffect(() => {
    if (navigateToOnOpen === NavigateToScreenOnOpen.DOMESTIC_COUNTRY) {
      setIsChooseDomesticCountryModalVisible(true);
    }
  }, [navigateToOnOpen]);

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

  const initiateEditLimit = (limitType: string) => {
    if (get(limitsByControlType, limitType) === 0) {
      if (limitType === CARD_LIMIT_TYPE.ATM) {
        void editLimit(limitType, defaultAtmLimit);
      } else {
        void editLimit(limitType, get(editedLimits, ['planLimit', 'd'], 0));
      }
    } else {
      void editLimit(limitType, 0);
    }
  };

  const openEditLimitModal = (limitType: CARD_LIMIT_TYPE) => {
    setEditModalData({
      isEditLimitModalVisible: true,
      limitType,
      limit: get(limitsByControlType, limitType, 0) as number,
    });
  };

  const saveLimits = async (forAllCards = false) => {
    setLoading(true);
    let payload = editedLimits;
    if (
      cardControlType === CardControlTypes.DOMESTIC &&
      !isEqual(selectedDomesticCountry, domesticCountry)
    ) {
      payload = {
        ...payload,
        cCode: selectedDomesticCountry?.Iso2,
      };
    }
    if (
      cardControlType === CardControlTypes.INTERNATIONAL &&
      (selectedAllowedCountries.length < 1 ||
        !isEqual(selectedAllowedCountries, allowedCountries))
    ) {
      let countryList: string[] = [];
      if (allCountriesSelected) {
        countryList = ['ALL'];
      } else if (selectedAllowedCountries?.length > 0) {
        countryList = selectedAllowedCountries?.map((country, index) => {
          return country.Iso2;
        });
      }

      payload = {
        ...payload,
        cusL: {
          ...get(payload, 'cusL'),
          intl: {
            ...get(payload, ['cusL', cardControlType]),
            cLs: compact(countryList),
          },
        },
      };
    }
    payload = {
      ...payload,
      ...(forAllCards && { forAllCards: true }),
    };

    const response = await patchWithAuth(
      `/v1/cards/${currentCardProvider}/card/${cardId}/limits`,
      pick(payload, ['cusL', 'cCode', ...(forAllCards ? ['forAllCards'] : [])]),
    );

    if (!response.isError) {
      void getCardLimits();

      showModal('state', {
        type: 'success',
        title: t('DETAILS_UPDATED_SUCESSFULLY'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_UPDATE_DETAILS'),
        description: response.error.message ?? t('PLEASE_CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
    setLoading(false);
  };

  const editLimit = async (limitType: string, newLimit: number | boolean) => {
    const tempLimit = {
      ...editedLimits,
      cusL: {
        ...get(editedLimits, 'cusL'),
        [cardControlType]: {
          ...get(editedLimits, ['cusL', cardControlType]),
          [limitType]: newLimit,
        },
      },
    };
    setEditedLimits(tempLimit);
  };

  const getCardLimits = async () => {
    setLoading(true);
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/${cardId}/limits`,
    );
    if (!response.isError) {
      const limitValue = response.data;
      setLimits(limitValue);
      if (get(limitValue, 'cydL')) {
        setLimitApplicable('cydL');
      } else if (get(limitValue, 'advL')) {
        setLimitApplicable('advL');
      } else {
        setLimitApplicable('planLimit');
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_FETCH_CARD_LIMIT'),
        description: response.error.message ?? t('PLEASE_CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
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
    if (allCountriesSelected) {
      return 'All Countries';
    } else if (selectedAllowedCountries.length > 2) {
      return `${selectedAllowedCountries[0].name}, ${selectedAllowedCountries[1].name} + ${selectedAllowedCountries.length - 2}`;
    } else if (selectedAllowedCountries.length === 2) {
      return `${selectedAllowedCountries[0].name}, ${selectedAllowedCountries[1].name}`;
    } else if (selectedAllowedCountries.length === 1) {
      return `${selectedAllowedCountries[0].name}`;
    } else {
      return 'Choose a country';
    }
  };

  useEffect(() => {
    setEditedLimits(limits);

    for (const country of countries) {
      if (country.Iso2 === get(limits, 'cCode', '')) {
        setDomesticCountry(country);
        setSelectedDomesticCountry(country);
      }
    }
    const tempCountryList = get(limits, ['cusL', cardControlType, 'cLs'], []);

    if (tempCountryList.length) {
      if (tempCountryList.includes('ALL')) {
        setAllCountriesSelected(true);
        setAllowedCountries(countries);
        setSelectedAllowedCountries(countries);
      } else {
        const tempAllowedCountries = countries.filter(country => {
          return tempCountryList.includes(country.Iso2);
        });
        setAllowedCountries(tempAllowedCountries);
        setSelectedAllowedCountries(tempAllowedCountries);
      }
    }
  }, [limits]);

  useEffect(() => {
    setLimitsByControlType({
      dis: get(
        editedLimits,
        ['cusL', cardControlType, CARD_LIMIT_TYPE.DISABLED],
        true,
      ),
      pos: get(
        editedLimits,
        ['cusL', cardControlType, CARD_LIMIT_TYPE.CARD_PIN],
        0,
      ),
      tap: get(
        editedLimits,
        ['cusL', cardControlType, CARD_LIMIT_TYPE.CONTACTLESS],
        0,
      ),
      atm: get(editedLimits, ['cusL', cardControlType, CARD_LIMIT_TYPE.ATM], 0),
      wal: get(
        editedLimits,
        ['cusL', cardControlType, CARD_LIMIT_TYPE.MOBILE_WALLET],
        0,
      ),
      ecom: get(
        editedLimits,
        ['cusL', cardControlType, CARD_LIMIT_TYPE.ONLINE],
        0,
      ),
    });
  }, [editedLimits]);

  useEffect(() => {
    if (
      !isEqual(selectedAllowedCountries, allowedCountries) ||
      !isEqual(selectedDomesticCountry, domesticCountry) ||
      !isEqual(editedLimits, limits)
    ) {
      setIsDetailsChanged(true);
    } else {
      setIsDetailsChanged(false);
    }
  }, [editedLimits, selectedDomesticCountry, selectedAllowedCountries]);

  const cardOptions: CardOption[] = [
    {
      id: 'atm',
      title: 'ATM withdrawals',
      icon: AppImages.ATM_WITHDRAWALS,
      limitType: CARD_LIMIT_TYPE.ATM,
    },
    {
      id: 'online',
      title: 'Online Payment',
      icon: AppImages.ONLINE_TRANSACTIONS,
      limitType: CARD_LIMIT_TYPE.ONLINE,
    },
    {
      id: 'tap',
      title: 'Tap and Pay',
      icon: AppImages.CONTACTLESS_TRANSACTIONS,
      limitType: CARD_LIMIT_TYPE.CONTACTLESS,
    },
    {
      id: 'offline',
      title: 'Offline Payments',
      icon: AppImages.CARD_AND_PIN_TRANSACTIONS,
      limitType: CARD_LIMIT_TYPE.CARD_PIN,
    },
    {
      id: 'wallet',
      title: 'Mobile Wallets',
      icon: AppImages.MOBILE_WALLETS,
      limitType: CARD_LIMIT_TYPE.MOBILE_WALLET,
      description:
        'Limit transactions through mobile wallets like Apple Pay, Google Pay, etc.',
    },
  ];

  const getVisibleOptions = () => {
    const isRainCard = card?.cardProvider === CardProviders.RAIN_CARD;
    const isVirtualRainCard = isRainCard && card?.type === CardType.VIRTUAL;

    if (isVirtualRainCard) {
      return cardOptions.filter(option =>
        ['online', 'wallet'].includes(option.id),
      );
    } else if (isRainCard && card?.type === CardType.PHYSICAL) {
      return cardOptions.filter(option =>
        ['atm', 'online', 'wallet'].includes(option.id),
      );
    }
    return cardOptions.filter(option =>
      ['atm', 'online', 'tap', 'offline', 'wallet'].includes(option.id),
    );
  };

  const renderCardOption = (option: CardOption) => {
    const limit = get(limitsByControlType, option.limitType, 0);
    const isEnabled = Number(limit) > 0;

    return (
      <CyDTouchView
        key={option.id}
        className={`bg-n0 flex flex-col px-[12px] py-[12px] mt-[12px] rounded-[8px] ${
          disableOptions ? 'opacity-50' : ''
        }`}
        disabled={disableOptions}>
        <CyDView className='flex flex-row justify-between items-center'>
          <CyDImage source={option.icon} className='h-[32px] w-[32px]' />
          <CyDSwitch
            value={isEnabled}
            onValueChange={() => {
              !disableOptions && initiateEditLimit(option.limitType.toString());
            }}
            id={option.id}
            disabled={disableOptions}
          />
        </CyDView>
        <CyDText className='text-[16px] font-semibold mt-[4px]'>
          {option.title}
        </CyDText>

        {option.description && (
          <CyDView className='flex flex-row mt-[12px]'>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={14}
              className='text-base400 mr-[6px]'
            />
            <CyDText className='text-[10px] text-n200'>
              {option.description}
            </CyDText>
          </CyDView>
        )}

        {isEnabled && (
          <CyDView className='flex flex-row justify-between items-center mt-[12px]'>
            <CyDView>
              <CyDText className='text-[10px] font-normal'>
                {'Limit per transactions'}
              </CyDText>
              <CyDText className='text-[16px] font-bold'>{`$${Number(limit)}`}</CyDText>
            </CyDView>
            <Button
              title={'Change'}
              onPress={() => {
                openEditLimitModal(option.limitType);
              }}
              paddingY={6}
              icon={
                <CyDMaterialDesignIcons
                  name='circle-edit-outline'
                  size={16}
                  className='text-base400 mr-2'
                />
              }
              type={ButtonType.GREY_FILL}
              titleStyle={'text-[12px]'}
              disabled={disableOptions}
            />
          </CyDView>
        )}
      </CyDTouchView>
    );
  };

  return loading ? (
    <Loading />
  ) : (
    <>
      <CyDView className={'h-full bg-n20'}>
        <SaveChangesModal
          isModalVisible={isSaveChangesModalVisible}
          setIsModalVisible={setIsSaveChangesModalVisible}
          card={card as Card}
          onApplyToAllCards={() => {
            void saveLimits(true);
            setIsSaveChangesModalVisible(false);
          }}
          onApplyToCard={() => {
            void saveLimits();
            setIsSaveChangesModalVisible(false);
          }}
        />
        <ChooseMultipleCountryModal
          isModalVisible={countryModalVisible}
          setModalVisible={setCountryModalVisible}
          selectedCountryState={[
            selectedAllowedCountries,
            setSelectedAllowedCountries,
          ]}
          allCountriesSelectedState={[
            allCountriesSelected,
            setAllCountriesSelected,
          ]}
        />
        <ChooseCountryModal
          isModalVisible={isChooseDomesticCountryModalVisible}
          setModalVisible={setIsChooseDomesticCountryModalVisible}
          selectedCountryState={[
            selectedDomesticCountry,
            setSelectedDomesticCountry,
          ]}
          showDialCode={false}
          showRadioButton={true}
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
          maxLimit={get(limits, [limitApplicable, 'd'], 0)}
          onChangeLimit={(newLimit: number) => {
            setEditModalData({
              ...editModalData,
              isEditLimitModalVisible: false,
            });
            void editLimit(editModalData.limitType.toString(), newLimit);
          }}
        />

        <CyDScrollView className='flex-1 bg-n20'>
          <CyDView className='mx-[16px] mt-[16px]'>
            {cardControlType === CardControlTypes.DOMESTIC && (
              <CyDView
                className={`bg-n0 flex-1 flex-col px-[12px] py-[12px] mb-[12px] rounded-[8px] ${disableOptions ? 'opacity-50' : ''}`}>
                <CyDText className='text-[16px] font-semibold mt-[4px]'>
                  {'Country'}
                </CyDText>
                <CyDView className='flex-1 flex-row justify-between items-center mt-[4px]'>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDText className={'text-[36px]'}>
                      {selectedDomesticCountry.unicode_flag}
                    </CyDText>
                    <CyDText className={'ml-[10px] font-semibold text-[16px]'}>
                      {selectedDomesticCountry.name}
                    </CyDText>
                  </CyDView>
                  <Button
                    title={'Change'}
                    onPress={() => {
                      setIsChooseDomesticCountryModalVisible(true);
                    }}
                    paddingY={6}
                    loaderStyle={{
                      height: 15,
                      width: 15,
                    }}
                    style='w-[84.5px] h-[30px]'
                    type={ButtonType.GREY_FILL}
                    icon={
                      <CyDMaterialDesignIcons
                        name='circle-edit-outline'
                        size={16}
                        className='text-base400 mr-2'
                      />
                    }
                    titleStyle={'text-[12px]'}
                    disabled={disableOptions}
                  />
                </CyDView>
              </CyDView>
            )}
            {cardControlType === CardControlTypes.INTERNATIONAL && (
              <>
                <CyDView className='bg-n0 flex flex-col px-[12px] py-[12px] mb-[12px] rounded-[8px]'>
                  <CyDView className='flex flex-row justify-between items-center'>
                    <CyDMaterialDesignIcons
                      name='airplane'
                      size={32}
                      className='text-base400'
                    />
                    <CyDSwitch
                      id='disabled'
                      value={
                        !get(
                          limitsByControlType,
                          CARD_LIMIT_TYPE.DISABLED,
                          true,
                        )
                      }
                      onValueChange={() => {
                        void editLimit(
                          CARD_LIMIT_TYPE.DISABLED.toString(),
                          !get(
                            limitsByControlType,
                            CARD_LIMIT_TYPE.DISABLED,
                            true,
                          ),
                        );
                      }}
                    />
                  </CyDView>
                  <CyDText className='text-[16px] font-semibold mt-[4px]'>
                    {'International Transactions'}
                  </CyDText>
                </CyDView>
              </>
            )}
            {cardControlType === CardControlTypes.INTERNATIONAL && (
              <CyDView
                className={`bg-n0 flex flex-col px-[12px] py-[12px] mb-[12px] rounded-[8px] ${disableOptions ? 'opacity-50' : ''}`}>
                <CyDView className='flex flex-row items-center'>
                  <CyDMaterialDesignIcons
                    name='earth'
                    size={24}
                    className='text-base400 mr-[8px]'
                  />
                  <CyDText className='text-[16px] font-semibold'>
                    {'Countries'}
                  </CyDText>
                </CyDView>
                <CyDView className='felx flex-row items-center justify-between mt-[12px]'>
                  <CyDText className='text-[12px] text-n200'>
                    {'Allowed Countries'}
                  </CyDText>
                  <CyDText className='text-[12px] text-n200'>{`Total Countries: ${countries.length}`}</CyDText>
                </CyDView>
                <CyDTouchView
                  className='flex flex-row justify-between items-center rounded-[8px] border-[1px] border-base400 p-[12px] mt-[6px]'
                  onPress={() => {
                    !disableOptions && setCountryModalVisible(true);
                  }}
                  disabled={disableOptions}>
                  <CyDView>
                    <CyDText>{getAllowedCountiesText()}</CyDText>
                  </CyDView>
                  <CyDMaterialDesignIcons
                    name={'chevron-down'}
                    size={24}
                    className={'text-base400 mr-3'}
                  />
                </CyDTouchView>
              </CyDView>
            )}
            {getVisibleOptions().map(renderCardOption)}
          </CyDView>
        </CyDScrollView>
        <CyDView className='bg-n0 pt-[14px] pb-[10px]'>
          <Button
            type={ButtonType.PRIMARY}
            title={t('SAVE_CHANGES')}
            onPress={() => {
              if (isShowAllCards) {
                setIsSaveChangesModalVisible(true);
              } else {
                void saveLimits();
              }
            }}
            paddingY={12}
            style='mx-[26px] rounded-[12px] mt-[10px] mb-[20px]'
            titleStyle='text-[18px]'
            loading={loading}
            disabled={!isDetailsChanged}
            loaderStyle={{ height: 25, width: 25 }}
          />
        </CyDView>
      </CyDView>
    </>
  );
}
