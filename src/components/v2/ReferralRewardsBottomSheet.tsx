/**
 * Referral Rewards Bottom Sheet Component
 *
 * Displays referral rewards functionality with:
 * - Signup reward amount (150 CYPR)
 * - Referral count selector (1, 2, 3, 4, 5+)
 * - Dynamic merchant earnings based on referral count
 * - Invite code display with copy functionality
 * - Links to referral invite modal and other options
 *
 * @component
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
  CyDScrollView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import useAxios from '../../core/HttpRequest';
import { copyToClipboard } from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import MerchantLogo from './MerchantLogo';
import { MerchantLike } from '../../models/merchantLogo.interface';
import { DecimalHelper } from '../../utils/decimalHelper';

/**
 * Merchant data structure with user rewards
 */
interface MerchantData extends MerchantLike {
  candidateId: string;
  canonicalName: string;
  merchantGroupId: string;
}

/**
 * Merchant earnings display structure
 */
interface MerchantEarning {
  merchant: MerchantData;
  amount: string;
}

/**
 * Props for the ReferralRewardsBottomSheet component
 */
interface ReferralRewardsBottomSheetProps {
  /**
   * Callback to open the referral invite modal
   */
  onOpenInviteModal: () => void;
  /**
   * List of voted merchants from parent
   */
  votedMerchants?: MerchantData[];
}

/**
 * Format amount to display with proper decimal places
 * @param amount - Amount to format
 * @returns Formatted amount string
 */
const formatAmount = (amount: number): string => {
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toFixed(2);
};

/**
 * ReferralRewardsBottomSheet Component
 */
