import React, { useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages, { AppImagesMap } from '../../../assets/images/appImages';
import {
  CyDSafeAreaView,
  CyDView,
  CyDTouchView,
  CyDText,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
} from '../../styles/tailwindComponents';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useColorScheme,
  Modal,
} from 'react-native';
import Video from 'react-native-video';
import { getMaskedAddress, HdWalletContext } from '../../core/util';
import useAxios from '../../core/HttpRequest';
import moment from 'moment';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { CardProfile } from '../../models/cardProfile.model';
import { get } from 'lodash';
import GradientText from '../../components/gradientText';
import ReferralDetailContent from '../../components/v2/ReferralDetailContent';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';
import { PieChart } from 'react-native-svg-charts';
import { screenTitle } from '../../constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Button from '../../components/v2/button';
import { ButtonType, CardProviders } from '../../constants/enum';
import { Theme, useTheme as useAppTheme } from '../../reducers/themeReducer';
import CypherTokenBottomSheetContent from '../../components/v2/cypherTokenBottomSheetContent';
import { DecimalHelper } from '../../utils/decimalHelper';
import InviteFriendsBanner from '../../components/v2/inviteFriendsBanner';
import { IUserProfileResponse } from '../../models/rewardsProfile.interface';
import { IRewardsHistoryResponse } from '../../models/rewardsHistory.interface';
import {
  IVotingPowerResponse,
  IEnrichedVotingPowerData,
  IVeNFTDetails,
} from '../../models/votingPower.interface';
import ReferralRewardsBottomSheet from '../../components/v2/ReferralRewardsBottomSheet';
import BoosterInfoBottomSheetContent from '../../components/v2/BoosterInfoBottomSheetContent';
// NOTE: Import for ReferralsViewAll component (ready for navigation integration)
// import ReferralsViewAll from './ReferralsViewAll';
import Loading from '../Loading';
import { ClaimRewardResponse } from '../../models/rewardsClaim.interface';

/**
 * Combined rewards data structure for the component
 * This aggregates data from multiple API endpoints
 */
interface ICombinedRewardsData {
  userProfile: IUserProfileResponse | null;
  rewardsHistory: IRewardsHistoryResponse | null;
  votingPower: IEnrichedVotingPowerData | null;
}

interface RewardTrendsContentProps {
  rewardsData: ICombinedRewardsData | null;
}

