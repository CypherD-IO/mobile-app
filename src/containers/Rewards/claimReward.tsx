import React, { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Share,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  View,
  Platform,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDTouchView,
  CyDText,
  CyDImage,
  CyDScrollView,
  CyDMaterialDesignIcons,
  CyDIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { ButtonType, GlobalModalType } from '../../constants/enum';
import { showToast } from '../utilities/toastUtility';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import useRewardsDistributor from '../../hooks/useRewardsDistributor';
import useBribesClaimer from '../../hooks/useBribesClaimer';
import { HdWalletContext } from '../../core/util';
import { get } from 'lodash';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { screenTitle } from '../../constants';
import useAxios from '../../core/HttpRequest';
import { ClaimRewardResponse } from '../../models/rewardsClaim.interface';
import { IBribeClaimResponse } from '../../models/bribesClaim.interface';
import { DecimalHelper } from '../../utils/decimalHelper';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';

interface EarningBreakdown {
  id: string;
  type: string;
  amount: string;
  color: string;
  bgColor: string;
  textColor: string;
}

/**
 * Interface for merchant reward data displayed in the breakdown
 */
interface MerchantRewardData {
  id: string;
  name: string;
  logo?: string;
  rewardsEarned: number;
  canonicalName?: string;
  totalSpend: number;
}

interface ClaimExecutionResult {
  success: boolean;
  rewardsClaimedSuccess: boolean;
  bribesClaimedSuccess: boolean;
  rewardsClaimedAmount: number;
  bribesClaimedCount: number;
  lastTransactionHash: string;
  errorMessage?: string;
}

/**
 * Info Icon component with tooltip functionality
 * Displays an information icon that shows a tooltip when pressed
 */
interface InfoIconProps {
  tooltipId: string;
  content: string;
  showTooltip: string | null;
  setShowTooltip: (id: string | null) => void;
  isDarkMode: boolean;
}

const InfoIcon: React.FC<InfoIconProps> = ({
  tooltipId,
  content,
  showTooltip,
  setShowTooltip,
  isDarkMode,
}) => {
  const borderColor = isDarkMode ? '#404040' : '#E5E5E5';
  const borderWidth = 1;
  const zIndex = 9999;
  const elevation = 10;
  const tooltipMaxWidth = 280; // Maximum width in pixels
  const textFlexShrink = 1;

  // Measure icon position to anchor tooltip in a Modal overlay
  const iconRef = React.useRef<View | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [tooltipTop, setTooltipTop] = useState<number>(0);
  const [tooltipLeft, setTooltipLeft] = useState<number>(0);
  const [iconLayout, setIconLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 12;
  const verticalOffset = 8;

  // Store layout position for more reliable positioning on Android
  const handleIconLayout = (event: {
    nativeEvent: {
      layout: { x: number; y: number; width: number; height: number };
    };
  }) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setIconLayout({ x, y, width, height });
  };

  const handlePress = () => {
    if (modalVisible) {
      setModalVisible(false);
      setShowTooltip(null);
      return;
    }

    // Use a more reliable measurement approach for Android
    // Try measureInWindow first, fallback to onLayout if needed
    const measurePosition = () => {
      iconRef.current?.measureInWindow((x, y, width, height) => {
        let safeX = Number.isFinite(x) ? x : 0;
        let safeY = Number.isFinite(y) ? y : 0;
        let safeW = Number.isFinite(width) ? width : 14;
        let safeH = Number.isFinite(height) ? height : 14;

        // On Android, if measureInWindow gives invalid values, try using stored layout
        if (
          Platform.OS === 'android' &&
          (safeX === 0 || safeY === 0) &&
          iconLayout
        ) {
          // Try to get window position using measure
          iconRef.current?.measure((fx, fy, fw, fh, px, py) => {
            if (Number.isFinite(px) && Number.isFinite(py)) {
              safeX = px;
              safeY = py;
              safeW = fw;
              safeH = fh;
              calculateTooltipPosition(safeX, safeY, safeW, safeH);
            } else {
              // Fallback: use layout position (less accurate but better than NaN)
              calculateTooltipPosition(
                iconLayout.x,
                iconLayout.y,
                iconLayout.width,
                iconLayout.height,
              );
            }
          });
        } else {
          calculateTooltipPosition(safeX, safeY, safeW, safeH);
        }
      });
    };

    const calculateTooltipPosition = (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => {
      const centerX = x + width / 2;
      const left = Math.max(
        horizontalPadding,
        Math.min(
          centerX - tooltipMaxWidth / 2,
          screenWidth - tooltipMaxWidth - horizontalPadding,
        ),
      );
      const top = y + height + verticalOffset;

      if (!Number.isFinite(left) || !Number.isFinite(top)) {
        // Fallback to center if measurement failed
        setTooltipLeft(screenWidth / 2 - tooltipMaxWidth / 2);
        setTooltipTop(100);
      } else {
        setTooltipLeft(left);
        setTooltipTop(top);
      }

      setModalVisible(true);
      setShowTooltip(tooltipId);
    };

    // Delay measurement until after layout pass
    requestAnimationFrame(() => {
      setTimeout(() => {
        measurePosition();
      }, 50); // Small delay for Android to ensure layout is ready
    });
  };

  // Styles as constants to satisfy linter
  const overlayStyle = {
    flex: 1,
    backgroundColor: 'transparent',
  } as const;

  const tooltipContainerStyle = {
    position: 'absolute' as const,
    top: tooltipTop,
    left: tooltipLeft,
    maxWidth: tooltipMaxWidth,
    width: tooltipMaxWidth,
    borderWidth,
    borderColor,
    zIndex,
    elevation,
  };

  const getArrowStyle = (): ViewStyle => ({
    position: 'absolute',
    left: 20,
    top: -6,
    width: 12,
    height: 12,
    borderLeftWidth: borderWidth,
    borderTopWidth: borderWidth,
    borderColor,
    transform: [{ rotate: '45deg' }],
    backgroundColor: undefined,
  });

  const iconContainerStyle: ViewStyle = { marginLeft: 4 };

  return (
    <View ref={iconRef} style={iconContainerStyle} onLayout={handleIconLayout}>
      <CyDTouchView onPress={handlePress}>
        <CyDMaterialDesignIcons
          name='information'
          size={14}
          className='text-n200'
        />
      </CyDTouchView>
      <Modal
        transparent
        visible={modalVisible && showTooltip === tooltipId}
        animationType='fade'
        onRequestClose={() => {
          setModalVisible(false);
          setShowTooltip(null);
        }}>
        <Pressable
          style={overlayStyle}
          onPress={() => {
            setModalVisible(false);
            setShowTooltip(null);
          }}>
          <CyDView
            className='bg-base40 rounded-lg p-3 shadow-2xl'
            style={tooltipContainerStyle}>
            <CyDView className='bg-base40' style={getArrowStyle()} />
            <CyDText
              className='text-[12px] leading-[18px]'
              numberOfLines={0}
              style={{ flexShrink: textFlexShrink }}>
              {content}
            </CyDText>
          </CyDView>
        </Pressable>
      </Modal>
    </View>
  );
};

/**
 * Note: RewardsBreakdownBottomSheetContent component has been removed
 * The breakdown is now displayed inline on the main page instead of in a bottom sheet
 */

/**
 * Bottom Sheet Content for Claim Rewards Options
 */
const ClaimRewardsBottomSheetContent = ({
  totalRewards,
  onClaimToWallet,
  onPerformClaims,
  onClose,
  navigation,
}: {
  totalRewards: number;
  onClaimToWallet: () => Promise<void>;
  onPerformClaims: () => Promise<ClaimExecutionResult>;
  onClose: () => void;
  navigation: any;
}) => {
  const { t } = useTranslation();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { showModal, hideModal } = useGlobalModalContext();
  const [claimingToWallet, setClaimingToWallet] = useState(false);
  const [claimingAndLock, setClaimingAndLock] = useState(false);

  /**
   * Handle deposit and boost rewards
   * Navigates to social media screen with claim lock URL
   */
  const handleDepositAndBoost = async () => {
    setClaimingAndLock(true);
    try {
      // First, perform the on-chain claims (rewards + bribes if available)
      const result = await onPerformClaims();

      if (!result.success) {
        showModal(GlobalModalType.STATE, {
          type: 'error',
          title: t('CLAIM_FAILED'),
          description:
            result.errorMessage ??
            t<string>('CLAIM_ERROR_DESC') ??
            'Claim failed',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      // After successful claim, show success modal with a Proceed to Lock action
      const sessionToken = globalContext.globalState.token;
      if (!sessionToken) {
        console.error('Session token not available');
      }
      const redirectURI = `https://app.cypherhq.io/#/?claimLock=true&sessionToken=${encodeURIComponent(
        sessionToken || '',
      )}`;

      showModal(GlobalModalType.CUSTOM_LAYOUT, {
        isModalVisible: true,
        customComponent: (
          <CyDView className={'px-[24px] pt-[24px] pb-[16px] items-center'}>
            <CyDMaterialDesignIcons
              name={'check-circle'}
              size={56}
              className='text-green400'
            />
            <CyDText
              className={'mt-[12px] text-center text-[18px] font-semibold'}>
              {t<string>('CLAIM_SUCCESS') ?? 'Claim successful'}
            </CyDText>
            <CyDText className={'mt-[8px] text-center text-[14px] text-n200'}>
              {t<string>('REWARDS_CLAIMED_READY_TO_LOCK') ??
                'Your rewards are claimed. Proceed to lock to boost your rewards.'}
            </CyDText>
            <CyDView className={'w-[100%] mt-[20px] px-[8px]'}>
              <Button
                title={t<string>('PROCEED_TO_LOCK') ?? 'Proceed to Lock'}
                onPress={() => {
                  hideModal();
                  navigation.navigate(screenTitle.OPTIONS);
                  setTimeout(() => {
                    navigation.navigate(screenTitle.OPTIONS, {
                      screen: screenTitle.SOCIAL_MEDIA_SCREEN,
                      params: {
                        title: t('DEPOSIT_AND_BOOST'),
                        uri: redirectURI,
                      },
                    });
                  }, 250);
                }}
                type={ButtonType.PRIMARY}
                style={'rounded-full'}
                paddingY={14}
              />
              <Button
                title={t<string>('CLOSE') ?? 'Close'}
                onPress={() => {
                  hideModal();
                }}
                type={ButtonType.SECONDARY}
                style={'mt-[10px] rounded-full'}
                paddingY={14}
              />
            </CyDView>
          </CyDView>
        ),
        onSuccess: hideModal,
        onFailure: hideModal,
      });

      // Keep bottom sheet open so users see the modal, they can close from modal
    } catch (error) {
      console.error('Error in claim and lock flow:', error);
      showModal(GlobalModalType.STATE, {
        type: 'error',
        title: t('CLAIM_ERROR') || 'Claim error',
        description:
          error instanceof Error ? error.message : t('CLAIM_ERROR_DESC'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      setClaimingAndLock(false);
    }
  };

  const onPressDepositAndBoost = (): void => {
    void handleDepositAndBoost();
  };

  /**
   * Handle claim to wallet
   * Calls the parent function to execute the claim and closes the bottom sheet
   */
  const handleClaimToWallet = async () => {
    setClaimingToWallet(true);
    try {
      await onClaimToWallet();
      // Close the bottom sheet after successful claim
      onClose();
    } catch (error) {
      // Keep bottom sheet open if there's an error so user can retry
      console.error('Error in claim, keeping bottom sheet open:', error);
    } finally {
      setClaimingToWallet(false);
    }
  };

  const onPressClaimToWallet = (): void => {
    void handleClaimToWallet();
  };

  return (
    <CyDView className='flex-1 bg-n0 px-6'>
      {/* Options */}
      <CyDView className='gap-y-6 my-8'>
        {/* Deposit and boost Reward */}
        <CyDTouchView
          onPress={onPressDepositAndBoost}
          disabled={claimingAndLock || claimingToWallet}
          className={`bg-p50 rounded-[16px] pb-4 pt-2 px-6 ${
            claimingAndLock || claimingToWallet ? 'opacity-50' : ''
          }`}>
          <CyDView className='items-center'>
            <CyDIcons name='card-filled' className='text-black text-[40px]' />
            <CyDText className='text-black font-semibold text-center mb-1'>
              {t('CLAIM_AND_LOCK_REWARD')}
            </CyDText>
            <CyDText className='text-black text-[14px] text-center opacity-80'>
              {t('USE_CLAIMABLE_CYPHER_TOKENS_AS_COLLATERAL')}
            </CyDText>
          </CyDView>
        </CyDTouchView>

        {/* Claim to wallet */}
        <CyDTouchView
          onPress={onPressClaimToWallet}
          disabled={claimingToWallet || claimingAndLock}
          className={`bg-base40 rounded-[16px] px-6 pb-4 pt-2 ${
            claimingToWallet || claimingAndLock ? 'opacity-50' : ''
          }`}>
          <CyDView className='items-center'>
            {/* <CyDIcons
              name='wallet-multiple'
              className='text-white text-[40px]'
            /> */}
            <CyDMaterialDesignIcons
              name='wallet'
              size={30}
              className='text-base400 my-[8px]'
            />
            <CyDText className='font-semibold text-center mb-1'>
              {claimingToWallet ? t('CLAIMING') : t('CLAIM_TO_WALLET')}
            </CyDText>
            <CyDText className='text-n200 text-[14px] text-center'>
              {claimingToWallet
                ? t('PROCESSING_YOUR_CLAIM_TRANSACTION')
                : t('CLAIM_THE_EARNED_CYPHER_TOKEN_STRAIGHT_TO_YOUR_WALLET')}
            </CyDText>
          </CyDView>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};

const ClaimReward: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();
  const { showModal, hideModal } = useGlobalModalContext();
  const { getWithAuth, patchWithAuth } = useAxios();

  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Initialize Rewards Distributor and Bribes Claimer hooks (must be in parent component within WagmiProvider)
  const { claimRewards } = useRewardsDistributor();
  const { claimBribesBatch } = useBribesClaimer();
  const hdWalletContext = useContext<any>(HdWalletContext);

  // State for claim reward data from API
  const [claimRewardData, setClaimRewardData] =
    useState<ClaimRewardResponse | null>(null);
  const [loadingClaimData, setLoadingClaimData] = useState<boolean>(true);

  // State for bribes data from API
  const [bribesData, setBribesData] = useState<IBribeClaimResponse | null>(
    null,
  );
  const [loadingBribesData, setLoadingBribesData] = useState<boolean>(true);

  // State for tooltip management in inline breakdown
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Get rewardsData and claimRewardData from navigation params
  const passedClaimRewardData = (route.params as any)?.claimRewardData as
    | ClaimRewardResponse
    | undefined;

  // Calculate claim data from API response
  const claimData = React.useMemo(() => {
    if (!claimRewardData) {
      return {
        totalRewards: 0,
        dateRange: 'From all reward cycles',
        isEligible: false,
      };
    }

    // API returns values in wei - convert to decimal using 18 decimals
    const totalRewards = parseFloat(
      DecimalHelper.toDecimal(
        String(claimRewardData?.rewardInfo?.totalRewardsInToken ?? '0'),
        18,
      ).toString(),
    );

    return {
      totalRewards,
      dateRange: `Epoch ${claimRewardData.epochNumber}`,
      isEligible: claimRewardData.isEligible,
    };
  }, [claimRewardData]);

  // Calculate earning breakdown from API response
  const earningBreakdown: EarningBreakdown[] = React.useMemo(() => {
    const breakdown: EarningBreakdown[] = [];

    // Add protocol rewards if available
    if (claimRewardData) {
      const rewards = claimRewardData.rewardInfo;
      // API returns values in wei - convert to decimal using 18 decimals
      const baseSpend = parseFloat(
        DecimalHelper.toDecimal(
          String(rewards?.baseSpendAmount ?? '0'),
          18,
        ).toString(),
      ).toFixed(2);
      const boostedSpend = parseFloat(
        DecimalHelper.toDecimal(
          String(rewards?.boostedSpend ?? '0'),
          18,
        ).toString(),
      ).toFixed(2);
      const boostedReferral = parseFloat(
        DecimalHelper.toDecimal(
          String(rewards?.boostedReferralAmount ?? '0'),
          18,
        ).toString(),
      ).toFixed(2);

      breakdown.push(
        {
          id: '2',
          type: t('FROM_SPENDS'),
          amount: `${baseSpend} $CYPR`,
          color: 'blue-400',
          bgColor: 'rgba(247,198,69,0.15)',
          textColor: '#F7C645',
        },
        {
          id: '3',
          type: t('MERCHANT_SPENDS'),
          amount: `${boostedSpend} $CYPR`,
          color: 'red-400',
          bgColor: 'rgba(255,140,0,0.15)',
          textColor: '#FF8C00',
        },
        {
          id: '4',
          type: t('REFERRAL_REWARDS'),
          amount: `${boostedReferral} $CYPR`,
          color: 'blue-400',
          bgColor: 'rgba(7,73,255,0.15)',
          textColor: '#0749FF',
        },
      );
    }

    // Add bribes section if available
    if (
      bribesData?.hasClaimableBribes &&
      bribesData?.mergedBribes &&
      bribesData.mergedBribes.length > 0
    ) {
      const totalBribesValue =
        Number(bribesData.summary?.totalClaimableBribes) || 0;
      breakdown.push({
        id: '5',
        type: 'Voting Bribes',
        amount:
          totalBribesValue > 0
            ? `$${totalBribesValue.toFixed(2)}`
            : `${bribesData.mergedBribes.length} veNFT(s)`,
        color: 'purple-400',
        bgColor: 'rgba(147,51,234,0.15)',
        textColor: '#9333EA',
      });
    }

    return breakdown;
  }, [claimRewardData, bribesData, t]);

  /**
   * Fetches claim reward data from API
   * This provides the rootId, proof, and amounts needed for claiming
   */
  const fetchClaimRewardData = async () => {
    try {
      setLoadingClaimData(true);

      const response = await getWithAuth(
        '/v1/cypher-protocol/user/claim-reward',
      );

      if (!response.isError && response.data) {
        setClaimRewardData(response.data as ClaimRewardResponse);
      } else {
        console.error('❌ Failed to fetch claim reward data:', response.error);
        showToast('Failed to load claim reward data', 'error');
      }
    } catch (error) {
      console.error('💥 Error fetching claim reward data:', error);
      showToast('Error loading claim reward data');
    } finally {
      setLoadingClaimData(false);
    }
  };

  /**
   * Fetches bribes data from API
   * This provides the bribe tokens, candidates, and epoch ranges needed for claiming
   */
  const fetchBribesData = async () => {
    try {
      setLoadingBribesData(true);

      const response = await getWithAuth('/v1/cypher-protocol/bribes/claim');

      if (!response.isError && response.data) {
        const data = response.data as IBribeClaimResponse;
        setBribesData(data);
      } else {
        console.error('❌ Failed to fetch bribes data:', response.error);
        // Don't show toast for bribes - it's optional
      }
    } catch (error) {
      console.error('💥 Error fetching bribes data:', error);
      // Don't show toast for bribes - it's optional
    } finally {
      setLoadingBribesData(false);
    }
  };

  /**
   * Fetch claim reward data and bribes data on component mount
   */
  useEffect(() => {
    if (passedClaimRewardData) {
      setClaimRewardData(passedClaimRewardData);
      setLoadingClaimData(false);
    } else {
      void fetchClaimRewardData();
    }

    // Always fetch bribes data
    void fetchBribesData();
  }, []);

  /**
   * Helper function to format numbers with decimals
   * @param value - The number to format
   * @param decimals - Number of decimal places (default: 2)
   * @returns Formatted string with decimals
   */
  const formatWithDecimals = (value: number, decimals = 2): string => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  /**
   * Process API data to create detailed breakdown
   * Calculates base spend, boosted spend, referral rewards, and merchant breakdown
   * Note: API returns values in wei - must convert to decimal using 18 decimals
   */
  const getDetailedBreakdownData = () => {
    if (!claimRewardData?.isEligible || !claimRewardData?.rewardInfo) {
      return {
        baseSpendRewards: 0,
        boostedSpendRewards: 0,
        referralRewards: 0,
        totalEarnings: 0,
        merchantRewards: [],
      };
    }

    const { rewardInfo } = claimRewardData;

    // API returns values in wei - convert to decimal using 18 decimals
    const baseSpendRewards = parseFloat(
      DecimalHelper.toDecimal(
        String(rewardInfo.baseSpendAmount ?? '0'),
        18,
      ).toString(),
    );
    const boostedSpendRewards = parseFloat(
      DecimalHelper.toDecimal(
        String(rewardInfo.boostedSpend ?? '0'),
        18,
      ).toString(),
    );
    const referralRewards = parseFloat(
      DecimalHelper.toDecimal(
        String(rewardInfo.boostedReferralAmount ?? '0'),
        18,
      ).toString(),
    );

    const totalEarnings =
      baseSpendRewards + boostedSpendRewards + referralRewards;

    // Transform merchant data from boostedSpendSplit
    const merchantRewards: MerchantRewardData[] =
      rewardInfo.boostedSpendSplit?.map(
        (
          merchant: {
            parentMerchantId?: string;
            canonicalName?: string;
            logoUrl?: string;
            spend?: string | number;
          },
          index: number,
        ) => ({
          id: merchant.parentMerchantId ?? `merchant_${index}`,
          name: merchant.canonicalName ?? 'Unknown Merchant',
          logo: merchant.logoUrl,
          rewardsEarned: parseFloat(
            DecimalHelper.toDecimal(
              String(merchant.spend ?? '0'),
              18,
            ).toString(),
          ),
          canonicalName: merchant.canonicalName,
        }),
      ) ?? [];

    return {
      baseSpendRewards,
      boostedSpendRewards,
      referralRewards,
      totalEarnings,
      merchantRewards,
    };
  };

  const detailedBreakdownData = getDetailedBreakdownData();

  /**
   * Tooltip content for each reward type
   * Provides educational information about how each reward is earned
   */
  const tooltipContent = {
    baseSpend:
      t('BASE_SPEND_TOOLTIP') ??
      'Every spend at any merchant qualifies for base spend rewards. Earn 1 $CYPR for every $10 spent with your Cypher card.',
    boostedSpend:
      t('BOOSTED_SPEND_TOOLTIP') ??
      "Spending at merchants listed in the leaderboard qualifies for boosted rewards. Number of $CYPR earned is based on the merchant's reward multiplier at the end of the reward cycle.",
    referral:
      t('REFERRAL_TOOLTIP') ??
      'First-time spend made by your referrals (at merchants listed in the leaderboard) who onboarded in the last reward cycle qualifies for referral rewards.',
  };

  // Color constants for reward types
  const baseSpendBgColor = 'rgba(247,198,69,0.15)';
  const baseSpendColor = '#F7C645';
  const boostedSpendBgColor = 'rgba(255,140,0,0.15)';
  const boostedSpendColor = '#FF8C00';
  const referralBgColor = 'rgba(7,73,255,0.15)';
  const referralColor = '#0749FF';

  /**
   * Handles back navigation
   */
  const handleBack = () => {
    navigation.goBack();
  };

  /**
   * Handles sharing reward information
   */
  const handleShare = () => {
    const shareMessage = `🎉 I've earned ${claimData.totalRewards} $CYPR tokens through Cypher Rewards! 💰Join me and start earning crypto rewards on every purchase with Cypher Card! 🚀`;

    Share.share({
      message: shareMessage,
      title: t('CYPHER_REWARDS_ACHIEVEMENT'),
    }).catch((error: any) => {
      if (error.message !== 'User did not share') {
        console.error('Error sharing rewards:', error);
        showToast(t('FAILED_TO_SHARE_REWARDS_INFORMATION'));
      }
    });
  };

  /**
   * Execute claims (rewards + bribes) and return the result without navigating
   */
  const performClaims = async (): Promise<ClaimExecutionResult> => {
    try {
      // Get user's Ethereum address from wallet context
      const fromAddress = get(
        hdWalletContext,
        'state.wallet.ethereum.address',
        '',
      ) as `0x${string}`;

      if (!fromAddress) {
        console.error('❌ No Ethereum address found in wallet context');
        return {
          success: false,
          rewardsClaimedSuccess: false,
          bribesClaimedSuccess: false,
          rewardsClaimedAmount: 0,
          bribesClaimedCount: 0,
          lastTransactionHash: '',
          errorMessage: String(t('CONNECT_WALLET_FIRST')),
        };
      }

      // Check if either claim data or bribes data is available
      const hasRewards =
        claimRewardData?.isEligible && claimRewardData?.claimInfo;
      const hasBribes =
        bribesData?.hasClaimableBribes &&
        bribesData?.mergedBribes &&
        bribesData.mergedBribes.length > 0;

      if (!hasRewards && !hasBribes) {
        console.error('❌ No rewards or bribes available to claim');
        return {
          success: false,
          rewardsClaimedSuccess: false,
          bribesClaimedSuccess: false,
          rewardsClaimedAmount: 0,
          bribesClaimedCount: 0,
          lastTransactionHash: '',
          errorMessage:
            'There are no rewards or bribes available to claim at this time.',
        };
      }

      let rewardsClaimedSuccess = false;
      let bribesClaimedSuccess = false;
      let rewardsClaimedAmount = 0;
      let bribesClaimedCount = 0;
      let lastTransactionHash = '';

      // Step 1: Claim protocol rewards if available
      if (hasRewards && claimRewardData?.claimInfo) {
        const { claimInfo } = claimRewardData;

        // Convert proof and amount from API format to contract format
        const proofs = claimInfo.proof.map(proofArray =>
          proofArray.map(p => p),
        ) as Array<Array<`0x${string}`>>;

        const rootIds = claimInfo.rootId.map(id => BigInt(id));
        const values = claimInfo.amount.map(amt => BigInt(amt));

        const claimParams = {
          proofs,
          rootIds,
          values,
          fromAddress,
        };

        // Execute claim using the same pattern as airdrop claim
        const result = await claimRewards(claimParams);

        // Check if transaction was successful
        if (!result.isError && result.hash) {
          rewardsClaimedSuccess = true;
          lastTransactionHash = result.hash;

          // Calculate the total claimed amount in CYPR tokens
          // Sum all values and convert from Wei to tokens (18 decimals)
          const totalClaimedWei = claimParams.values.reduce(
            (sum, val) => sum + val,
            0n,
          );
          rewardsClaimedAmount = Number(totalClaimedWei) / Math.pow(10, 18);

          // Mark rewards as claimed in backend
          // This is a non-blocking call - we don't want to prevent navigation if it fails
          try {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const markClaimedResponse = await patchWithAuth(
              '/v1/cypher-protocol/user/mark-claimed',
              {
                unixTimestamp: currentTimestamp,
                ...(result.hash && { transactionHash: result.hash }),
              },
            );
            if (markClaimedResponse.isError) {
              console.error(
                '⚠️ Failed to mark rewards as claimed on backend:',
                markClaimedResponse.error,
              );
              // Don't block the user flow - just log the error
            }
          } catch (markClaimedError) {
            console.error(
              '💥 Exception while marking rewards as claimed:',
              markClaimedError,
            );
            // Don't block the user flow - just log the error
          }
        } else {
          console.error('❌ Protocol rewards claim failed:', result.error);
          // Don't fail the entire process - continue to bribes if available
        }
      }

      // Step 2: Claim bribes if available
      if (hasBribes && bribesData?.mergedBribes) {
        // Prepare claim parameters for all merged bribes
        const claimParams = bribesData.mergedBribes.map(bribe => ({
          tokenId: parseInt(bribe.veNFTId, 10),
          bribeTokens: bribe.bribeTokens,
          candidates: bribe.candidates,
          fromTimestamp: bribe.epochRange.from,
          untilTimestamp: bribe.epochRange.until,
        }));

        // Execute batch claim for all bribes
        const results = await claimBribesBatch(claimParams);

        // Count successes
        const successCount = results.filter(r => !r.isError).length;

        if (successCount > 0) {
          bribesClaimedSuccess = true;
          bribesClaimedCount = successCount;

          // Get last successful transaction hash
          const lastSuccessful = results
            .reverse()
            .find(r => !r.isError && r.hash);
          if (lastSuccessful?.hash) {
            lastTransactionHash = lastSuccessful.hash;
          }

          // Refresh bribes data after successful claim
          void fetchBribesData();
        } else {
          console.error('❌ All bribe claims failed');
        }
      }

      // Return the result to the caller
      const success = rewardsClaimedSuccess || bribesClaimedSuccess;
      if (success) {
        // Refresh data after successful claim
        void fetchClaimRewardData();
      }
      return {
        success,
        rewardsClaimedSuccess,
        bribesClaimedSuccess,
        rewardsClaimedAmount,
        bribesClaimedCount,
        lastTransactionHash,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(t('CLAIM_ERROR_DESC'));
      return {
        success: false,
        rewardsClaimedSuccess: false,
        bribesClaimedSuccess: false,
        rewardsClaimedAmount: 0,
        bribesClaimedCount: 0,
        lastTransactionHash: '',
        errorMessage,
      };
    }
  };

  /**
   * Handle claim to wallet transaction
   * Calls performClaims and then navigates to the success screen on success
   */
  const handleClaimToWalletTransaction = async () => {
    const result = await performClaims();
    if (!result.success) {
      showModal(GlobalModalType.STATE, {
        type: 'error',
        title: t('CLAIM_FAILED'),
        description:
          result.errorMessage ??
          t<string>('CLAIM_ERROR_DESC') ??
          'Claim failed',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }

    let successMessage = '';
    if (result.rewardsClaimedSuccess && result.bribesClaimedSuccess) {
      const formattedAmount = (
        Number(result.rewardsClaimedAmount) || 0
      ).toFixed(2);
      successMessage = `Successfully claimed ${formattedAmount} $CYPR rewards and bribes from ${result.bribesClaimedCount} veNFT(s)!`;
    } else if (result.rewardsClaimedSuccess) {
      const formattedAmount = (
        Number(result.rewardsClaimedAmount) || 0
      ).toFixed(2);
      successMessage = `Successfully claimed ${formattedAmount} $CYPR rewards!`;
    } else if (result.bribesClaimedSuccess) {
      successMessage = `Successfully claimed bribes from ${result.bribesClaimedCount} veNFT(s)!`;
    }

    (navigation as any).navigate(screenTitle.TOKEN_REWARD_EARNED, {
      rewardAmount: result.rewardsClaimedAmount ?? 0,
      tokenSymbol: '$CYPR',
      message: successMessage,
      transactionHash: result.lastTransactionHash,
      fromRewardsClaim: true,
      bribesClaimedCount: result.bribesClaimedSuccess
        ? result.bribesClaimedCount
        : 0,
    });
  };

  /**
   * Shows the claim options bottom sheet (deposit & boost or claim to wallet)
   * This is the second bottom sheet in the claim flow
   */
  const showClaimOptionsBottomSheet = () => {
    const bottomSheetId = 'claim-rewards-options';

    showBottomSheet({
      id: bottomSheetId,
      snapPoints: ['45%', '60%'],
      showCloseButton: true,
      scrollable: true,
      content: (
        <ClaimRewardsBottomSheetContent
          totalRewards={claimData.totalRewards}
          onClaimToWallet={handleClaimToWalletTransaction}
          onPerformClaims={performClaims}
          navigation={navigation}
          onClose={() => {
            hideBottomSheet(bottomSheetId);
          }}
        />
      ),
      topBarColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      backgroundColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
    });
  };

  /**
   * Handles claim rewards action
   * Shows claim options bottom sheet directly (breakdown is now inline on the page)
   */
  const handleClaimRewards = () => {
    // Show claim options bottom sheet
    showClaimOptionsBottomSheet();
  };

  return (
    <>
      {/* Top inset background – white in dark mode, black in light mode */}
      <CyDView
        className={isDarkMode ? 'bg-white' : 'bg-black'}
        style={{
          height: insets.top,
        }}
      />

      {/* Header */}
      <CyDView
        className={`flex-row justify-between items-center px-4 py-3 ${
          isDarkMode ? 'bg-white' : 'bg-black'
        }`}>
        <CyDText className='text-n0 text-lg font-semibold'>
          {t('CYPHER')}{' '}
          <CyDText className='text-n0 font-[300] tracking-[2px]'>
            {t('REWARDS_CAPS')}
          </CyDText>
        </CyDText>

        <CyDTouchView onPress={handleBack} className='p-2'>
          <CyDMaterialDesignIcons
            name='close'
            size={24}
            className='text-n200'
          />
        </CyDTouchView>
      </CyDView>

      <CyDScrollView
        className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-n30'}`}
        showsVerticalScrollIndicator={false}>
        {loadingClaimData || loadingBribesData ? (
          <CyDView className='flex-1 items-center justify-center py-20'>
            <ActivityIndicator
              size='large'
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
            <CyDText className='text-n200 text-[16px] mt-4'>
              {loadingClaimData && loadingBribesData
                ? 'Loading rewards and bribes data...'
                : loadingClaimData
                ? t('LOADING_CLAIM_DATA')
                : 'Loading bribes data...'}
            </CyDText>
          </CyDView>
        ) : (
          <>
            {/* Main Claim Section */}
            <CyDView className='px-6 py-8 bg-base400 rounded-br-[36px] pt-[200px] -mt-[200px]'>
              <CyDText className='text-n0 text-[44px] font-[300] leading-tight mb-4'>
                {t('YOUR_REWARDS_ARE_AVAILABLE_TO_CLAIM')}
              </CyDText>

              {/* Token Amount */}
              <CyDView className='flex-row items-center mb-3'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-8 h-8 mr-3'
                  resizeMode='contain'
                />
                <CyDText className='text-n0 text-[36px] font-bold !font-gambetta'>
                  {DecimalHelper.round(claimData.totalRewards, 2).toString()}
                </CyDText>
              </CyDView>

              {/* Date Range */}
              <CyDText className='text-n0 text-[14px] mb-11'>
                {claimData.dateRange}
              </CyDText>

              {/* Action Buttons */}
              <CyDView className='flex-row gap-x-3'>
                <CyDTouchView
                  onPress={handleShare}
                  className='bg-base80 rounded-full px-[30px] py-[14px] items-center'>
                  <CyDText className='text-black text-[20px] font-medium'>
                    {t('SHARE')}
                  </CyDText>
                </CyDTouchView>

                <CyDView className='flex-1'>
                  <Button
                    title={t('CLAIM_REWARDS')}
                    titleStyle='text-[20px] font-medium'
                    onPress={handleClaimRewards}
                    type={ButtonType.PRIMARY}
                    style='rounded-full'
                    paddingY={14}
                  />
                </CyDView>
              </CyDView>
            </CyDView>

            {/* Content Container */}
            <CyDView className='flex-1 px-4 gap-y-6'>
              {/* Earning Breakdown - Summary */}
              <CyDView
                className={`rounded-[12px] p-4 mt-6 ${
                  isDarkMode ? 'bg-base40' : 'bg-n0'
                }`}>
                <CyDText className='font-medium text-[14px] mb-6 text-n200'>
                  {t('EARNING_BREAKDOWN') ?? 'Earning Breakdown'}
                </CyDText>

                <CyDView className='gap-y-4'>
                  {/* Base spend rewards */}
                  <CyDView className='flex-row items-center justify-between'>
                    <CyDView className='flex-row items-center'>
                      <CyDText className='text-[14px]'>
                        {t('BASE_SPEND_REWARDS') ?? 'Base spend rewards'}
                      </CyDText>
                      <InfoIcon
                        tooltipId='baseSpend'
                        content={tooltipContent.baseSpend}
                        showTooltip={showTooltip}
                        setShowTooltip={setShowTooltip}
                        isDarkMode={isDarkMode}
                      />
                    </CyDView>
                    <CyDView
                      className='px-1 py-[2px] rounded-[4px]'
                      style={{ backgroundColor: baseSpendBgColor }}>
                      <CyDText
                        className='text-[14px] font-semibold'
                        style={{ color: baseSpendColor }}>
                        {formatWithDecimals(
                          detailedBreakdownData.baseSpendRewards,
                        )}{' '}
                        $CYPR
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  {/* Boosted spend rewards */}
                  <CyDView className='flex-row items-center justify-between'>
                    <CyDView className='flex-row items-center'>
                      <CyDText className='text-[14px]'>
                        {t('BOOSTED_SPEND_REWARDS') ?? 'Boosted spend rewards'}
                      </CyDText>
                      <InfoIcon
                        tooltipId='boostedSpend'
                        content={tooltipContent.boostedSpend}
                        showTooltip={showTooltip}
                        setShowTooltip={setShowTooltip}
                        isDarkMode={isDarkMode}
                      />
                    </CyDView>
                    <CyDView
                      className='px-1 py-[2px] rounded-[4px]'
                      style={{ backgroundColor: boostedSpendBgColor }}>
                      <CyDText
                        className='text-[14px] font-semibold'
                        style={{ color: boostedSpendColor }}>
                        {formatWithDecimals(
                          detailedBreakdownData.boostedSpendRewards,
                        )}{' '}
                        $CYPR
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  {/* Referral rewards */}
                  <CyDView className='flex-row items-center justify-between'>
                    <CyDView className='flex-row items-center'>
                      <CyDText className='text-[14px]'>
                        {t('REFERRAL_REWARDS')}
                      </CyDText>
                      <InfoIcon
                        tooltipId='referral'
                        content={tooltipContent.referral}
                        showTooltip={showTooltip}
                        setShowTooltip={setShowTooltip}
                        isDarkMode={isDarkMode}
                      />
                    </CyDView>
                    <CyDView
                      className='px-1 py-[2px] rounded-[4px]'
                      style={{ backgroundColor: referralBgColor }}>
                      <CyDText
                        className='text-[14px] font-semibold'
                        style={{ color: referralColor }}>
                        {formatWithDecimals(
                          detailedBreakdownData.referralRewards,
                        )}{' '}
                        $CYPR
                      </CyDText>
                    </CyDView>
                  </CyDView>
                </CyDView>
              </CyDView>

              {/* Reward on Merchants Section */}
              {detailedBreakdownData.merchantRewards.length > 0 && (
                <CyDView
                  className={`rounded-[12px] py-4 mb-6 ${
                    isDarkMode ? 'bg-base40' : 'bg-n0'
                  }`}>
                  <CyDText className='font-medium text-[14px] mb-4 text-n200 px-4'>
                    {t('REWARD_ON_MERCHANTS') ?? 'Reward on Merchants'}
                  </CyDText>

                  {/* Total Earnings Header */}
                  <CyDView
                    className={`flex-row items-center justify-between px-4 py-3 mb-4 ${
                      isDarkMode ? 'bg-base200' : 'bg-n20'
                    }`}>
                    <CyDText
                      className={`text-[14px] font-medium ${
                        isDarkMode ? 'text-n50' : 'text-black'
                      }`}>
                      {t('TOTAL_EARNINGS') ?? 'Total Earnings'}
                    </CyDText>
                    <CyDView className='flex-row items-center gap-x-2'>
                      <CyDImage
                        source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                        className='w-5 h-5'
                        resizeMode='contain'
                      />
                      <CyDText
                        className={`text-[18px] font-bold ${
                          isDarkMode ? 'text-white' : 'text-black'
                        }`}>
                        {formatWithDecimals(
                          detailedBreakdownData.totalEarnings,
                          0,
                        )}
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  {/* Merchant List */}
                  <CyDView>
                    {detailedBreakdownData.merchantRewards.map(
                      (merchant, index) => (
                        <CyDView
                          key={merchant.id}
                          className={`px-4 py-4 ${
                            index !==
                            detailedBreakdownData.merchantRewards.length - 1
                              ? 'border-b'
                              : ''
                          } ${isDarkMode ? 'border-base200' : 'border-n40'}`}>
                          {/* Merchant header */}
                          <CyDView className='flex-row items-center gap-x-3 mb-4'>
                            {/* Merchant logo */}
                            <CyDView className='w-10 h-10 p-[2px] rounded-full bg-white items-center justify-center overflow-hidden'>
                              {merchant.logo ? (
                                <CyDImage
                                  source={{ uri: merchant.logo }}
                                  className='w-full h-full rounded-full'
                                  resizeMode='contain'
                                />
                              ) : (
                                <CyDView className='w-full h-full rounded-full items-center justify-center bg-n40'>
                                  <CyDText className='text-[10px] font-bold uppercase'>
                                    {merchant.name.slice(0, 2)}
                                  </CyDText>
                                </CyDView>
                              )}
                            </CyDView>

                            {/* Merchant name */}
                            <CyDView className='flex-1'>
                              <CyDText className='text-[16px] font-medium'>
                                {merchant.name}
                              </CyDText>
                            </CyDView>
                          </CyDView>

                          {/* Merchant stats */}
                          <CyDView className='flex-row items-center justify-between'>
                            <CyDText className='text-[14px] text-n200'>
                              {t('REWARDS_EARNED') ?? 'Rewards earned'}
                            </CyDText>
                            <CyDView
                              className='px-1 py-[2px] rounded-[4px]'
                              style={{ backgroundColor: boostedSpendBgColor }}>
                              <CyDText
                                className='text-[14px] font-medium'
                                style={{ color: boostedSpendColor }}>
                                {formatWithDecimals(merchant.rewardsEarned)}{' '}
                                $CYPR
                              </CyDText>
                            </CyDView>
                          </CyDView>

                          {/* Merchant stats */}
                          {/* <CyDView className='flex-row items-center justify-between mt-2'>
                            <CyDText className='text-[14px] text-n200'>
                              {t('TOTAL_SPEND') ?? 'Total spend'}
                            </CyDText>

                            <CyDText className='text-[14px] font-medium'>
                              ${formatWithDecimals(merchant.totalSpend)}
                            </CyDText>
                          </CyDView> */}
                        </CyDView>
                      ),
                    )}
                  </CyDView>
                </CyDView>
              )}

              {/* Reward on Merchants */}
              {/* <CyDView
              className={`py-6 rounded-[12px] ${
                isDarkMode ? 'bg-base40' : 'bg-n0'
              }`}>
              <CyDText className='text-[16px] font-medium mb-4 mx-4'>
                Reward on Merchants
              </CyDText> */}

              {/* Total Earnings */}
              {/* <CyDView
                className={`py-3 px-4 flex-row justify-between items-center ${
                  isDarkMode ? 'bg-base200' : 'bg-n20'
                }`}>
                <CyDText className='text-[14px] font-medium'>
                  Total Earnings
                </CyDText>
                <CyDView className='flex-row items-center'>
                  <CyDImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-6 h-6 mr-2'
                    resizeMode='contain'
                  />
                  <CyDText className='text-[18px] font-bold'>997</CyDText>
                </CyDView>
              </CyDView> */}

              {/* Merchant List */}
              {/* {merchantRewards.map((merchant, index) => (
                <CyDView
                  key={merchant.id}
                  className={`px-6 border-base200 border-b py-4 ${
                    index === merchantRewards.length - 1
                      ? 'border-b-0 pb-0'
                      : ''
                  } ${isDarkMode ? 'border-base200' : 'border-n40'}`}> */}
              {/* Merchant Header */}
              {/* <CyDView className='flex-row items-center mb-3'>
                    {renderMerchantAvatar(merchant.name)}
                    <CyDView className='flex-1'>
                      <CyDText className='text-[16px] font-medium mb-1'>
                        {merchant.name}
                      </CyDText>
                      <CyDText
                        className={`text-[12px] ${merchant.boosted ? 'text-orange-400' : 'text-green400'}`}>
                        {merchant.multiplier}
                      </CyDText>
                    </CyDView>
                  </CyDView> */}

              {/* Merchant Details */}
              {/* <CyDView>
                    <CyDView className='flex-row justify-between items-center mb-3'>
                      <CyDText className='text-n200 text-[14px]'>
                        Rewards earned
                      </CyDText>
                      <CyDText className='text-red-400 text-[14px] font-medium'>
                        {merchant.rewardsEarned}
                      </CyDText>
                    </CyDView>

                    {merchant.referralRewards && (
                      <CyDView className='flex-row justify-between items-center mb-3'>
                        <CyDText className='text-n200 text-[14px]'>
                          Referral rewards
                        </CyDText>
                        <CyDText className='text-blue-400 text-[14px] font-medium'>
                          {merchant.referralRewards}
                        </CyDText>
                      </CyDView>
                    )}

                    <CyDView className='flex-row justify-between items-center'>
                      <CyDText className='text-n200 text-[14px]'>
                        Total spend
                      </CyDText>
                      <CyDText className='text-white text-[14px] font-medium'>
                        {merchant.totalSpend}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                </CyDView>
              ))}
            </CyDView> */}

              {/* Spend Performance */}

              {/* <CyDView
              className={`py-4 rounded-[12px] ${
                isDarkMode ? 'bg-base40' : 'bg-n0'
              }`}>
              <CyDText className='text-[16px] font-medium mb-4 mx-4'>
                Spend Performance
              </CyDText> */}

              {/* Total Earnings */}
              {/* <CyDView
                className={`bg-base200 py-3 px-4 flex-row justify-between items-center mb-3 ${
                  isDarkMode ? 'bg-base200' : 'bg-n20'
                }`}>
                <CyDText
                  className={`text-[14px] font-medium ${
                    isDarkMode ? 'text-n50' : 'text-black'
                  }`}>
                  Total Spend
                </CyDText>
                <CyDText
                  className={`text-[18px] font-bold ${
                    isDarkMode ? 'text-white' : 'text-black'
                  }`}>
                  {spendPerformance.totalSpend}
                </CyDText>
              </CyDView> */}

              {/* <CyDView className='flex-row justify-between items-center mb-3 px-4'>
                <CyDText className='text-n200 text-[14px]'>
                  Avg. Spend/ Transaction
                </CyDText>
                <CyDText className='text-[14px] font-medium'>
                  {spendPerformance.avgSpendPerTransaction}
                </CyDText>
              </CyDView>

              <CyDView className='flex-row justify-between items-center px-4'>
                <CyDText className='text-n200 text-[14px]'>
                  Tokens Earned per 10$ Spent
                </CyDText>
                <CyDView className='flex-row items-center'>
                  <CyDImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-5 h-5 mr-2'
                    resizeMode='contain'
                  />
                  <CyDText className='text-[14px] font-medium'>
                    {spendPerformance.tokensEarnedPer10Spend}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView> */}
            </CyDView>
          </>
        )}
      </CyDScrollView>
    </>
  );
};

export default ClaimReward;
