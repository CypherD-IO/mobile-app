import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { t } from 'i18next';
import { find, get } from 'lodash';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import countryMaster from '../../../../assets/datasets/countryMaster';
import AppImages from '../../../../assets/images/appImages';
import SelectPlanModal from '../../../components/selectPlanModal';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import Loading from '../../../components/v2/loading';
import ThreeDSecureOptionModal from '../../../components/v2/threeDSecureOptionModal';
import { screenTitle } from '../../../constants';
import { CYPHER_PLAN_ID_NAME_MAPPING } from '../../../constants/data';
import {
  CARD_IDS,
  CARD_LIMIT_TYPE,
  CardControlTypes,
  CardOperationsAuthType,
  CardProviders,
  CardStatus,
  CardType,
  CypherPlanId,
} from '../../../constants/enum';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { Card } from '../../../models/card.model';
import { ICountry } from '../../../models/cardApplication.model';
import {
  CyDFastImage,
  CyDIcons,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CydProgessCircle,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../utilities/toastUtility';
import ZeroRestrictionModeConfirmationModal from './zeroRestrictionMode/zeroRestrictionModeConfirmationModal';
import SaveChangesModal from '../../../components/v2/saveChangesModal';

interface RouteParams {
  cardId: string;
  currentCardProvider: string;
  isCardActivation?: boolean;
  isShowAllCards?: boolean;
}

const SecuritySection = ({
  card,
  currentCardProvider,
  navigation,
  isTelegramEnabled,
  setShow3DsModal,
}: {
  card: Card;
  currentCardProvider: string;
  navigation: any;
  isTelegramEnabled: boolean;
  setShow3DsModal: (show: boolean) => void;
}) => {
  const isRainCard = card?.cardProvider === CardProviders.RAIN_CARD;
  const isVirtualRainCard = isRainCard && card?.type === CardType.VIRTUAL;

  const renderSetPinOption = () => (
    <CyDTouchView
      onPress={() => {
        navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
          currentCardProvider,
          card,
        });
      }}
      className='flex flex-row items-center justify-between m-[2px] py-[15px] px-[12px] bg-n0 rounded-[6px] mt-[8px]'>
      <CyDView className='flex flex-row flex-1 items-center'>
        <CyDMaterialDesignIcons
          name='dots-horizontal-circle-outline'
          size={24}
          className='text-base400 mr-3'
        />
        <CyDView className='flex-1 flex-col justify-between mr-[6px]'>
          <CyDText className='text-[16px] font-semibold flex-wrap'>
            {'Set Pin'}
          </CyDText>
        </CyDView>
      </CyDView>
      <CyDView className='flex flex-row items-center'>
        <CyDMaterialDesignIcons
          name='chevron-right'
          size={16}
          className='text-base400 ml-2'
        />
      </CyDView>
    </CyDTouchView>
  );

  const renderAuthenticationOption = () => (
    <>
      <CyDTouchView
        onPress={() => setShow3DsModal(true)}
        className='flex flex-row items-center justify-between m-[2px] py-[15px] px-[12px] bg-n0 rounded-[6px] mt-[8px]'>
        <CyDView className='flex flex-row flex-1 items-center'>
          <CyDMaterialDesignIcons
            name='shield-check-outline'
            size={24}
            className='text-base400 mr-3'
          />
          <CyDView className='flex-1 flex-col justify-between mr-[6px]'>
            <CyDText className='text-[16px] font-semibold flex-wrap'>
              {'Online Payment Authentication'}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className='flex flex-row items-center'>
          <CyDText className='text-[14px] text-b150'>
            {isTelegramEnabled ? 'Telegram & Email' : 'SMS'}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-right'
            size={16}
            className='text-base400 ml-2'
          />
        </CyDView>
      </CyDTouchView>
      <CyDText className='text-n200 text-[12px] text-[500] mx-[20px] mt-[6px]'>
        {"Choose where you'd like to receive the online payment verification"}
      </CyDText>
    </>
  );

  const renderSectiontitle = () => (
    <CyDText className='text-[14px] text-n200 mt-[16px] font-[600]'>
      Security
    </CyDText>
  );

  return (
    <>
      {!isVirtualRainCard && renderSectiontitle()}
      {renderSetPinOption()}
      {!isRainCard && renderAuthenticationOption()}
    </>
  );
};

