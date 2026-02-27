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
import { limitDecimalPlaces } from '../../core/util';

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
      limitDecimalPlaces(
        DecimalHelper.toDecimal(merchantRewardsData.baseReward[planId], 18),
        2,
      ) || '-'
    );
  };

  /**
   * Get the base reward value for basic plan (used for strikethrough in premium view)
   * @returns The basic plan base reward as a string, or '-' if not available
   */
  const getBasicPlanReward = (): string => {
    if (!merchantRewardsData?.baseReward) return '-';
    return (
      limitDecimalPlaces(
        DecimalHelper.toDecimal(
          merchantRewardsData.baseReward[CypherPlanId.BASIC_PLAN],
          18,
        ),
        2,
      ).toString() || '-'
    );
  };

  /**
   * Renders a skeleton loader row that mimics the merchant list row layout.
   * @param index - The index of the skeleton row for unique key
   */
  const renderSkeletonRow = (index: number): JSX.Element => {
    const merchants = merchantRewardsData?.items ?? [];
    const isLast = index === Math.min(merchants.length, 5) - 1 || index === 4;

    return (
      <CyDView key={`skeleton-${index}`}>
        <CyDView className='flex-row items-center justify-between px-4 py-3'>
          <CyDView className='flex-row items-center gap-3'>
            <CyDView className='w-[34px] h-[34px] rounded-full bg-n40' />
            <CyDView className='w-[80px] h-[16px] rounded bg-n40' />
          </CyDView>
          <CyDView className='flex-row items-center gap-1'>
            <CyDView className='w-[24px] h-[24px] rounded-full bg-n40' />
            <CyDView className='w-[40px] h-[16px] rounded bg-n40' />
          </CyDView>
        </CyDView>
        {!isLast && <CyDView className='h-[1px] bg-n30 mx-4' />}
      </CyDView>
    );
  };

  /**
   * Renders a single merchant row: logo + name on the left, reward on the right.
   * @param merchant - The merchant data to display
   * @param index - The index for key and divider logic
   * @param total - Total number of items being rendered
   */
  const renderMerchantRow = (
    merchant: IMerchantRewardsListItemDto,
    index: number,
    total: number,
  ): JSX.Element => {
    const cypRReward =
      limitDecimalPlaces(
        DecimalHelper.toDecimal(merchant.projectedCYPRReward, 18),
        2,
      ) || '0';
    const isLast = index === total - 1;

    return (
      <CyDView key={merchant.candidateId}>
        <CyDTouchView
          className='flex-row items-center justify-between px-4 py-3'
          onPress={() => handleMerchantPress(merchant)}>
          {/* Merchant Logo and Name */}
          <CyDView className='flex-row items-center gap-3 flex-1'>
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
            <CyDText
              className='text-[16px] font-medium'
              numberOfLines={1}
              ellipsizeMode='tail'>
              {merchant.brand ?? merchant.canonicalName}
            </CyDText>
          </CyDView>

          {/* \ Reward Value */}
          <CyDView className='flex-row items-center gap-1'>
            <CyDImage
              source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
              className='w-[24px] h-[24px]'
              resizeMode='contain'
            />
            <CyDText className='text-[16px] font-bold'>{cypRReward}</CyDText>
          </CyDView>
        </CyDTouchView>
        {!isLast && <CyDView className='h-[1px] bg-n30 mx-4' />}
      </CyDView>
    );
  };

  return (
    <CyDView className='border-[1px] border-n40 rounded-[16px] py-4'>
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

      <CyDView className='w-full h-[1px] bg-n30' />

      {/* Merchants List */}
      <CyDView>
        {loading ? (
          <CyDView>
            {[0, 1, 2, 3, 4].map(index => renderSkeletonRow(index))}
          </CyDView>
        ) : (
          <CyDView>
            {(() => {
              const items = (merchantRewardsData?.items ?? []).slice(0, 5);
              return items.map((merchant, index) =>
                renderMerchantRow(merchant, index, items.length),
              );
            })()}
          </CyDView>
        )}
      </CyDView>

      <CyDView className='w-full h-[1px] bg-n30' />

      {/* View All Button */}
      <CyDView className='px-4 mt-4'>
        <CyDTouchView
          className='bg-n30 py-[14px] rounded-full justify-center items-center'
          onPress={handleViewAllPress}>
          <CyDText className='text-base400 text-[14px] font-semibold'>
            {'View all Merchant rewards'}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};

export default MerchantSpendRewardWidget;