const RewardTrendsContent: React.FC<RewardTrendsContentProps> = ({
  rewardsData,
}) => {
  const { t } = useTranslation();

  /* -------------------------------------------------------------------------- */
  /*                         Time-filter drop-down logic                         */
  /* -------------------------------------------------------------------------- */

  // Theme / color-scheme helpers (kept inside component to respect dynamic changes)
  const { theme } = useAppTheme();
  const colorScheme = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Dynamic background colour for video placeholder to avoid black flash.
  const rewardTrendsTokenVideoBgColor = isDarkMode ? '#000000' : '#FFFFFF';

  // Time-filter drop-down logic
  const [timeFilter, setTimeFilter] = React.useState(t('ALL_TIME', 'All time'));
  const [showOptions, setShowOptions] = React.useState(false);
  const selectorRef = React.useRef<any>(null);
  const [dropdownPos, setDropdownPos] = React.useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Build list of options based on epochs from rewards history
  const timeOptions: string[] = React.useMemo(() => {
    const opts: string[] = [t('ALL_TIME', 'All time')];
    if (rewardsData?.rewardsHistory?.epochs?.length) {
      rewardsData.rewardsHistory.epochs.forEach(e => {
        // Using String(...) to satisfy eslint restrict-template-expressions rule
        opts.push(`${t('REWARD_CYCLE')} ${String(e.epochNumber)}`);
      });
    }
    return opts;
  }, [rewardsData, t]);

  // Resolve selected epoch object (undefined for all-time)
  const selectedEpoch = React.useMemo(() => {
    if (timeFilter === t('ALL_TIME', 'All time')) return undefined;
    const match = new RegExp(`${t('REWARD_CYCLE')} (\\d+)`).exec(timeFilter);
    const epochNum = match ? Number(match[1]) : undefined;
    return rewardsData?.rewardsHistory?.epochs?.find(
      e => e.epochNumber === epochNum,
    );
  }, [timeFilter, rewardsData, t]);

  /* -------------------------------------------------------------------------- */
  /*                   Derived metrics based on selected window                 */
  /* -------------------------------------------------------------------------- */

  const breakdownSource = (selectedEpoch
    ? selectedEpoch.earned.breakdown
    : rewardsData?.userProfile?.allTime?.totalEarned) ?? {
    baseSpend: '0',
    boostedSpend: '0',
    baseReferral: '0',
    boostedReferral: '0',
    bribes: '0',
    total: '0',
  };

  const totalRewards = React.useMemo(() => {
    const val = selectedEpoch
      ? breakdownSource.total
      : rewardsData?.userProfile?.allTime?.totalEarned?.total;
    return parseFloat(DecimalHelper.toDecimal(val ?? '0', 18).toString());
  }, [breakdownSource, selectedEpoch, rewardsData]);

  const bonus = React.useMemo(() => {
    const val = selectedEpoch
      ? breakdownSource.bribes
      : rewardsData?.userProfile?.allTime?.totalEarned?.bribes;
    return parseFloat(DecimalHelper.toDecimal(val ?? '0', 18).toString());
  }, [breakdownSource, selectedEpoch, rewardsData]);

  const fromSpends = React.useMemo(() => {
    const val = selectedEpoch
      ? breakdownSource.baseSpend
      : rewardsData?.userProfile?.allTime?.totalEarned?.baseSpend;
    return parseFloat(DecimalHelper.toDecimal(val ?? '0', 18).toString());
  }, [breakdownSource, selectedEpoch, rewardsData]);

  const merchantSpends = React.useMemo(() => {
    const val = selectedEpoch
      ? breakdownSource.boostedSpend
      : rewardsData?.userProfile?.allTime?.totalEarned?.boostedSpend;
    return parseFloat(DecimalHelper.toDecimal(val ?? '0', 18).toString());
  }, [breakdownSource, selectedEpoch, rewardsData]);

  const referrals = React.useMemo(() => {
    const baseRefVal = selectedEpoch
      ? breakdownSource.baseReferral
      : rewardsData?.userProfile?.allTime?.totalEarned?.baseReferral;
    const boostedRefVal = selectedEpoch
      ? breakdownSource.boostedReferral
      : rewardsData?.userProfile?.allTime?.totalEarned?.boostedReferral;
    const baseRef = parseFloat(
      DecimalHelper.toDecimal(baseRefVal ?? '0', 18).toString(),
    );
    const boostedRef = parseFloat(
      DecimalHelper.toDecimal(boostedRefVal ?? '0', 18).toString(),
    );
    return baseRef + boostedRef;
  }, [breakdownSource, selectedEpoch, rewardsData]);

  // Donut chart data (order matters for consistent colours)
  const chartData = React.useMemo(
    () => [
      {
        key: 'bonus',
        value: bonus,
        svg: { fill: '#6BB200' },
        arc: { outerRadius: '100%', cornerRadius: 4 },
      },
      {
        key: 'spends',
        value: fromSpends,
        svg: { fill: '#F7C645' },
        arc: { outerRadius: '100%', cornerRadius: 4 },
      },
      {
        key: 'merchant',
        value: merchantSpends,
        svg: { fill: '#FF8C00' },
        arc: { outerRadius: '100%', cornerRadius: 4 },
      },
      {
        key: 'referrals',
        value: referrals,
        svg: { fill: '#0749FF' },
        arc: { outerRadius: '100%', cornerRadius: 4 },
      },
    ],
    [bonus, fromSpends, merchantSpends, referrals],
  );

  // Transaction data state
  const [transactionData, setTransactionData] = React.useState<any[]>([]);

  /* -------------------------------------------------------------------------- */
  /*                   Fetch Transactions for Reward Section                    */
  /* -------------------------------------------------------------------------- */

  // Access global context for card provider details
  const globalContextForCard = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalContextForCard?.globalState
    ?.cardProfile as CardProfile;
  const cardProvider: CardProviders =
    (cardProfile?.provider as CardProviders) ?? CardProviders.REAP_CARD;

  const { getWithAuth } = useAxios();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Determine transaction limit based on whether we're filtering to a specific epoch or all time
        const transactionLimit = selectedEpoch ? 5 : 200;
        let url = `/v1/cards/${cardProvider}/card/transactions?newRoute=true&limit=${transactionLimit}&includeRewards=true`;

        // Append epoch window if selected epoch exists
        if (selectedEpoch?.epochStartTime && selectedEpoch?.epochEndTime) {
          url += `&startDate=${String(selectedEpoch.epochStartTime)}&endDate=${String(selectedEpoch.epochEndTime)}`;
        } else if (!selectedEpoch) {
          // For "All time" selection, limit end date to current epoch's start time
          // The current epoch is typically the most recent one (first in the array after sorting)
          const currentEpoch = rewardsData?.rewardsHistory?.epochs?.[0];
          if (currentEpoch?.epochStartTime) {
            url += `&endDate=${String(currentEpoch.epochStartTime)}`;
          }
        }

        const resp = await getWithAuth(url);

        if (!resp.isError) {
          const allTransactions = resp.data.transactions ?? [];

          // Filter transactions to include only:
          // 1. DEBIT transactions
          // 2. Settled transactions (isSettled === true)
          // 3. Transactions with merchant name present in metadata
          const filteredTransactions = allTransactions.filter((txn: any) => {
            const isDebit = txn.type === 'DEBIT';
            const isSettled = txn.isSettled === true;
            const hasMerchantName = txn.metadata?.merchant?.merchantName;

            return isDebit && isSettled && hasMerchantName;
          });

          /* Group by calendar day for UI section */
          const grouped: { [date: string]: any[] } = {};
          filteredTransactions.forEach((txn: any) => {
            const dateKey = moment(txn.date).format('MMM DD, YYYY');
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(txn);
          });

          const transformed = Object.keys(grouped)
            .sort(
              (a, b) =>
                moment(b, 'MMM DD, YYYY').valueOf() -
                moment(a, 'MMM DD, YYYY').valueOf(),
            )
            .map((dateStr, idx) => ({
              id: `day-${String(idx)}`,
              date: dateStr,
              transactions: grouped[dateStr].map((txn: any) => ({
                id: txn.id,
                merchant: txn.title ?? txn.merchant ?? t('UNKNOWN', 'Unknown'),
                amount: txn.amount,
                status: txn.tStatus,
                time: moment(txn.date).format('h:mm A'),
                reward: txn.cypherRewards,
              })),
            }));

          setTransactionData(transformed);
        } else {
          console.error('Error response from transactions API:', resp.error);
          setTransactionData([]);
        }
      } catch (error) {
        console.error('Error fetching reward transactions', error);
        setTransactionData([]);
      }
    };

    void fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEpoch, cardProvider, rewardsData]);

  const renderTransactionItem = (transaction: any) => {
    return (
      <CyDView
        key={transaction.id}
        className='flex-row justify-between items-center py-4 bg-base40 border-b border-n40 px-4'>
        <CyDView className='flex-1'>
          <CyDText className='text-[14px] font-medium'>
            {transaction.merchant}
          </CyDText>
          <CyDText className='text-n200 text-[12px]'>
            ${transaction.amount} • {transaction.time}
          </CyDText>
          {DecimalHelper.toDecimal(
            transaction.reward?.rewardsAllocation?.boostedSpendRewards,
            18,
          ).toNumber() > 0 && (
            <CyDView className='bg-orange-500/10 rounded-full px-3 py-[2px] mt-1 self-start'>
              <CyDText className='text-orange500 text-[12px] font-bold'>
                Boosted by{' '}
                {transaction.merchant.length > 10
                  ? transaction.merchant.slice(0, 10) + '...'
                  : transaction.merchant}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
        <CyDView className='items-end'>
          {DecimalHelper.toDecimal(
            transaction.reward?.rewardsAllocation?.totalRewards,
            18,
          ).toNumber() === 0 &&
            transaction.status === 'PENDING' && (
              <CyDView className='flex-row items-center'>
                <CyDView className='w-2 h-2 bg-n200 rounded-full mr-2' />
                <CyDText className='text-n200 text-[12px]'>
                  {transaction.status}
                </CyDText>
              </CyDView>
            )}
          {DecimalHelper.toDecimal(
            transaction.reward?.rewardsAllocation?.totalRewards,
            18,
          ).toNumber() > 0 && (
            <CyDView className='flex-row items-center mt-1'>
              <CyDImage
                source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                className='w-6 h-6 mr-1'
                resizeMode='contain'
              />
              <CyDText className='text-[14px] font-bold'>
                {DecimalHelper.toDecimal(
                  transaction.reward.rewardsAllocation.totalRewards,
                  18,
                ).toFixed(2)}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    );
  };

  /* -------------------------------------------------------------------------- */
  /*                            Badge colour helper                             */
  /* -------------------------------------------------------------------------- */

  // Static style for dropdown menu container (avoid inline-style lint error)
  const dropdownStaticStyle = {
    position: 'absolute' as const,
    right: 16,
    width: 180,
    maxHeight: 320,
  };

  const getBadgeColors = (key: string) => {
    switch (key) {
      case 'bonus':
        return { bg: 'rgba(107,178,0,0.15)', txt: '#6BB200' };
      case 'spends':
        return { bg: 'rgba(247,198,69,0.15)', txt: '#F7C645' };
      case 'merchant':
        return { bg: 'rgba(255,140,0,0.15)', txt: '#FF8C00' };
      default:
        return { bg: 'rgba(7,73,255,0.15)', txt: '#0749FF' };
    }
  };

  return (
    <CyDView className='flex-1 bg-n0'>
      <CyDView className='bg-base40 px-4 mt-[-200px] pt-[200px]'>
        {/* Time Filter */}
        <CyDView className='flex-row justify-between items-center py-4'>
          <CyDText className='text-[22px] font-medium'>
            {t('REWARD_TRENDS', 'Reward Trends')}
          </CyDText>
          <CyDTouchView
            ref={selectorRef}
            className='flex-row items-center rounded-lg px-3 py-2'
            onPress={() => {
              if (selectorRef.current) {
                selectorRef.current.measureInWindow(
                  (x: number, y: number, width: number, height: number) => {
                    setDropdownPos({ x, y, width, height });
                    setShowOptions(prev => !prev);
                  },
                );
              }
            }}>
            <CyDText className='text-[14px] mr-2'>{timeFilter}</CyDText>
            <CyDMaterialDesignIcons
              name={showOptions ? 'chevron-up' : 'chevron-down'}
              size={16}
              className={`${isDarkMode ? 'text-white' : 'text-black'}`}
            />
          </CyDTouchView>
        </CyDView>

        {/* Dropdown Modal */}
        {showOptions && (
          <Modal
            visible={showOptions}
            transparent
            animationType='fade'
            onRequestClose={() => setShowOptions(false)}>
            <CyDTouchView
              className='absolute top-0 left-0 right-0 bottom-0 bg-black/10'
              onPress={() => setShowOptions(false)}
              activeOpacity={1}>
              {/* eslint-disable-next-line react-native/no-inline-styles */}
              <CyDView
                style={[
                  dropdownStaticStyle,
                  { top: dropdownPos.y + dropdownPos.height + 4 },
                ]}
                className='bg-n20 rounded-[12px] shadow-lg max-h-[220px]'>
                <CyDScrollView nestedScrollEnabled>
                  {timeOptions.map((option, index) => (
                    <CyDTouchView
                      key={option}
                      className={`py-3 px-4 ${timeOptions.length - 1 === index ? '' : 'border-b border-n40'}`}
                      onPress={() => {
                        setTimeFilter(option);
                        setShowOptions(false);
                      }}>
                      <CyDText
                        className={`text-[14px] ${
                          option === timeFilter ? 'font-semibold' : ''
                        }`}>
                        {option}
                      </CyDText>
                    </CyDTouchView>
                  ))}
                </CyDScrollView>
              </CyDView>
            </CyDTouchView>
          </Modal>
        )}

        {/* Chart Section */}
        <CyDView className='items-center py-6'>
          <CyDView className='relative items-center justify-center'>
            <PieChart
              style={styles.pieChart}
              data={chartData}
              innerRadius='70%'
              outerRadius='90%'
              padAngle={0.02}
            />
            {/* Center content - positioned absolutely in the exact center */}
            <CyDView
              className='absolute items-center justify-center'
              style={styles.centerContent}>
              <CyDView className='relative'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN}
                  className='w-12 h-12'
                  resizeMode='contain'
                />
                <CyDView className='absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full items-center justify-center'>
                  <CyDImage
                    source={AppImages.BASE_LOGO}
                    className='w-5 h-5'
                    resizeMode='contain'
                  />
                </CyDView>
              </CyDView>
              <CyDText className='text-[24px] font-bold'>
                {totalRewards.toFixed(2)}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Total Rewards Earned Label */}
        <CyDView className='mb-6'>
          <CyDText className='text-n200 text-[14px]'>
            {t('REWARDS_TOTAL_REWARDS_EARNED')}
          </CyDText>
        </CyDView>

        {/* Reward Breakdown */}
        <CyDView className='mb-6'>
          {/* Bonus row */}
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDText className='text-[14px]'>{t('REWARDS_BONUS')}</CyDText>
            <CyDView
              style={{
                backgroundColor: getBadgeColors('bonus').bg,
              }}
              className='px-1 py-[2px] rounded-[4px]'>
              <CyDText
                className='text-[14px] font-medium'
                style={{ color: getBadgeColors('bonus').txt }}>
                {bonus.toFixed(2)} $CYPR
              </CyDText>
            </CyDView>
          </CyDView>
          {/* From spends row */}
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDText className='text-[14px]'>
              {t('REWARDS_FROM_SPENDS')}
            </CyDText>
            <CyDView
              style={{ backgroundColor: getBadgeColors('spends').bg }}
              className='px-1 py-[2px] rounded-[4px]'>
              <CyDText
                className='text-[14px] font-medium'
                style={{ color: getBadgeColors('spends').txt }}>
                {fromSpends.toFixed(2)} $CYPR
              </CyDText>
            </CyDView>
          </CyDView>
          {/* Merchant spends row */}
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDText className='text-[14px]'>
              {t('REWARDS_MERCHANT_SPENDS')}
            </CyDText>
            <CyDView
              style={{ backgroundColor: getBadgeColors('merchant').bg }}
              className='px-1 py-[2px] rounded-[4px]'>
              <CyDText
                className='text-[14px] font-medium'
                style={{ color: getBadgeColors('merchant').txt }}>
                {merchantSpends.toFixed(2)} $CYPR
              </CyDText>
            </CyDView>
          </CyDView>
          {/* Referrals row */}
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDText className='text-[14px]'>
              {t('REWARDS_REFERRALS_REWARDS')}
            </CyDText>
            <CyDView
              style={{ backgroundColor: getBadgeColors('referrals').bg }}
              className='px-1 py-[2px] rounded-[4px]'>
              <CyDText
                className='text-[14px] font-medium'
                style={{ color: getBadgeColors('referrals').txt }}>
                {referrals.toFixed(2)} $CYPR
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>

      {/* Reward Transaction Section */}
      <CyDView className='flex-1 mb-[40px]'>
        {transactionData.length > 0 && (
          <CyDText className='text-[18px] font-bold py-4 px-4 bg-n20'>
            {t('REWARDS_REWARD_TRANSACTION')}
          </CyDText>
        )}

        {transactionData.map(dayData => (
          <CyDView key={dayData.id}>
            <CyDText className='text-n200 text-[12px] font-medium mt-[24px] mb-[8px] px-4'>
              {dayData.date}
            </CyDText>
            {dayData.transactions.map(renderTransactionItem)}
          </CyDView>
        ))}
      </CyDView>
    </CyDView>
  );
};

export default function Rewards() {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  // NOTE: Casting navigation to `any` as we navigate to multiple stacks without strict typing.
  // This prevents TypeScript linter errors while keeping the API unchanged.
  const navigation: any = useNavigation();
  // Rewards data fetched from API and related states
  const { getWithAuth } = useAxios();

  // Combined rewards data from multiple API endpoints
  const [rewardsData, setRewardsData] =
    React.useState<ICombinedRewardsData | null>(null);

  // Referral summary state
  const [referralSummary, setReferralSummary] = React.useState<any | null>(
    null,
  );

  // Voted merchants list (user voted)
  const [votedMerchants, setVotedMerchants] = React.useState<
    Array<{
      candidateId: string;
      brand: string;
      logoUrl?: string;
      category?: string;
      historicalMultiplier?: { current: number };
    }>
  >([]);
  const [isTokenVideoLoaded, setIsTokenVideoLoaded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [claimRewardData, setClaimRewardData] =
    React.useState<ClaimRewardResponse | null>(null);
  const { theme } = useAppTheme();
  const colorScheme = useColorScheme();

  // Bottom sheet hook for displaying modals
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  // Get current ethereum address for voting power API
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const currentAddress: string = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    '',
  );

  const totalRewards = DecimalHelper.toDecimal(
    rewardsData?.userProfile?.allTime?.totalEarned?.total ?? '0',
    18,
  ).toString();

  const totalUnclaimed = DecimalHelper.toDecimal(
    rewardsData?.userProfile?.allTime?.totalUnclaimed?.total ?? '0',
    18,
  ).toString();

  const availableToClaim =
    claimRewardData?.rewardInfo?.totalRewardsInToken !== undefined
      ? DecimalHelper.toDecimal(
          claimRewardData.rewardInfo.totalRewardsInToken,
          18,
        ).toString()
      : totalUnclaimed;

  const totalVotingPower = DecimalHelper.toDecimal(
    rewardsData?.votingPower?.totalVotingPower ?? '0',
    18,
  ).toString();

  const usedVotingPower = DecimalHelper.toDecimal(
    rewardsData?.votingPower?.usedVotingPower ?? '0',
    18,
  ).toString();

  const unusedVotingPower = DecimalHelper.toDecimal(
    rewardsData?.votingPower?.freeVotingPower ?? '0',
    18,
  ).toString();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Dynamic background colour for video placeholder to avoid black flash.
  const tokenVideoBgColor = isDarkMode ? '#000000' : '#EBEDF0';

  /* -------------------------------------------------------------------------- */
  /*                               Progress State                               */
  /* -------------------------------------------------------------------------- */
  // Animated value for reward booster progress (0-1 range)
  const [progressAnimation] = React.useState(new Animated.Value(0));

  /* -------------------------------------------------------------------------- */
  /*                    Fetch User Rewards API & Progress Animation            */
  /* -------------------------------------------------------------------------- */

  /**
   * Helper function to calculate used and free voting power from veNFTs
   * Used voting power is the sum of all votes across all veNFTs
   * Free voting power is total voting power minus used voting power
   */
  const enrichVotingPowerData = (
    votingPowerResponse: IVotingPowerResponse,
  ): IEnrichedVotingPowerData => {
    const { votingPower } = votingPowerResponse;
    const {
      totalVotingPower: vpTotal,
      totalLockedAmount,
      veNFTs,
    } = votingPower;

    // Calculate used voting power by summing all votes across all veNFTs
    let usedVotingPowerBigInt = BigInt(0);
    if (Array.isArray(veNFTs) && veNFTs.length > 0) {
      // Type guard to check if veNFTs contains detailed NFT data
      const hasDetailedNFTs =
        'currentVotes' in veNFTs[0] && veNFTs[0].currentVotes !== undefined;

      if (hasDetailedNFTs) {
        const detailedVeNFTs = veNFTs as IVeNFTDetails[];
        detailedVeNFTs.forEach(veNFT => {
          if (veNFT.currentVotes && Array.isArray(veNFT.currentVotes)) {
            veNFT.currentVotes.forEach(vote => {
              usedVotingPowerBigInt += BigInt(vote.voteAmount ?? '0');
            });
          }
        });
      }
    }

    const usedVotingPowerStr = usedVotingPowerBigInt.toString();
    const freeVotingPower = (
      BigInt(vpTotal) - usedVotingPowerBigInt
    ).toString();

    return {
      totalVotingPower: vpTotal,
      totalLockedAmount,
      veNFTs: veNFTs as IVeNFTDetails[],
      endOfCurrentEpochTotalVotingPower:
        'endOfCurrentEpochTotalVotingPower' in votingPower
          ? votingPower.endOfCurrentEpochTotalVotingPower
          : undefined,
      currentEpochEndTimestamp:
        'currentEpochEndTimestamp' in votingPower
          ? votingPower.currentEpochEndTimestamp
          : undefined,
      usedVotingPower: usedVotingPowerStr,
      freeVotingPower,
    };
  };

  // Fetch rewards data from multiple endpoints and animate progress bar every time screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const fetchRewards = async () => {
        try {
          setIsLoading(true);

          // Fetch profile data first

          const profileUrl = `/v1/cypher-protocol/user/${currentAddress}/profile`;

          const userProfilePromise = getWithAuth(profileUrl);

          // Fetch rewards history second (in parallel)
          const historyUrl = `/v1/cypher-protocol/user/${currentAddress}/rewards/history?limit=10`;
          const rewardsHistoryPromise = getWithAuth(historyUrl);

          // Fetch voting power data third (in parallel)

          const votingPowerUrl = `/v1/cypher-protocol/user/${currentAddress}/voting-power?includeEndOfEpoch=true&includeVeNFTDetails=true`;
          const votingPowerPromise = getWithAuth(votingPowerUrl);
          const claimRewardPromise = getWithAuth(
            '/v1/cypher-protocol/user/claim-reward',
          );

          const [
            userProfileResponse,
            rewardsHistoryResponse,
            votingPowerResponse,
            claimRewardResponse,
          ] = await Promise.all([
            userProfilePromise,
            rewardsHistoryPromise,
            votingPowerPromise,
            claimRewardPromise,
          ]);

          // Check if all critical requests succeeded
          if (userProfileResponse.isError) {
            console.error(
              '❌ Failed to fetch user profile:',
              userProfileResponse.error,
            );
            return;
          }

          if (votingPowerResponse.isError) {
            console.error(
              '❌ Failed to fetch voting power:',
              votingPowerResponse.error,
            );
            return;
          }

          // Rewards history is optional - can proceed without it
          if (rewardsHistoryResponse.isError) {
            console.warn(
              '⚠️ Failed to fetch rewards history (non-critical):',
              rewardsHistoryResponse.error,
            );
          }

          // Extract user profile data
          const userProfile: IUserProfileResponse = userProfileResponse.data;

          // Extract rewards history data (with fallback)
          let rewardsHistory: IRewardsHistoryResponse;
          if (
            !rewardsHistoryResponse.isError &&
            rewardsHistoryResponse.data?.epochs
          ) {
            rewardsHistory = rewardsHistoryResponse.data;
          } else {
            console.warn(
              '⚠️ Using empty rewards history (endpoint may not be deployed)',
            );
            rewardsHistory = {
              epochs: [],
              pagination: { hasMore: false },
            };
          }

          // Extract and enrich voting power data

          // The API returns { votingPower: {...} } wrapped structure
          // Check if we have the nested structure or direct structure
          let rawVotingPower: any;
          if (votingPowerResponse.data?.votingPower) {
            rawVotingPower = votingPowerResponse.data.votingPower;
          } else if (votingPowerResponse.data?.veNFTs) {
            rawVotingPower = votingPowerResponse.data;
          } else {
            console.error(
              '❌ Unexpected response structure from voting power endpoint!',
            );
            console.error('Response data:', votingPowerResponse.data);
            // Create empty fallback structure
            rawVotingPower = {
              totalVotingPower: '0',
              totalLockedAmount: '0',
              veNFTs: [],
            };
          }

          // Enrich voting power data with calculated fields
          const enrichedVotingPower = enrichVotingPowerData({
            votingPower: rawVotingPower,
          } as IVotingPowerResponse);

          if (!claimRewardResponse.isError && claimRewardResponse.data) {
            setClaimRewardData(claimRewardResponse.data as ClaimRewardResponse);
          } else {
            console.warn('⚠️ Failed to fetch claim reward (non-critical)');
          }

          // Combine all data into a single state object
          const combinedData: ICombinedRewardsData = {
            userProfile,
            rewardsHistory,
            votingPower: enrichedVotingPower,
          };

          setRewardsData(combinedData);
        } catch (err) {
          console.error('💥 Error fetching rewards data:', err);
        } finally {
          setIsLoading(false);
        }
      };

      void fetchRewards();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAddress]),
  );

  // Animate progress bar whenever screen is focused and voting power data changes
  useFocusEffect(
    React.useCallback(() => {
      const total = parseFloat(totalVotingPower);
      const used = parseFloat(usedVotingPower);

      if (Number.isFinite(total) && total > 0) {
        const ratio = used / total; // 0-1
        Animated.timing(progressAnimation, {
          toValue: ratio,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    }, [totalVotingPower, usedVotingPower, progressAnimation]),
  );

  /* -------------------------------------------------------------------------- */
  /*                       Fetch Referral Summary on Focus                      */
  /* -------------------------------------------------------------------------- */

  useFocusEffect(
    React.useCallback(() => {
      const fetchReferralSummary = async () => {
        try {
          const resp = await getWithAuth(
            '/v1/cards/referral-v2/rewards-summary',
          );

          if (!resp.isError && resp.data) {
            // Log refereesByEpoch structure safely
            if (resp.data.refereesByEpoch) {
              const epochKeys = Object.keys(resp.data.refereesByEpoch);

              // Log first epoch data safely if exists
              if (epochKeys.length > 0) {
                const firstEpoch = epochKeys[0];
              }
            }

            setReferralSummary(resp.data);
          } else {
            console.warn('Failed to fetch referral summary:', resp.error);
          }
        } catch (err) {
          console.error('Error fetching referral summary:', err);
        }
      };

      void fetchReferralSummary();
    }, []),
  );

  /* -------------------------------------------------------------------------- */
  /*                       Fetch Voted Merchants on Focus                      */
  /* -------------------------------------------------------------------------- */

  useFocusEffect(
    React.useCallback(() => {
      const fetchVotedMerchants = async () => {
        try {
          const resp = await getWithAuth(
            '/v1/cypher-protocol/merchants?onlyUserVoted=true',
          );
          if (!resp.isError) {
            setVotedMerchants(resp.data?.items ?? []);
          } else {
            console.warn('Failed to fetch voted merchants', resp.error);
          }
        } catch (err) {
          console.error('Error fetching voted merchants', err);
        }
      };

      void fetchVotedMerchants();
    }, []),
  );

  /* -------------------------------------------------------------------------- */
  /*                           Derived referral list                            */
  /* -------------------------------------------------------------------------- */
  // Flatten referees across all epochs into a single array while keeping epoch info
  interface RefereeData {
    address: string;
    totalRewardsEarned: number;
    onboardingStatus: string;
    signupDate?: number;
    epoch: number;
  }

  const referees: RefereeData[] = React.useMemo(() => {
    if (!referralSummary?.refereesByEpoch) return [];

    const flattened: RefereeData[] = [];

    Object.entries<{ referees?: RefereeData[] }>(
      referralSummary.refereesByEpoch,
    ).forEach(([epochKey, epochData]) => {
      const epochNum = Number(epochKey);
      const refList = epochData?.referees ?? [];
      refList.forEach(ref => {
        flattened.push({
          address: ref.address,
          totalRewardsEarned: ref.totalRewardsEarned ?? 0,
          onboardingStatus: ref.onboardingStatus ?? 'PENDING',
          signupDate: ref.signupDate,
          epoch: epochNum,
        });
      });
    });

    // Sort by signupDate descending (latest first)
    flattened.sort((a, b) => (b.signupDate ?? 0) - (a.signupDate ?? 0));

    return flattened;
  }, [referralSummary]);

  // First 5 referees for preview list
  const previewReferees = referees.slice(0, 5);

  // NOTE: DUMMY FUNCTIONS 🍎🍎🍎🍎🍎🍎
  const handleKnowMorePress = () => {
    showRewardTrendsBottomSheet();
  };
  /**
   * Handle deposit token button press
   * Navigates to social media screen with locks URL
   */
  const handleDepositTokenPress = () => {
    const redirectURI = 'https://app.cypherhq.io/#/?locks=true';
    (navigation as any).navigate(screenTitle.OPTIONS);
    setTimeout(() => {
      (navigation as any).navigate(screenTitle.OPTIONS, {
        screen: screenTitle.SOCIAL_MEDIA_SCREEN,
        params: {
          title: 'Deposit Tokens',
          uri: redirectURI,
        },
      });
    }, 250);
  };

  /**
   * Handle booster info button press
   * Shows the booster information bottom sheet explaining veCYPR and boosting
   */
  const handleBoosterInfoPress = () => {
    showBottomSheet({
      id: 'booster-info',
      snapPoints: ['65%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      backgroundColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      topBarColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      content: <BoosterInfoBottomSheetContent />,
      onClose: () => {},
    });
  };
  const handleWhatIsCypherTokenPress = () => {
    showBottomSheet({
      id: 'cypher-token-details',
      snapPoints: ['75%', Platform.OS === 'android' ? '100%' : '93%'],
      showCloseButton: true,
      scrollable: true,
      content: <CypherTokenBottomSheetContent />,
      onClose: () => {},
      backgroundColor: 'rgba(15, 15, 15, 0.95)',
    });
  };
  const handleViewAllReferralsPress = () => {
    navigation.navigate(screenTitle.REFERRALS_VIEW_ALL, {
      refereesByEpoch: referralSummary?.refereesByEpoch ?? {},
      votedMerchants,
    });
  };
  const handleInviteFriendsPress = () => {
    // Navigate to the Referrals page when the user taps "Invite Friends".
    // This allows users to invite friends and track referral rewards.
    navigation.navigate(screenTitle.REFERRALS);
  };

  /**
   * Handle learn how referral works button press
   * Shows the referral rewards bottom sheet with detailed information
   */
  const handleLearnReferralWorksPress = () => {
    showBottomSheet({
      id: 'referral-rewards-info',
      snapPoints: ['75%', Platform.OS === 'android' ? '100%' : '93%'],
      showCloseButton: true,
      scrollable: true,
      topBarColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      backgroundColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      content: (
        <ReferralRewardsBottomSheet
          onOpenInviteModal={() => {
            // Close current bottom sheet and navigate to referrals page
            hideBottomSheet('referral-rewards-info');
            navigation.navigate(screenTitle.REFERRALS);
          }}
          votedMerchants={votedMerchants as any}
        />
      ),
      onClose: () => {},
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                        Reward Trends Bottom Sheet                         */
  /* -------------------------------------------------------------------------- */

  const showRewardTrendsBottomSheet = () => {
    showBottomSheet({
      id: 'reward-trends',
      snapPoints: ['80%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      backgroundColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      topBarColor: isDarkMode ? '#202020' : '#ECECEC',
      content: <RewardTrendsContent rewardsData={rewardsData} />,
      onClose: () => {},
    });
  };

  const showReferralDetailBottomSheet = (ref: {
    address: string;
    totalRewardsEarned: number;
    onboardingStatus: string;
    signupDate?: number;
    epoch: number;
  }) => {
    showBottomSheet({
      id: `referral-detail-${ref.address}-${performance.now()}`,
      snapPoints: ['70%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      backgroundColor: isDarkMode ? '#0D0D0D' : '#EBEDF0',
      content: (
        <ReferralDetailContent
          referralDetail={ref}
          votedMerchants={votedMerchants}
        />
      ),
    });
  };

  // NOTE: RENDER METHOD 🍎🍎🍎🍎🍎🍎
  if (isLoading) {
    return (
      <Loading
        loadingText={''}
        backgroundColor={isDarkMode ? 'bg-black' : 'bg-n20'}
      />
    );
  }

  return (
    <CyDSafeAreaView className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-n30'}`}>
      {/* Header */}
      <CyDView
        className={`flex-row justify-between items-center mx-[24px] mt-[8px] ${
          isDarkMode ? 'text-white' : 'bg-n30'
        }`}>
        <CyDText className='text-[32px] font-medium text-base400'>
          {t('REWARDS', 'Rewards')}
        </CyDText>
        <CyDTouchView onPress={handleWhatIsCypherTokenPress}>
          <CyDText className='text-blue200 font-medium text-[12px]'>
            {t('WHAT_IS_CYPHER_TOKEN', 'What is Cypher token?')}
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CyDScrollView className='flex-1'>
        {/* Body */}
        <CyDView className='flex-1 bg-n20 pb-[48px]'>
          {/* Token Summary */}
          <CyDView
            className={`items-center pt-[24px] pb-[24px] rounded-b-[16px] ${
              isDarkMode ? 'bg-black' : 'bg-n30'
            }`}>
            <CyDView
              className='h-[110px] w-[110px]'
              style={{
                backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
              }}>
              {/* Video component - No placeholder needed */}
              <Video
                source={{
                  uri: isDarkMode
                    ? AppImagesMap.common.CYPR_TOKEN_REWARD.uri
                    : AppImagesMap.common.CYPR_TOKEN_REWARD_LIGHT.uri,
                }}
                style={[
                  styles.rewardTokenVideo,
                  {
                    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                  },
                ]}
                resizeMode='cover'
                repeat={true}
                paused={false}
                muted={true}
                controls={false}
                playInBackground={false}
                playWhenInactive={false}
                onError={error => {}}
              />
            </CyDView>

            <GradientText
              textElement={
                <CyDText className='text-[44px] font-bold font-newyork'>
                  {DecimalHelper.round(totalRewards, 2).toString()}
                </CyDText>
              }
              gradientColors={
                isDarkMode ? ['#FFFFFF', '#999999'] : ['#959595', '#000000']
              }
              useAngle
              angle={75}
            />
            <CyDText className='text-[12px] text-base150 tracking-[1px]'>
              $CYPR X BASE
            </CyDText>

            {/* Know more */}
            <CyDTouchView onPress={handleKnowMorePress} className='mt-[32px]'>
              <CyDView
                className={`flex-row items-center rounded-[24px] px-[20px] py-[8px] ${
                  isDarkMode ? 'bg-n30' : 'bg-n0'
                }`}>
                <CyDText className='font-semibold text-[14px] mr-[5px]'>
                  {t('Know more')}
                </CyDText>
                <CyDMaterialDesignIcons
                  name='chevron-down'
                  size={20}
                  className='text-base400'
                />
              </CyDView>
            </CyDTouchView>
          </CyDView>

          <CyDView className='flex-1 bg-n20'>
            <CyDView className='flex flex-row justify-between items-center p-4 rounded-[16px] bg-base400 mx-[16px] mt-[24px] mb-[16px]'>
              <CyDView className='flex flex-col'>
                <CyDView className='flex-row items-center mb-2'>
                  <CyDImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-[22px] h-[22px] mr-1'
                    resizeMode='contain'
                  />
                  <CyDText className='text-n0 text-[20px] font-extrabold'>
                    {DecimalHelper.round(availableToClaim, 2).toString()}
                  </CyDText>
                </CyDView>
                <CyDText className='text-[14px] font-medium text-n0'>
                  {t(
                    'REWARDS_AVAILABLE_TO_CLAIM',
                    'Rewards available to claim',
                  )}
                </CyDText>
              </CyDView>
              <Button
                title={t('CLAIM', 'Claim')}
                onPress={() => {
                  navigation.navigate(screenTitle.CLAIM_REWARD, {
                    rewardsData,
                    claimRewardData,
                  });
                }}
                type={ButtonType.PRIMARY}
                style='rounded-full px-8'
                paddingY={8}
              />
            </CyDView>
            {/* Action Cards */}
            <CyDView className='flex-row justify-between mx-[16px]'>
              {/* Cypher Deposit */}
              <CyDView className='flex-1 bg-base40 rounded-[12px] p-[12px] mr-[8px]'>
                <CyDView className='flex-row justify-between items-center mb-4'>
                  <CyDView className='flex-row items-center'>
                    <CyDText className='font-bold text-[18px] mr-[2px]'>
                      Cypher
                    </CyDText>
                    <CyDText className='font-medium text-[18px] text-n200'>
                      Deposit
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDImage
                  source={AppImages.CYPR_TOKEN_STACK}
                  resizeMode='contain'
                  className='h-[58px] w-[89px]'
                />
                <CyDView className='flex flex-row items-center justify-between'>
                  <CyDText className='text-[14px] mr-[6px]'>{'💡'}</CyDText>
                  <CyDText className='text-[12px] text-n200 font-medium flex-1'>
                    {t(
                      'DEPOSIT_CYPHER_TOKEN_TO_GET_REWARD_BOOSTER',
                      'Deposit cypher token to get reward booster',
                    )}
                  </CyDText>
                </CyDView>

                <CyDTouchView
                  onPress={handleDepositTokenPress}
                  className={`bg-base150 mt-[20px] py-[8px] rounded-full items-center ${
                    isDarkMode ? 'bg-base200' : 'bg-n50'
                  }`}>
                  <CyDText className='text-base100 text-[14px] '>
                    {t('REWARDS_VIEW_MORE')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>

              {/* Reward Booster */}
              <CyDView className='flex-1 bg-base40 rounded-[12px] p-[12px] ml-[8px]'>
                <CyDView className='flex-row items-center'>
                  <CyDText className='font-bold text-[18px] mr-[2px]'>
                    Reward
                  </CyDText>
                  <CyDText className='font-medium text-[18px] text-n200'>
                    Booster
                  </CyDText>
                </CyDView>

                <CyDView className='flex-row items-center mt-[12px]'>
                  <CyDMaterialDesignIcons
                    name='lightning-bolt'
                    size={24}
                    className='text-p150'
                  />
                  <CyDText className='text-[24px] font-extrabold ml-[4px]'>
                    {DecimalHelper.round(totalVotingPower, 2).toString()}
                  </CyDText>
                  <CyDText className='text-[12px] text-n200 ml-[4px] mt-[6px]'>
                    veCypher
                  </CyDText>
                </CyDView>

                {/* Progress Bar */}
                <CyDView className='w-full h-[24px] bg-n40 rounded-[1px] overflow-hidden mt-[16px]'>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </CyDView>

                {/* Used / Unused */}
                <CyDView className='flex-row justify-between mt-[8px]'>
                  <CyDView className='flex-row items-center'>
                    <CyDView className='h-[6px] w-[6px] bg-p150 rounded-full mr-[4px]' />
                    <CyDText className='text-[12px]'>
                      {t('REWARDS_USED')}
                    </CyDText>
                  </CyDView>
                  <CyDText className='text-[12px]'>
                    {DecimalHelper.round(usedVotingPower, 2).toString()}
                  </CyDText>
                </CyDView>

                <CyDView className='flex-row justify-between mt-[4px]'>
                  <CyDView className='flex-row items-center'>
                    <CyDView className='h-[6px] w-[6px] bg-green200 rounded-full mr-[4px]' />
                    <CyDText className='text-[12px]'>
                      {t('REWARDS_UNUSED')}
                    </CyDText>
                  </CyDView>
                  <CyDText className='text-[12px]'>
                    {DecimalHelper.round(unusedVotingPower, 2).toString()}
                  </CyDText>
                </CyDView>

                <CyDTouchView
                  onPress={handleBoosterInfoPress}
                  className='mt-[12px]'>
                  <CyDText className='text-blue200 underline text-[12px]'>
                    {t('WHAT_IS_BOOSTER', 'what is booster?')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            </CyDView>

            {/* Referrals Section */}
            <CyDView className='mx-[16px] mt-[16px]'>
              <CyDText className='text-[16px] font-medium mb-[8px]'>
                {t('REFERRALS', 'Referrals')}
              </CyDText>

              <CyDView className='mb-[40px]'>
                {/* Referrals List */}
                {referees.length > 0 ? (
                  <>
                    <CyDView className='bg-base40 rounded-[12px]'>
                      {previewReferees.map((referrer, index) => (
                        <CyDTouchView
                          key={`${referrer.address}-${index}`}
                          className={`flex-row justify-between items-center py-[12px] px-[16px] ${
                            index < previewReferees.length - 1
                              ? 'border-b border-n40'
                              : ''
                          }`}
                          onPress={() =>
                            showReferralDetailBottomSheet(referrer)
                          }>
                          <CyDText className='text-[14px] font-medium flex-1'>
                            {getMaskedAddress(referrer.address, 6)}
                          </CyDText>
                          <CyDView className='flex-row items-center'>
                            {referrer.totalRewardsEarned > 0 ? (
                              <CyDText className='text-blue200 text-[14px] font-medium mr-[8px]'>
                                {referrer.totalRewardsEarned} CYPR
                              </CyDText>
                            ) : (
                              <CyDView className='bg-n60 rounded-[16px] px-[12px] py-[4px] mr-[8px]'>
                                <CyDText className='text-n200 text-[12px]'>
                                  {t('REWARDS_PENDING')}
                                </CyDText>
                              </CyDView>
                            )}
                            <CyDMaterialDesignIcons
                              name='chevron-right'
                              size={16}
                              className='text-n200'
                            />
                          </CyDView>
                        </CyDTouchView>
                      ))}

                      {/* View All Button */}
                      {referees.length > 5 && (
                        <CyDTouchView
                          className={`flex-row justify-between items-center py-[16px] mt-[8px] rounded-b-[12px] px-[16px] ${
                            isDarkMode ? 'bg-base200' : 'bg-n40'
                          }`}
                          onPress={handleViewAllReferralsPress}>
                          <CyDText className='text-[16px] font-medium'>
                            {t('REWARDS_VIEW_ALL')}
                          </CyDText>
                          <CyDMaterialDesignIcons
                            name='chevron-right'
                            size={20}
                            className='text-base400'
                          />
                        </CyDTouchView>
                      )}
                    </CyDView>
                    {/* Action Buttons */}
                    <CyDView className='flex-row mt-[16px] gap-x-[12px]'>
                      <CyDTouchView
                        className={`flex-1 rounded-[24px] py-[8px] flex-row items-center justify-center ${
                          isDarkMode ? 'bg-base200' : 'bg-n40'
                        }`}
                        onPress={handleInviteFriendsPress}>
                        <CyDMaterialDesignIcons
                          name='account-group'
                          size={24}
                          className='text-base400 mr-[8px]'
                        />
                        <CyDText className='text-base100 text-[14px] font-medium'>
                          {t('INVITE_FRIENDS')}
                        </CyDText>
                      </CyDTouchView>

                      <CyDTouchView
                        className={`flex-1 rounded-[24px] py-[8px] items-center justify-center ${
                          isDarkMode ? 'bg-base200' : 'bg-n40'
                        }`}
                        onPress={handleLearnReferralWorksPress}>
                        <CyDText className='text-[14px] font-medium'>
                          {t('REWARDS_LEARN_HOW_REFERRAL_WORKS')}
                        </CyDText>
                      </CyDTouchView>
                    </CyDView>
                  </>
                ) : (
                  <InviteFriendsBanner />
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F7C645', // golden yellow progress color
  },
  pieChart: {
    height: 200,
    width: 200,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardTokenVideo: {
    width: '100%',
    height: '100%',
  },
});
