import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import { StyleSheet, Animated } from 'react-native';
import { capitalize, find, get } from 'lodash';
import clsx from 'clsx';
import Tooltip from 'react-native-walkthrough-tooltip';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

import {
  CyDImage,
  CyDText,
  CyDView,
  CyDMaterialDesignIcons,
  CyDTouchView,
  CydProgessCircle,
  CyDIcons,
  CyDSwitch,
  CyDScrollView,
} from '../../../styles/tailwindComponents';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { getCardImage, parseErrorMessage } from '../../../core/util';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { Card } from '../../../models/card.model';
import {
  CardProviders,
  CardType,
  SpendLimitType,
  ON_OPEN_NAVIGATE,
  CardStatus,
  CypherPlanId,
  PhysicalCardType,
} from '../../../constants/enum';
import AppImages from '../../../../assets/images/appImages';
import GradientText from '../../../components/gradientText';
import EditLimitModal from '../../../components/v2/editLimitModal';
import RequestHigherLimitModal from '../../../components/v2/requestHigherLimitModal';
import ChooseMultipleCountryModal from '../../../components/v2/chooseMultipleCountryModal';
import { ICountry } from '../../../models/cardApplication.model';
import ThreeDSecureOptionModal from '../../../components/v2/threeDSecureOptionModal';
import { screenTitle } from '../../../constants';
import Loading from '../../../components/v2/loading';
import SaveChangesModal from '../../../components/v2/saveChangesModal';
import SelectPlanModal from '../../../components/selectPlanModal';
import { countryMaster } from '../../../../assets/datasets/countryMaster';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../../core/analytics';

interface RouteParams {
  cardId: string;
  currentCardProvider: string;
  onOpenNavigate?: ON_OPEN_NAVIGATE;
}

interface ILimitDetail {
  d: number;
  m: number;
}

interface ISpentState {
  d: number;
  m: number;
}

interface ICustomLimit {
  pos?: boolean;
  atm?: boolean;
  ecom?: boolean;
  wal?: boolean;
}

interface CardLimitsV2Response {
  planLimit: ILimitDetail;
  currentLimit: ILimitDetail;
  maxLimit: ILimitDetail;
  advL?: ILimitDetail;
  cydL?: ILimitDetail;
  aMercs?: Record<string, number>;
  dMercs?: string[];
  aCats?: Record<string, number>;
  dCats?: string[];
  customLimit?: ICustomLimit;
  sSt?: ISpentState;
  countries: string[];
  isDefaultSetting?: boolean;
  timeToRemindLater?: number;
}

