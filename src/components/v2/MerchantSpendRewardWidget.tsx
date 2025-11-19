import React, { useState, useCallback, useEffect } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
} from '../../styles/tailwindComponents';
import MerchantLogo from './MerchantLogo';
import AppImages from '../../../assets/images/appImages';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import useAxios from '../../core/HttpRequest';
import GradientText from '../gradientText';
import { DecimalHelper } from '../../utils/decimalHelper';

/**
 * Props interface for the MerchantSpendRewardWidget component
 */
interface MerchantSpendRewardWidgetProps {
  onViewAllPress?: () => void;
  onMerchantPress?: (merchant: IMerchantRewardsListItemDto) => void;
  isPremium?: boolean; // Indicates if user has Pro plan
}

/**
 * Enum for Cypher plan IDs
 */
export enum CypherPlanId {
  BASIC_PLAN = 'basic_plan_v1',
  PRO_PLAN = 'pro_plan_v1',
  CB_ONE = 'cb_one_v1',
}

/**
 * Interface for epoch emissions data
 */
export interface IEpochEmissions {
  totalEmission: string;
  baseSpendPool: string;
  boostedSpendPool: string;
  baseReferralPool: string;
  boostedReferralPool: string;
}

/**
 * Interface for individual merchant reward data from API
 */
export interface IMerchantRewardsListItemDto {
  parentMerchantId: string;
  candidateId: string;
  canonicalName: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  logoUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  isCandidate: boolean;
  votesGained: string;
  emissionGained: string;
  votePercentage: number;
  uniqueVoters: number;
  currentSpend: number;
  currentTransactionCount: number;
  projectedCYPRReward: string;
}

/**
 * Interface for paginated merchant rewards API response
 */
export interface IPaginatedMerchantRewardsResponseDto {
  items: IMerchantRewardsListItemDto[];
  referenceAmount: number;
  baseReward: Record<CypherPlanId, string>;
  hasMore: boolean;
  nextOffset?: string;
  epochInfo: {
    epochNumber: number;
    startTime: number;
    endTime: number;
    emissions: IEpochEmissions;
  };
}

