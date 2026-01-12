import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDImage,
} from '../../styles/tailwindComponents';
import { BlurView } from '@react-native-community/blur';
import {
  StyleSheet,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import MerchantLogo from './MerchantLogo';
import AppImages from '../../../assets/images/appImages';
import { DecimalHelper } from '../../utils/decimalHelper';
import { useColorScheme } from 'nativewind';
import { Theme, useTheme } from '../../reducers/themeReducer';
import useAxios from '../../core/HttpRequest';
import { useGlobalBottomSheet } from '../v2/GlobalBottomSheetProvider';
import { PieChart } from 'react-native-svg-charts';
import { useNavigation } from '@react-navigation/native';
import { screenTitle } from '../../constants';
import { CypherPlanId } from '../../constants/enum';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { get } from 'lodash';

interface MerchantRewardDetailContentProps {
  /**
   * Initial merchant data may come from list endpoints that don't include the
   * full "details" fields. We fetch the full details internally using
   * `candidateId`, so this is intentionally the "base" shape.
   */
  merchantData?: MerchantBaseData;
  navigation?: any;
}

interface MerchantBaseData {
  groupId: string;
  candidateId: string;
  brand: string;
  canonicalName: string;
  category: string;
  subcategory: string;
  logoUrl?: string;
  historicalMultiplier: {
    current: number;
    max: number;
  };
  votePercentage: number;
  voteRank: number;
  isActive: boolean;
  isVerified: boolean;
  hasActiveBribes: boolean;
  userVoteData: {
    hasVoted: boolean;
  };
  metrics: {
    averageTransactionSize: number;
    totalSpend: number;
    transactionCount: number;
    uniqueSpenders: number;
  };
  // Some list endpoints include this, but it is optional until we fetch details.
  projectedCYPRReward?: string;
}

interface MerchantDetailData extends MerchantBaseData {
  // Full details fields
  projectedCYPRReward: string;
  referenceAmount: number;
  baseReward: {
    [key: string]: string;
  };
  currentEpochVotes: string;
}

interface EstimatedNextEpochRewards {
  baseSpend: string;
  boostedSpend: string;
  total: string;
}

// The full response now includes votingHistory & bribeData directly
interface MerchantDetailsResponseDto extends MerchantDetailData {
  description?: string;
  websiteUrl?: string;
  parentCompany?: string;
  industry?: string;
  tags: string[];

  votingHistory: Array<{
    epochNumber: number;
    totalVotes: string;
    votePercentage: number;
    multiplier: number;
    uniqueVoters: number;
    voteRank: number;
    startTime: number;
    endTime: number;
    status: string;
  }>;

  bribeData: {
    currentEpoch: Array<{
      token: {
        address: string;
        symbol: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      claimableBy: string[];
      addedAt: number;
      addedBy: string;
    }>;
    history: any[];
    totalCurrentValue: string;
    totalHistoricalValue: string;
    hasClaimableBribes: boolean;
  };

  userSpecificData?: {
    hasVoted: boolean;
    voteAmount: string;
    votingPower: string;
    totalVotingPower: string;
    projectedNextEpochValue: string;
    historicalEarnings: any[];
    claimableBribes: string;
    currentEpochSpending: {
      amount: number;
      transactionCount: number;
      lastTransactionAt?: number;
    };
    estimatedNextEpochRewards: EstimatedNextEpochRewards;
  };

  trends: {
    votingTrend: string;
    spendingTrend: string;
    voterGrowth: number;
    multiplierTrend: Array<{
      epoch: number;
      multiplier: number;
      change: number;
    }>;
  };
}

interface PromotionalBonus {
  id: string;
  title: string;
  amount: string;
  token: string;
  date: string;
}

interface Transaction {
  id: string;
  location: string;
  amount: string;
  date: string;
  type: 'transaction' | 'bonus';
}

interface RewardCycle {
  id: string;
  name: string;
  period: string;
  amount: string;
  token: string;
}

const MerchantRewardDetailContent: React.FC<
  MerchantRewardDetailContentProps
> = ({ merchantData, navigation: navigationProp }) => {
  const { t } = useTranslation();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const { getWithAuth } = useAxios();
  const { showBottomSheet, hideAllBottomSheets } = useGlobalBottomSheet();
  const navigationHook = useNavigation();
  const navigation = navigationProp ?? navigationHook;

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const [loading, setLoading] = useState<boolean>(true);
  const [merchantDetails, setMerchantDetails] =
    useState<MerchantDetailsResponseDto | null>(null);
  const [promotionalBonuses, setPromotionalBonuses] = useState<
    PromotionalBonus[]
  >([]);
  const [votingHistory, setVotingHistory] = useState<RewardCycle[]>([]);

  // Helper: formats timestamp to '26 June, 2025 11:58AM'
  function formatTimestamp(timestamp: number): string {
    const d = new Date(timestamp);
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'long' });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month}, ${year} ${hours}:${minutes}${ampm}`;
  }

  const formatTimePeriod = (
    startTimestamp: number,
    endTimestamp: number,
  ): string => {
    // API provides millisecond timestamps already
    const startDate = new Date(Number(startTimestamp));
    const endDate = new Date(Number(endTimestamp));

    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleString('default', { month: 'long' });
    const startYear = startDate.getFullYear();

    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleString('default', { month: 'long' });
    const endYear = endDate.getFullYear();

    const startYearStr = startYear === endYear ? '' : ` ${startYear}`;
    return `${startMonth} ${startDay}${startYearStr} to ${endMonth} ${endDay} ${endYear}`;
  };

  /**
   * Fetches merchant details and voting history
   */
  const fetchMerchantData = async () => {
    if (!merchantData?.candidateId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const detailsResponse = await getWithAuth(
        `/v1/cypher-protocol/merchants/${merchantData.candidateId}`,
      );

      if (!detailsResponse.isError) {
        const data: MerchantDetailsResponseDto = detailsResponse.data;
        setMerchantDetails(data);

        // Transform userSpecificData.historicalEarnings → RewardCycle[]
        const he = data.userSpecificData?.historicalEarnings ?? [];
        const transformedHistory: RewardCycle[] = he.map((earn: any) => ({
          id: `epoch-${String(earn.epochNumber)}`,
          name: `Reward Cycle ${String(earn.epochNumber)}`,
          period: formatTimePeriod(earn.startTime, earn.endTime),
          amount: DecimalHelper.round(
            DecimalHelper.toDecimal(earn.totalEarned, 18),
            2,
          ).toString(),
          token: 'CYPR',
        }));
        setVotingHistory(transformedHistory);

        // Transform bribeData.currentEpoch → PromotionalBonus[]
        const promos: PromotionalBonus[] =
          data.bribeData?.currentEpoch?.map((bribe, index) => ({
            id: `bribe-${index}`,
            title: t('PROMOTIONAL_BONUS', 'Promotional Bonus'),
            amount: bribe.amountFormatted,
            token: bribe.token.symbol,
            date: formatTimestamp(bribe.addedAt * 1000),
          })) ?? [];
        setPromotionalBonuses(promos);
      } else {
        console.warn(
          'Failed to fetch merchant details:',
          detailsResponse.error,
        );
      }
    } catch (err) {
      console.error('Error fetching merchant data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMerchantData();
  }, [merchantData?.candidateId]);

  // Use passed merchant data or fetched details
  const currentMerchantData = useMemo(
    () => merchantDetails ?? merchantData,
    [merchantDetails, merchantData],
  );
  const userBoostStatus = useMemo(
    () =>
      merchantDetails?.userSpecificData
        ? {
            hasBoost: merchantDetails.userSpecificData.hasVoted,
            boostAmount: merchantDetails.userSpecificData.voteAmount,
          }
        : undefined,
    [merchantDetails],
  );

  // Memoised chart data ensuring the two slices always sum exactly to 100%
  const chartData = useMemo(() => {
    const votingPower = DecimalHelper.toDecimal(
      merchantDetails?.userSpecificData?.votingPower ?? '0',
      18,
    );
    const totalVotingPower = DecimalHelper.toDecimal(
      merchantDetails?.userSpecificData?.totalVotingPower ?? '0',
      18,
    );

    // Default to 0 to avoid NaN / Infinity when totalVotingPower is 0
    let votingPowerPercentage = 0;

    if (!DecimalHelper.isEqualTo(totalVotingPower, 0)) {
      votingPowerPercentage = DecimalHelper.round(
        DecimalHelper.multiply(
          DecimalHelper.divide(votingPower, totalVotingPower),
          100,
        ),
        2,
      ).toNumber();
    }

    // Ensure the complementary percentage is always 100 - votingPowerPercentage
    const remainingPercentage = DecimalHelper.round(
      DecimalHelper.subtract(100, votingPowerPercentage),
      2,
    ).toNumber();

    return [
      {
        key: 'Voting Power in this merchant',
        value: votingPowerPercentage,
        svg: { fill: '#FF8C00' },
        arc: { outerRadius: '100%', cornerRadius: 4 },
      },
      {
        key: 'Total voting power',
        value: remainingPercentage,
        svg: { fill: '#A8A8A8' },
        arc: { outerRadius: '100%', cornerRadius: 4 },
      },
    ];
  }, [merchantDetails]);

  // Plan Info for Reward Breakdown
  const cardProfile = globalContext.globalState.cardProfile;
  const planId = get(cardProfile, ['planInfo', 'planId']);
  const isPremiumUser = planId === CypherPlanId.PRO_PLAN;

  const rewardBreakdown = useMemo(() => {
    const referenceAmount = merchantDetails?.referenceAmount ?? 10;

    const baseRewardWei =
      merchantDetails?.baseReward?.[
        isPremiumUser ? CypherPlanId.PRO_PLAN : CypherPlanId.BASIC_PLAN
      ] ?? '0';
    const projectedRewardWei = merchantDetails?.projectedCYPRReward ?? '0';

    const baseRewardValue = DecimalHelper.toDecimal(
      baseRewardWei,
      18,
    ).toNumber();
    const projectedRewardValue = DecimalHelper.toDecimal(
      projectedRewardWei,
      18,
    ).toNumber();

    const formatReward = (value: number): string =>
      value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    return {
      referenceAmount,
      baseRewardDisplay: formatReward(baseRewardValue),
      merchantRewardDisplay: formatReward(projectedRewardValue),
    };
  }, [merchantDetails, isPremiumUser]);

  const userTransactions: Transaction[] = []; // Not available in response yet

  /**
   * Opens bottom sheet displaying full reward cycle earnings list
   */
  const openAllRewardCycles = () => {
    showBottomSheet({
      id: 'all-reward-cycles',
      snapPoints: ['80%', '95%'],
      showCloseButton: true,
      scrollable: true,
      backgroundColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      content: (
        <CyDView className='flex-1'>
          <CyDView className='items-center py-4'>
            <CyDText className='text-[16px] font-semibold'>
              {t('REWARD_CYCLES')}
            </CyDText>
          </CyDView>
          {votingHistory.map((cycle, idx) => (
            <CyDView
              key={cycle.id}
              className={`flex-row items-center justify-between px-4 py-3 ${
                idx < votingHistory.length - 1 ? 'border-b border-n40' : ''
              }`}>
              <CyDView className='flex-1'>
                <CyDText className='text-[14px] font-medium mb-[2px]'>
                  {cycle.name}
                </CyDText>
                <CyDText className='text-n200 text-[12px]'>
                  {cycle.period}
                </CyDText>
              </CyDView>
              <CyDView className='flex-row items-center'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-5 h-5 mr-1'
                />
                <CyDText className='text-[14px] font-semibold'>
                  {cycle.amount}
                </CyDText>
              </CyDView>
            </CyDView>
          ))}
        </CyDView>
      ),
    });
  };

  if (loading) {
    return (
      <CyDView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-black' : 'bg-n30'
        }`}>
        <ActivityIndicator
          size='large'
          color={isDarkMode ? '#ffffff' : '#000000'}
        />
      </CyDView>
    );
  }

  if (!currentMerchantData) {
    return (
      <CyDView
        className={`flex-1 items-center justify-center ${
          isDarkMode ? 'bg-black' : 'bg-n30'
        }`}>
        <CyDText
          className={`text-[16px] ${isDarkMode ? 'text-white' : 'text-black'}`}>
          {t('MERCHANT_DATA_NOT_AVAILABLE')}
        </CyDText>
      </CyDView>
    );
  }

  /**
   * Handles boost this merchant button press
   * Navigates to social media screen with candidate ID parameter
   */
  const handleBoostMerchant = () => {
    const sessionToken = globalContext.globalState.token;

    if (!sessionToken) {
      console.error('Session token not available');
      return;
    }

    const candidateId = currentMerchantData.candidateId;
    const redirectURI = `https://app.cypherhq.io/#/?candidateId=${candidateId}&sessionToken=${sessionToken}`;
    navigation.navigate(screenTitle.OPTIONS);
    setTimeout(() => {
      navigation.navigate(screenTitle.OPTIONS, {
        screen: screenTitle.SOCIAL_MEDIA_SCREEN,
        params: {
          title: 'Boost Merchant',
          uri: redirectURI,
        },
      });

      // After navigation begins, close any open bottom sheets to avoid overlaying the next screen.
      // Using InteractionManager ensures we wait until current interactions (like navigation animations)
      // are scheduled before attempting to dismiss the sheet.
      void InteractionManager.runAfterInteractions(() => {
        try {
          hideAllBottomSheets();
        } catch (err) {
          console.warn('Failed to close bottom sheet after navigation', err);
        }
      });
    }, 250);
  };

  return (
    <CyDView
      className={`flex-1 pb-14 -mb-10 ${isDarkMode ? 'bg-black' : 'bg-n30'}`}>
      {/* Header Section with Background */}
      <CyDView className='items-center'>
        {/* Background Image or Solid Color */}
        {
          <>
            <CyDView className='w-full h-[146px] bg-white items-center justify-center relative overflow-hidden rounded-t-[14px]'>
              <CyDView className='absolute top-[8px] left-0 right-0 items-center z-50'>
                <CyDView
                  style={{
                    width: 34,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDarkMode
                      ? 'rgba(255,255,255,0.35)'
                      : 'rgba(0,0,0,0.25)',
                  }}
                />
              </CyDView>
              {currentMerchantData.logoUrl ? (
                <CyDImage
                  source={{ uri: currentMerchantData.logoUrl }}
                  className='absolute inset-0 w-full h-full'
                  resizeMode='cover'
                />
              ) : (
                // Fallback when no logoUrl is present.
                <CyDText className='text-black font-bold text-center text-[80px] opacity-30'>
                  {currentMerchantData.brand ??
                    currentMerchantData.canonicalName}
                </CyDText>
              )}

              <BlurView
                style={styles.blurAbsolute}
                blurType={isDarkMode ? 'dark' : 'light'}
                blurAmount={10}
                reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.3)'
                pointerEvents='none'
              />
            </CyDView>
          </>
        }

        {/* Merchant Logo Circle */}
        <CyDView className='w-20 h-20 bg-white rounded-full items-center justify-center mb-2 shadow-lg z-20 absolute left-1/2 -translate-x-1/2 top-[106px]'>
          {/* BOOSTED Badge */}
          {(userBoostStatus?.hasBoost ??
            currentMerchantData?.userVoteData?.hasVoted ??
            false) && (
            <CyDView className='absolute -top-3 bg-orange500 rounded-full px-2 py-1 self-center z-10'>
              <CyDText className='text-white text-[10px] font-bold'>
                {t('BOOSTED')}
              </CyDText>
            </CyDView>
          )}

          <MerchantLogo
            merchant={{
              brand:
                currentMerchantData.brand ?? currentMerchantData.canonicalName,
              canonicalName: currentMerchantData.canonicalName,
              logoUrl: currentMerchantData.logoUrl,
            }}
            size={76}
            hasUserVoted={
              userBoostStatus?.hasBoost ??
              currentMerchantData?.userVoteData?.hasVoted ??
              false
            }
            showBorder={true}
          />
        </CyDView>

        {/* Content Container */}
        <CyDView className='items-center justify-center py-10'>
          {/* Merchant Name */}
          <CyDText className='text-[24px] font-bold text-center px-4'>
            {currentMerchantData.brand ?? currentMerchantData.canonicalName}
          </CyDText>

          {/* Rewards Badge */}
          {/* <CyDText className='text-green400 text-[18px] font-bold'>
            {currentMerchantData.historicalMultiplier.current.toFixed(1)}X{' '}
            {t('REWARDS')}
          </CyDText> */}
        </CyDView>
      </CyDView>

      {/* Your spend section */}
      <CyDView className='mb-6 mx-4 '>
        <CyDText className='text-[12px] font-medium mb-2'>
          {t('YOUR_SPEND_ON_THIS_MERCHANT_EARNS')}
        </CyDText>

        <CyDView
          className={`rounded-[12px] relative ${
            isDarkMode ? 'bg-base40' : 'bg-n0 border border-n40'
          }`}>
          {/* Base reward */}
          <CyDView className='flex-row justify-between items-center px-4 py-3 border-b border-n40'>
            <CyDText className='text-[14px] font-medium'>
              {t('BASE_REWARD')}
            </CyDText>
            <CyDView className='items-end'>
              <CyDView className='flex-row items-center'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-5 h-5 mr-1 rounded-full'
                />
                <CyDText className='text-[16px] font-semibold'>
                  {rewardBreakdown.baseRewardDisplay}
                </CyDText>
              </CyDView>
              <CyDText className='text-n200 text-[12px]'>
                {t('FOR_EVERY_AMOUNT_SPEND', {
                  amount: rewardBreakdown.referenceAmount,
                })}
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Plus Icon */}
          <CyDView className='items-center absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10'>
            <CyDView className='w-8 h-8 bg-black rounded-full items-center justify-center'>
              <CyDMaterialDesignIcons
                name='plus'
                size={16}
                className='text-white'
              />
            </CyDView>
          </CyDView>

          {/* Merchant reward (Boosted reward) */}
          <CyDView className='flex-row justify-between items-center px-4 py-3'>
            <CyDText className='text-[14px] font-medium'>
              {t('BOOSTED_REWARD')}
            </CyDText>
            <CyDView className='items-end'>
              <CyDView className='flex-row items-center'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-5 h-5 mr-1 rounded-full'
                />
                <CyDText className='text-[16px] font-semibold'>
                  {rewardBreakdown.merchantRewardDisplay}
                </CyDText>
              </CyDView>
              <CyDText className='text-n200 text-[12px]'>
                {t('FOR_EVERY_AMOUNT_SPEND', {
                  amount: rewardBreakdown.referenceAmount,
                })}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>

      {/* Bonuses Section */}
      {promotionalBonuses.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[12px] font-medium mb-2'>
            {t('BONUSES')}
          </CyDText>

          <CyDView
            className={`bg-base40 rounded-[12px] ${
              isDarkMode ? 'bg-base40' : 'bg-n0 border border-n40'
            }`}>
            {promotionalBonuses.map((bonus, index) => (
              <CyDView
                key={bonus.id}
                className={`p-4 ${
                  index < promotionalBonuses.length - 1
                    ? `border-b ${isDarkMode ? 'border-base200' : 'border-n40'}`
                    : ''
                }`}>
                <CyDView className='flex-row justify-between items-center'>
                  <CyDView className='flex-1'>
                    <CyDText className='text-[14px] font-medium mb-1'>
                      {bonus.title}
                    </CyDText>
                    <CyDText className='text-n200 text-[12px]'>
                      {bonus.date}
                    </CyDText>
                  </CyDView>
                  <CyDView className='items-end'>
                    <CyDView className='flex-row items-center'>
                      <CyDImage
                        source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                        className='w-6 h-6 mr-2'
                        resizeMode='contain'
                      />
                      <CyDText className='text-[16px] font-semibold'>
                        {bonus.amount}
                      </CyDText>
                    </CyDView>
                    <CyDText className='text-n200 text-[12px]'>
                      {t('AVG_BOOSTER')}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            ))}
          </CyDView>
        </CyDView>
      )}

      {/* Merchant Boost Section */}
      <CyDView
        className={`p-3 mb-6 rounded-[12px] bg-base40 mx-4 ${
          isDarkMode ? 'bg-base40' : 'bg-n0'
        }`}>
        <CyDText className='text-[14px] font-semibold mb-3'>
          {t('MERCHANT_BOOST')}
        </CyDText>

        <CyDText className='text-n200 text-[12px] leading-5 mb-4'>
          {t('BOOSTING_IS_POWERED_BY_THE_CYPHER_COMMUNITY')}
        </CyDText>

        {userBoostStatus?.hasBoost ? (
          <CyDView className='rounded-[16px] bg-base20 py-3 mb-4'>
            <CyDView className='flex flex-row items-center justify-between px-3'>
              <CyDView>
                <CyDText className='text-n200 text-[12px] font-medium'>
                  {t('YOU_HAVE_BOOSTED_THIS_MERCHANT_FOR')}
                </CyDText>
                <CyDText className='font-medium'>
                  {DecimalHelper.round(
                    DecimalHelper.toDecimal(
                      merchantDetails?.userSpecificData?.votingPower ?? '0',
                      18,
                    ),
                    2,
                  ).toNumber()}{' '}
                  {t('VE_CYPHER')}
                </CyDText>
              </CyDView>
              <CyDView>
                <PieChart
                  style={styles.pieChart}
                  data={chartData}
                  innerRadius='60%'
                  outerRadius='90%'
                  padAngle={0.02}
                />
              </CyDView>
            </CyDView>
          </CyDView>
        ) : (
          <CyDView className='items-center justify-center rounded-[16px] bg-base20 py-[28px] mb-4'>
            <CyDText className='text-n200 text-[14px] font-medium'>
              {t('YOU_HAVENT_BOOSTED_THIS_MERCHANT')}
            </CyDText>
          </CyDView>
        )}

        <CyDView className='flex-row items-center mb-4'>
          <CyDMaterialDesignIcons
            name='lightbulb-outline'
            size={16}
            className='text-n200 mr-2'
          />
          <CyDText className='text-n200 text-[12px] flex-1'>
            {t('BRANDS_MAY_OFFER_EXCLUSIVE_BONUSES')}
          </CyDText>
        </CyDView>

        {/* Action Buttons */}
        {!userBoostStatus?.hasBoost && (
          <CyDView className='gap-y-3'>
            <CyDTouchView
              className='bg-yellow-400 rounded-[25px] py-4 items-center'
              onPress={handleBoostMerchant}>
              <CyDText className='text-black text-[16px] font-semibold'>
                {t('BOOST_THIS_MERCHANT')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )}
      </CyDView>

      {/* Community Stats Section */}
      <CyDView className='mb-6 mx-4'>
        <CyDText className='text-[14px] font-semibold mb-3'>
          {t('COMMUNITY_STATS', 'Community Stats')}
        </CyDText>

        <CyDView
          className={`rounded-[12px] py-4 space-y-4 ${
            isDarkMode ? 'bg-base40' : 'bg-n0 border border-n40'
          }`}>
          {/* Total veCYPR on Merchant */}
          <CyDView className='px-4'>
            <CyDView className='flex-row items-center gap-1 mb-2'>
              <CyDText className='text-n200 text-[12px]'>
                {t(
                  'TOTAL_BOOSTER_CURRENT_CYCLE',
                  'Total Booster (Current Reward Cycle)',
                )}
              </CyDText>
            </CyDView>
            <CyDView className='flex-row items-center gap-1'>
              <CyDMaterialDesignIcons
                name='lightning-bolt'
                size={16}
                className='text-yellow-400'
              />
              <CyDText className='text-[20px] font-bold'>
                {DecimalHelper.toDecimal(
                  merchantDetails?.currentEpochVotes ?? '0',
                  18,
                )
                  .toNumber()
                  .toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
              </CyDText>
            </CyDView>
          </CyDView>

          {/* Divider */}
          <CyDView className='w-full h-[1px] bg-n40 my-4' />

          {/* Total spends on Merchant */}
          <CyDView className='px-4'>
            <CyDView className='flex-row items-center gap-1 mb-2'>
              <CyDText className='text-n200 text-[12px]'>
                {t('TOTAL_SPEND', 'Total spend')}
              </CyDText>
            </CyDView>
            <CyDText className='text-[20px] font-bold'>
              $
              {merchantDetails?.metrics?.totalSpend?.toLocaleString('en-US') ??
                '0'}
            </CyDText>
          </CyDView>

          {/* Divider */}
          <CyDView className='w-full h-[1px] bg-n40 my-4' />

          {/* Vote Percentage */}
          <CyDView className='px-4'>
            <CyDView className='flex-row items-center gap-1 mb-2'>
              <CyDText className='text-n200 text-[12px]'>
                {t('BOOST_PERCENTAGE', 'Boost Percentage')}
              </CyDText>
            </CyDView>
            <CyDText className='text-[20px] font-bold'>
              {(
                merchantDetails?.votePercentage ??
                currentMerchantData?.votePercentage ??
                0
              ).toFixed(2)}
              %
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>

      {/* This Reward Cycle Trend Section */}
      {merchantDetails?.trends && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[14px] font-semibold mb-3'>
            {t('THIS_REWARD_CYCLE_TREND', 'This Reward Cycle Trend')}
          </CyDText>

          <CyDView
            className={`rounded-[12px] py-4 space-y-4 ${
              isDarkMode ? 'bg-base40' : 'bg-n0 border border-n40'
            }`}>
            {/* Community Boosting trend */}
            <CyDView className='px-4'>
              <CyDText className='text-n200 text-[12px] mb-2'>
                {t('COMMUNITY_BOOSTING_TREND', 'Community Boosting trend')}
              </CyDText>
              <CyDView className='flex-row items-center gap-2'>
                {merchantDetails.trends.votingTrend === 'INCREASING' && (
                  <>
                    <CyDText className='text-[18px]'>🔥</CyDText>
                    <CyDText className='text-[18px] font-medium'>
                      {t('POPULAR', 'Popular')}
                    </CyDText>
                  </>
                )}
                {merchantDetails.trends.votingTrend === 'DECREASING' && (
                  <>
                    <CyDText className='text-[18px]'>📉</CyDText>
                    <CyDText className='text-[18px] font-medium'>
                      {t('DECLINING', 'Declining')}
                    </CyDText>
                  </>
                )}
                {merchantDetails.trends.votingTrend === 'STABLE' && (
                  <>
                    <CyDText className='text-[18px]'>📊</CyDText>
                    <CyDText className='text-[18px] font-medium'>
                      {t('NORMAL', 'Normal')}
                    </CyDText>
                  </>
                )}
              </CyDView>
            </CyDView>

            {/* Divider */}
            <CyDView className='w-full h-[1px] bg-n40 my-4' />

            {/* Spending Trend */}
            <CyDView className='px-4'>
              <CyDText className='text-n200 text-[12px] mb-2'>
                {t('SPENDING_TREND', 'Spending Trend')}
              </CyDText>
              <CyDView className='flex-row items-center gap-2'>
                {merchantDetails.trends.spendingTrend === 'INCREASING' && (
                  <>
                    <CyDText className='text-[18px]'>🔥</CyDText>
                    <CyDText className='text-[18px] font-medium'>
                      {t('POPULAR', 'Popular')}
                    </CyDText>
                  </>
                )}
                {merchantDetails.trends.spendingTrend === 'DECREASING' && (
                  <>
                    <CyDText className='text-[18px]'>📉</CyDText>
                    <CyDText className='text-[18px] font-medium'>
                      {t('DECLINING', 'Declining')}
                    </CyDText>
                  </>
                )}
                {merchantDetails.trends.spendingTrend === 'STABLE' && (
                  <>
                    <CyDText className='text-[18px]'>📊</CyDText>
                    <CyDText className='text-[18px] font-medium'>
                      {t('NORMAL', 'Normal')}
                    </CyDText>
                  </>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      )}

      {/* Recent Transactions */}
      {userTransactions.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[12px] font-medium mb-2'>
            {t('YOUR_RECENT_TRANSACTIONS_ON_THIS_MERCHANT')}
          </CyDText>

          <CyDView
            className={`bg-base40 rounded-[12px] overflow-hidden ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
            }`}>
            {userTransactions?.slice(0, 4).map((transaction, index) => (
              <CyDView
                key={transaction.id}
                className={`p-4 flex-row items-center justify-between ${
                  index < 3 ? 'border-b border-n20' : ''
                }`}>
                <CyDView className='flex-row items-center flex-1'>
                  <CyDView className='w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3'>
                    <CyDMaterialDesignIcons
                      name='store'
                      size={20}
                      className='text-white'
                    />
                  </CyDView>
                  <CyDView className='flex-1'>
                    <CyDText className='text-[14px] font-medium mb-1'>
                      {transaction.location}
                    </CyDText>
                    <CyDText className='text-n200 text-[12px]'>
                      {transaction.date}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDView className='items-end'>
                  {transaction.type === 'bonus' ? (
                    <CyDView className='flex-row items-center'>
                      <CyDImage
                        source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                        className='w-5 h-5 mr-1'
                        resizeMode='contain'
                      />
                      <CyDText className='text-[16px] font-semibold'>
                        {transaction.amount}
                      </CyDText>
                    </CyDView>
                  ) : (
                    <CyDText className='text-[16px] font-semibold'>
                      {transaction.amount}
                    </CyDText>
                  )}
                </CyDView>
              </CyDView>
            ))}

            {/* View All Button */}
            <CyDTouchView
              className={`p-4 flex-row items-center justify-between ${
                isDarkMode ? 'bg-base200' : 'bg-n40'
              }`}
              onPress={openAllRewardCycles}>
              <CyDText className='text-[14px] font-medium'>
                {t('VIEW_ALL')}
              </CyDText>
              <CyDMaterialDesignIcons
                name='chevron-right'
                size={20}
                className={`${isDarkMode ? 'text-white' : 'text-black'}`}
              />
            </CyDTouchView>
          </CyDView>
        </CyDView>
      )}

      {/* Previous reward cycles earnings */}
      {votingHistory.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[16px] font-semibold mb-2'>
            {t('PREVIOUS_REWARD_CYCLES_EARNINGS')}
          </CyDText>

          <CyDView
            className={`bg-base40 rounded-[12px] overflow-hidden ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
            }`}>
            {votingHistory?.slice(0, 5).map((cycle, index) => (
              <CyDView
                key={cycle.id}
                className={`p-4 flex-row items-center justify-between ${
                  index < 4 ? 'border-b border-n20' : ''
                }`}>
                <CyDView className='flex-1'>
                  <CyDText className='text-[14px] font-medium mb-1'>
                    {cycle.name}
                  </CyDText>
                  <CyDText className='text-n200 text-[12px]'>
                    {cycle.period}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center'>
                  <CyDImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-6 h-6 mr-2'
                    resizeMode='contain'
                  />
                  <CyDText className='text-[16px] font-semibold'>
                    {cycle.amount}
                  </CyDText>
                </CyDView>
              </CyDView>
            ))}

            {/* View All Button */}
            {votingHistory.length > 5 && (
              <CyDTouchView
                className={`p-4 flex-row items-center justify-between ${
                  isDarkMode ? 'bg-base200' : 'bg-n40'
                }`}
                onPress={openAllRewardCycles}>
                <CyDText className='text-[14px] font-medium'>
                  {t('VIEW_ALL')}
                </CyDText>
                <CyDMaterialDesignIcons
                  name='chevron-right'
                  size={20}
                  className={`${isDarkMode ? 'text-white' : 'text-black'}`}
                />
              </CyDTouchView>
            )}
          </CyDView>
        </CyDView>
      )}

      {/* Disclaimer */}
      <CyDView className='mb-8 mx-4'>
        <CyDText className='text-n200 text-[10px] leading-4'>
          {t('DISCLAIMER_THIRD_PARTY_TRADEMARKS')}
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

export default MerchantRewardDetailContent;

const styles = StyleSheet.create({
  pieChart: {
    height: 44,
    width: 44,
  },
  blurAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
