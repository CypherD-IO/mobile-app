import React, { useState } from 'react';
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
}: {
  totalRewards: number;
}) => {
  /**
   * Handle deposit and boost rewards
   */
  const handleDepositAndBoost = () => {
    console.log('Deposit and boost rewards pressed');
    // TODO: Implement deposit and boost functionality
  };

  /**
   * Handle claim to wallet
   */
  const handleClaimToWallet = () => {
    console.log('Claim to wallet pressed');
    // TODO: Implement claim to wallet functionality
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
          onPress={handleClaimToWallet}
          className='bg-base40 rounded-[16px] px-6 pb-4 pt-2'>
          <CyDView className='items-center'>
            {/* <CyDIcons
              name='wallet-multiple'
              className='text-white text-[40px]'
            /> */}
            <CyDMaterialDesignIcons
              name='wallet'
              size={30}
              className='text-white my-[8px]'
            />
            <CyDText className='text-white font-semibold text-center mb-1'>
              Claim to wallet
            </CyDText>
            <CyDText className='text-n200 text-[14px] text-center'>
              Claim the earned cypher token straight to your wallet
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
  const { showBottomSheet } = useGlobalBottomSheet();

  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

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

  const [merchantRewards] = useState<MerchantReward[]>([
    {
      id: '1',
      name: 'Uber Services inc',
      multiplier: '3.2X Rewards',
      rewardsEarned: '322.09 $CYPR',
      totalSpend: '$672.32',
    },
    {
      id: '2',
      name: 'Uber Services inc',
      multiplier: '2.2X Rewards',
      rewardsEarned: '322.09 $CYPR',
      totalSpend: '$672.32',
    },
    {
      id: '3',
      name: 'Uber Services inc',
      multiplier: 'Boosted • 5.2X Rewards',
      rewardsEarned: '322.09 $CYPR',
      referralRewards: '122.09 $CYPR',
      totalSpend: '$672.32',
      boosted: true,
    },
  ]);

  const [spendPerformance] = useState<SpendPerformance>({
    totalSpend: '$2,340',
    avgSpendPerTransaction: '$123',
    tokensEarnedPer10Spend: '6.11',
  });

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
   * Handles claim rewards action
   */
  const handleClaimRewards = () => {
    console.log('Claim rewards pressed - total:', claimData.totalRewards);

    showBottomSheet({
      id: 'claim-rewards-options',
      snapPoints: ['45%', '60%'],
      showCloseButton: true,
      scrollable: true,
      content: (
        <ClaimRewardsBottomSheetContent totalRewards={claimData.totalRewards} />
      ),
      topBarColor: isDarkMode ? '#000000' : '#FFFFFF',
      onClose: () => {
        console.log('Claim rewards bottom sheet closed');
      },
    });
  };

  /**
   * Renders merchant avatar with name
   */
  const renderMerchantAvatar = (merchantName: string) => (
    <CyDView
      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
        isDarkMode ? 'bg-white' : 'bg-n40'
      }`}>
      <CyDText
        className={`text-[8px] font-bold text-center text-black`}
        numberOfLines={2}>
        {merchantName.split(' ')[0]}
      </CyDText>
    </CyDView>
  );

  return (
    <>
      {/* Top inset background – white in dark mode, black in light mode */}
      <CyDView
        style={{
          height: insets.top,
          backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
        }}
      />

      <CyDSafeAreaView
        className={`flex-1 ${isDarkMode ? 'bg-base400' : 'bg-n0'}`}>
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
              You rewards are{'\n'}available to claim
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
      </CyDSafeAreaView>

      {/* Bottom Safe Area with n0 background */}
      <CyDView
        className={`${isDarkMode ? 'bg-black' : 'bg-n30'}`}
        style={{ height: insets.bottom }}
      />
    </>
  );
};

export default ClaimReward;
