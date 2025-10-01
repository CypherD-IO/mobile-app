import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDSafeAreaView,
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
import { ButtonType } from '../../constants/enum';
import { showToast } from '../utilities/toastUtility';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import { DecimalHelper } from '../../utils/decimalHelper';
import useRewardsDistributor from '../../hooks/useRewardsDistributor';
import { HdWalletContext } from '../../core/util';
import { get } from 'lodash';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { screenTitle } from '../../constants';

interface EarningBreakdown {
  id: string;
  type: string;
  amount: string;
  color: string;
  bgColor: string;
  textColor: string;
}

interface MerchantReward {
  id: string;
  name: string;
  multiplier: string;
  rewardsEarned: string;
  referralRewards?: string;
  totalSpend: string;
  boosted?: boolean;
}

interface SpendPerformance {
  totalSpend: string;
  avgSpendPerTransaction: string;
  tokensEarnedPer10Spend: string;
}

/**
 * Bottom Sheet Content for Claim Rewards Options
 */
const ClaimRewardsBottomSheetContent = ({
  totalRewards,
  onClaimToWallet,
  onClose,
}: {
  totalRewards: number;
  onClaimToWallet: () => Promise<void>;
  onClose: () => void;
}) => {
  const [claiming, setClaiming] = useState(false);

  /**
   * Handle deposit and boost rewards
   */
  const handleDepositAndBoost = () => {
    console.log('Deposit and boost rewards pressed');
    // TODO: Implement deposit and boost functionality
  };

  /**
   * Handle claim to wallet
   * Calls the parent function to execute the claim and closes the bottom sheet
   */
  const handleClaimToWallet = async () => {
    setClaiming(true);
    try {
      await onClaimToWallet();
      // Close the bottom sheet after successful claim
      onClose();
    } catch (error) {
      // Keep bottom sheet open if there's an error so user can retry
      console.error('Error in claim, keeping bottom sheet open:', error);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <CyDView className='flex-1 bg-n0 px-6'>
      {/* Options */}
      <CyDView className='gap-y-6 my-8'>
        {/* Deposit and boost Reward */}
        <CyDTouchView
          onPress={handleDepositAndBoost}
          className='bg-p50 rounded-[16px] pb-4 pt-2 px-6'>
          <CyDView className='items-center'>
            <CyDIcons name='card-filled' className='text-black text-[40px]' />
            <CyDText className='text-black font-semibold text-center mb-1'>
              Deposit and boost Reward
            </CyDText>
            <CyDText className='text-black text-[14px] text-center opacity-80'>
              Use your claimable Cypher tokens as{'\n'}
              collateral to boost rewards
            </CyDText>
          </CyDView>
        </CyDTouchView>

        {/* Claim to wallet */}
        <CyDTouchView
          onPress={() => {
            void handleClaimToWallet();
          }}
          disabled={claiming}
          className={`bg-base40 rounded-[16px] px-6 pb-4 pt-2 ${
            claiming ? 'opacity-50' : ''
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
              {claiming ? 'Claiming...' : 'Claim to wallet'}
            </CyDText>
            <CyDText className='text-n200 text-[14px] text-center'>
              {claiming
                ? 'Processing your claim transaction'
                : 'Claim the earned cypher token straight to your wallet'}
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

  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Initialize Rewards Distributor hook (must be in parent component within WagmiProvider)
  const { claimRewards } = useRewardsDistributor();
  const hdWalletContext = useContext<any>(HdWalletContext);

  // Get rewardsData from navigation params
  const rewardsData = (route.params as any)?.rewardsData;

  // Calculate claim data from passed rewardsData
  const claimData = React.useMemo(() => {
    const totalUnclaimed = rewardsData?.allTime?.totalUnclaimed?.total ?? '0';
    const totalRewardsNum = parseFloat(
      DecimalHelper.toDecimal(totalUnclaimed, 18).toString(),
    );

    return {
      totalRewards: totalRewardsNum,
      dateRange: 'From all reward cycles',
    };
  }, [rewardsData]);

  // Calculate earning breakdown from rewardsData
  const earningBreakdown: EarningBreakdown[] = React.useMemo(() => {
    const unclaimed = rewardsData?.allTime?.totalUnclaimed ?? {};

    const bonus = parseFloat(
      DecimalHelper.toDecimal(unclaimed.bribes ?? '0', 18).toString(),
    );
    const baseSpend = parseFloat(
      DecimalHelper.toDecimal(unclaimed.baseSpend ?? '0', 18).toString(),
    );
    const boostedSpend = parseFloat(
      DecimalHelper.toDecimal(unclaimed.boostedSpend ?? '0', 18).toString(),
    );
    const baseReferral = parseFloat(
      DecimalHelper.toDecimal(unclaimed.baseReferral ?? '0', 18).toString(),
    );
    const boostedReferral = parseFloat(
      DecimalHelper.toDecimal(unclaimed.boostedReferral ?? '0', 18).toString(),
    );

    return [
      {
        id: '1',
        type: 'Bonus',
        amount: `${bonus.toFixed(2)} $CYPR`,
        color: 'green400',
        bgColor: 'rgba(107,178,0,0.15)',
        textColor: '#6BB200',
      },
      {
        id: '2',
        type: 'From spends',
        amount: `${baseSpend.toFixed(2)} $CYPR`,
        color: 'blue-400',
        bgColor: 'rgba(247,198,69,0.15)',
        textColor: '#F7C645',
      },
      {
        id: '3',
        type: 'Merchant Spends',
        amount: `${boostedSpend.toFixed(2)} $CYPR`,
        color: 'red-400',
        bgColor: 'rgba(255,140,0,0.15)',
        textColor: '#FF8C00',
      },
      {
        id: '4',
        type: 'Referrals Rewards',
        amount: `${(baseReferral + boostedReferral).toFixed(2)} $CYPR`,
        color: 'blue-400',
        bgColor: 'rgba(7,73,255,0.15)',
        textColor: '#0749FF',
      },
    ];
  }, [rewardsData]);

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
      title: 'Cypher Rewards Achievement',
    }).catch((error: any) => {
      if (error.message !== 'User did not share') {
        console.error('Error sharing rewards:', error);
        showToast('Failed to share rewards information');
      }
    });
  };

  /**
   * Handle claim to wallet transaction
   * Executes the claim rewards transaction on Base Sepolia
   */
  const handleClaimToWalletTransaction = async () => {
    console.log('🎁 Claim to wallet pressed');

    try {
      // Get user's Ethereum address from wallet context
      const fromAddress = get(
        hdWalletContext,
        'state.wallet.ethereum.address',
        '',
      ) as `0x${string}`;

      if (!fromAddress) {
        console.error('❌ No Ethereum address found in wallet context');
        showModal('state', {
          type: 'error',
          title: t('WALLET_NOT_FOUND') ?? 'Wallet Not Found',
          description:
            t('CONNECT_WALLET_FIRST') ??
            'Please connect your wallet to claim rewards',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      console.log('📍 User address:', fromAddress);

      // Test parameters for claiming rewards
      const testParams = {
        proofs: [[]] as Array<Array<`0x${string}`>>, // Empty proof array for testing
        rootIds: [0n], // Root ID 0
        values: [100000n], // Value 100000
        fromAddress,
      };

      console.log('📋 Test claim parameters:', {
        proofs: testParams.proofs,
        rootIds: testParams.rootIds.map(id => id.toString()),
        values: testParams.values.map(v => v.toString()),
        fromAddress: testParams.fromAddress,
      });

      // Execute claim
      const result = await claimRewards(testParams);

      console.log('🎉 Claim result:', result);

      // Only consider successful if there's a valid transaction hash
      if (result.success && result.hash && result.hash !== '0x') {
        console.log('✅ Rewards claimed successfully!');
        console.log('📜 Transaction hash:', result.hash);

        // Calculate the total claimed amount in CYPR tokens
        // Sum all values and convert from Wei to tokens (18 decimals)
        const totalClaimedWei = testParams.values.reduce(
          (sum, val) => sum + val,
          0n,
        );
        const claimedAmount = Number(totalClaimedWei) / Math.pow(10, 18);

        console.log('💰 Total claimed amount:', claimedAmount, '$CYPR');

        // Navigate to TokenRewardEarned screen with claimed amount
        const navigationParams = {
          rewardAmount: claimedAmount,
          tokenSymbol: '$CYPR',
          message: 'Congrats! You have successfully claimed your rewards!',
          transactionHash: result.hash,
          fromRewardsClaim: true, // Flag to indicate coming from rewards claim
        };

        (navigation as any).navigate(
          screenTitle.TOKEN_REWARD_EARNED,
          navigationParams,
        );

        // TODO: Refresh rewards data from API after successful claim
      } else {
        // Show error modal if claim failed or no transaction hash
        console.error('❌ Claim failed:', result.error);
        showModal('state', {
          type: 'error',
          title: t('CLAIM_FAILED') ?? 'Claim Failed',
          description:
            result.error ??
            t('CLAIM_FAILED_DESC') ??
            'Failed to claim rewards. Please try again later.',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      console.error('💥 Error in claim process:', error);

      // Show error modal for exceptions
      const errorMessage =
        error instanceof Error
          ? error.message
          : (t('CLAIM_ERROR_DESC') ??
            'An error occurred while claiming rewards. Please try again.');

      showModal('state', {
        type: 'error',
        title: t('CLAIM_ERROR') ?? 'Claim Error',
        description: errorMessage,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  /**
   * Handles claim rewards action
   * Shows bottom sheet with claim options
   */
  const handleClaimRewards = () => {
    console.log('Claim rewards pressed - total:', claimData.totalRewards);

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
          onClose={() => {
            console.log('Closing claim rewards bottom sheet...');
            hideBottomSheet(bottomSheetId);
          }}
        />
      ),
      topBarColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      backgroundColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      onClose: () => {
        console.log('Claim rewards bottom sheet closed');
      },
    });
  };

  return (
    <>
      {/* Top inset background – white in dark mode, black in light mode */}
      <CyDView
        style={{
          height: insets.top,
          backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
        }}
      />

      {/* Header */}
      <CyDView
        className={`flex-row justify-between items-center px-4 py-3 ${isDarkMode ? 'bg-white' : 'bg-black'}`}>
        <CyDText className='text-n0 text-lg font-semibold'>
          Cypher{' '}
          <CyDText className='text-n0 font-[300] tracking-[2px]'>
            REWARDS
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
        {/* Main Claim Section */}
        <CyDView className='px-6 py-8 bg-base400 rounded-br-[36px] pt-[200px] -mt-[200px]'>
          <CyDText className='text-n0 text-[44px] font-[300] leading-tight mb-4'>
            Your rewards are{'\n'}available to claim
          </CyDText>

          {/* Token Amount */}
          <CyDView className='flex-row items-center mb-3'>
            <CyDImage
              source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
              className='w-8 h-8 mr-3'
              resizeMode='contain'
            />
            <CyDText className='text-n0 text-[36px] font-bold font-newyork'>
              {claimData.totalRewards.toLocaleString()}
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
                Share
              </CyDText>
            </CyDTouchView>

            <CyDView className='flex-1'>
              <Button
                title='Claim Rewards'
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
          {/* Earning Breakdown */}
          <CyDView
            className={`p-4 mt-6 rounded-[12px] ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
            }`}>
            <CyDText className='text-[16px] font-medium mb-1'>
              Earning breakdown
            </CyDText>

            {earningBreakdown.map(item => (
              <CyDView
                key={item.id}
                className='flex-row justify-between items-center mt-3'>
                <CyDText className='text-[14px]'>{item.type}</CyDText>
                <CyDView
                  className={`px-1 py-[2px] rounded-[4px]`}
                  style={{ backgroundColor: item.bgColor }}>
                  <CyDText
                    className={`text-[14px] font-medium`}
                    style={{ color: item.textColor }}>
                    {item.amount}
                  </CyDText>
                </CyDView>
              </CyDView>
            ))}
          </CyDView>

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
      </CyDScrollView>

      {/* Bottom Safe Area with n0 background */}
      <CyDView
        className={`${isDarkMode ? 'bg-black' : 'bg-n30'}`}
        style={{ height: insets.bottom }}
      />
    </>
  );
};

export default ClaimReward;