export default function CardControls() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const {
    cardId,
    currentCardProvider,
    onOpenNavigate = ON_OPEN_NAVIGATE.DEFAULT,
  } = route.params ?? {};
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const { getWithAuth, patchWithAuth, postWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(
    cardId,
  );
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const [hasChanges, setHasChanges] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});

  // Replace editLimitModal state with separate modal states
  const [isDailyLimitModalVisible, setIsDailyLimitModalVisible] =
    useState(false);
  const [isMonthlyLimitModalVisible, setIsMonthlyLimitModalVisible] =
    useState(false);

  // Channel control states
  const [channelControls, setChannelControls] = useState({
    atm: false,
    online: false,
    merchantOutlet: false,
    applePay: false,
  });

  const [
    isRequestHigherLimitModalVisible,
    setIsRequestHigherLimitModalVisible,
  ] = useState(false);
  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [activeCards, setActiveCards] = useState<Card[]>([]);
  const [showForAllCards, setShowForAllCards] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | undefined>(undefined);
  const [onOpenNavigateTo, setOnOpenNavigateTo] =
    useState<ON_OPEN_NAVIGATE | null>(onOpenNavigate);

  const [selectedCountries, setSelectedCountries] = useState<ICountry[]>([]);
  const [allCountriesSelected, setAllCountriesSelected] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [showMobileWalletTooltip, setShowMobileWalletTooltip] = useState(false);
  const [showMerchantOutletTooltip, setShowMerchantOutletTooltip] =
    useState(false);
  const [showAtmWithdrawalTooltip, setShowAtmWithdrawalTooltip] =
    useState(false);
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [show3DsModal, setShow3DsModal] = useState(false);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(
    get(selectedCard, 'is3dsEnabled', false),
  );

  // const [showHigherLimitStatus, setShowHigherLimitStatus] = useState(true);
  // const [higherLimitStatus, setHigherLimitStatus] =
  //   useState<HigherSpendingLimitStatus>(HigherSpendingLimitStatus.PENDING);

  // const handleContactSupport = () => {
  //   // Handle contact support action
  //   setShowHigherLimitStatus(false);
  //   // Add your contact support navigation/action here
  // };

  const [loading, setLoading] = useState(true);
  const [cardLimits, setCardLimits] = useState<CardLimitsV2Response>();
  const [showSaveChangesModal, setShowSaveChangesModal] = useState(false);

  // Add a ref to store the exit action
  const exitActionRef = useRef<any>();

  useEffect(() => {
    const filteredCards =
      get(globalState?.cardProfile, [currentCardProvider, 'cards'])?.filter(
        (card: Card) =>
          card.status === CardStatus.IN_ACTIVE ||
          card.status === CardStatus.ACTIVE,
      ) ?? [];
    const isPremiumPlan =
      get(globalState, ['cardProfile', 'planInfo', 'planId']) ===
      CypherPlanId.PRO_PLAN;
    setActiveCards(filteredCards);
    setShowForAllCards(filteredCards.length > 1);
    setIsPremiumUser(isPremiumPlan);
  }, [globalState?.cardProfile, currentCardProvider]);

  useEffect(() => {
    const card = find(activeCards, {
      cardId: selectedCardId,
    });
    if (card) {
      setSelectedCard(card);
      void fetchCardLimits();
      setIsTelegramEnabled(get(card, 'is3dsEnabled', false));
    }
  }, [selectedCardId, activeCards]);

  const populateSelectedCountries = (countries: string[]) => {
    if (countries) {
      // Check if countries array contains "ALL"
      if (countries.includes('ALL')) {
        setAllCountriesSelected(true);
        setSelectedCountries([]); // Clear selected countries when ALL is selected
      } else {
        // Convert country codes to ICountry objects
        const countryObjects = countries.map(code => {
          const country = countryMaster.find(c => c.Iso2 === code);
          return {
            name: country?.name ?? '',
            Iso2: code,
            unicode_flag: country?.unicode_flag ?? '',
            dialCode: country?.dial_code ?? '',
            flag: country?.flag ?? '',
            Iso3: country?.Iso3 ?? '',
            currency: country?.currency ?? '',
          };
        });
        setSelectedCountries(countryObjects);
        setAllCountriesSelected(false);
      }
    }
  };

  useEffect(() => {
    if (isExpanded) {
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isExpanded]);

  const handleCardSelect = (selectedCard: Card) => {
    setSelectedCardId(selectedCard.cardId);
    setIsExpanded(false);
  };

  const channelMapping = {
    atm: 'atm',
    online: 'ecom',
    merchantOutlet: 'pos',
    applePay: 'wal',
  } as const;

  type ChannelKey = keyof typeof channelMapping;

  const handleChannelToggle = async (channel: ChannelKey) => {
    try {
      const channelCode = channelMapping[channel];
      if (!channelCode) return;

      const originalChannelControl = channelControls[channel];

      // Update UI immediately
      setChannelControls({
        ...channelControls,
        [channel]: !originalChannelControl,
      });

      const response = await patchWithAuth(
        `/v1/cards/${currentCardProvider}/card/${selectedCardId}/limits-v2`,
        {
          customLimit: {
            [channelCode]: !originalChannelControl,
          },
        },
      );

      if (!response.isError) {
        // Track changes only on success
        setHasChanges(true);
        setChanges(prev => ({
          ...prev,
          customLimit: {
            ...prev.customLimit,
            [channelCode]: !originalChannelControl,
          },
        }));
        // Log analytics event
        void logAnalyticsToFirebase(AnalyticEvent.CARD_CHANNEL_TOGGLE, {
          channel,
          enabled: !originalChannelControl,
          cardId,
          cardProvider: currentCardProvider,
        });
      } else {
        // Revert UI on error
        setChannelControls({
          ...channelControls,
          [channel]: originalChannelControl,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: parseErrorMessage(error),
      });
    }
  };

  const handleEditLimit = (type: 'daily' | 'monthly') => {
    if (type === 'daily') {
      setIsDailyLimitModalVisible(true);
    } else {
      setIsMonthlyLimitModalVisible(true);
    }
  };

  const handleLimitChange = async (
    type: 'daily' | 'monthly',
    newLimit: number,
  ) => {
    try {
      const payload = {
        advL: {
          [type === 'daily' ? 'd' : 'm']: newLimit,
        },
      };

      const response = await patchWithAuth(
        `/v1/cards/${currentCardProvider}/card/${selectedCardId}/limits-v2`,
        payload,
      );

      if (!response.isError) {
        // Track changes only on success
        setHasChanges(true);
        setChanges(prev => ({
          ...prev,
          advL: {
            ...prev.advL,
            [type === 'daily' ? 'd' : 'm']: newLimit,
          },
        }));

        // Log analytics event
        void logAnalyticsToFirebase(AnalyticEvent.CARD_LIMIT_CHANGE, {
          type,
          newLimit,
          cardId,
          cardProvider: currentCardProvider,
        });

        Toast.show({
          type: 'success',
          text1: t('LIMIT_UPDATED_SUCCESSFULLY'),
          position: 'bottom',
        });
        void fetchCardLimits();
      } else {
        Toast.show({
          type: 'error',
          text1: t('UNABLE_TO_UPDATE_LIMIT'),
          text2: response.error.message ?? t('PLEASE_CONTACT_SUPPORT'),
          position: 'bottom',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('UNABLE_TO_UPDATE_LIMIT'),
        text2: t('PLEASE_CONTACT_SUPPORT'),
        position: 'bottom',
      });
    }
  };

  const handleRequestHigherLimit = () => {
    setTimeout(() => {
      setIsRequestHigherLimitModalVisible(true);
    }, 300);
  };

  const handleHigherLimitSubmit = async (
    dailyLimit: number,
    monthlyLimit: number,
    reason: string,
  ) => {
    try {
      const response = await postWithAuth('/v1/cards/increase-limit-request', {
        reason,
        dailyLimit,
        monthlyLimit,
      });

      if (!response.isError) {
        void logAnalyticsToFirebase(
          AnalyticEvent.CARD_CONTROLS_REQUEST_HIGHER_LIMIT_SUBMIT,
          {
            card_id: selectedCardId,
            card_type: selectedCard?.type,
            reason,
            dailyLimit,
            monthlyLimit,
          },
        );
        showModal('state', {
          type: 'success',
          title: t('LIMIT_INCREASE_REQUEST_SUBMITTED'),
          description: t(
            'LIMIT_INCREASE_REQUEST_SUBMITTED_DESC',
            "You'll be notified once the request is processed through email and telegram.",
          ),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        setIsRequestHigherLimitModalVisible(false);
      } else {
        showModal('state', {
          type: 'error',
          title: t('LIMIT_INCREASE_REQUEST_FAILED'),
          description: t(
            'LIMIT_INCREASE_REQUEST_FAILED_DESC',
            'Could not process the limit increase request. Please contact support.',
          ),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('LIMIT_INCREASE_REQUEST_FAILED'),
        description: t(
          'LIMIT_INCREASE_REQUEST_FAILED_DESC',
          'Could not process the limit increase request please contact support.',
        ),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const fetchCardLimits = async (cardId = selectedCardId) => {
    if (!cardId) return;
    setLoading(true);
    try {
      const response = await getWithAuth(
        `/v1/cards/${currentCardProvider}/card/${cardId}/limits-v2`,
      );
      if (!response.isError) {
        setCardLimits(response.data);
        setChannelControls({
          atm: response.data.customLimit?.atm || false,
          online: response.data.customLimit?.ecom || false,
          merchantOutlet: response.data.customLimit?.pos || false,
          applePay: response.data.customLimit?.wal || false,
        });

        populateSelectedCountries(response.data.countries);

        // Handle navigation based on ON_OPEN_NAVIGATE
        if (onOpenNavigateTo) {
          switch (onOpenNavigateTo) {
            case ON_OPEN_NAVIGATE.DAILY_LIMIT:
              setIsDailyLimitModalVisible(true);
              break;
            case ON_OPEN_NAVIGATE.MONTHLY_LIMIT:
              setIsMonthlyLimitModalVisible(true);
              break;
            case ON_OPEN_NAVIGATE.SELECT_COUNTRY:
              setIsCountryModalVisible(true);
              break;
            case ON_OPEN_NAVIGATE.DEFAULT:
              break;
            default:
              break;
          }
          setOnOpenNavigateTo(null);
        }
      } else {
        Toast.show({
          type: 'error',
          text1: t('UNABLE_TO_FETCH_LIMITS'),
          text2: response.error.message ?? t('PLEASE_CONTACT_SUPPORT'),
          position: 'bottom',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('UNABLE_TO_FETCH_LIMITS'),
        text2: t('PLEASE_CONTACT_SUPPORT'),
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelection = (countries: ICountry[]) => {
    setSelectedCountries(countries);
    setAllCountriesSelected(countries.length === countryMaster.length);
  };

  const handleSaveCountries = async () => {
    try {
      setLoading(true);
      // Remove duplicates from selected countries
      const uniqueCountries = selectedCountries.filter(
        (country, index, self) =>
          index === self.findIndex(c => c.Iso2 === country.Iso2),
      );

      const countryCodes = allCountriesSelected
        ? ['ALL']
        : uniqueCountries.map(country => country.Iso2);

      const response = await patchWithAuth(
        `/v1/cards/${currentCardProvider}/card/${selectedCardId}/limits-v2`,
        {
          countries: countryCodes,
        },
      );

      if (!response.isError) {
        // Update the selectedCountries state with unique countries
        setSelectedCountries(uniqueCountries);

        // Track the changes only after successful save
        setHasChanges(true);
        setChanges(prev => ({
          ...prev,
          countries: countryCodes,
        }));

        void logAnalyticsToFirebase(
          AnalyticEvent.CARD_CONTROLS_UPDATE_COUNTRIES,
          {
            card_id: selectedCardId,
            card_type: selectedCard?.type,
          },
        );

        // Fetch updated limits after successful country update
        await fetchCardLimits();

        Toast.show({
          type: 'success',
          text1: t('COUNTRIES_UPDATED_SUCCESSFULLY'),
          position: 'bottom',
        });
        setIsCountryModalVisible(false);
      } else {
        Toast.show({
          type: 'error',
          text1: t('UNABLE_TO_UPDATE_COUNTRIES'),
          position: 'bottom',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('UNABLE_TO_UPDATE_COUNTRIES'),
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetCardSettings = async () => {
    showModal('state', {
      type: 'warning',
      title: t('RESET_CARD_SETTINGS'),
      description: t('RESET_CARD_SETTINGS_CONFIRMATION'),
      onSuccess: async () => {
        try {
          const response = await patchWithAuth(
            `/v1/cards/${currentCardProvider}/card/${selectedCardId}/limits-v2`,
            { restoreToDefaults: true },
          );

          if (!response.isError) {
            // Log analytics event
            void logAnalyticsToFirebase(AnalyticEvent.CARD_SETTINGS_RESET, {
              cardId,
              cardProvider: currentCardProvider,
            });

            showModal('state', {
              type: 'success',
              title: t('CARD_SETTINGS_RESET_SUCCESSFULLY'),
              onSuccess: () => {
                hideModal();
                void fetchCardLimits();
              },
              onFailure: hideModal,
            });
          } else {
            showModal('state', {
              type: 'error',
              title: t('UNABLE_TO_RESET_CARD_SETTINGS'),
              description:
                response.error.message ?? t('PLEASE_CONTACT_SUPPORT'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
        } catch (error) {
          showModal('state', {
            type: 'error',
            title: t('UNABLE_TO_RESET_CARD_SETTINGS'),
            description: t('PLEASE_CONTACT_SUPPORT'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      },
      onFailure: hideModal,
    });
  };
  useEffect(() => {
    // Handle back navigation for iOS and Android
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      // If there are no changes, let the navigation proceed normally
      if (!hasChanges) {
        return;
      }

      // Specifically check for GO_BACK action type (swipe back or hardware back)
      if (e.data.action.type === 'GO_BACK') {
        // Prevent default behavior
        e.preventDefault();

        // Store the navigation action for later use
        exitActionRef.current = e.data.action;

        // Show modal if multiple cards, otherwise navigate back
        if (showForAllCards) {
          setShowSaveChangesModal(true);
        } else {
          // Clear changes without triggering navigation recursion
          setHasChanges(false);
          setChanges({});
          // Explicitly dispatch the original action we captured
          navigation.dispatch(exitActionRef.current);
        }
      }
      // No else needed - for other action types, just let them proceed normally
    });

    return () => unsubscribe();
  }, [navigation, hasChanges, showForAllCards]);

  const handleApplyToAllCards = async () => {
    try {
      const response = await patchWithAuth(
        `/v1/cards/${currentCardProvider}/card/${selectedCardId}/limits-v2`,
        {
          ...changes,
          forAllCards: true,
        },
      );

      if (!response.isError) {
        // Only clear changes after successful apply to all
        setHasChanges(false);
        setChanges({});
        setShowSaveChangesModal(false);

        setTimeout(() => {
          showModal('state', {
            type: 'success',
            title: t('CHANGES_APPLIED_SUCCESSFULLY_TO_ALL_CARDS'),
            onSuccess: () => {
              hideModal();
              navigation.goBack();
            },
            onFailure: () => {
              hideModal();
              navigation.goBack();
            },
          });
        }, 300);
      } else {
        setShowSaveChangesModal(false);
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: t('UNABLE_TO_APPLY_CHANGES_TO_ALL_CARDS'),
            description: response.error.message ?? t('PLEASE_CONTACT_SUPPORT'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, 300);
      }
    } catch (error) {
      setShowSaveChangesModal(false);
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_APPLY_CHANGES'),
        description: t('PLEASE_CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  // Update the onApplyToCard and onCancel functions to use the stored navigation action
  const handleApplyToCard = () => {
    setShowSaveChangesModal(false);
    setHasChanges(false);
    setChanges({});
    if (exitActionRef.current) {
      navigation.dispatch(exitActionRef.current);
    }
  };

  const handleCancelExit = () => {
    setShowSaveChangesModal(false);
  };

  const getDisplayCardType = (card: Card) => {
    if (
      card?.type === CardType.PHYSICAL &&
      card?.physicalCardType === PhysicalCardType.METAL
    ) {
      return 'Metal';
    }
    return capitalize(card?.type);
  };

  if (loading) {
    return <Loading />;
  }

  if (!selectedCard) {
    // Instead of returning null, show a loading state or error message
    return (
      <CyDView className='h-full bg-n20 justify-center items-center'>
        <CyDText className='text-base400 text-[16px]'>
          {loading ? 'Loading card details...' : 'No cards found'}
        </CyDText>
      </CyDView>
    );
  }

  return (
    <>
      <CyDView className='h-full bg-n20'>
        <CyDView className='bg-n0 shadow-lg shadow-black/10 z-20'>
          <CyDTouchView
            className='flex flex-row items-center justify-between px-[14px] py-[12px]'
            onPress={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <CyDView className='flex flex-row items-center gap-x-[12px]'>
                <CyDView className='h-[40px] w-[63px] bg-n40 rounded-[4px]' />
                <CyDText className='font-medium'>
                  {t('CARD_SELECT_A_CARD')}
                </CyDText>
              </CyDView>
            ) : (
              <CyDView className='flex flex-row items-center gap-x-[12px]'>
                <CyDImage
                  source={getCardImage(
                    selectedCard,
                    currentCardProvider as CardProviders,
                  )}
                  className={clsx('h-[40px] w-[63px]', {
                    'border border-n40 rounded-[4px]':
                      selectedCard?.type === CardType.PHYSICAL,
                  })}
                  resizeMode='contain'
                />
                <CyDText className='font-medium'>{`${getDisplayCardType(selectedCard)} card ** ${selectedCard?.last4}`}</CyDText>
              </CyDView>
            )}
            <CyDMaterialDesignIcons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        {isExpanded && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.3)',
                opacity: animatedOpacity,
                zIndex: 10,
              },
            ]}
            pointerEvents={isExpanded ? 'auto' : 'none'}>
            <CyDTouchView
              className='h-full w-full'
              onPress={() => setIsExpanded(false)}
            />
          </Animated.View>
        )}

        {/* Dropdown */}
        {isExpanded && (
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                opacity: animatedOpacity,
                transform: [
                  {
                    translateY: animatedHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}>
            <CyDView className='bg-n0'>
              {activeCards.map((cardItem: Card) => (
                <CyDTouchView
                  key={cardItem.cardId}
                  onPress={() => handleCardSelect(cardItem)}
                  className='flex flex-row items-center justify-between px-[14px] py-[12px] border-b border-n40'>
                  <CyDView className='flex flex-row items-center gap-x-[12px]'>
                    <CyDImage
                      source={getCardImage(
                        cardItem,
                        currentCardProvider as CardProviders,
                      )}
                      className={clsx('h-[40px] w-[63px]', {
                        'border border-n40 rounded-[4px]':
                          cardItem?.type === CardType.PHYSICAL,
                      })}
                      resizeMode='contain'
                    />
                    <CyDText className='font-medium text-base400'>{`${getDisplayCardType(cardItem)} card ** ${cardItem?.last4}`}</CyDText>
                  </CyDView>
                  {cardItem.cardId === selectedCardId && (
                    <CyDMaterialDesignIcons
                      name='check-circle'
                      size={20}
                      className='text-p50'
                    />
                  )}
                </CyDTouchView>
              ))}
            </CyDView>
          </Animated.View>
        )}

        <CyDScrollView className='flex-1'>
          <CyDView className='p-[16px] mb-[32px]'>
            {/* Higher Spending Limit Status */}
            {/* {showHigherLimitStatus && (
              <HigherSpendingLimitStatusModal
                status={higherLimitStatus}
                cardLast4={selectedCard?.last4 ?? ''}
                onClose={() => setShowHigherLimitStatus(false)}
                onContactSupport={handleContactSupport}
              />
            )} */}

            {/* Spend Controls Section */}
            <CyDView className='mt-[4px] bg-n0 rounded-[10px] p-[16px]'>
              <CyDView className='flex flex-row items-center gap-x-[12px]'>
                <CyDImage
                  source={AppImages.SPEND_CONTROL_ICON}
                  className='w-[32px] h-[32px]'
                />
                <CyDText className='text-[18px]'>
                  {t('CARD_SPEND_CONTROLS')}
                </CyDText>
              </CyDView>

              <CyDView className='flex items-center mt-[24px]'>
                <CydProgessCircle
                  className='w-[180px] h-[180px]'
                  progress={
                    get(cardLimits, 'sSt.m', 0) /
                      (get(cardLimits, 'advL.m', 1) || 1) || 0
                  }
                  strokeWidth={13}
                  cornerRadius={30}
                  progressColor='#F7C645'
                />
                <CyDView className='absolute top-[55px] flex items-center justify-center'>
                  <CyDView className='flex flex-row items-start'>
                    <CyDText className='text-[32px] font-bold'>
                      $
                      {Math.floor(get(cardLimits, 'sSt.m', 0)).toLocaleString()}
                    </CyDText>
                    <CyDText className='text-[14px] font-bold mt-[6px] ml-[2px]'>
                      {String(get(cardLimits, 'sSt.m', 0)).split('.')[1]}
                    </CyDText>
                  </CyDView>
                  <CyDText className='text-[12px] text-[#6B7280]'>
                    Spent this month
                  </CyDText>
                </CyDView>
              </CyDView>

              <CyDView className='mt-[24px] mx-[-16px]'>
                <CyDView className='flex flex-row justify-between items-center py-[12px] px-[16px] border-t border-n40'>
                  <CyDText className='text-[16px]'>
                    {t('CARD_DAILY_LIMIT')}
                  </CyDText>
                  <CyDTouchView
                    className='flex flex-row items-center'
                    onPress={() => handleEditLimit('daily')}>
                    <CyDText className='text-[16px] font-medium'>
                      ${cardLimits?.advL?.d?.toLocaleString() ?? 0}
                    </CyDText>
                    <CyDImage
                      source={AppImages.BLUE_EDIT_ICON}
                      className='w-[16px] h-[16px] ml-2'
                    />
                  </CyDTouchView>
                </CyDView>

                <CyDView
                  className={clsx(
                    'flex flex-row justify-between items-center pt-[12px] px-[16px] border-t border-n40',
                    { 'pb-[12px]': !isPremiumUser },
                  )}>
                  <CyDText className='text-[16px]'>
                    {t('CARD_MONTHLY_LIMIT')}
                  </CyDText>
                  <CyDTouchView
                    className='flex flex-row items-center'
                    onPress={() => handleEditLimit('monthly')}>
                    <CyDText className='text-[16px] font-medium'>
                      ${cardLimits?.advL?.m?.toLocaleString() ?? 0}
                    </CyDText>
                    <CyDImage
                      source={AppImages.BLUE_EDIT_ICON}
                      className='w-[16px] h-[16px] ml-2'
                    />
                  </CyDTouchView>
                </CyDView>

                {!isPremiumUser && (
                  <CyDView className='flex flex-row items-center justify-between pt-[16px] px-[16px] border-t border-n40'>
                    <CyDView className='flex flex-row gap-x-[8px]'>
                      <CyDMaterialDesignIcons
                        name='information-outline'
                        size={20}
                        className='text-n200'
                      />
                      <CyDText className='text-[12px] text-n200 w-[176px]'>
                        Get higher spending limit and much more with premium
                      </CyDText>
                    </CyDView>
                    <CyDTouchView
                      className='flex flex-row items-center bg-n20 rounded-[15px] px-[12px] py-[8px]'
                      onPress={() => {
                        void logAnalyticsToFirebase(
                          AnalyticEvent.CARD_CONTROLS_EXPLORE_PREMIUM,
                          {
                            card_id: selectedCardId,
                            card_type: selectedCard?.type,
                          },
                        );
                        setPlanChangeModalVisible(true);
                      }}>
                      <GradientText
                        textElement={
                          <CyDText className='font-extrabold text-[12px]'>
                            {'Explore Premium'}
                          </CyDText>
                        }
                        gradientColors={['#FA9703', '#F89408', '#F6510A']}
                      />
                    </CyDTouchView>
                  </CyDView>
                )}
              </CyDView>
            </CyDView>

            {/* Channel Controls Section */}
            <CyDText className='mt-[16px] text-[14px] text-n200 mb-[8px]'>
              Channel Control
            </CyDText>
            <CyDView className='bg-n0 rounded-[10px] px-[16px]'>
              {/* ATM Withdrawals */}
              <CyDView className='flex flex-row items-center justify-between py-[16px]'>
                <CyDView className='flex flex-row items-center gap-x-[12px]'>
                  <CyDImage
                    source={AppImages.ATM_WITHDRAWAL_ICON}
                    className='w-[32px] h-[32px]'
                  />
                  <CyDText className='text-[16px]'>
                    {t('CARD_ATM_WITHDRAWALS')}
                  </CyDText>
                  <Tooltip
                    isVisible={showAtmWithdrawalTooltip}
                    content={
                      <CyDView className='p-[5px] bg-n40 rounded-[4px]'>
                        <CyDText className='text-[14px] text-base400'>
                          Daily ATM withdrawals are limited to $2,000 and
                          monthly limit is set to $10,000. Additional
                          restrictions may apply based on local ATM networks and
                          regulations.
                        </CyDText>
                      </CyDView>
                    }
                    onClose={() => setShowAtmWithdrawalTooltip(false)}
                    placement='top'
                    backgroundColor='transparent'
                    useInteractionManager={true}
                    contentStyle={{
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                    }}>
                    <CyDTouchView
                      onPress={() => setShowAtmWithdrawalTooltip(true)}>
                      <CyDMaterialDesignIcons
                        name='information-outline'
                        size={16}
                        className='text-n200'
                      />
                    </CyDTouchView>
                  </Tooltip>
                </CyDView>
                <CyDSwitch
                  value={channelControls.atm}
                  onValueChange={async () => await handleChannelToggle('atm')}
                />
              </CyDView>

              {/* Online Transaction */}
              <CyDView className='flex flex-row items-center justify-between py-[16px] border-t border-n40'>
                <CyDView className='flex flex-row items-center gap-x-[12px]'>
                  <CyDImage
                    source={AppImages.ONLINE_TRANSACTIONS_ICON}
                    className='w-[32px] h-[32px]'
                  />
                  <CyDText className='text-[16px]'>Online Transaction</CyDText>
                </CyDView>
                <CyDSwitch
                  value={channelControls.online}
                  onValueChange={async () =>
                    await handleChannelToggle('online')
                  }
                />
              </CyDView>

              {/* Merchant Outlet */}
              {selectedCard?.type === CardType.PHYSICAL && (
                <CyDView className='flex flex-row items-center justify-between py-[16px] border-t border-n40'>
                  <CyDView className='flex flex-row items-center gap-x-[12px]'>
                    <CyDImage
                      source={AppImages.MERCHANT_OUTLET_ICON}
                      className='w-[32px] h-[32px]'
                    />
                    <CyDText className='text-[16px]'>Merchant Outlet</CyDText>
                    <Tooltip
                      isVisible={showMerchantOutletTooltip}
                      content={
                        <CyDView className='p-[5px] bg-n40 rounded-[4px]'>
                          <CyDText className='text-[14px] text-base400'>
                            For in-store purchases where you physically present
                            your card at retail locations, restaurants, and
                            other point-of-sale terminals
                          </CyDText>
                        </CyDView>
                      }
                      onClose={() => setShowMerchantOutletTooltip(false)}
                      placement='top'
                      backgroundColor='transparent'
                      useInteractionManager={true}
                      contentStyle={{
                        backgroundColor: 'transparent',
                        borderWidth: 0,
                      }}>
                      <CyDTouchView
                        onPress={() => setShowMerchantOutletTooltip(true)}>
                        <CyDMaterialDesignIcons
                          name='information-outline'
                          size={16}
                          className='text-n200'
                        />
                      </CyDTouchView>
                    </Tooltip>
                  </CyDView>
                  <CyDSwitch
                    value={channelControls.merchantOutlet}
                    onValueChange={async () =>
                      await handleChannelToggle('merchantOutlet')
                    }
                  />
                </CyDView>
              )}

              {/* Apple Pay and Gpay */}
              <CyDView className='flex flex-row items-center justify-between py-[16px] border-t border-n40'>
                <CyDView className='flex flex-row items-center gap-x-[12px]'>
                  <CyDImage
                    source={AppImages.MOBILE_WALLETS_ICON}
                    className='w-[32px] h-[32px]'
                  />
                  <CyDText className='text-[16px]'>Mobile Wallets</CyDText>
                  <Tooltip
                    isVisible={showMobileWalletTooltip}
                    content={
                      <CyDView className='p-[5px] bg-n40 rounded-[4px]'>
                        <CyDText className='text-[14px] text-base400'>
                          Includes Apple Pay, Google Pay, and other mobile
                          payment solutions
                        </CyDText>
                      </CyDView>
                    }
                    onClose={() => setShowMobileWalletTooltip(false)}
                    placement='top'
                    backgroundColor='transparent'
                    useInteractionManager={true}
                    contentStyle={{
                      backgroundColor: 'transparent',
                      borderWidth: 0,
                    }}>
                    <CyDTouchView
                      onPress={() => setShowMobileWalletTooltip(true)}>
                      <CyDMaterialDesignIcons
                        name='information-outline'
                        size={16}
                        className='text-n200'
                      />
                    </CyDTouchView>
                  </Tooltip>
                </CyDView>
                <CyDSwitch
                  value={channelControls.applePay}
                  onValueChange={async () =>
                    await handleChannelToggle('applePay')
                  }
                />
              </CyDView>
            </CyDView>

            {/* Demographic */}
            <CyDText className='mt-[16px] text-[14px] text-n200 mb-[8px]'>
              Demographic
            </CyDText>
            <CyDView className='bg-n0 rounded-[10px] px-[16px]'>
              {/* Select Country */}
              <CyDTouchView
                className='flex flex-row items-center justify-between py-[16px]'
                onPress={() => {
                  void logAnalyticsToFirebase(
                    AnalyticEvent.CARD_CONTROLS_SELECT_COUNTRY,
                    {
                      card_id: selectedCardId,
                      card_type: selectedCard?.type,
                    },
                  );
                  setIsCountryModalVisible(true);
                }}>
                <CyDView className='flex flex-row items-center gap-x-[12px]'>
                  <CyDImage
                    source={AppImages.SELECT_COUNTRIES_ICON}
                    className='w-[32px] h-[32px]'
                  />
                  <CyDText className='text-[16px]'>Select Country</CyDText>
                </CyDView>
                <CyDIcons
                  name='chevron-right'
                  size={20}
                  className='text-n200'
                />
              </CyDTouchView>
            </CyDView>

            {/* Security Controls */}
            {!(
              currentCardProvider === CardProviders.RAIN_CARD &&
              selectedCard?.type === CardType.VIRTUAL
            ) && (
              <>
                <CyDText className='mt-[16px] text-[14px] text-n200 mb-[8px]'>
                  Security Controls
                </CyDText>
                <CyDView className='bg-n0 rounded-[10px] px-[16px]'>
                  {/* Authentication Method */}
                  {currentCardProvider === CardProviders.REAP_CARD && (
                    <CyDTouchView
                      className='flex flex-row items-center justify-between py-[16px]'
                      onPress={() => setShow3DsModal(true)}>
                      <CyDView className='flex flex-row items-center gap-x-[12px]'>
                        <CyDImage
                          source={AppImages.AUTHENTICATION_METHOD_ICON}
                          className='w-[32px] h-[32px]'
                        />
                        <CyDText className='text-[16px]'>
                          Authentication Method
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex flex-row items-center'>
                        <CyDText className='text-[14px] text-b150'>
                          {isTelegramEnabled ? 'Email' : 'SMS'}
                        </CyDText>
                        <CyDMaterialDesignIcons
                          name='chevron-right'
                          size={16}
                          className='text-base400 ml-2'
                        />
                      </CyDView>
                    </CyDTouchView>
                  )}

                  {/* Card Pin */}

                  <CyDTouchView
                    className='flex flex-row items-center justify-between py-[16px] border-t border-n40'
                    onPress={() => {
                      navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
                        currentCardProvider,
                        card: selectedCard,
                      });
                    }}>
                    <CyDView className='flex flex-row items-center gap-x-[12px]'>
                      <CyDImage
                        source={AppImages.CARD_PIN_ICON}
                        className='w-[32px] h-[32px]'
                      />
                      <CyDText className='text-[16px]'>Card Pin</CyDText>
                    </CyDView>
                    <CyDMaterialDesignIcons
                      name='chevron-right'
                      size={16}
                      className='text-base400 ml-2'
                    />
                  </CyDTouchView>
                </CyDView>
              </>
            )}

            {/* Reset Card Settings */}
            <CyDView className='mt-[16px] bg-n0 rounded-[10px] px-[16px]'>
              <CyDTouchView
                className='flex flex-row items-center py-[16px]'
                onPress={handleResetCardSettings}>
                <CyDText className='text-[16px] text-red400'>
                  Reset Card Settings
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDScrollView>
      </CyDView>

      {/* Daily Limit Modal */}
      <EditLimitModal
        isModalVisible={isDailyLimitModalVisible}
        setIsModalVisible={setIsDailyLimitModalVisible}
        type={SpendLimitType.DAILY}
        currentLimit={cardLimits?.advL?.d ?? 0}
        maxLimit={cardLimits?.cydL?.d ?? cardLimits?.maxLimit.d ?? 0}
        onChangeLimit={async newLimit =>
          await handleLimitChange('daily', newLimit)
        }
        onRequestHigherLimit={handleRequestHigherLimit}
      />

      {/* Monthly Limit Modal */}
      <EditLimitModal
        isModalVisible={isMonthlyLimitModalVisible}
        setIsModalVisible={setIsMonthlyLimitModalVisible}
        type={SpendLimitType.MONTHLY}
        currentLimit={cardLimits?.advL?.m ?? 0}
        maxLimit={cardLimits?.cydL?.m ?? cardLimits?.maxLimit.m ?? 0}
        onChangeLimit={async newLimit =>
          await handleLimitChange('monthly', newLimit)
        }
        onRequestHigherLimit={handleRequestHigherLimit}
      />

      {/* Request Higher Limit Modal */}
      <RequestHigherLimitModal
        isModalVisible={isRequestHigherLimitModalVisible}
        setIsModalVisible={setIsRequestHigherLimitModalVisible}
        onSubmit={handleHigherLimitSubmit}
      />

      <ChooseMultipleCountryModal
        isModalVisible={isCountryModalVisible}
        setModalVisible={setIsCountryModalVisible}
        selectedCountryState={[selectedCountries, handleCountrySelection]}
        allCountriesSelectedState={[
          allCountriesSelected,
          setAllCountriesSelected,
        ]}
        onSaveChanges={handleSaveCountries}
      />

      {/* Authentication Method Modal */}
      <ThreeDSecureOptionModal
        isModalVisible={show3DsModal}
        setModalVisible={setShow3DsModal}
        card={selectedCard}
        currentCardProvider={currentCardProvider as CardProviders}
        isTelegramEnabled={isTelegramEnabled}
        setIsTelegramEnabled={setIsTelegramEnabled}
      />

      <SaveChangesModal
        isModalVisible={showSaveChangesModal}
        setIsModalVisible={setShowSaveChangesModal}
        card={selectedCard}
        onApplyToAllCards={handleApplyToAllCards}
        onApplyToCard={handleApplyToCard}
        onCancel={handleCancelExit}
      />

      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        cardProvider={currentCardProvider as CardProviders}
        cardId={selectedCardId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dropdownContainer: {
    overflow: 'hidden',
    position: 'absolute',
    top: 64, // Height of the card selector
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
