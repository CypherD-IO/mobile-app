import Intercom from '@intercom/intercom-react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { get, isEmpty } from 'lodash';
import moment from 'moment';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import AppImages, { AppImagesMap } from '../../../../assets/images/appImages';
import { GetPhysicalCardComponent } from '../../../components/getPhysicalCardComponent';
import CardProviderSwitch from '../../../components/cardProviderSwitch';
import GradientText from '../../../components/gradientText';
import SelectPlanModal from '../../../components/selectPlanModal';
import ActivityBottomBar from '../../../components/v2/ActivityBottomBar';
import ActivityDetailsModal from '../../../components/v2/ActivityDetailsModal';
import CardTransactionItem from '../../../components/v2/CardTransactionItem';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import OverchargeDccInfoModal from '../../../components/v2/OverchargeDccInfoModal';
import Button from '../../../components/v2/button';
import Loading from '../../../components/v2/loading';
import TermsAndConditionsModal from '../../../components/v2/termsAndConditionsModal';
import { screenTitle } from '../../../constants';
import {
  DateRange,
  STATUSES,
  TYPES,
  initialCardTxnDateRange,
} from '../../../constants/cardPageV2';
import {
  ACCOUNT_STATUS,
  ButtonType,
  CARD_IDS,
  CardApplicationStatus,
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
  CypherPlanId,
  GlobalContextType,
} from '../../../constants/enum';
import { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../../core/analytics';
import { getOverchargeDccInfoModalShown } from '../../../core/asyncStorage';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { isPotentiallyDccOvercharged } from '../../../core/util';
import useActivityPolling from '../../../hooks/useActivityPolling';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { CardFundResponse } from '../../../models/activities.interface';
import usePortfolio from '../../../hooks/usePortfolio';
import { Card, ICardTransaction } from '../../../models/card.model';
import { CardDesign } from '../../../models/cardDesign.interface';
import { CardProfile } from '../../../models/cardProfile.model';
import { PlanInfo } from '../../../models/planInfo.interface';
import {
  CyDFastImage,
  CyDImage,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import CardScreen from '../bridgeCard/card';
import CardTxnFilterModal from './CardTxnFilterModal';
import MerchantSpendRewardWidget from '../../../components/v2/MerchantSpendRewardWidget';
import RewardsEpochModal, {
  IEpochInfo,
  shouldShowRewardsEpochModal,
} from '../../../components/v2/RewardsEpochModal';
import RewardProgressWidget from '../../../components/v2/RewardProgressWidget';
import MerchantRewardDetailContent from '../../../components/v2/MerchantRewardDetailContent';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import { useOnboardingReward } from '../../../contexts/OnboardingRewardContext';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

interface RouteParams {
  cardProvider: CardProviders;
}

export default function CypherCardScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { cardProvider } = route?.params ?? {
    cardProvider: CardProviders.REAP_CARD,
  };
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;
  const [cardBalance, setCardBalance] = useState('0');
  const [currentCardIndex] = useState(0); // Not setting anywhere.
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [
    isTermsAndConditionsModalVisible,
    setIsTermsAndConditionsModalVisible,
  ] = useState(false);
  const [cardDesignData, setCardDesignData] = useState<CardDesign | undefined>(
    undefined,
  );
  const [recentTransactions, setRecentTransactions] = useState<
    ICardTransaction[]
  >([]);
  const [overchargeDccInfoTransactionId, setOverchargeDccInfoTransactionId] =
    useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<{
    types: CardTransactionTypes[];
    dateRange: DateRange;
    statuses: CardTransactionStatuses[];
  }>({
    types: TYPES,
    dateRange: initialCardTxnDateRange,
    statuses: STATUSES,
  });
  const selectedCard = get(cardProfile, [
    cardProvider,
    'cards',
    currentCardIndex,
  ]);
  const cardId = selectedCard?.cardId;
  const isLockdownModeEnabled = get(
    cardProfile,
    ['accountStatus'],
    ACCOUNT_STATUS.ACTIVE,
  );
  const accountStatus = get(cardProfile, ['accountStatus'], '');
  const rcApplicationStatus = get(cardProfile, ['rc', 'applicationStatus'], '');
  const [isLayoutRendered, setIsLayoutRendered] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(
    get(cardProfile, ['planInfo'], null),
  );
  const { getWalletProfile, isLegacyCardClosed, getCardSpendStats } =
    useCardUtilities();
  const { fetchPortfolio, getLocalPortfolio } = usePortfolio();
  const [spendStats, setSpendStats] = useState<{
    isPremiumPlan: boolean;
    amount: number;
    year: string;
    timePeriod: string;
  }>({
    isPremiumPlan: false,
    amount: 0,
    year: '2025-01-01',
    timePeriod: '3 months',
  });
  const [isOverchargeDccInfoModalOpen, setIsOverchargeDccInfoModalOpen] =
    useState(false);
  const [ongoingCardActivities, setOngoingCardActivities] = useState<
    CardFundResponse[]
  >([]);
  const [fundingsCompletedInLast5Mins, setFundingsCompletedInLast5Mins] =
    useState<CardFundResponse[]>([]);
  const [fundingsFailedInLast5Mins, setFundingsFailedInLast5Mins] = useState<
    CardFundResponse[]
  >([]);
  const [selectedActivity, setSelectedActivity] =
    useState<CardFundResponse | null>(null);
  const [isActivityDetailsVisible, setIsActivityDetailsVisible] =
    useState(false);

  // Ref to track timeout IDs for cleanup on unmount
  const removalTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  /**
   * Handles when an ongoing activity is completed
   * Moves it to the completed activities list and sets up auto-removal after 5 minutes
   */
  const handleActivityCompleted = (
    completedActivity: CardFundResponse,
  ): void => {
    // Add completed activity with current timestamp
    const activityWithCompletionTime = {
      ...completedActivity,
      completedAt: Date.now(), // Add completion timestamp
    };

    setFundingsCompletedInLast5Mins(prev => {
      // Check if already exists to avoid duplicates
      const exists = prev.some(
        activity => activity.freshdeskId === completedActivity.freshdeskId,
      );
      if (exists) {
        return prev;
      }
      return [activityWithCompletionTime, ...prev];
    });

    // Auto-remove after 5 minutes (300,000ms)
    const timeoutId = setTimeout(
      () => {
        setFundingsCompletedInLast5Mins(prev =>
          prev.filter(
            activity => activity.freshdeskId !== completedActivity.freshdeskId,
          ),
        );
        // Remove timeout ID from tracking set once executed
        removalTimeoutsRef.current.delete(timeoutId);
      },
      5 * 60 * 1000,
    ); // 5 minutes

    // Track timeout ID for cleanup on unmount
    removalTimeoutsRef.current.add(timeoutId);
  };

  /**
   * Handles when an ongoing activity fails
   * Moves it to the failed activities list and sets up auto-removal after 5 minutes
   */
  const handleActivityFailed = (failedActivity: CardFundResponse): void => {
    // Add failed activity with current timestamp
    const activityWithFailureTime = {
      ...failedActivity,
      failedAt: Date.now(), // Add failure timestamp
    };

    setFundingsFailedInLast5Mins(prev => {
      // Check if already exists to avoid duplicates
      const exists = prev.some(
        activity => activity.freshdeskId === failedActivity.freshdeskId,
      );
      if (exists) {
        return prev;
      }
      return [activityWithFailureTime, ...prev];
    });

    // Auto-remove after 5 minutes (300,000ms)
    const timeoutId = setTimeout(
      () => {
        setFundingsFailedInLast5Mins(prev =>
          prev.filter(
            activity => activity.freshdeskId !== failedActivity.freshdeskId,
          ),
        );
        // Remove timeout ID from tracking set once executed
        removalTimeoutsRef.current.delete(timeoutId);
      },
      5 * 60 * 1000,
    ); // 5 minutes

    // Track timeout ID for cleanup on unmount
    removalTimeoutsRef.current.add(timeoutId);
  };

  /**
   * Cleanup effect to remove completed and failed activities older than 5 minutes
   * Runs every minute to check for expired activities
   */
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      // Cleanup completed activities
      setFundingsCompletedInLast5Mins(prev => {
        const filtered = prev.filter(activity => {
          const completedAt =
            (activity as CardFundResponse & { completedAt?: number })
              .completedAt ?? activity.createdOn * 1000;
          const shouldKeep = completedAt > fiveMinutesAgo;

          return shouldKeep;
        });

        return filtered;
      });

      // Cleanup failed activities
      setFundingsFailedInLast5Mins(prev => {
        const filtered = prev.filter(activity => {
          const failedAt =
            (activity as CardFundResponse & { failedAt?: number }).failedAt ??
            activity.createdOn * 1000;
          const shouldKeep = failedAt > fiveMinutesAgo;

          return shouldKeep;
        });

        return filtered;
      });
    }, 60 * 1000); // Check every minute

    return () => {
      clearInterval(cleanupInterval);
      // Clear all pending removal timeouts to prevent setState on unmounted component
      removalTimeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      removalTimeoutsRef.current.clear();
    };
  }, []);

  // Initialize activity polling hook
  useActivityPolling({
    ongoingActivities: ongoingCardActivities,
    setOngoingActivities: setOngoingCardActivities,
    onActivityCompleted: handleActivityCompleted,
    onActivityFailed: handleActivityFailed,
    pollingInterval: 10000, // 10 seconds to avoid rate limiting
    enabled: true,
  });

  /**
   * Handles removal of completed activities from the carousel
   * Updates the state to remove the activity by quoteId (primary) or freshdeskId (fallback)
   */
  const handleRemoveCompletedActivity = (activityId: string): void => {
    setFundingsCompletedInLast5Mins(prev =>
      prev.filter(activity => {
        const id = activity.quoteId ?? activity.freshdeskId?.toString();
        return id !== activityId;
      }),
    );
  };

  /**
   * Handles removal of failed activities from the carousel
   * Updates the state to remove the activity by quoteId (primary) or freshdeskId (fallback)
   * Handles both activities in failed array and failed activities still in ongoing array
   */
  const handleRemoveFailedActivity = (activityId: string): void => {
    // Check if the activity is in the failed array
    const isInFailedArray = fundingsFailedInLast5Mins.some(activity => {
      const id = activity.quoteId ?? activity.freshdeskId?.toString();
      return id === activityId;
    });

    if (isInFailedArray) {
      // Remove from failed array
      setFundingsFailedInLast5Mins(prev =>
        prev.filter(activity => {
          const id = activity.quoteId ?? activity.freshdeskId?.toString();
          return id !== activityId;
        }),
      );
    } else {
      // Activity might be in ongoing array with failed status
      // Remove from ongoing array
      setOngoingCardActivities(prev =>
        prev.filter(activity => {
          const id = activity.quoteId ?? activity.freshdeskId?.toString();
          return id !== activityId;
        }),
      );
    }
  };

  /**
   * Handles "Know More" action for ongoing activities
   * Opens the activity details modal with the selected activity
   */
  const handleKnowMore = (activity: CardFundResponse): void => {
    setSelectedActivity(activity);
    setIsActivityDetailsVisible(true);
  };

  /**
   * Closes the activity details modal
   */
  const handleCloseActivityDetails = (): void => {
    setIsActivityDetailsVisible(false);
    setSelectedActivity(null);
  };
  const [selectedMerchantData, setSelectedMerchantData] = useState<any>(null);
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();
  const { refreshStatus: refreshOnboardingStatus, statusWiseRewards } =
    useOnboardingReward();

  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  // isPremium = true; // Remove this test line
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  useEffect(() => {
    console.log('C A R D  S C R E E N  M O U N T E D');
    return () => console.log('C A R D  S C R E E N  U N M O U N T E D');
  }, []);

  const onRefresh = async () => {
    void refreshProfile();

    const spendStatsFromAPI = await getCardSpendStats();
    if (spendStatsFromAPI) {
      const premiumDataStats = spendStatsFromAPI?.projectedSavings;
      let amount = 0;
      if (premiumDataStats?.isPremiumPlan) {
        amount =
          Number(premiumDataStats?.projectedFxFeeSaved ?? 0) +
          Number(premiumDataStats?.projectedLoadFeeSaved ?? 0);
      } else {
        amount =
          Number(premiumDataStats?.projectedFxFeeLost ?? 0) +
          Number(premiumDataStats?.projectedLoadFeeLost ?? 0);
      }

      // Calculate months between current date and target year using moment
      const targetDate = moment(premiumDataStats?.year);
      const currentDate = moment();
      const monthsDiff = Math.abs(currentDate.diff(targetDate, 'months'));
      const timePeriod = `${monthsDiff} months`;

      setSpendStats({
        ...spendStats,
        amount,
        isPremiumPlan: premiumDataStats?.isPremiumPlan,
        year: premiumDataStats?.year,
        timePeriod,
      });
    }

    setCardBalance('0');
    if (cardId !== CARD_IDS.HIDDEN_CARD) {
      await fetchCardBalance();
      void fetchRecentTransactions();
      void getCardDesignValues();
    }

    // Ensure portfolio data is available if user landed directly on Card tab
    try {
      const localPortfolio = await getLocalPortfolio();
      if (!localPortfolio) {
        // background fetch; we ignore result here as other screens will read from storage
        void fetchPortfolio();
      }
    } catch (e) {
      console.warn('Portfolio fetch failed in Card screen', e);
    }

    if (!isLayoutRendered) {
      setIsLayoutRendered(true);
    }
  };

  useEffect(() => {
    if (isFocused) {
      void onRefresh();
      void refreshOnboardingStatus();
    }
  }, [isFocused, cardProvider]);

  useEffect(() => {
    void getCardDesignValues();
  }, [isFocused, cardId]);

  const checkForOverchargeDccInfo = async (
    transactions: ICardTransaction[],
  ) => {
    const overchargeTransactions = transactions.filter(transaction =>
      isPotentiallyDccOvercharged(transaction),
    );
    const lastOverchargeTransactionIdStored =
      await getOverchargeDccInfoModalShown();
    if (
      lastOverchargeTransactionIdStored !== 'true' &&
      lastOverchargeTransactionIdStored !== overchargeTransactions[0]?.id &&
      overchargeTransactions.length > 0
    ) {
      setOverchargeDccInfoTransactionId(overchargeTransactions[0]?.id);
      setIsOverchargeDccInfoModalOpen(true);
    }
  };

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    setPlanInfo(get(data, ['planInfo'], null));
    if (cardProvider !== CardProviders.PAYCADDY) {
      if (selectedCard?.cardProvider === CardProviders.REAP_CARD) {
        setIsTermsAndConditionsModalVisible(
          !get(data, [cardProvider, 'termsAgreedOn'], 0),
        );
      }
    }
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const fetchCardBalance = async () => {
    setBalanceLoading(true);
    const url = `/v1/cards/${cardProvider}/card/${String(cardId)}/balance`;
    try {
      const response = await getWithAuth(url);
      if (!response.isError && response?.data && response.data.balance) {
        setCardBalance(String(response.data.balance));
      } else {
        setCardBalance('NA');
      }
    } catch (error) {
      Sentry.captureException(error);
      setCardBalance('NA');
    }
    setBalanceLoading(false);
  };

  const fetchRecentTransactions = async () => {
    const txnURL = `/v1/cards/${cardProvider}/card/transactions?newRoute=true&limit=10&includeRewards=true`;
    console.log('C A R D  I D :', cardId);
    const response = await getWithAuth(txnURL);
    if (!response.isError) {
      const { transactions: txnsToSet } = response.data;
      txnsToSet.sort((a: ICardTransaction, b: ICardTransaction) => {
        // Use a fallback approach since 'date' field might not exist
        const aTransaction = a as ICardTransaction & {
          date?: number;
          createdAt?: number;
        };
        const bTransaction = b as ICardTransaction & {
          date?: number;
          createdAt?: number;
        };
        const aTime = aTransaction.date ?? aTransaction.createdAt ?? 0;
        const bTime = bTransaction.date ?? bTransaction.createdAt ?? 0;
        return aTime < bTime ? 1 : -1;
      });
      await checkForOverchargeDccInfo(txnsToSet);
      setRecentTransactions(txnsToSet.slice(0, 5));
    }
  };

  const onCardActivationConfirmation = (card: Card) => {
    navigation.navigate(screenTitle.CARD_ACTIAVTION_SCREEN, {
      currentCardProvider: cardProvider,
      card,
    });
  };

  const getCardDesignValues = async () => {
    const response = await getWithAuth('/v1/cards/designs');
    if (!response.isError) {
      const cardDesignValues: CardDesign = response.data;
      setCardDesignData(cardDesignValues);
    }
  };

  const onGetAdditionalCard = () => {
    navigation.navigate(screenTitle.SELECT_ADDITIONAL_CARD, {
      currentCardProvider: cardProvider,
      cardDesignData,
      cardBalance,
    });
  };

  const onPressActivateCard = (card: Card) => {
    onCardActivationConfirmation(card);
  };

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.LOCKDOWN_MODE_AUTH, {
      onSuccess: () => {
        showModal('state', {
          type: 'success',
          title: t('Lockdown mode disabled'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      },
      currentCardProvider: cardProvider,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });
  };

  const shouldBlockAction = () => {
    if (
      isLockdownModeEnabled === ACCOUNT_STATUS.LOCKED &&
      cardProvider === CardProviders.REAP_CARD
    ) {
      return true;
    }
    return false;
  };

  const shouldShowLocked = () => {
    if (
      cardBalance !== 'NA' &&
      accountStatus === ACCOUNT_STATUS.INACTIVE &&
      Number(cardBalance) < 0
    ) {
      return true;
    }
    return false;
  };

  const shouldShowActionNeeded = () => {
    if (
      cardBalance !== 'NA' &&
      accountStatus === ACCOUNT_STATUS.ACTIVE &&
      Number(cardBalance) < 0
    ) {
      return true;
    }
    return false;
  };

  const shouldShowContactSupport = () => {
    if (
      cardBalance !== 'NA' &&
      accountStatus === ACCOUNT_STATUS.INACTIVE &&
      Number(cardBalance) > 0
    ) {
      return true;
    }
    return false;
  };

  // Show merchant detail sheet
  const showMerchantDetailSheet = (merchant: any) => {
    console.log('Showing merchant detail for:', merchant?.name);

    setSelectedMerchantData(merchant);

    showBottomSheet({
      id: 'merchant-detail',
      snapPoints: ['80%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      backgroundColor: isDarkMode ? '#595959' : '#FFFFFF',
      content: (
        <MerchantRewardDetailContent
          merchantData={merchant}
          onKnowMorePress={() => {
            console.log('Know More pressed for:', merchant?.name);
          }}
          onRemoveBoosterPress={() => {
            console.log('Remove booster pressed for:', merchant?.name);
          }}
        />
      ),
      onClose: () => {
        console.log('Merchant detail modal closed');
        setSelectedMerchantData(null);
      },
    });
  };

  const handleViewAllMerchants = () => {
    console.log('Navigating to Merchant Reward List screen');
    navigation.navigate(screenTitle.MERCHANT_REWARD_LIST);
  };

  const handleDirectMerchantPress = (merchant: any) => {
    console.log('Direct merchant press:', merchant?.name);
    showMerchantDetailSheet(merchant);
  };

  const onPressFundCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      navigation,
      currentCardProvider: cardProvider,
      currentCardIndex: 0,
    });
  };

  return isLayoutRendered ? (
    <CyDSafeAreaView
      className={clsx('flex-1 bg-n20', {
        'bg-red400': shouldShowLocked(),
        'bg-p40': shouldShowActionNeeded() || shouldShowContactSupport(),
      })}>
      <CyDView className='flex-1'>
        <CyDView className='flex-1'>
          <TermsAndConditionsModal
            isModalVisible={isTermsAndConditionsModalVisible}
            setIsModalVisible={setIsTermsAndConditionsModalVisible}
            cardProvider={selectedCard?.cardProvider}
            onAgree={() => {
              setIsTermsAndConditionsModalVisible(false);
              void refreshProfile();
            }}
            onCancel={() => {
              setIsTermsAndConditionsModalVisible(false);
              setTimeout(() => {
                navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
              }, MODAL_HIDE_TIMEOUT_250);
            }}
          />
          <OverchargeDccInfoModal
            isModalVisible={isOverchargeDccInfoModalOpen}
            setModalVisible={setIsOverchargeDccInfoModalOpen}
            transactionId={overchargeDccInfoTransactionId}
          />

          <SelectPlanModal
            isModalVisible={planChangeModalVisible}
            setIsModalVisible={setPlanChangeModalVisible}
            cardProvider={cardProvider}
            cardId={cardId}
          />

          {(shouldShowLocked() ||
            shouldShowActionNeeded() ||
            shouldShowContactSupport()) && (
            <CyDView
              className={clsx('p-4', {
                'bg-p40':
                  shouldShowActionNeeded() || shouldShowContactSupport(),
                'bg-red400': shouldShowLocked(),
              })}>
              <CyDView className='flex flex-row gap-x-2'>
                <CyDMaterialDesignIcons
                  name={shouldShowLocked() ? 'lock' : 'alert'}
                  size={24}
                  className={clsx('text-black', {
                    'text-white': shouldShowLocked(),
                  })}
                />
                <CyDText
                  className={clsx('font-semibold text-[16px]', {
                    'text-black':
                      shouldShowActionNeeded() || shouldShowContactSupport(),
                    'text-white': shouldShowLocked(),
                  })}>
                  {shouldShowLocked()
                    ? t('ACCOUNT_LOCKED')
                    : shouldShowActionNeeded()
                      ? t('ACCOUNT_ACTION_NEEDED')
                      : t('CONTACT_SUPPORT')}
                </CyDText>
              </CyDView>
              <CyDText
                className={clsx('mt-2', {
                  'text-black':
                    shouldShowActionNeeded() || shouldShowContactSupport(),
                  'text-white': shouldShowLocked(),
                })}>
                {shouldShowLocked()
                  ? t('ACCOUNT_LOCKED_DESCRIPTION')
                  : shouldShowActionNeeded()
                    ? t('ACCOUNT_ACTION_NEEDED_DESCRIPTION')
                    : t('ACCOUNT_INACTIVE_DESCRIPTION')}
              </CyDText>
              {shouldShowContactSupport() && (
                <CyDTouchView
                  className='mt-2 px-3 py-2 rounded-lg bg-white w-[135px]'
                  onPress={() => {
                    void Intercom.present();
                  }}>
                  <CyDText className='text-black font-medium text-[14px]'>
                    {t('CONTACT_SUPPORT')}
                  </CyDText>
                </CyDTouchView>
              )}
            </CyDView>
          )}

          {/* TXN FILTER MODAL */}
          <CardTxnFilterModal
            navigation={navigation}
            modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
            filterState={[filter, setFilter]}
          />

          <CyDView className='bg-n20  px-[16px] mt-[4px]'>
            {!(
              shouldShowLocked() ||
              shouldShowActionNeeded() ||
              shouldShowContactSupport()
            ) && (
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDView>
                  <CyDText className='font-extrabold text-[26px] text-base100'>
                    Cards
                  </CyDText>
                </CyDView>
                <CyDTouchView
                  className='bg-n40 rounded-full p-[8px] flex flex-row items-center'
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'We have moved the options to the new screen',
                      text2: 'You can access all the settings from here',
                    });
                    navigation.navigate(screenTitle.OPTIONS);
                  }}>
                  <CyDMaterialDesignIcons
                    name={'hammer-screwdriver'}
                    size={16}
                    className='text-base400'
                  />
                  <CyDText className='font-bold text-[12px] text-base400 ml-[7px]'>
                    {t('OPTIONS')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            )}

            <CardProviderSwitch />

            {/* {isShippingFeeConsentModalVisible && (
          <ShippingFeeConsentModal
            isModalVisible={isShippingFeeConsentModalVisible}
            feeAmount={String(cardFee)}
            onFailure={() => {
              setIsShippingFeeConsentModalVisible(false);
            }}
          />
        )} */}

            {/* balance and add funds/activate card */}
            <CyDView className={'h-[60px] mt-[24px]'}>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDView>
                  <CyDText className={'font-semibold text-[10px]'}>
                    {t<string>('TOTAL_BALANCE') + ' (USD)'}
                  </CyDText>
                  <CyDView className='flex flex-row justify-between items-center'>
                    {!balanceLoading ? (
                      <CyDTouchView
                        onPress={() => {
                          void fetchCardBalance();
                        }}>
                        <CyDView className='flex flex-row items-center justify-start gap-x-[8px]'>
                          <CyDText
                            className={clsx('font-bold text-[28px]', {
                              'text-red400':
                                shouldShowLocked() || shouldShowActionNeeded(),
                            })}>
                            {(cardBalance !== 'NA' ? '$ ' : '') +
                              (cardBalance ?? 0)}
                          </CyDText>
                          <CyDMaterialDesignIcons
                            name='refresh'
                            size={20}
                            className='text-base400'
                          />
                        </CyDView>
                      </CyDTouchView>
                    ) : (
                      <CyDLottieView
                        source={AppImages.LOADER_TRANSPARENT}
                        autoPlay
                        loop
                        style={style.loaderStyle}
                      />
                    )}
                  </CyDView>
                </CyDView>
                <CyDView className={'h-[36px] w-[42%]'}>
                  <Button
                    icon={
                      <CyDMaterialDesignIcons
                        name='plus'
                        size={20}
                        className='text-black mr-[4px]'
                      />
                    }
                    disabled={shouldBlockAction()}
                    onPress={() => {
                      onPressFundCard();
                    }}
                    style='h-[42px] py-[8px] px-[12px] rounded-[6px]'
                    // imageStyle={'mr-[4px] h-[12px] w-[12px]'}
                    title={t('ADD_FUNDS')}
                    titleStyle='text-[14px] text-black font-extrabold'
                  />
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDScrollView
            showsVerticalScrollIndicator={false}
            className='bg-n20 '>
            {cardId !== CARD_IDS.HIDDEN_CARD &&
              cardProvider === CardProviders.PAYCADDY && (
                <CyDView className='mx-[16px] my-[12px] bg-n0 rounded-[16px] p-[8px]'>
                  {rcApplicationStatus !== CardApplicationStatus.COMPLETED ? (
                    <CyDText className='text-[12px] font-medium'>
                      {
                        'Important: Complete KYC, get your new VISA card, and transfer funds from your Legacy card to your VISA card by November to avoid losing your balance.'
                      }
                    </CyDText>
                  ) : (
                    <CyDText className='text-[12px] font-medium'>
                      {
                        'Important: Transfer funds from your Legacy card to your VISA card by November to avoid losing your balance.'
                      }
                    </CyDText>
                  )}
                </CyDView>
              )}

            <CyDView
              className={clsx(
                'flex flex-row items-center mx-[16px] mt-[12px]',
                {
                  'justify-between': cardId !== CARD_IDS.HIDDEN_CARD,
                  'justify-end': cardId === CARD_IDS.HIDDEN_CARD,
                },
              )}>
              {cardId !== CARD_IDS.HIDDEN_CARD &&
                cardProvider === CardProviders.PAYCADDY && (
                  <CyDView className='flex flex-row justify-center items-center w-full'>
                    <Button
                      disabled={
                        shouldBlockAction() ||
                        (!isEmpty(cardBalance) && cardBalance === 'NA') ||
                        rcApplicationStatus !== CardApplicationStatus.COMPLETED
                      }
                      onPress={() => {
                        navigation.navigate(screenTitle.MIGRATE_FUNDS, {
                          cardId,
                          currentCardProvider: cardProvider,
                        });
                      }}
                      image={AppImages.MIGRATE_FUNDS_ICON}
                      style={'p-[9px] rounded-[6px] border-[0px]'}
                      imageStyle={'mr-[3px] h-[14px] w-[24px]'}
                      title={t('MOVE_FUNDS_TO_NEW_CARD')}
                      titleStyle={'text-[12px] font-semibold'}
                      type={ButtonType.SECONDARY}
                    />
                  </CyDView>
                )}
            </CyDView>

            {shouldBlockAction() && (
              <CyDView className='rounded-[16px] bg-red20 border-[1px] border-red300 p-[14px] m-[16px]'>
                <CyDText className='text-[18px] font-[700] text-red300'>
                  {'Your account has been locked'}
                </CyDText>
                <CyDText className='text-[14px] font-[500] mt-[6px]'>
                  {
                    'Since, you have enabled lockdown mode, your card load and transactions will be completely disabled '
                  }
                </CyDText>
                <CyDTouchView
                  onPress={() => {
                    void verifyWithOTP();
                  }}>
                  <CyDText className='underline font-[700] text-[14px] mt-[6px]'>
                    Disable lockdown mode
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            )}

            {cardDesignData && (
              <CyDView className='mt-[2px]'>
                <CardScreen
                  navigation={navigation}
                  currentCardProvider={cardProvider}
                  onGetAdditionalCard={onGetAdditionalCard}
                  onPressActivateCard={onPressActivateCard}
                  refreshProfile={() => {
                    void refreshProfile();
                  }}
                  cardDesignData={cardDesignData}
                  isAccountLocked={
                    shouldBlockAction() ||
                    shouldShowLocked() ||
                    shouldShowContactSupport()
                  }
                />
              </CyDView>
            )}

            <CyDView className='w-full bg-n0 mt-[26px] pb-[120px] pt-[16px] gap-y-[16px]'>
              {cardId === CARD_IDS.HIDDEN_CARD && (
                <CyDView className='mx-[16px]'>
                  <LinearGradient
                    colors={['#4575F7', '#3155B4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={style.loadCardGradientContainer}>
                    <CyDView>
                      <CyDView className='flex flex-row items-center gap-x-[12px]'>
                        <CyDFastImage
                          source={AppImages.FALLING_COINS_3D}
                          className='h-[46px] w-[32px]'
                          resizeMode='contain'
                        />
                        <CyDView className='flex flex-col flex-1'>
                          <CyDText className='text-[20px] font-[500] mb-[4px] text-white'>
                            {t<string>('LOAD_YOUR_CARD')}
                          </CyDText>
                          <CyDText className='text-[14px] font-[400] mb-[16px] text-white'>
                            {t<string>('LOAD_YOUR_CARD_DESCRIPTION')}
                          </CyDText>
                        </CyDView>
                      </CyDView>
                    </CyDView>
                  </LinearGradient>
                </CyDView>
              )}
              <GetPhysicalCardComponent
                cardProfile={cardProfile}
                cardProvider={cardProvider}
                cardDesignData={cardDesignData}
                cardBalance={cardBalance}
              />
              {hasSecuredSlot && <RewardProgressWidget />}
              <MerchantSpendRewardWidget
                onViewAllPress={handleViewAllMerchants}
                onMerchantPress={handleDirectMerchantPress}
                isPremium={planInfo?.planId === CypherPlanId.PRO_PLAN}
              />
              {cardId !== CARD_IDS.HIDDEN_CARD && (
                <CyDView className='mx-[16px]'>
                  <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
                    {t<string>('RECENT_TRANSACTIONS')}
                  </CyDText>
                  {recentTransactions.length ? (
                    <CyDView className='border-[1px] border-n40 rounded-[8px] pt-[12px]'>
                      {recentTransactions.map((transaction, index) => {
                        return (
                          <CardTransactionItem item={transaction} key={index} />
                        );
                      })}
                      <CyDTouchView
                        className='bg-n0 flex flex-row justify-center items-center py-[16px] rounded-b-[22px]'
                        onPress={() =>
                          navigation.navigate(
                            screenTitle.CARD_TRANSACTIONS_SCREEN,
                            {
                              navigation,
                              cardProvider,
                            },
                          )
                        }>
                        <CyDText className='text-[14px] font-bold'>
                          {t<string>('VIEW_ALL_TRANSACTIONS')}
                        </CyDText>
                        <CyDMaterialDesignIcons
                          name='chevron-right'
                          size={24}
                          className='text-base400'
                        />
                      </CyDTouchView>
                    </CyDView>
                  ) : (
                    <CyDView className='border-[1px] border-n40 rounded-[22px] py-[24px] justify-start items-center'>
                      <CyDFastImage
                        source={AppImages.NO_TRANSACTIONS_YET}
                        className='h-[150px] w-[150px]'
                        resizeMode='contain'
                      />
                    </CyDView>
                  )}
                </CyDView>
              )}
              {cardProfile && isLegacyCardClosed(cardProfile) && (
                <CyDView className='mx-[16px]'>
                  <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
                    {t<string>('OTHERS')}
                  </CyDText>
                  <CyDTouchView
                    className='border-[1.2px] border-n20 flex flex-row justify-center items-center py-[16px] rounded-[16px]'
                    onPress={() =>
                      navigation.navigate(
                        screenTitle.CARD_TRANSACTIONS_SCREEN,
                        {
                          navigation,
                          cardProvider: CardProviders.PAYCADDY,
                        },
                      )
                    }>
                    <CyDText className='text-[14px] font-bold'>
                      {t<string>('LEGACY_CARD_TRANSACTIONS')}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='arrow-right-thin'
                      size={24}
                      className='text-base400'
                    />
                  </CyDTouchView>
                </CyDView>
              )}
              {planInfo?.planId !== CypherPlanId.PRO_PLAN && (
                <CyDView className='mx-[16px] bg-p10 p-6 rounded-xl'>
                  <CyDView className='flex flex-row items-center gap-x-[4px] justify-center'>
                    <CyDText className='font-extrabold text-[20px]'>
                      {'Cypher'}
                    </CyDText>
                    <GradientText
                      textElement={
                        <CyDText className='font-extrabold text-[20px]'>
                          {'Premium'}
                        </CyDText>
                      }
                      gradientColors={['#FA9703', '#F89408', '#F6510A']}
                    />
                  </CyDView>
                  <CyDView className='mt-[16px]'>
                    {spendStats.amount > 20 ? (
                      <CyDView>
                        <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                          <CyDText className='font-medium text-[14px] text-base200'>
                            {'You could have saved'}
                          </CyDText>

                          <LinearGradient
                            colors={['#FA9703', '#F7510A', '#FA9703']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            locations={[0, 0.5, 1]}
                            style={style.gradientStyle}>
                            <CyDText className='font-semibold text-[14px] text-white'>
                              {`$${spendStats.amount}`}
                            </CyDText>
                          </LinearGradient>
                          <CyDText className='font-medium text-[14px] text-base200 text-center'>
                            {'in'}
                          </CyDText>
                        </CyDView>
                        <CyDText className='font-medium text-[14px] text-base200 text-center'>
                          {`last ${spendStats.timePeriod} and also get a free \nMetal card`}
                        </CyDText>
                      </CyDView>
                    ) : (
                      <CyDView className='self-center'>
                        <CyDText className='font-medium text-[14px] text-center text-base200'>
                          {'Save more on each transaction and'}
                        </CyDText>
                        <CyDText className='text-[14px] font-medium text-center text-base200'>
                          {'get a free premium metal card'}
                        </CyDText>
                      </CyDView>
                    )}
                  </CyDView>
                  <CyDView className='mt-[16px] flex flex-row justify-between items-center mx-[16px]'>
                    <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                      <CyDMaterialDesignIcons
                        name='check-bold'
                        size={18}
                        className='text-base400'
                      />
                      <CyDText className='font-semibold text-[12px]'>
                        {'Zero Forex Markup'}
                      </CyDText>
                    </CyDView>
                    <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                      <CyDMaterialDesignIcons
                        name='check-bold'
                        size={18}
                        className='text-base400'
                      />
                      <CyDText className='font-semibold text-[12px]'>
                        {'Zero USDC Load Fee'}
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  <Button
                    title={'Explore Premium'}
                    type={ButtonType.DARK}
                    onPress={() => {
                      setPlanChangeModalVisible(true);
                      void logAnalyticsToFirebase(
                        AnalyticEvent.EXPLORE_PREMIUM_CARD_PAGE_CTA,
                      );
                    }}
                    style='h-[42px] py-[8px] px-[12px] rounded-[4px] mt-[16px] bg-black'
                    titleStyle='text-[14px] text-white font-semibold'
                  />
                </CyDView>
              )}
            </CyDView>
          </CyDScrollView>
        </CyDView>

        {/* Activity Bottom Bar - Fixed at bottom */}
        <ActivityBottomBar
          ongoingCardActivities={ongoingCardActivities}
          fundingsCompletedInLast5Mins={fundingsCompletedInLast5Mins}
          fundingsFailedInLast5Mins={fundingsFailedInLast5Mins}
          onRemoveCompletedActivity={handleRemoveCompletedActivity}
          onRemoveFailedActivity={handleRemoveFailedActivity}
          onKnowMore={handleKnowMore}
        />

        {/* Activity Details Modal */}
        <ActivityDetailsModal
          isVisible={isActivityDetailsVisible}
          onClose={handleCloseActivityDetails}
          setIsVisible={setIsActivityDetailsVisible}
          activity={selectedActivity}
          ongoingActivities={ongoingCardActivities}
          completedActivities={fundingsCompletedInLast5Mins}
          failedActivities={fundingsFailedInLast5Mins}
        />
      </CyDView>
    </CyDSafeAreaView>
  ) : (
    <Loading />
  );
}
const style = StyleSheet.create({
  loaderStyle: {
    height: 38,
  },
  gradientStyle: {
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  loadCardGradientContainer: {
    borderRadius: 12,
    padding: 16,
  },
});