const MerchantSpendRewardWidget: React.FC<MerchantSpendRewardWidgetProps> = ({
  onViewAllPress,
  onMerchantPress,
  isPremium,
}) => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;
  const { getWithAuth } = useAxios();

  // Loading state for API calls
  const [loading, setLoading] = useState<boolean>(true);

  // State to hold the complete API response
  const [merchantRewardsData, setMerchantRewardsData] =
    useState<IPaginatedMerchantRewardsResponseDto | null>(null);

  /**
   * Fetches top merchants with their projected CYPR rewards.
   * Uses the /merchants/rewards endpoint which returns paginated merchant data
   * along with base reward information and epoch details.
   */
  const fetchTopMerchants = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch merchant rewards data with same params as before
      const resp = await getWithAuth(
        '/v1/cypher-protocol/merchants/rewards?sortBy=multiplier&limit=6',
      );

      console.log(
        'resp : >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',
        resp,
      );

      const { isError, data } = resp;

      if (!isError && data) {
        // Store the complete response which includes:
        // - items: array of merchant rewards
        // - baseReward: rewards for each plan tier
        // - epochInfo: current epoch details
        // - referenceAmount: reference spending amount
        setMerchantRewardsData(data as IPaginatedMerchantRewardsResponseDto);
      } else {
        console.warn(
          '[MerchantSpendRewardWidget] Failed to fetch merchant rewards',
          data?.error,
        );
      }
    } catch (err) {
      console.error(
        '[MerchantSpendRewardWidget] Error fetching merchant rewards:',
        err,
      );
    } finally {
      setLoading(false);
    }
  }, []); // stable reference – avoids re-creating on every render

  // Fetch every time the screen gains focus (also runs on first mount)
  useEffect(() => {
    void fetchTopMerchants();
  }, []);

  /**
   * Handler for when a merchant card is pressed
   * @param merchant - The merchant data to pass to parent component
   */
  const handleMerchantPress = (merchant: IMerchantRewardsListItemDto): void => {
    onMerchantPress?.(merchant);
  };

  /**
   * Handler for View All button press
   */
  const handleViewAllPress = (): void => {
    onViewAllPress?.();
  };

  /**
   * Get the base reward value for the current user's plan tier
   * @returns The base reward as a string, or '-' if not available
   */
  const getBaseRewardForPlan = (): string => {
    if (!merchantRewardsData?.baseReward) return '-';

    const planId = isPremium ? CypherPlanId.PRO_PLAN : CypherPlanId.BASIC_PLAN;
    return (
      DecimalHelper.round(
        merchantRewardsData.baseReward[planId],
        2,
      ).toString() || '-'
    );
  };

  /**
   * Get the base reward value for basic plan (used for strikethrough in premium view)
   * @returns The basic plan base reward as a string, or '-' if not available
   */
  const getBasicPlanReward = (): string => {
    if (!merchantRewardsData?.baseReward) return '-';
    return (
      DecimalHelper.round(
        merchantRewardsData.baseReward[CypherPlanId.BASIC_PLAN],
        2,
      ).toString() || '-'
    );
  };

  /**
   * Renders a skeleton loader card that mimics the merchant card layout.
   * Used during loading state to provide visual feedback to users.
   * @param index - The index of the skeleton card for unique key
   */
  const renderSkeletonCard = (index: number): JSX.Element => {
    const isRightColumn = index % 2 !== 0;
    const hasBottomBorder = index < 4; // First 4 items (2 rows) have bottom border

    return (
      <CyDView
        className={`w-[50%] p-4 flex-row justify-between items-center bg-n0 ${
          !isRightColumn ? 'border-r border-n40' : ''
        } ${hasBottomBorder ? 'border-b border-n40' : ''}`}
        key={`skeleton-${index}`}>
        <CyDView>
          {/* Skeleton Merchant Icon */}
          <CyDView className={`w-[34px] h-[34px] rounded-full bg-n20 mb-2`} />
          {/* Skeleton Merchant Name */}
          <CyDView className={`w-[80px] h-[16px] rounded bg-n20`} />
        </CyDView>

        {/* Skeleton Reward */}
        <CyDView className='flex-row items-center gap-1'>
          <CyDView className='w-[24px] h-[24px] rounded-full bg-n20' />
          <CyDView className='w-[40px] h-[16px] rounded bg-n20' />
        </CyDView>
      </CyDView>
    );
  };

  /**
   * Renders an individual merchant card with logo, CYPR reward badge, and name
   * @param merchant - The merchant data to display
   * @param index - The index of the merchant card for unique key
   */
  const renderMerchantCard = (
    merchant: IMerchantRewardsListItemDto,
    index: number,
  ): JSX.Element => {
    // Format the projected CYPR reward value
    const cypRReward = parseFloat(merchant.projectedCYPRReward || '0').toFixed(
      1,
    );

    const isRightColumn = index % 2 !== 0;
    const hasBottomBorder = index < 4; // First 4 items (2 rows) have bottom border

    return (
      <CyDTouchView
        key={merchant.candidateId}
        className={`w-[50%] p-4 flex-row justify-between items-center bg-n0 ${
          !isRightColumn ? 'border-r border-n40' : ''
        } ${hasBottomBorder ? 'border-b border-n40' : ''}`}
        onPress={() => handleMerchantPress(merchant)}>
        <CyDView className='flex-1'>
          <CyDView className='flex-row items-center justify-between'>
            {/* Merchant Logo */}
            <MerchantLogo
              merchant={{
                brand: merchant.brand ?? merchant.canonicalName,
                canonicalName: merchant.canonicalName,
                logoUrl: merchant.logoUrl,
              }}
              size={34}
              hasUserVoted={false}
              showBorder={!isDarkMode}
            />
            {/* Reward Value */}
            <CyDView className='flex-row items-center gap-1'>
              <CyDImage
                source={AppImages.CYPR_TOKEN}
                className='w-[24px] h-[24px]'
                resizeMode='contain'
              />
              <CyDText className='text-[16px] font-bold'>{cypRReward}</CyDText>
            </CyDView>
          </CyDView>

          {/* Merchant Name */}
          <CyDText
            className={`text-[14px] font-medium mt-1`}
            numberOfLines={1}
            ellipsizeMode='tail'>
            {merchant.brand ?? merchant.canonicalName}
          </CyDText>
        </CyDView>
      </CyDTouchView>
    );
  };

  return (
    <CyDView className={`mx-4 rounded-[12px] py-4 bg-n20`}>
      {/* Header Section */}
      <CyDView className='flex-row justify-between items-start mb-4 px-4'>
        <CyDView className='flex-1'>
          {isPremium && (
            <GradientText
              textElement={
                <CyDText className='text-[14px] font-extrabold'>
                  Premium
                </CyDText>
              }
              gradientColors={[
                '#FA9703',
                '#ECD821',
                '#F7510A',
                '#ECD821',
                '#F48F0F',
                '#F7510A',
                '#F89408',
              ]}
            />
          )}
          <CyDText className='text-n200 text-[14px]'>REWARDS</CyDText>
          <CyDText className='text-n200 text-[12px] font-medium'>
            On all Transaction
          </CyDText>
        </CyDView>

        {/* Base Reward Display with CYPR Icon */}
        <CyDView className='flex flex-col items-end'>
          {isPremium ? (
            <>
              {/* Premium plan reward with CYPR icon */}
              <CyDView className='flex-row items-center gap-1'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText className={`text-[20px] font-bold`}>
                  {getBaseRewardForPlan()}
                </CyDText>
              </CyDView>
              {/* Strikethrough basic plan reward */}
              <CyDText className='text-[14px] line-through text-n200'>
                {getBasicPlanReward()} $CYPR
              </CyDText>
            </>
          ) : (
            <>
              {/* Basic plan reward with CYPR icon */}
              <CyDView className='flex-row items-center gap-1'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN}
                  className='w-[24px] h-[24px]'
                  resizeMode='contain'
                />
                <CyDText className={`text-[20px] font-bold`}>
                  {getBaseRewardForPlan()}
                </CyDText>
              </CyDView>
            </>
          )}
        </CyDView>
      </CyDView>

      <CyDView className='w-full h-[1px] bg-n20' />

      {/* Merchants Grid */}
      <CyDView className='border-l border-r border-n20'>
        {loading ? (
          <CyDView className='flex-row flex-wrap'>
            {/* Skeleton loaders */}
            {[0, 1, 2, 3, 4, 5].map(index => renderSkeletonCard(index))}
          </CyDView>
        ) : (
          <CyDView className='flex-row flex-wrap'>
            {/* Actual merchant cards */}
            {(merchantRewardsData?.items ?? [])
              .slice(0, 6)
              .map((merchant, index) => renderMerchantCard(merchant, index))}
          </CyDView>
        )}
      </CyDView>

      <CyDView className='w-full h-[1px] bg-n20 mb-4' />

      {/* View All Button */}
      <CyDView className='px-4 mb-4'>
        <CyDTouchView
          className={`rounded-[25px] py-3 items-center ${
            isDarkMode ? 'bg-base200' : 'bg-n30'
          }`}
          onPress={handleViewAllPress}>
          <CyDText className='text-[16px] font-medium'>
            View all Merchant rewards
          </CyDText>
        </CyDTouchView>
      </CyDView>

      {/* Footer Text */}
      <CyDView className='px-4'>
        <CyDText className='text-n200 text-[12px] text-center'>
          *rewards for every ${merchantRewardsData?.referenceAmount ?? '-'} you
          spend with your Cypher card
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

export default MerchantSpendRewardWidget;
