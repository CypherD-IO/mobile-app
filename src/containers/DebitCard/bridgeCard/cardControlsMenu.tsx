import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { find, get } from 'lodash';
import LottieView from 'lottie-react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { ProgressCircle } from 'react-native-svg-charts';
import countryMaster from '../../../../assets/datasets/countryMaster';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import ThreeDSecureOptionModal from '../../../components/v2/threeDSecureOptionModal';
import ZeroRestrictionModeConfirmationModal from './zeroRestrictionMode/zeroRestrictionModeConfirmationModal';
import { screenTitle } from '../../../constants';
import {
  CARD_LIMIT_TYPE,
  CardControlTypes,
  CardOperationsAuthType,
  CypherPlanId,
} from '../../../constants/enum';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import {
  CyDFastImage,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { showToast } from '../../utilities/toastUtility';
import Loading from '../../../components/v2/loading';
import { Card } from '../../../models/card.model';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import
import { CYPHER_PLAN_ID_NAME_MAPPING } from '../../../constants/data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ICountry } from '../../../models/cardApplication.model';
import { t } from 'i18next';
import CyDPicker from '../../../components/picker';

interface RouteParams {
  card: Card;
  currentCardProvider: string;
}

export default function CardControlsMenu() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const { getWithAuth, patchWithAuth } = useAxios();
  const isFocused = useIsFocused();
  const { showModal, hideModal } = useGlobalModalContext();
  const insets = useSafeAreaInsets();

  const { card, currentCardProvider } = route.params ?? {};
  const planInfo = globalState?.cardProfile?.planInfo;

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
  const [cardBalance, setCardBalance] = useState('');
  // const [godmExpiryInMinutes, setGodmExpiryInMinutes] = useState(0);

  useEffect(() => {
    if (isZeroRestrictionModeEnabled) {
      setDisableOptions(true);
    } else {
      setDisableOptions(false);
    }
  }, [isZeroRestrictionModeEnabled]);

  const getCardLimits = async () => {
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/limits`,
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

  const fetchCardBalance = async () => {
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/balance`,
    );
    if (!response.isError && response?.data && response.data.balance) {
      setCardBalance(String(response.data.balance));
    } else {
      setCardBalance('');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await getCardLimits();
    await fetchCardBalance();
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
  ) => {
    setIsZeroRestrictionModeLoading(true);
    const payload = {
      godm: value,
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
      });
    } else {
      const response = await patchWithAuth(
        `/v1/cards/${currentCardProvider}/card/${card.cardId}/god-mode`,
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
      await toggleZeroRestrictionMode(false);
    }
  };

  const onPressPlanChange = (openComparePlans: boolean) => {
    navigation.navigate(screenTitle.SELECT_PLAN, {
      toPage: screenTitle.DEBIT_CARD_SCREEN,
      deductAmountNow: true,
      cardBalance,
      openComparePlans,
    });
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
        onPressProceed={(godmExpiryInMinutes: number) => {
          setIsZeroRestrictionModeLoading(true);
          setShowZeroRestrictionModeModal(false);
          void toggleZeroRestrictionMode(true, godmExpiryInMinutes);
        }}
        setLoader={setIsZeroRestrictionModeLoading}
      />
      <CyDView
        className={'h-full bg-n0 pt-[10px]'}
        style={{ paddingTop: insets.top }}>
        <CyDTouchView
          className='bg-n0 flex flex-row px-[16px] py-[13px] items-center'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDFastImage
            source={AppImages.LEFT_ARROW_LONG}
            className='w-[20px] h-[16px]'
          />
          <CyDText className='font-bold text-[16px] ml-[8px]'>{`Card Controls ** ${card.last4}`}</CyDText>
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
                        <ProgressCircle
                          className={'h-[130px] w-[130px] mt-[12px]'}
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
                    className='p-[12px] border-t border-[#EBEDF0] flex flex-row justify-between items-center'
                    onPress={() => {
                      navigation.navigate(screenTitle.EDIT_USAGE_LIMITS, {
                        currentCardProvider,
                        card,
                      });
                    }}>
                    <CyDText className='text-[16px] font-semibold text-base400'>
                      {t('SET_USAGE_LIMIT')}
                    </CyDText>
                    <CyDImage
                      source={AppImages.RIGHT_ARROW}
                      className='w-[20px] h-[20px]'
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
                        onPress={() => onPressPlanChange(false)}>
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
                        onPress={() => onPressPlanChange(true)}>
                        <CyDText className=' text-center text-[14px] font-semibold text-n700 mr-[2px]'>
                          {'Compare plans'}
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
                    <CyDImage
                      source={AppImages.ZERO_RESTRICTION_MODE_ICON}
                      className={'h-[20px] w-[24px]'}
                      resizeMode={'contain'}
                    />
                    <CyDText className='text-[18px] font-medium text-base400 mt-[8px]'>
                      {'Zero Restriction'}
                    </CyDText>
                  </CyDView>
                  <CyDView className='flex flex-row items-center'>
                    {isZeroRestrictionModeLoading ? (
                      <LottieView
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
                            className='bg-n0 rounded-full p-[10px] w-[44px] h-[44px]'
                            // eslint-disable-next-line react-native/no-inline-styles
                            style={{
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.15,
                              shadowRadius: 8,
                              elevation: 4, // for Android
                            }}>
                            <CyDFastImage
                              source={AppImages.SWITCH_OFF}
                              className='w-[24px] h-[24px]'
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
                className={`flex flex-row mt-[8px] bg-white rounded-[10px] px-[12px] py-[16px] justify-between items-center ${
                  disableOptions ? 'opacity-50' : ''
                }`}
                onPress={() => {
                  if (!disableOptions) {
                    navigation.navigate(screenTitle.DOMESTIC_CARD_CONTROLS, {
                      cardControlType: CardControlTypes.DOMESTIC,
                      currentCardProvider,
                      card,
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
                    <CyDImage
                      className='w-[24px] h-[24px] mr-[8px]'
                      source={AppImages.DOMESTIC_ICON}
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
                  <CyDImage
                    source={AppImages.RIGHT_ARROW}
                    className='w-[12px] h-[12px] ml-[8px]'
                  />
                </CyDView>
              </CyDTouchView>
              <CyDTouchView
                className={`flex flex-row mt-[12px] bg-white rounded-[10px] px-[12px] py-[16px] items-center ${
                  disableOptions ? 'opacity-50' : ''
                }`}
                onPress={() => {
                  if (!disableOptions) {
                    navigation.navigate(
                      screenTitle.INTERNATIONAL_CARD_CONTROLS,
                      {
                        cardControlType: CardControlTypes.INTERNATIONAL,
                        currentCardProvider,
                        card,
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
                  <CyDImage
                    className='w-[24px] h-[24px] mr-[12px] mt-[2px]'
                    source={AppImages.INTERNATIONAL_ICON}
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
                  <CyDImage
                    source={AppImages.RIGHT_ARROW}
                    className='w-[12px] h-[12px] ml-[8px]'
                  />
                </CyDView>
              </CyDTouchView>

              <CyDText className='text-[14px] text-n200 mt-[16px] font-[600]'>
                Security
              </CyDText>
              <CyDTouchView
                onPress={() => {
                  navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
                    currentCardProvider,
                    card,
                  });
                }}
                className={
                  'flex flex-row items-center justify-between m-[2px] py-[15px] px-[12px] bg-white rounded-[6px] mt-[8px]'
                }>
                <CyDView className='flex flex-row flex-1 items-center'>
                  <CyDImage
                    source={AppImages.CIRCLE_WITH_DOTS}
                    className={'h-[24px] w-[24px] mr-[12px]'}
                    resizeMode={'contain'}
                  />
                  <CyDView className='flex-1 flex-col justify-between mr-[6px]'>
                    <CyDText className='text-[16px] font-semibold flex-wrap'>
                      {'Set Pin'}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDView className='flex flex-row items-center'>
                  <CyDImage
                    source={AppImages.RIGHT_ARROW}
                    className='w-[12px] h-[12px] ml-[8px]'
                  />
                </CyDView>
              </CyDTouchView>
              <CyDTouchView
                onPress={() => {
                  setShow3DsModal(true);
                }}
                className={
                  'flex flex-row items-center justify-between m-[2px] py-[15px] px-[12px] bg-white rounded-[6px] mt-[8px]'
                }>
                <CyDView className='flex flex-row flex-1 items-center'>
                  <CyDImage
                    source={AppImages.THREE_D_SECURE}
                    className={'h-[24px] w-[24px] mr-[12px]'}
                    resizeMode={'contain'}
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
                  <CyDImage
                    source={AppImages.RIGHT_ARROW}
                    className='w-[12px] h-[12px] ml-[8px]'
                  />
                </CyDView>
              </CyDTouchView>
              <CyDText className='text-n200 text-[12px] text-[500] mx-[20px] mt-[6px]'>
                {
                  "Choose where you'd like to receive the online payment verification"
                }
              </CyDText>
            </CyDView>
          </ScrollView>
        )}
      </CyDView>
    </>
  );
}
