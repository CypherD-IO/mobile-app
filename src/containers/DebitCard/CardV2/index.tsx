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
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  withSpring,
  withTiming,
  Easing,
  WithSpringConfig,
  EntryAnimationsValues,
  ExitAnimationsValues,
  EntryExitAnimationFunction,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../assets/images/appImages';
import { getCardColorByHex } from '../../../constants/cardColours';
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
  CardStatus,
  CardTransactionStatuses,
  CardTransactionTypes,
  CardType,
  ConnectionTypes,
  CypherPlanId,
  GlobalContextType,
  PhysicalCardType,
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
  CyDIcons,
  CyDImage,
  CyDImageBackground,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import CardTagBadge from '../../../components/CardTagBadge';
import CardScreen from '../bridgeCard/card';
import CardTxnFilterModal from './CardTxnFilterModal';
import MerchantSpendRewardWidget from '../../../components/v2/MerchantSpendRewardWidget';
import RewardProgressWidget from '../../../components/v2/RewardProgressWidget';
import MerchantRewardDetailContent from '../../../components/v2/MerchantRewardDetailContent';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import { useOnboardingReward } from '../../../contexts/OnboardingRewardContext';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import useConnectionManager from '../../../hooks/useConnectionManager';
import CyDTokenValue from '../../../components/v2/tokenValue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FreeSafepalClaimContent, {
  STORAGE_KEY_DISMISSED_PREMIUM,
  STORAGE_KEY_DISMISSED_NON_PREMIUM,
  SAFEPAL_BOTTOM_SHEET_ID,
} from '../../../components/v2/freeSafepalClaimModal';

const STACK_COMPRESSION_PER_CARD = 340;

const DECK_SPRING: WithSpringConfig = {
  damping: 28,
  stiffness: 25,
  mass: 2.2,
};

const createDeckSpreadEntering = (
  index: number,
): EntryExitAnimationFunction => {
  'worklet';
  return (targetValues: EntryAnimationsValues) => {
    'worklet';
    const offset = -(index * STACK_COMPRESSION_PER_CARD);
    const stiffness = Math.max((DECK_SPRING.stiffness ?? 120) - index * 5, 40);
    return {
      initialValues: {
        originY: targetValues.targetOriginY + offset,
        opacity: index > 2 ? 0 : 1,
      },
      animations: {
        originY: withSpring(targetValues.targetOriginY, {
          ...DECK_SPRING,
          stiffness,
        }),
        opacity: index > 2 ? withSpring(1, DECK_SPRING) : 1,
      },
    };
  };
};

const STACK_SCALES = [1.0, 0.843, 0.703] as const;

const COLLAPSE_SPRING: WithSpringConfig = {
  damping: 26,
  stiffness: 28,
  mass: 2.0,
};

const COLLAPSE_FADE_DURATION = 600;
const COLLAPSE_FADE_DELAY = 350;

const createDeckCollapseExiting = (
  index: number,
  _totalCards: number,
): EntryExitAnimationFunction => {
  'worklet';
  return (values: ExitAnimationsValues) => {
    'worklet';

    if (index > 2) {
      return {
        initialValues: {
          originY: values.currentOriginY,
          opacity: 1,
        },
        animations: {
          originY: values.currentOriginY,
          opacity: withTiming(0, { duration: 250 }),
        },
      };
    }

    const offset = -(index * STACK_COMPRESSION_PER_CARD);
    const targetScale = STACK_SCALES[index] ?? 0.7;

    return {
      initialValues: {
        originY: values.currentOriginY,
        opacity: 1,
        transform: [{ scale: 1 }],
      },
      animations: {
        originY: withSpring(values.currentOriginY + offset, COLLAPSE_SPRING),
        transform: [{ scale: withSpring(targetScale, COLLAPSE_SPRING) }],
        opacity: withTiming(0, {
          duration: COLLAPSE_FADE_DURATION,
          easing: Easing.in(Easing.ease),
        }),
      },
    };
  };
};