const ReferralRewardsBottomSheet: React.FC<ReferralRewardsBottomSheetProps> = ({
  onOpenInviteModal,
  votedMerchants: parentVotedMerchants = [],
}) => {
  const { t } = useTranslation();
  const { getWithAuth, getWithoutAuth } = useAxios();

  // Theme hooks
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // State management
  const [referralCodes, setReferralCodes] = useState<string[]>([]);
  const [selectedReferralCount, setSelectedReferralCount] = useState<number>(5);
  const [votedMerchants, setVotedMerchants] =
    useState<MerchantData[]>(parentVotedMerchants);
  const [merchantBaseEarnings, setMerchantBaseEarnings] = useState<
    Record<string, number>
  >({});
  const [loadingEarnings, setLoadingEarnings] = useState<boolean>(false);
  const loadedEarningsRef = useRef<boolean>(false);
  const [signupBonus, setSignupBonus] = useState<number>(0); // Default to 100
  const [loadingSignupBonus, setLoadingSignupBonus] = useState<boolean>(true);

  /**
   * Fetch referral codes from API
   * Retrieves the user's referral codes for sharing
   */
  useEffect(() => {
    const fetchReferralCodes = async () => {
      try {
        const response = await getWithAuth('/v1/cards/referral-v2');

        if (!response.isError && response.data?.referralCodes) {
          const codes = response.data.referralCodes.filter(Boolean);
          setReferralCodes(codes);
        } else {
          console.warn('⚠️ No referral codes found in response');
        }
      } catch (error) {
        console.error('❌ Error fetching referral codes:', error);
      }
    };

    void fetchReferralCodes();
  }, []);

  /**
   * Fetch signup bonus from epoch parameters
   * Retrieves the current epoch signup bonus reward amount
   */
  useEffect(() => {
    const fetchSignupBonus = async () => {
      try {
        setLoadingSignupBonus(true);
        const epochResp = await getWithoutAuth('/v1/cypher-protocol/epoch');

        if (!epochResp.isError) {
          const signupBonusValue = epochResp.data?.parameters?.signupBonus;

          // Parse and validate signup bonus

          const parsedSignupBonus = Number(signupBonusValue);
          setSignupBonus(parsedSignupBonus);
        } else {
          console.error(
            '❌ Failed to fetch epoch parameters:',
            epochResp.error,
          );
        }
      } catch (error) {
        console.error('❌ Error fetching signup bonus from epoch:', error);
      } finally {
        setLoadingSignupBonus(false);
      }
    };

    void fetchSignupBonus();
  }, []);

  /**
   * Fetch merchants user voted and their details to compute base earnings
   * This calculates the predicted rewards for each merchant
   */
  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (loadedEarningsRef.current) return;
    loadedEarningsRef.current = true;

    const loadVotedMerchantsAndEarnings = async () => {
      setLoadingEarnings(true);
      try {
        // Fetch list of merchants user has voted for
        const listResp = await getWithAuth('/v1/cypher-protocol/merchants', {
          onlyUserVoted: true,
        });

        if (!listResp.isError && listResp.data?.items) {
          const items: MerchantData[] = listResp.data.items;
          setVotedMerchants(items);

          // Get top 5 merchants for earning calculations
          const top = items.slice(0, 5);

          // Fetch detailed merchant data including user rewards
          const detailResponses = await Promise.all(
            top.map(async m => {
              return await getWithAuth(
                `/v1/cypher-protocol/merchants/${m.candidateId}`,
                {
                  includeUserData: true,
                },
              );
            }),
          );

          // Calculate base earnings for each merchant
          const earningsMap: Record<string, number> = {};
          detailResponses.forEach((resp, idx) => {
            try {
              if (
                !resp.isError &&
                resp.data?.userRewards?.currentEpoch?.predicted?.boostedSpend
              ) {
                const boosted: string =
                  resp.data.userRewards.currentEpoch.predicted.boostedSpend;
                const amount = DecimalHelper.toDecimal(boosted, 18).toNumber();
                earningsMap[top[idx].candidateId] = Number.isFinite(amount)
                  ? amount
                  : 0;
              } else {
                earningsMap[top[idx].candidateId] = 0;
              }
            } catch (err) {
              console.error(
                `❌ Error parsing earnings for merchant ${top[idx].candidateId}:`,
                err,
              );
              earningsMap[top[idx].candidateId] = 0;
            }
          });

          setMerchantBaseEarnings(earningsMap);
        } else {
          console.warn('⚠️ No voted merchants found');
        }
      } catch (error) {
        console.error('❌ Error loading voted merchants or earnings:', error);
      } finally {
        setLoadingEarnings(false);
      }
    };

    void loadVotedMerchantsAndEarnings();
  }, []);

  /**
   * Calculate earnings multiplier based on referral count
   * 1 referral = 10%, 2 = 20%, 3 = 30%, 4 = 40%, 5+ = 50%
   *
   * @param referralCount - Number of referrals
   * @returns Multiplier value (0.1 to 0.5)
   */
  const getEarningsMultiplier = useCallback((referralCount: number): number => {
    if (referralCount >= 5) return 0.5; // 50%
    return referralCount * 0.1; // 10% per referral
  }, []);

  /**
   * Get merchant earnings list based on selected referral count
   * Calculates earnings for each merchant using base amount * multiplier
   *
   * @returns Array of merchant earnings
   */
  const getMerchantEarningsList = useCallback((): MerchantEarning[] => {
    const multiplier = getEarningsMultiplier(selectedReferralCount);
    const top = votedMerchants.slice(0, 5);

    return top.map(merchant => {
      const base = merchantBaseEarnings[merchant.candidateId] || 0;
      const computed = base * multiplier;
      return { merchant, amount: formatAmount(computed) };
    });
  }, [
    selectedReferralCount,
    votedMerchants,
    merchantBaseEarnings,
    getEarningsMultiplier,
  ]);

  /**
   * Handle copy invite code to clipboard
   * Shows success toast on successful copy
   */
  const handleCopyInviteCode = useCallback(async () => {
    const codeToCopy = referralCodes[0];
    if (!codeToCopy) {
      console.warn('⚠️ No invite code to copy');
      showToast(t('NO_INVITE_CODE_AVAILABLE'));
      return;
    }

    try {
      copyToClipboard(codeToCopy);
      showToast(t('INVITE_CODE_COPIED') || 'Invite code copied!');
    } catch (err) {
      console.error('❌ Failed to copy invite code:', err);
      showToast(t('FAILED_TO_COPY_CODE'));
    }
  }, [referralCodes, t]);

  /**
   * Handle referral count selection
   * Updates the selected count and recalculates earnings
   */
  const handleReferralCountChange = useCallback((count: number) => {
    setSelectedReferralCount(count);
  }, []);

  // Derived values
  const earningsList = getMerchantEarningsList();
  const displayCode = referralCodes[0];

  return (
    <CyDScrollView
      className='flex-1 bg-n0 px-6'
      showsVerticalScrollIndicator={false}>
      <CyDView className='py-6'>
        {/* Header Section */}
        <CyDView className='mb-2'>
          <CyDText className='text-lg font-bold text-primaryText'>
            {t('INVITE_FRIENDS_EARN_REWARDS', 'Invite friends, earn rewards')}
          </CyDText>
        </CyDView>

        {/* Description */}
        <CyDText className='text-n200 text-sm mb-4 leading-relaxed'>
          {t(
            'REFERRAL_REWARDS_DESCRIPTION',
            'Cypher Referral Rewards offers two reward layers: a signup reward for every sign-ups and a merchant reward for spending at your boosted merchants.',
          )}
        </CyDText>

        {/* Signup Reward Section */}
        <CyDView className='mb-6'>
          <CyDText className='text-n200 text-sm mb-2'>
            {t(
              'SIGNUP_REWARD_TEXT',
              "You'll earn $CYPR every time a friend signs up!",
            )}
          </CyDText>
          <CyDView
            className={`rounded-[12px] px-4 py-3 flex-row items-center max-w-[320px] ${
              isDarkMode ? 'bg-base40' : 'bg-n20'
            }`}>
            <CyDImage
              source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
              className='h-6 w-6 mr-3'
              resizeMode='contain'
            />
            {loadingSignupBonus ? (
              <CyDView className='h-6 w-16 rounded bg-n40 animate-pulse' />
            ) : (
              <CyDText className='text-[20px] font-bold text-primaryText !font-gambetta'>
                {signupBonus ?? '0'}
              </CyDText>
            )}
          </CyDView>
        </CyDView>

        {/* Merchant Spending Rewards Section */}
        <CyDView>
          <CyDText className='text-n200 text-sm mb-3'>
            {t(
              'MERCHANT_SPEND_REWARD_TEXT',
              'You earn $CYPR when invited friends spend at their boosted merchants',
            )}
          </CyDText>

          <CyDText className='text-n200 text-sm mb-3'>
            {t(
              'MERCHANT_SPEND_REWARD_TEXT_2',
              'Based on the number of friends who spend at the merchants you boosted, the rewards you earn will increase.',
            )}
          </CyDText>

          {/* Merchant Earnings Card */}
          <CyDView
            className={`rounded-[12px] p-3 mb-3 ${
              isDarkMode ? 'bg-base40' : 'bg-n20'
            }`}>
            {/* Referral Count Selector */}
            <CyDView className='mb-4'>
              <CyDText className='text-n200 text-sm mb-2'>
                {t('NO_OF_REFERRAL', 'No. of friends')}
              </CyDText>
              <CyDView className='flex-row gap-2 flex-wrap'>
                {[1, 2, 3, 4, 5].map(count => (
                  <CyDTouchView
                    key={count}
                    onPress={() => handleReferralCountChange(count)}
                    className={`px-4 py-2 rounded-[4px] border ${
                      selectedReferralCount === count
                        ? 'bg-p50 border-p50'
                        : isDarkMode
                          ? 'bg-base200 border-n40'
                          : 'bg-n0 border-n40'
                    }`}>
                    <CyDText
                      className={`text-sm font-medium ${
                        selectedReferralCount === count
                          ? 'text-black'
                          : 'text-n200'
                      }`}>
                      {count === 5 ? '5+' : count}
                    </CyDText>
                  </CyDTouchView>
                ))}
              </CyDView>
            </CyDView>

            {/* Merchant Earnings List */}
            <CyDView>
              <CyDText className='text-n200 text-sm mb-3'>
                {t(
                  'EARNING_FOR_SPEND_BY_FRIEND',
                  'Rewards you earn when your friends spends at',
                )}
              </CyDText>

              {/* Loading State */}
              {loadingEarnings ? (
                <CyDView>
                  {[0, 1, 2].map(i => (
                    <CyDView
                      key={i}
                      className={`flex-row items-center justify-between p-3 ${
                        isDarkMode ? 'bg-base40' : 'bg-n0'
                      } ${i < 2 ? 'border-b border-n40' : ''}`}>
                      <CyDView className='flex-row items-center'>
                        <CyDView className='h-6 w-6 rounded-full bg-n40 mr-3' />
                        <CyDView className='h-4 w-24 rounded bg-n40' />
                      </CyDView>
                      <CyDView className='h-4 w-16 rounded bg-n40' />
                    </CyDView>
                  ))}
                </CyDView>
              ) : earningsList.length > 0 ? (
                /* Merchant List */
                <CyDView>
                  {earningsList.map(({ merchant, amount }, idx) => (
                    <CyDView
                      key={merchant.candidateId || idx}
                      className={`flex-row items-center justify-between p-3 ${
                        isDarkMode ? 'bg-base40' : 'bg-n0'
                      } ${
                        idx < earningsList.length - 1
                          ? 'border-b border-n40'
                          : ''
                      }`}>
                      <CyDView className='flex-row items-center'>
                        <MerchantLogo
                          merchant={merchant}
                          size={24}
                          className='mr-3'
                        />
                        <CyDText className='text-sm font-medium text-primaryText'>
                          {merchant.canonicalName || merchant.brand}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex-row items-center gap-2'>
                        <CyDImage
                          source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                          className='h-5 w-5'
                          resizeMode='contain'
                        />
                        <CyDText className='text-sm font-medium text-primaryText'>
                          {amount}
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  ))}
                </CyDView>
              ) : (
                /* Empty State */
                <CyDView
                  className={`p-4 rounded-[8px] ${
                    isDarkMode ? 'bg-base40' : 'bg-n0'
                  }`}>
                  <CyDText className='text-n200 text-sm text-center'>
                    {t('NO_VOTED_MERCHANTS', 'No voted merchants found')}
                  </CyDText>
                </CyDView>
              )}
            </CyDView>
          </CyDView>

          {/* Disclaimer Text */}
          <CyDText className='text-xs text-n200 mb-1 leading-relaxed'>
            {t(
              'REWARD_EARNINGS_DISCLAIMER',
              'Reward earnings applicable per referral, per spend on every boosted merchant',
            )}
          </CyDText>

          <CyDText className='text-xs text-n200 mb-4 leading-relaxed'>
            {t(
              'ESTIMATES_DISCLAIMER',
              '** The numbers shown are estimates based on the current market conditions and are subject to change.',
            )}
          </CyDText>
        </CyDView>

        {/* Invite Code Section */}
        {displayCode && (
          <>
            <CyDView className='mb-4'>
              <CyDText className='text-n200 text-sm mb-2'>
                {t('INVITE_CODE', 'Invite code')}
              </CyDText>
              <CyDView className='flex-row items-center gap-2'>
                <CyDView
                  className={`flex-1 rounded-[12px] px-4 py-3 ${
                    isDarkMode ? 'bg-base40' : 'bg-n20'
                  }`}>
                  <CyDText className='text-lg font-bold text-primaryText font-mono tracking-widest'>
                    {displayCode}
                  </CyDText>
                </CyDView>
                <CyDTouchView
                  onPress={() => {
                    void handleCopyInviteCode();
                  }}
                  className={`p-3 rounded-[12px] border ${
                    isDarkMode ? 'bg-base40 border-n40' : 'bg-n20 border-n40'
                  }`}>
                  <CyDMaterialDesignIcons
                    name='content-copy'
                    size={20}
                    className='text-n200'
                  />
                </CyDTouchView>
              </CyDView>
            </CyDView>

            {/* Other Invite Options Link */}
            <CyDTouchView onPress={onOpenInviteModal}>
              <CyDText className='text-blue300 underline text-sm'>
                {t('OTHER_INVITE_OPTIONS', 'Other invite options')}
              </CyDText>
            </CyDTouchView>
          </>
        )}
      </CyDView>
    </CyDScrollView>
  );
};

export default ReferralRewardsBottomSheet;