export default function CardControlsMenu() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const { getWithAuth, patchWithAuth } = useAxios();
  const isFocused = useIsFocused();
  const { showModal, hideModal } = useGlobalModalContext();
  const insets = useSafeAreaInsets();

  const {
    cardId,
    currentCardProvider,
    isCardActivation,
    isShowAllCards = true,
  } = route.params ?? {};
  const planInfo = globalState?.cardProfile?.planInfo;
  const activeCards =
    get(globalState?.cardProfile, currentCardProvider)?.cards ?? [];

  const card: Card | undefined = find(activeCards, { cardId });

  const [limits, setLimits] = useState();
  const [limitApplicable, setLimitApplicable] = useState('planLimit');
  const [loading, setLoading] = useState(true);
  const [
    isInternationalTransactionEnabled,
    setIsInternationalTransactionEnabled,
  ] = useState(false);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(
    get(card, 'is3dsEnabled', false),
  );
  const [show3DsModal, setShow3DsModal] = useState(false);
  const [domesticCountry, setDomesticCountry] = useState<ICountry>({});
  const [isZeroRestrictionModeEnabled, setIsZeroRestrictionModeEnabled] =
    useState(false);
  const [isZeroRestrictionModeLoading, setIsZeroRestrictionModeLoading] =
    useState(false);
  const [showZeroRestrictionModeModal, setShowZeroRestrictionModeModal] =
    useState(false);
  const [disableOptions, setDisableOptions] = useState(true);
  const [timer, setTimer] = useState<number | null>(null);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [openComparePlans, setOpenComparePlans] = useState(false);
  const [isSaveChangesModalVisible, setIsSaveChangesModalVisible] =
    useState(false);

  const godmExpiryInMinutes = useRef<number | null>(0);

  useEffect(() => {
    if (isZeroRestrictionModeEnabled) {
      setDisableOptions(true);
    } else {
      setDisableOptions(false);
    }
  }, [isZeroRestrictionModeEnabled]);

  const getCardLimits = async () => {
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/${cardId}/limits`,
    );

    if (!response.isError) {
      const limitValue = response.data;
      setLimits(limitValue);
      if (get(limitValue, 'advL')) {
        setLimitApplicable('advL');
      } else {
        setLimitApplicable('planLimit');
      }
      setIsInternationalTransactionEnabled(
        !get(
          limitValue,
          ['cusL', CardControlTypes.INTERNATIONAL, CARD_LIMIT_TYPE.DISABLED],
          true,
        ),
      );
      setDomesticCountry(
        find(countryMaster, { Iso2: get(limitValue, 'cCode', '') }),
      );
      setIsZeroRestrictionModeEnabled(get(limitValue, 'godm', false));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await getCardLimits();
    setLoading(false);
  };

  useEffect(() => {
    if (isFocused) {
      void fetchData();
    }
  }, [isFocused]);

  useEffect(() => {
    const loadTimer = async () => {
      const limitValue = limits;
      const end = get(limitValue, 'godmExpiry', null);
      if (end) {
        const now = Date.now();
        const endTime = end * 1000;
        if (endTime > now) {
          setTimerEnd(endTime);
          setTimer(Math.max(0, endTime - now));
        }
      }
    };
    void loadTimer();
  }, [limits]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer !== null) {
      interval = setInterval(() => {
        const now = Date.now();
        if (timerEnd && now >= timerEnd) {
          clearInterval(interval);
          setTimer(null);
          setTimerEnd(null);
        } else {
          setTimer(timerEnd ? timerEnd - now : 0);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, timerEnd]);

  useEffect(() => {
    if (timer === null && timerEnd === null) {
      void fetchData();
    }
  }, [timer, timerEnd]);

  const formatTime = (milliseconds: number) => {
    const weeks = Math.floor(milliseconds / (7 * 24 * 3600000));
    const days = Math.floor(
      (milliseconds % (7 * 24 * 3600000)) / (24 * 3600000),
    );
    const hours = Math.floor((milliseconds % (24 * 3600000)) / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);

    // 1 week
    if (weeks > 0) {
      return `${weeks}w ${days}d`;
    }
    // 1 day
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    // 12 hours or 1 hour
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    // 30 mins or less
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getMonthlyLimitPercentage = () => {
    const percentage =
      get(limits, ['sSt', 'm'], 0) / get(limits, [limitApplicable, 'm'], 1);
    return percentage;
  };

  const getActiveCards = () => {
    const cards = activeCards.filter(
      (card: Card) =>
        card.status !== CardStatus.PENDING_ACTIVATION &&
        card.cardId !== CARD_IDS.HIDDEN_CARD,
    );
    return cards ?? activeCards;
  };

  const successFeedBack = () => {
    void fetchData();
    showModal('state', {
      type: 'success',
      title: `Success, Zero Restriction Mode ${isZeroRestrictionModeEnabled ? 'Disabled' : 'Enabled'}!`,
      description: isZeroRestrictionModeEnabled
        ? 'Zero Restriction Mode has been disabled'
        : 'Zero Restriction Mode will has been enabled.',
      onSuccess: hideModal,
      onFailure: hideModal,
    });
  };

  const toggleZeroRestrictionMode = async (
    value: boolean,
    godmExpiryInMinutes?: number,
    forAllCards?: boolean,
  ) => {
    setIsZeroRestrictionModeLoading(true);
    const payload = {
      godm: value,
      forAllCards: forAllCards ?? false,
    };
    if (value) {
      navigation.navigate(screenTitle.CARD_UNLOCK_AUTH, {
        onSuccess: () => {
          void successFeedBack();
        },
        currentCardProvider,
        card,
        authType: CardOperationsAuthType.ZERO_RESTRICTION_MODE_ON,
        godmExpiryInMinutes,
        forAllCards,
      });
    } else {
      const response = await patchWithAuth(
        `/v1/cards/${currentCardProvider}/card/${card?.cardId ?? ''}/god-mode`,
        payload,
      );
      if (!response.isError) {
        void successFeedBack();
      } else {
        showModal('state', {
          type: 'error',
          title: 'Error toggling Zero Restriction Mode',
          description:
            'Failed to toggle Zero Restriction Mode. Please contact customer support.',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    }
    setIsZeroRestrictionModeLoading(false);
  };

  const handleZeroRestionModeToggle = async () => {
    if (!isZeroRestrictionModeEnabled) {
      setShowZeroRestrictionModeModal(true);
    } else {
      setIsSaveChangesModalVisible(true);
    }
  };

  return (
    <>
      <ThreeDSecureOptionModal
        setModalVisible={setShow3DsModal}
        isModalVisible={show3DsModal}
        card={card}
        currentCardProvider={currentCardProvider}
        isTelegramEnabled={isTelegramEnabled}
        setIsTelegramEnabled={setIsTelegramEnabled}
      />
      <ZeroRestrictionModeConfirmationModal
        isModalVisible={showZeroRestrictionModeModal}
        setIsModalVisible={setShowZeroRestrictionModeModal}
        onPressProceed={(expiryInMinutes: number) => {
          godmExpiryInMinutes.current = expiryInMinutes;
          setIsZeroRestrictionModeLoading(true);
          setShowZeroRestrictionModeModal(false);
          if (getActiveCards().length > 1) {
            setTimeout(() => {
              setIsSaveChangesModalVisible(true);
            }, 1000);
          } else {
            void toggleZeroRestrictionMode(true, expiryInMinutes);
          }
        }}
        setLoader={setIsZeroRestrictionModeLoading}
        card={card as Card}
      />
      <SaveChangesModal
        isModalVisible={isSaveChangesModalVisible}
        setIsModalVisible={setIsSaveChangesModalVisible}
        card={card as Card}
        onApplyToAllCards={() => {
          if (!isZeroRestrictionModeEnabled) {
            void toggleZeroRestrictionMode(
              true,
              godmExpiryInMinutes.current,
              true,
            );
          } else {
            void toggleZeroRestrictionMode(false, undefined, true);
          }
          setIsSaveChangesModalVisible(false);
        }}
        onApplyToCard={() => {
          if (!isZeroRestrictionModeEnabled) {
            void toggleZeroRestrictionMode(
              true,
              godmExpiryInMinutes.current,
              false,
            );
          } else {
            void toggleZeroRestrictionMode(false, undefined, false);
          }
          setIsSaveChangesModalVisible(false);
        }}
      />
      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        openComparePlans={openComparePlans}
        cardProvider={currentCardProvider}
        cardId={cardId}
        onPlanChangeSuccess={() => {
          navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
        }}
      />
      <CyDView
        className={'h-full bg-n20 pt-[10px]'}
        style={{ paddingTop: insets.top }}>
        <CyDTouchView
          className='flex flex-row px-[16px] py-[13px] items-center'
          onPress={() => {
            if (isCardActivation) {
              navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
            } else {
              navigation.goBack();
            }
          }}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
          <CyDText className='font-bold text-[16px] ml-[8px]'>{`Card Controls ** ${card?.last4 ?? ''}`}</CyDText>
        </CyDTouchView>
        {loading ? (
          <Loading />
        ) : (
          <ScrollView className='bg-n20'>
            <CyDView className='mx-[16px] mt-[16px] mb-[24px]'>
              <CyDView className='bg-p10 rounded-[16px] border-[1px] border-n20'>
                <CyDView className='rounded-[10px] bg-n0'>
                  <CyDView className='p-[12px] relative'>
                    {planInfo?.planId === CypherPlanId.BASIC_PLAN && (
                      <CyDText className='font-bold text-[18px] text-base400'>
                        {get(
                          CYPHER_PLAN_ID_NAME_MAPPING,
                          planInfo?.planId ?? CypherPlanId.BASIC_PLAN,
                        )}
                      </CyDText>
                    )}
                    {planInfo?.planId === CypherPlanId.PRO_PLAN && (
                      <CyDView className='flex flex-row items-center'>
                        <CyDFastImage
                          className='h-[14px] w-[81px]'
                          source={AppImages.PREMIUM_TEXT_GRADIENT}
                        />
                        <CyDText className='font-bold text-[18px] text-base400 ml-[4px]'>
                          Plan
                        </CyDText>
                      </CyDView>
                    )}
                    <CyDView className='flex flex-row'>
                      <CyDView>
                        <CydProgessCircle
                          className='w-[130px] h-[130px] mt-[12px]'
                          progress={getMonthlyLimitPercentage()}
                          strokeWidth={13}
                          cornerRadius={30}
                          progressColor={'#F7C645'}
                        />
                        <CyDView className='absolute top-[10px] left-0 right-0 bottom-0 flex items-center justify-center text-center'>
                          <CyDText
                            className={`${String(get(limits, ['sSt', 'm'], 0)).length < 7 ? 'text-[16px]' : 'text-[12px]'} font-bold`}>{`$${get(limits, ['sSt', 'm'], 0)}`}</CyDText>
                          <CyDText className='text-[14px] font-[500]'>
                            {'This Month'}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                      <CyDView className='mt-[24px] ml-[24px]'>
                        <CyDText className='font-[500] text-n200 text-[14px]'>
                          {'Limit per month'}
                        </CyDText>
                        <CyDText className='font-[500] text-[16px] '>{`$${get(limits, [limitApplicable, 'm'], 0)}`}</CyDText>
                        <CyDText className='font-[500] text-n200 text-[14px] mt-[12px]'>
                          {'Limit per day'}
                        </CyDText>
                        <CyDText className='font-[500] text-[16px]'>{`$${get(limits, [limitApplicable, 'd'], 0)}`}</CyDText>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                  <CyDTouchView
                    className='p-[12px] border-t border-n40 flex flex-row justify-between items-center'
                    onPress={() => {
                      navigation.navigate(screenTitle.EDIT_USAGE_LIMITS, {
                        currentCardProvider,
                        card,
                      });
                    }}>
                    <CyDText className='text-[16px] font-semibold text-base400'>
                      {t('SET_USAGE_LIMIT')}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='chevron-right'
                      size={20}
                      className='text-base400'
                    />
                  </CyDTouchView>
                </CyDView>
                {planInfo?.planId === CypherPlanId.BASIC_PLAN && (
                  <CyDView className='p-[12px]'>
                    <CyDText className='text-[14px] font-medium text-center'>
                      {'Upgrade to '}
                      <CyDText className='font-extrabold'>{'Premium'}</CyDText>
                      {' and '}
                      <CyDText className='font-extrabold'>
                        {'Maximize Your Saving!'}
                      </CyDText>
                    </CyDText>
                    <CyDView className='mt-[12px] flex flex-row justify-center items-center'>
                      <CyDTouchView
                        className='flex flex-row items-center bg-n0 px-[10px] py-[6px] rounded-full w-[105px] mr-[12px]'
                        onPress={() => setPlanChangeModalVisible(true)}>
                        <CyDText className='text-[14px] font-extrabold mr-[2px]'>
                          {'Go'}
                        </CyDText>
                        <CyDFastImage
                          source={AppImages.PREMIUM_TEXT_GRADIENT}
                          className='w-[60px] h-[10px]'
                        />
                      </CyDTouchView>
                      <CyDTouchView
                        className=' bg-n0 px-[10px] py-[6px] rounded-full'
                        onPress={() => {
                          setOpenComparePlans(true);
                          setPlanChangeModalVisible(true);
                        }}>
                        <CyDText className=' text-center text-[14px] font-semibold text-n100 mr-[2px]'>
                          {t('COMPARE_PLANS')}
                        </CyDText>
                      </CyDTouchView>
                    </CyDView>
                  </CyDView>
                )}
              </CyDView>

              <CyDText className='text-[14px] text-n200 mt-[16px] font-[600]'>
                Super Action
              </CyDText>
              <CyDView className='p-[16px] bg-n0 rounded-[10px] mt-[8px]'>
                <CyDView className='flex flex-row items-center justify-between'>
                  <CyDView>
                    <CyDMaterialDesignIcons
                      name='shield-check-outline'
                      size={24}
                      className='text-base400'
                    />
                    <CyDText className='text-[18px] font-medium text-base400 mt-[8px]'>
                      {'Zero Restriction'}
                    </CyDText>
                  </CyDView>
                  <CyDView className='flex flex-row items-center'>
                    {isZeroRestrictionModeLoading ? (
                      <CyDLottieView
                        source={AppImages.LOADER_TRANSPARENT}
                        autoPlay
                        loop
                        // eslint-disable-next-line react-native/no-inline-styles
                        style={{
                          width: 35,
                          height: 35,
                          marginRight: 30,
                          marginBottom: 13.5,
                        }}
                      />
                    ) : (
                      <>
                        {!isZeroRestrictionModeEnabled && (
                          <CyDTouchView
                            onPress={() => {
                              void handleZeroRestionModeToggle();
                            }}
                            className='bg-n20 rounded-full p-[10px] w-[44px] h-[44px] shadow-sm'>
                            <CyDMaterialDesignIcons
                              name='power'
                              size={26}
                              className='text-base400'
                            />
                          </CyDTouchView>
                        )}
                        {isZeroRestrictionModeEnabled && (
                          <CyDView className='flex flex-row items-center'>
                            <CyDView
                              className='bg-n0 px-[6px] rounded-[10px] w-[70px] h-[30px] flex flex-col items-center justify-center border border-p200 mr-[12px]'
                              // eslint-disable-next-line react-native/no-inline-styles
                              style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 8,
                                elevation: 4, // for Android
                              }}>
                              <CyDText className='font-extrabold text-[12px] text-base400 text-center'>
                                {formatTime(timer ?? 0)}
                              </CyDText>
                            </CyDView>
                            <CyDTouchView
                              onPress={() => {
                                void handleZeroRestionModeToggle();
                              }}
                              className='px-[10px] py-[6px] bg-n0 rounded-full h-[32px]'
                              // eslint-disable-next-line react-native/no-inline-styles
                              style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15,
                                shadowRadius: 8,
                                elevation: 4, // for Android
                              }}>
                              <CyDText className='text-[14px] font-semibold text-n700'>
                                {'Disable'}
                              </CyDText>
                            </CyDTouchView>
                          </CyDView>
                        )}
                      </>
                    )}
                  </CyDView>
                </CyDView>
                <CyDView className='mt-[6px]'>
                  <CyDText className='font-medium txet-[12px] text-n200'>
                    {
                      'Enable unrestricted international transactions across all countries and bypass all configured limits.'
                    }
                  </CyDText>
                </CyDView>
              </CyDView>

              <CyDText className='text-[14px] text-n200 mt-[16px] font-[600]'>
                Spend Category
              </CyDText>
              <CyDTouchView
                className={`flex flex-row mt-[8px] bg-n0 rounded-[10px] px-[12px] py-[16px] justify-between items-center ${
                  disableOptions ? 'opacity-50' : ''
                }`}
                onPress={() => {
                  if (!disableOptions) {
                    navigation.navigate(screenTitle.DOMESTIC_CARD_CONTROLS, {
                      cardControlType: CardControlTypes.DOMESTIC,
                      currentCardProvider,
                      cardId: card?.cardId,
                      isShowAllCards:
                        isShowAllCards && getActiveCards().length > 1,
                    });
                  } else {
                    showToast(
                      'Disable Zero Restriction Mode to access this feature',
                      'error',
                    );
                  }
                }}>
                <CyDView className='flex flex-row items-center'>
                  {!domesticCountry.unicode_flag ? (
                    <CyDMaterialDesignIcons
                      name='home-outline'
                      size={24}
                      className='text-base400 mr-2'
                    />
                  ) : (
                    <CyDText className='text-[18px] mr-[12px]'>
                      {domesticCountry.unicode_flag}
                    </CyDText>
                  )}
                  <CyDText className='text-[16px] font-[600] '>
                    Domestic Transactions
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center'>
                  <CyDText className='text-[14px] text-b150'>
                    {'Enabled'}
                  </CyDText>
                  <CyDMaterialDesignIcons
                    name='chevron-right'
                    size={16}
                    className='text-base400 ml-2'
                  />
                </CyDView>
              </CyDTouchView>
              <CyDTouchView
                className={`flex flex-row mt-[12px] bg-n0 rounded-[10px] px-[12px] py-[16px] items-center ${
                  disableOptions ? 'opacity-50' : ''
                }`}
                onPress={() => {
                  if (!disableOptions) {
                    navigation.navigate(
                      screenTitle.INTERNATIONAL_CARD_CONTROLS,
                      {
                        cardControlType: CardControlTypes.INTERNATIONAL,
                        currentCardProvider,
                        cardId: card?.cardId,
                        isShowAllCards:
                          isShowAllCards && getActiveCards().length > 1, // false when isShowAllCards is passed as false in parameter
                      },
                    );
                  } else {
                    showToast(
                      'Disable Zero Restriction Mode to access this feature',
                      'error',
                    );
                  }
                }}>
                <CyDView className='flex-1 flex-row items-center'>
                  <CyDMaterialDesignIcons
                    name='airplane'
                    size={24}
                    className='text-base400 mr-3 mt-0.5'
                  />
                  <CyDView className='flex-1 flex-col justify-between mr-[6px]'>
                    <CyDText className='text-[16px] font-semibold flex-wrap'>
                      {'International Transactions'}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDView className='flex-row items-center ml-[8px]'>
                  <CyDText className='text-[14px] text-b150'>
                    {isInternationalTransactionEnabled ? 'Enabled' : 'Disabled'}
                  </CyDText>
                  <CyDMaterialDesignIcons
                    name='chevron-right'
                    size={16}
                    className='text-base400 ml-2'
                  />
                </CyDView>
              </CyDTouchView>

              <SecuritySection
                card={card}
                currentCardProvider={currentCardProvider}
                navigation={navigation}
                isTelegramEnabled={isTelegramEnabled}
                setShow3DsModal={setShow3DsModal}
              />
            </CyDView>
          </ScrollView>
        )}
      </CyDView>
    </>
  );
}