interface RouteParams {
  cardProvider: CardProviders;
}

const CARD_TRANSACTIONS_SHEET_ID = 'card-transactions-sheet';

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
  const [currentCardIndex] = useState(0);
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
  const { connectionType, checkMfaEnabled } = useConnectionManager();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 65 : 50;
  const tabBarTotalHeight = TAB_BAR_HEIGHT + insets.bottom;
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
  const [showAllCards, setShowAllCards] = useState(false);
  const UNIFIED_SNAP_POINTS = useMemo(() => ['12%', '58%', '85%'], []);
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

  // Free Safepal claim modal
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkSafepalModal = async (): Promise<void> => {
      try {
        const isPremiumUser =
          get(globalContext?.globalState, [
            'cardProfile',
            'planInfo',
            'planId',
          ]) === CypherPlanId.PRO_PLAN;
        const storageKey = isPremiumUser
          ? STORAGE_KEY_DISMISSED_PREMIUM
          : STORAGE_KEY_DISMISSED_NON_PREMIUM;
        const dismissed = await AsyncStorage.getItem(storageKey);

        if (dismissed !== 'true') {
          timer = setTimeout(() => {
            showBottomSheet({
              id: SAFEPAL_BOTTOM_SHEET_ID,
              snapPoints: [Platform.OS === 'android' ? '90%' : '88%'],
              showCloseButton: false,
              showHandle: false,
              scrollable: false,
              backgroundColor: '#131426',
              borderRadius: 24,
              content: (
                <FreeSafepalClaimContent
                  onDismiss={() => hideBottomSheet(SAFEPAL_BOTTOM_SHEET_ID)}
                  navigation={navigation}
                  isPremiumUser={isPremiumUser}
                />
              ),
            });
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking safepal modal status', error);
      }
    };

    if (isFocused && isLayoutRendered) {
      void checkSafepalModal();
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isFocused, isLayoutRendered, globalContext?.globalState?.cardProfile?.planInfo?.planId]);

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
    const timeoutId = setTimeout(() => {
      setFundingsCompletedInLast5Mins(prev =>
        prev.filter(
          activity => activity.freshdeskId !== completedActivity.freshdeskId,
        ),
      );
      // Remove timeout ID from tracking set once executed
      removalTimeoutsRef.current.delete(timeoutId);
    }, 5 * 60 * 1000); // 5 minutes

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
    const timeoutId = setTimeout(() => {
      setFundingsFailedInLast5Mins(prev =>
        prev.filter(
          activity => activity.freshdeskId !== failedActivity.freshdeskId,
        ),
      );
      // Remove timeout ID from tracking set once executed
      removalTimeoutsRef.current.delete(timeoutId);
    }, 5 * 60 * 1000); // 5 minutes

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
  const [showTooltip, setShowTooltip] = useState(false);
  const { showBottomSheet, hideBottomSheet, snapSheetToIndex } =
    useGlobalBottomSheet();
  const { refreshStatus: refreshOnboardingStatus, statusWiseRewards } =
    useOnboardingReward();

  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

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

  useEffect(() => {
    if (
      connectionType &&
      [
        ConnectionTypes.SOCIAL_LOGIN_EVM,
        ConnectionTypes.SOCIAL_LOGIN_SOLANA,
      ].includes(connectionType)
    ) {
      void checkMfaEnabled();
    }
  }, [connectionType, isFocused]);

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
    setSelectedMerchantData(merchant);

    showBottomSheet({
      id: 'merchant-detail',
      snapPoints: ['80%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      // We render a custom handle indicator inside the blurred header for better visual cohesion.
      showHandle: false,
      scrollable: true,
      backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
      content: (
        <MerchantRewardDetailContent
          merchantData={merchant}
          navigation={navigation}
        />
      ),
      onClose: () => {
        setSelectedMerchantData(null);
      },
    });
  };

  const handleViewAllMerchants = () => {
    navigation.navigate(screenTitle.MERCHANT_REWARD_LIST);
  };

  const handleDirectMerchantPress = (merchant: any) => {
    showMerchantDetailSheet(merchant);
  };

  const onPressFundCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      currentCardProvider: cardProvider,
      currentCardIndex: 0,
    });
  };

  const getCardImage = (card: Card): any => {
    const isLocked =
      shouldBlockAction() || shouldShowLocked() || shouldShowContactSupport();

    if (cardProvider === CardProviders.REAP_CARD) {
      if (isLocked) {
        if (card.type === CardType.PHYSICAL) {
          if (card?.physicalCardType === PhysicalCardType.METAL) {
            return AppImages.RC_METAL_DISABLED;
          }
          return AppImages.RC_PHYSICAL_DISABLED;
        }
        return AppImages.RC_VIRTUAL_DISABLED;
      }
      if (card.type === CardType.VIRTUAL && card.cardColor) {
        return getCardColorByHex(card.cardColor).cardImage;
      }
      return {
        uri: `${CYPHER_CARD_IMAGES}/${card.type}-${card.designId ?? ''}.png`,
      };
    } else {
      if (card.type === CardType.PHYSICAL) {
        return AppImages.PHYSICAL_CARD_MASTER;
      }
      return AppImages.VIRTUAL_CARD_MASTER;
    }
  };

  const allDisplayableCards = useMemo((): Card[] => {
    const cards = get(cardProfile, [cardProvider, 'cards'], []) as Card[];
    const filtered = cards.filter(
      (card: Card) =>
        card.status !== CardStatus.ADDITIONAL_CARD &&
        card.status !== CardStatus.RC_UPGRADABLE &&
        card.status !== CardStatus.HIDDEN &&
        card.cardId !== CARD_IDS.METAL_CARD,
    );
    const frozenStatuses = [CardStatus.IN_ACTIVE, CardStatus.BLOCKED];
    return [
      ...filtered.filter(c => !frozenStatuses.includes(c.status as CardStatus)),
      ...filtered.filter(c => frozenStatuses.includes(c.status as CardStatus)),
    ];
  }, [cardProfile, cardProvider]);

  useEffect(() => {
    if (allDisplayableCards.length > 0) {
      const imagesToPreload = allDisplayableCards
        .filter(card => card.type && card.designId)
        .filter(card => !(card.type === CardType.VIRTUAL && card.cardColor))
        .map(card => ({
          uri: `${CYPHER_CARD_IMAGES}/${card.type}-${card.designId ?? ''}.png`,
        }));
      if (imagesToPreload.length > 0) {
        FastImage.preload(imagesToPreload);
      }
    }
  }, [allDisplayableCards]);

  const deckSpreadAnimations = useMemo(
    () => allDisplayableCards.map((_, i) => createDeckSpreadEntering(i)),
    [allDisplayableCards.length],
  );
  const deckCollapseAnimations = useMemo(
    () =>
      allDisplayableCards.map((_, i) =>
        createDeckCollapseExiting(i, allDisplayableCards.length),
      ),
    [allDisplayableCards.length],
  );

  const renderAllCardsContent = (): React.ReactElement => {
    return (
      <CyDView className='pt-[8px] gap-y-[16px] px-[16px]'>
        {allDisplayableCards.map((card, index) => {
          const cardLabel =
            card.type === CardType.PHYSICAL ? 'Physical Card' : 'Virtual Card';
          return (
            <Animated.View
              key={card.cardId || `card-${index}`}
              entering={deckSpreadAnimations[index]}
              exiting={deckCollapseAnimations[index]}>
              <CyDView className='bg-n0 rounded-[16px] p-[16px]'>
                {/* Card label */}
                <CyDText className='font-manrope font-semibold text-[16px] text-base400 mb-[8px]'>
                  {cardLabel}
                </CyDText>

                {/* Card image with tag and frozen overlays */}
                <CyDTouchView
                  className='relative rounded-[12px] overflow-hidden'
                  style={
                    card.type === CardType.PHYSICAL
                      ? style.physicalCardBorder
                      : undefined
                  }
                  onPress={() => {
                    navigation.navigate(screenTitle.CARD_CONTROLS, {
                      cardId: card.cardId,
                      currentCardProvider: cardProvider,
                      card,
                      showAsSheet: true,
                    });
                  }}>
                  <CyDImageBackground
                    className={clsx(
                      'w-full rounded-[12px] overflow-hidden flex flex-col',
                      {
                        'justify-center items-center': [
                          CardStatus.IN_ACTIVE,
                          CardStatus.BLOCKED,
                        ].includes(card.status as CardStatus),
                        'justify-end': ![
                          CardStatus.IN_ACTIVE,
                          CardStatus.BLOCKED,
                        ].includes(card.status as CardStatus),
                      },
                    )}
                    style={style.expandedCardImage}
                    resizeMode='cover'
                    imageStyle={style.expandedCardImageBorder}
                    source={getCardImage(card)}>
                    {/* Frozen / Inactive overlay */}
                    {(card.status === CardStatus.IN_ACTIVE ||
                      card.status === CardStatus.BLOCKED) && (
                      <CyDView className='flex items-center bg-base400 p-[6px] rounded-[6px]'>
                        <CyDIcons name='freeze' size={32} className='text-n0' />
                        <CyDText className='font-extrabold text-[12px] mt-[4px] text-n0'>
                          Frozen
                        </CyDText>
                      </CyDView>
                    )}
                    {card.cardTag && (
                      <CyDView
                        className='absolute'
                        style={style.cardTagOverlay}>
                        <CardTagBadge tag={card.cardTag} />
                      </CyDView>
                    )}
                    {/* Last 4 digits overlay */}
                    {card.last4 && (
                      <CyDView className='absolute bottom-[14px] left-[14px]'>
                        <CyDText
                          className='font-semibold text-[14px]'
                          style={{
                            color:
                              card.type === CardType.VIRTUAL && card.cardColor
                                ? getCardColorByHex(card.cardColor).textColor
                                : card.type === CardType.PHYSICAL
                                ? '#000000'
                                : '#FFFFFF',
                          }}>
                          {`•••• ${card.last4}`}
                        </CyDText>
                      </CyDView>
                    )}
                  </CyDImageBackground>
                </CyDTouchView>

                {/* Control icons row */}
                <CyDView className='flex-row justify-center items-center gap-x-[32px] mt-[12px]'>
                  {/* Reveal Card → auth screen */}
                  <CyDTouchView
                    className='flex-col justify-center items-center'
                    onPress={() => {
                      navigation.navigate(screenTitle.CARD_REVEAL_AUTH_SCREEN, {
                        currentCardProvider: cardProvider,
                        card,
                      });
                    }}>
                    <CyDView className='h-[48px] w-[48px] items-center justify-center rounded-full bg-n30'>
                      <CyDIcons
                        name='card'
                        className='text-base400 text-[24px]'
                      />
                    </CyDView>
                    <CyDText className='font-semibold text-[11px] text-base400 mt-[4px]'>
                      {'Reveal Card'}
                    </CyDText>
                  </CyDTouchView>

                  {/* Freeze / Unfreeze → unlock auth screen */}
                  <CyDTouchView
                    className='flex-col justify-center items-center'
                    onPress={() => {
                      navigation.navigate(screenTitle.CARD_UNLOCK_AUTH, {
                        currentCardProvider: cardProvider,
                        card,
                      });
                    }}>
                    <CyDView
                      className={clsx(
                        'h-[48px] w-[48px] items-center justify-center rounded-full',
                        card.status !== CardStatus.ACTIVE
                          ? 'bg-base100'
                          : 'bg-n30',
                      )}>
                      <CyDImage
                        source={
                          card.status === CardStatus.ACTIVE
                            ? AppImages.FREEZE_ICON_BLACK
                            : AppImages.UNFREEZE_ICON_BLACK
                        }
                        className='h-[20px] w-[20px]'
                        resizeMode='contain'
                        style={
                          isDarkMode ? { tintColor: '#FFFFFF' } : undefined
                        }
                      />
                    </CyDView>
                    <CyDText className='font-semibold text-[11px] text-base400 mt-[4px]'>
                      {(card.status as CardStatus) === CardStatus.ACTIVE
                        ? 'Freeze'
                        : 'Unfreeze'}
                    </CyDText>
                  </CyDTouchView>

                  {/* Transactions → transactions screen */}
                  <CyDTouchView
                    className='flex-col justify-center items-center'
                    onPress={() => {
                      navigation.navigate(
                        screenTitle.CARD_TRANSACTIONS_SCREEN,
                        {
                          cardProvider,
                          cardId: card.cardId,
                        },
                      );
                    }}>
                    <CyDView className='h-[48px] w-[48px] items-center justify-center rounded-full bg-n30'>
                      <CyDMaterialDesignIcons
                        name='format-list-bulleted'
                        size={22}
                        className='text-base400'
                      />
                    </CyDView>
                    <CyDText className='font-semibold text-[11px] text-base400 mt-[4px]'>
                      {'Transactions'}
                    </CyDText>
                  </CyDTouchView>

                  {/* Card Controls → card controls page */}
                  <CyDTouchView
                    className='flex-col justify-center items-center'
                    onPress={() => {
                      navigation.navigate(screenTitle.CARD_CONTROLS, {
                        cardId: card.cardId,
                        currentCardProvider: cardProvider,
                        card,
                        showAsSheet: true,
                      });
                    }}>
                    <CyDView className='h-[48px] w-[48px] items-center justify-center rounded-full bg-n30'>
                      <CyDMaterialDesignIcons
                        name='cog-outline'
                        size={22}
                        className='text-base400'
                      />
                    </CyDView>
                    <CyDText className='font-semibold text-[11px] text-base400 mt-[4px]'>
                      {'Card Controls'}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </Animated.View>
          );
        })}

        {/* Free Metal Card promotion */}
        <Animated.View
          entering={createDeckSpreadEntering(allDisplayableCards.length)}
          exiting={FadeOut.duration(150)}>
          <CyDView className='bg-n0 rounded-[16px] py-[16px]'>
            <GetPhysicalCardComponent
              cardProfile={cardProfile}
              cardProvider={cardProvider}
              cardDesignData={cardDesignData}
              cardBalance={cardBalance}
            />
          </CyDView>
        </Animated.View>

        {/* Get New Card entry */}
        <Animated.View
          entering={createDeckSpreadEntering(allDisplayableCards.length + 1)}
          exiting={FadeOut.duration(150)}>
          <CyDView className='bg-n0 rounded-[16px] p-[16px]'>
            <CyDText className='font-manrope font-semibold text-[16px] text-base400 mb-[8px]'>
              {'Order New Cypher Card'}
            </CyDText>

            <CyDFastImage
              className='w-full rounded-[12px]'
              style={style.orderNewCardImage}
              resizeMode='stretch'
              source={AppImages.ADDITIONAL_CARD}
            />

            <CyDText className='font-manrope font-normal text-[14px] text-center leading-[140%] tracking-[-0.14px] text-base400 mt-[12px]'>
              {
                'You can get an extra physical or virtual card and enjoy the ease of shopping anywhere in the world.'
              }
            </CyDText>

            <CyDTouchView
              className='bg-p150 py-[11px] rounded-full mt-[16px]'
              onPress={onGetAdditionalCard}>
              <CyDText className='text-black text-[16px] font-bold text-center'>
                {'Order new card'}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </Animated.View>
      </CyDView>
    );
  };

  useEffect(() => {
    if (!isFocused || !isLayoutRendered) {
      return;
    }

    const headerButtons = (
      <CyDView className='flex flex-row justify-center items-center gap-x-[12px] pt-[16px] px-[16px] pb-[8px]'>
        <CyDTouchView
          className='flex-1 flex-row items-center justify-between bg-p50 py-[10px] px-[16px] rounded-[24px]'
          onPress={onPressFundCard}
          disabled={
            shouldBlockAction() ||
            shouldShowLocked() ||
            shouldShowContactSupport()
          }>
          <CyDText className='font-manrope font-semibold text-[14px] text-black leading-[145%] tracking-[-0.6px]'>
            {t('LOAD_CARD')}
          </CyDText>
          <CyDMaterialDesignIcons
            name='plus-circle'
            size={20}
            className='text-black'
          />
        </CyDTouchView>

        {showAllCards ? (
          <CyDTouchView
            className='flex-1 flex-row items-center justify-between bg-n30 py-[12px] px-[16px] rounded-[24px]'
            onPress={() => setShowAllCards(false)}>
            <CyDText className='font-manrope font-semibold text-[14px] text-base400 leading-[145%] tracking-[-0.6px]'>
              {'Hide cards'}
            </CyDText>
            <CyDMaterialDesignIcons
              name='arrow-up-circle'
              size={20}
              className='text-base400'
            />
          </CyDTouchView>
        ) : (
          <CyDTouchView
            className='flex-1 flex-row items-center justify-between bg-n30 py-[12px] px-[16px] rounded-[24px]'
            onPress={() => setShowAllCards(true)}>
            <CyDText className='font-manrope font-semibold text-[14px] text-base400 leading-[145%] tracking-[-0.6px]'>
              {t('VIEW_ALL_CARDS')}
            </CyDText>
            <CyDMaterialDesignIcons
              name='arrow-down-circle'
              size={20}
              className='text-base400'
            />
          </CyDTouchView>
        )}
      </CyDView>
    );

    showBottomSheet({
      id: CARD_TRANSACTIONS_SHEET_ID,
      snapPoints: UNIFIED_SNAP_POINTS,
      defaultPresentIndex: showAllCards ? 0 : 1,
      showCloseButton: false,
      showHandle: true,
      scrollable: true,
      backgroundColor: isDarkMode ? '#161616' : '#FFFFFF',
      borderRadius: 24,
      enablePanDownToClose: false,
      showBackdrop: false,
      bottomInset: tabBarTotalHeight,
      onAnimate: (fromIndex: number, toIndex: number) => {
        if (showAllCards && toIndex >= 1) {
          setShowAllCards(false);
        } else if (!showAllCards && toIndex === 0) {
          setShowAllCards(true);
        }
      },
      fixedHeaderContent: headerButtons,
      content: showAllCards ? (
        <CyDView />
      ) : (
        <CyDView className='pt-[8px] gap-y-[16px] px-[16px] pb-[120px]'>
          {cardId === CARD_IDS.HIDDEN_CARD && (
            <CyDTouchView
              className='bg-base250 rounded-[12px] p-[16px]'
              onPress={onPressFundCard}>
              <CyDView className='flex flex-row items-center gap-x-[12px]'>
                <CyDFastImage
                  source={AppImages.FALLING_COINS_3D}
                  className='h-[46px] w-[32px]'
                  resizeMode='contain'
                />
                <CyDView className='flex flex-col flex-1'>
                  <CyDView className='flex flex-row items-center justify-between gap-x-[4px]'>
                    <CyDText className='text-[20px] font-[500] mb-[4px]'>
                      {t<string>('LOAD_YOUR_CARD')}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='arrow-right-thin'
                      size={24}
                      className='text-base400'
                    />
                  </CyDView>
                  <CyDText className='text-[14px] font-[400] mb-[16px]'>
                    {t<string>('LOAD_YOUR_CARD_DESCRIPTION')}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDTouchView>
          )}
          {get(statusWiseRewards, ['kycPending', 'earned'], false) && (
            <RewardProgressWidget />
          )}
          <MerchantSpendRewardWidget
            onViewAllPress={handleViewAllMerchants}
            onMerchantPress={handleDirectMerchantPress}
            isPremium={planInfo?.planId === CypherPlanId.PRO_PLAN}
          />
          {cardId !== CARD_IDS.HIDDEN_CARD && (
            <CyDView className='border-[1px] border-n40 rounded-[16px]'>
              <CyDText className='font-manrope text-[16px] font-medium ml-[16px] mt-[16px] mb-[8px] leading-[140%] tracking-[-0.8px]'>
                {t<string>('RECENT_TRANSACTIONS')}
              </CyDText>
              {recentTransactions.length ? (
                <>
                  {recentTransactions.map((transaction, index) => (
                    <CardTransactionItem item={transaction} key={index} />
                  ))}
                  <CyDView className='px-[12px] pb-[12px] pt-[16px]'>
                    <CyDTouchView
                      className='bg-n30 py-[14px] rounded-full justify-center items-center'
                      onPress={() =>
                        navigation.navigate(
                          screenTitle.CARD_TRANSACTIONS_SCREEN,
                          { navigation, cardProvider },
                        )
                      }>
                      <CyDText className='text-base400 text-[14px] font-semibold'>
                        {t<string>('VIEW_ALL_TRANSACTIONS')}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                </>
              ) : (
                <CyDView className='py-[24px] justify-start items-center'>
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
            <CyDView>
              <CyDText className='text-[14px] font-bold ml-[4px] mb-[8px]'>
                {t<string>('OTHERS')}
              </CyDText>
              <CyDTouchView
                className='border-[1.2px] border-n20 flex flex-row justify-center items-center py-[16px] rounded-[16px]'
                onPress={() =>
                  navigation.navigate(screenTitle.CARD_TRANSACTIONS_SCREEN, {
                    navigation,
                    cardProvider: CardProviders.PAYCADDY,
                  })
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
            <CyDView className='bg-p10 p-6 rounded-xl'>
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
                      <CyDView style={style.gradientStyle}>
                        <LinearGradient
                          colors={['#FA9703', '#F7510A', '#FA9703']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          locations={[0, 0.5, 1]}
                          style={StyleSheet.absoluteFill}
                        />
                        <CyDText className='font-semibold text-[14px] text-white'>
                          {`$${spendStats.amount}`}
                        </CyDText>
                      </CyDView>
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
                    {'0.75% Forex Markup'}
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
      ),
    });
  }, [
    isFocused,
    isLayoutRendered,
    recentTransactions,
    cardId,
    cardProvider,
    cardProfile,
    cardDesignData,
    cardBalance,
    planInfo,
    spendStats,
    statusWiseRewards,
    showAllCards,
    allDisplayableCards,
  ]);

  useEffect(() => {
    if (!isFocused || !isLayoutRendered) {
      return;
    }
    const targetIndex = showAllCards ? 0 : 1;
    const timer = setTimeout(() => {
      snapSheetToIndex(CARD_TRANSACTIONS_SHEET_ID, targetIndex);
    }, 50);
    return () => clearTimeout(timer);
  }, [showAllCards]);

  useEffect(() => {
    if (!isFocused) {
      hideBottomSheet(CARD_TRANSACTIONS_SHEET_ID);

      if (showAllCards) {
        const state = navigation.getState();
        const currentRouteIndex = state.routes.findIndex(
          r => r.key === route.key,
        );
        if (state.index === currentRouteIndex) {
          setShowAllCards(false);
        }
      }
    }
  }, [isFocused]);

  useEffect(() => {
    return () => {
      hideBottomSheet(CARD_TRANSACTIONS_SHEET_ID);
    };
  }, []);

  return isLayoutRendered ? (
    <CyDSafeAreaView
      className={clsx('flex-1 bg-n40', {
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

          <CyDView className='bg-n40  px-[16px] mt-[4px]'>
            {!(
              shouldShowLocked() ||
              shouldShowActionNeeded() ||
              shouldShowContactSupport()
            ) && (
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDText className='font-manrope font-medium text-[32px] text-base100 leading-[120%] tracking-[-1px]'>
                  Cards
                </CyDText>
                <CyDView className='flex-row items-center gap-x-[8px]'>
                  {planInfo?.planId === CypherPlanId.PRO_PLAN && (
                    <CyDView
                      className='bg-white border border-[#EEEEEE] items-center justify-center'
                      style={style.premiumPill}>
                      <GradientText
                        textElement={
                          <CyDText
                            className='font-extrabold text-[14px] text-center'
                            style={style.premiumPillText}>
                            {'Premium'}
                          </CyDText>
                        }
                        gradientColors={['#FA9703', '#F89408', '#F6510A']}
                        locations={[0, 0.3, 0.6]}
                      />
                    </CyDView>
                  )}
                  <CyDTouchView
                    className='bg-white border border-[#EEEEEE] items-center justify-center'
                    style={style.plusPill}
                    onPress={onGetAdditionalCard}>
                    <CyDMaterialDesignIcons
                      name='plus-circle'
                      size={16}
                      className='text-black'
                    />
                  </CyDTouchView>
                </CyDView>
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

            {/* Available to spend balance */}
            {!showAllCards && (
              <CyDView
                className='items-center mt-[24px]'
                onTouchEnd={() => {
                  if (showTooltip) setShowTooltip(false);
                }}>
                <CyDView className='flex flex-row items-center justify-center gap-x-[4px]'>
                  <CyDText className='font-manrope font-semibold text-[10px] text-n200 leading-[160%]'>
                    {t('AVAILABLE_TO_SPEND')}
                  </CyDText>
                  <CyDTouchView onPress={() => setShowTooltip(prev => !prev)}>
                    <CyDMaterialDesignIcons
                      name='information-outline'
                      size={14}
                      className='text-n200'
                    />
                  </CyDTouchView>
                </CyDView>
                {showTooltip && (
                  <CyDView className='absolute bottom-[60px] bg-n0 rounded-[8px] px-[12px] py-[8px] z-[100]'>
                    <CyDText className='font-manrope text-[10px] text-base400 text-center'>
                      {t('AVAILABLE_TO_SPEND_INFO')}
                    </CyDText>
                  </CyDView>
                )}
                <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                  {!balanceLoading ? (
                    <CyDTouchView
                      onPress={() => {
                        void fetchCardBalance();
                      }}>
                      <CyDView className='flex flex-row items-center justify-center gap-x-[8px]'>
                        <CyDView className='flex-shrink'>
                          <CyDTokenValue className='font-manrope font-semibold text-[32px] leading-[145%] tracking-[-1px]'>
                            {cardBalance === 'NA' ? '0.00' : cardBalance}
                          </CyDTokenValue>
                        </CyDView>
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
            )}
          </CyDView>

          <CyDView className='bg-n40'>
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

            {showAllCards ? (
              <CyDScrollView
                className='mt-[2px]'
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: tabBarTotalHeight + 200,
                }}>
                {renderAllCardsContent()}
              </CyDScrollView>
            ) : (
              cardDesignData && (
                <Animated.View
                  key='stacked-cards'
                  entering={FadeIn.duration(200).delay(COLLAPSE_FADE_DELAY)}
                  exiting={FadeOut.duration(100)}>
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
                      onCardPress={() => setShowAllCards(true)}
                    />
                  </CyDView>
                </Animated.View>
              )
            )}
          </CyDView>
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
    height: 40,
    width: 40,
  },
  gradientStyle: {
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadCardGradientContainer: {
    borderRadius: 12,
    padding: 16,
  },
  premiumPill: {
    width: 90,
    height: 32,
    borderRadius: 23.31,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  premiumPillText: {
    ...Platform.select({
      android: { includeFontPadding: false },
      ios: {},
    }),
  },
  plusPill: {
    height: 32,
    borderRadius: 23.31,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  expandedCardImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  expandedCardImageBorder: {
    borderRadius: 12,
  },
  cardTagOverlay: {
    top: 100,
    right: 8,
  },
  physicalCardBorder: {
    borderWidth: 1,
    borderColor: '#DFE2E6',
  },
  orderNewCardImage: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 12,
  },
});
