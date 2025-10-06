import React, { useEffect, useMemo, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDImage,
} from '../../styles/tailwindComponents';
import MerchantLogo from './MerchantLogo';
import { BlurView } from '@react-native-community/blur';
import { StyleSheet, ActivityIndicator, Platform } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { DecimalHelper } from '../../utils/decimalHelper';
import { useColorScheme } from 'nativewind';
import { Theme, useTheme } from '../../reducers/themeReducer';
import useAxios from '../../core/HttpRequest';
import { useGlobalBottomSheet } from '../v2/GlobalBottomSheetProvider';
import { PieChart } from 'react-native-svg-charts';
import { useNavigation } from '@react-navigation/native';
import { screenTitle } from '../../constants';

interface MerchantRewardDetailContentProps {
  merchantData?: MerchantDetailData;
  navigation?: any;
}

interface MerchantDetailData {
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
    estimatedNextEpochRewards: any;
  };

  trends: any;
}

interface VotingHistoryItem {
  epochNumber: number;
  bribesReceived?: string;
  [key: string]: any;
}

interface VotingHistoryResponse {
  history: VotingHistoryItem[];
  hasMore: boolean;
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

interface ReferralTransaction {
  id: string;
  hash: string;
  amount: string;
  status: string;
  date: string;
}

const MerchantRewardDetailContent: React.FC<
  MerchantRewardDetailContentProps
> = ({ merchantData, navigation: navigationProp }) => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const { getWithAuth } = useAxios();
  const { showBottomSheet } = useGlobalBottomSheet();
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
  const [error, setError] = useState<string | null>(null);

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
      setError(null);

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
            title: 'Promotional Bonus',
            amount: bribe.amountFormatted,
            token: bribe.token.symbol,
            date: formatTimestamp(bribe.addedAt),
          })) ?? [];
        setPromotionalBonuses(promos);
      } else {
        console.warn(
          'Failed to fetch merchant details:',
          detailsResponse.error,
        );
        setError('Failed to load merchant details');
      }
    } catch (err) {
      console.error('Error fetching merchant data:', err);
      setError('Failed to load merchant data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMerchantData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantData?.candidateId]);

  // Show error toast if needed
  useEffect(() => {
    if (error) {
      // TODO: Replace with your toast implementation
      console.error('Toast:', error);
    }
  }, [error]);

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
              Reward Cycles
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
        className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-n30'}`}>
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
        className={`flex-1 items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-n30'}`}>
        <CyDText
          className={`text-[16px] ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Merchant data not available
        </CyDText>
      </CyDView>
    );
  }

  /**
   * Processes merchant name for display in the circle
   * - If name has multiple words, takes first word only
   * - If name is longer than 10 characters, truncates to 10
   * - Returns processed name and appropriate font size
   */
  const processMerchantName = (name: string) => {
    const firstWord = name.split(' ')[0];
    const displayName =
      firstWord.length > 8 ? firstWord.substring(0, 8) : firstWord;

    // Calculate font size based on name length
    let fontSize = 20;
    if (displayName.length >= 8) {
      fontSize = 14;
    } else if (displayName.length > 5) {
      fontSize = 16;
    }

    return { displayName, fontSize };
  };

  /**
   * Handles boost this merchant button press
   * Navigates to social media screen with candidate ID parameter
   */
  const handleBoostMerchant = () => {
    const candidateId = currentMerchantData.candidateId;
    const redirectURI = `https://app.cypherhq.io/#/?candidateId=${candidateId}`;
    navigation.navigate(screenTitle.OPTIONS);
    setTimeout(() => {
      navigation.navigate(screenTitle.OPTIONS, {
        screen: screenTitle.SOCIAL_MEDIA_SCREEN,
        params: {
          title: 'Boost Merchant',
          uri: redirectURI,
        },
      });
    }, 250);
  };

  const { displayName, fontSize } = processMerchantName(
    currentMerchantData.brand ?? currentMerchantData.canonicalName,
  );

  // Style objects for dynamic styling
  const overlayStyle = {
    backgroundColor: 'rgba(13, 13, 13, 0.7)',
  };

  const merchantTextStyle = {
    fontSize,
  };

  return (
    <CyDView
      className={`flex-1 pb-14 -mb-10 ${isDarkMode ? 'bg-black' : 'bg-n30'}`}>
      {/* Header Section with Background */}
      <CyDView className='items-center'>
        {/* Background Image or Solid Color */}
        {
          <>
            {/* Background banner */}
            <CyDView className='w-full h-[126px] bg-white items-center justify-center relative'>
              {/* Large faded merchant name acting as background image */}
              <CyDText className='text-black font-bold text-center text-[80px]'>
                {currentMerchantData.brand ?? currentMerchantData.canonicalName}
              </CyDText>

              {/* Blur Effect overlaying the big text */}
              <BlurView
                style={styles.blurAbsolute}
                blurType={isDarkMode ? 'dark' : 'light'}
                blurAmount={8}
                reducedTransparencyFallbackColor='rgba(255, 255, 255, 0.3)'
                pointerEvents='none'
              />

              {/* Semi-transparent overlay (tint) */}
              <CyDView
                className='absolute inset-0'
                style={overlayStyle}
                pointerEvents='none'
              />
            </CyDView>
          </>
        }

        {/* Merchant Logo Circle */}
        <CyDView className='w-20 h-20 bg-white rounded-full items-center justify-center mb-2 shadow-lg z-20 absolute left-1/2 -translate-x-1/2 top-[86px]'>
          {/* BOOSTED Badge */}
          {(userBoostStatus?.hasBoost ??
            currentMerchantData?.userVoteData?.hasVoted ??
            false) && (
            <CyDView className='absolute -top-3 bg-orange500 rounded-full px-2 py-1 self-center z-10'>
              <CyDText className='text-white text-[10px] font-bold'>
                BOOSTED
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
          <CyDText className='text-green400 text-[18px] font-bold'>
            {currentMerchantData.historicalMultiplier.current.toFixed(1)}X
            Rewards
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Your spend section */}
      <CyDView className='mb-6 mx-4 '>
        <CyDText className='text-[12px] font-medium mb-2'>
          Your spend on this merchant, earns
        </CyDText>

        {/* All Transaction reward */}
        <CyDView
          className={`bg-base40 rounded-[12px] py-4 mb-3 ${
            isDarkMode ? 'bg-base40' : 'bg-n0'
          }`}>
          <CyDView className='flex-row justify-between items-center mb-4 px-4'>
            <CyDText className='text-[14px] font-medium'>
              All Transaction reward
            </CyDText>
            <CyDView className='items-end'>
              <CyDText className='text-[14px] font-medium'>1X Rewards</CyDText>
              {/* <CyDText className='text-n200 text-[12px]'>
                {currentMerchantData.baseReward}
              </CyDText> */}
            </CyDView>
          </CyDView>

          <CyDView className='relative  mb-4'>
            <CyDView
              className={`h-[1px] ${isDarkMode ? 'bg-base200' : 'bg-n40'}`}
            />
            {/* Plus Icon */}
            <CyDView className='items-center absolute -top-4 left-1/2 -translate-x-1/2'>
              <CyDView
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isDarkMode ? 'bg-white' : 'bg-black'
                }`}>
                <CyDMaterialDesignIcons
                  name='plus'
                  size={20}
                  className={`text-black ${isDarkMode ? 'text-black' : 'text-white'}`}
                />
              </CyDView>
            </CyDView>
          </CyDView>

          {/* Merchant reward */}
          <CyDView className='flex-row justify-between items-center px-4'>
            <CyDText className='text-[14px] font-medium'>
              Merchant reward
            </CyDText>
            <CyDText className='text-[14px] font-medium'>
              {currentMerchantData.historicalMultiplier.current.toFixed(1)}X
              Rewards
            </CyDText>
            {/* <CyDText className='text-n200 text-[12px]'>
                {currentMerchantData.merchantReward ??
                  '~ 45 - 61 $CYPR/$10 spent'}
              </CyDText> */}
          </CyDView>
        </CyDView>
      </CyDView>

      {/* Bonuses Section */}
      {promotionalBonuses.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[12px] font-medium mb-2'>Bonuses</CyDText>

          <CyDView
            className={`bg-base40 rounded-[12px] ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
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
                      Avg Booster
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
          Merchant Boost
        </CyDText>

        <CyDText className='text-n200 text-[12px] leading-5 mb-4'>
          Boosting is powered by the Cypher community. The more people who boost
          a merchant, the greater the reward potential - not just for you, but
          for everyone using Cypher.
        </CyDText>

        {userBoostStatus?.hasBoost ? (
          // <CyDView className='mb-4'>
          //   <CyDText className='text-green-500 text-[14px] font-medium mb-2'>
          //     ✓ You have boosted this merchant
          //   </CyDText>
          //   {userBoostStatus.boostAmount && (
          //     <CyDText className='text-n200 text-[12px]'>
          //       Boost amount: {userBoostStatus.boostAmount} CYPR
          //     </CyDText>
          //   )}
          //   {/* userBoostStatus.boostDate is not available in the new response */}
          // </CyDView>
          <CyDView className='rounded-[16px] bg-base20 py-3 mb-4'>
            <CyDView className='flex flex-row items-center justify-between px-3'>
              <CyDView>
                <CyDText className='text-n200 text-[12px] font-medium'>
                  You have boosted this merchant for
                </CyDText>
                <CyDText className='font-medium'>
                  {DecimalHelper.round(
                    DecimalHelper.toDecimal(
                      merchantDetails?.userSpecificData?.votingPower ?? '0',
                      18,
                    ),
                    2,
                  ).toNumber()}{' '}
                  veCypher
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
              You haven&apos;t boosted this merchant
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
            Brands may offer exclusive bonuses when you boost them – giving you
            even more back for your support.
          </CyDText>
        </CyDView>

        {/* Action Buttons */}
        {!userBoostStatus?.hasBoost && (
          <CyDView className='gap-y-3'>
            <CyDTouchView
              className='bg-yellow-400 rounded-[25px] py-4 items-center'
              onPress={handleBoostMerchant}>
              <CyDText className='text-black text-[16px] font-semibold'>
                Boost this merchant
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )}
      </CyDView>

      {/* <CyDTouchView
        className='bg-base200 rounded-[25px] py-4 items-center mb-7 mx-4'
        onPress={handleKnowMorePress}>
        <CyDText className='text-white text-[16px] font-medium'>
          Know More about {currentMerchantData.name}
        </CyDText>
      </CyDTouchView> */}

      {/* Recent Transactions */}
      {userTransactions.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[12px] font-medium mb-2'>
            Your Recent Transactions on this Merchant
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
              <CyDText className='text-[14px] font-medium'>View All</CyDText>
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
            Previous reward cycles earnings
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
                <CyDText className='text-[14px] font-medium'>View All</CyDText>
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
          Disclaimer: All third-party trademarks, including logos and brand
          names, are the property of their respective owners. Their inclusion
          within this product is for identification and informational purposes
          only and does not imply any endorsement, sponsorship, or affiliation.
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
