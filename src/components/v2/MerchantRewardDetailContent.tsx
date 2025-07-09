import React from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDImage,
} from '../../styles/tailwindComponents';
import { BlurView } from '@react-native-community/blur';
import { StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useColorScheme } from 'nativewind';
import { Theme, useTheme } from '../../reducers/themeReducer';

interface MerchantRewardDetailContentProps {
  merchantData?: MerchantDetailData;
  onKnowMorePress?: () => void;
  onRemoveBoosterPress?: () => void;
}

interface MerchantDetailData {
  id: string;
  name: string;
  logo?: string; // Optional merchant logo URL
  multiplier: string;
  category: string;
  description: string;
  baseReward: string;
  merchantReward: string;
  boostedAmount: string;
  boostedPercentage: string;
  boostedSince: string;
  nextMonthDecrease: string;
  promotionalBonuses: PromotionalBonus[];
  recentTransactions: Transaction[];
  rewardCycles: RewardCycle[];
  referralTransactions: ReferralTransaction[];
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
> = ({
  merchantData,
  onKnowMorePress = () => {
    console.log('Know more pressed');
  },
  onRemoveBoosterPress = () => {
    console.log('Remove booster pressed');
  },
}) => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Dummy merchant detail data - will be replaced with API call later
  const defaultMerchantData: MerchantDetailData = {
    id: '1',
    name: 'Walmart',
    logo: undefined, // Will be populated with actual logo URL
    multiplier: '5.2X',
    category: 'Retail',
    description:
      'Merchant rewards act as multipliers to the base spending rewards. For example, if you earn 10 $CYPR as a reward for all merchant transactions, and the additional merchant reward multiplier is 3.2X, you will receive 10 $CYPR multiplied by 3.2, resulting in a total of 32 $CYPR for every $10 spent.',
    baseReward: '~ 4.5 - 6.7 $CYPR/$10 spent',
    merchantReward: '~ 45 - 61 $CYPR/$10 spent',
    boostedAmount: '4.19 veCypher',
    boostedPercentage: '4.06(4.1%)',
    boostedSince: '26 June, 2025',
    nextMonthDecrease: '4.06(4.1%)',
    promotionalBonuses: [
      {
        id: '1',
        title: 'Promotional Bonus',
        amount: '100.00',
        token: 'CYPR',
        date: '26 June, 2025 | 1:38 AM',
      },
      {
        id: '2',
        title: 'Promotional Bonus',
        amount: '4.30',
        token: 'USDC',
        date: '26 June, 2025 | 1:38 AM',
      },
    ],
    recentTransactions: [
      {
        id: '1',
        location: 'Walmart, Illinois',
        amount: '$14.32',
        date: 'Apr 24, 2024, 02:29 PM',
        type: 'transaction',
      },
      {
        id: '2',
        location: 'Walmart Bonus',
        amount: '100.00',
        date: 'Apr 24, 2024, 02:29 PM',
        type: 'bonus',
      },
      {
        id: '3',
        location: 'Walmart, Ontario',
        amount: '$22.32',
        date: 'Apr 24, 2024, 02:29 PM',
        type: 'transaction',
      },
      {
        id: '4',
        location: 'Walmart, Seattle',
        amount: '$69',
        date: 'Apr 24, 2024, 02:29 PM',
        type: 'transaction',
      },
    ],
    rewardCycles: [
      {
        id: '1',
        name: 'Reward Cycle 12',
        period: 'Apr 24 to May 7 2025',
        amount: '272.83',
        token: 'CYPR',
      },
      {
        id: '2',
        name: 'Reward Cycle 11',
        period: 'Apr 24 to May 7 2025',
        amount: '2.83',
        token: 'CYPR',
      },
      {
        id: '3',
        name: 'Reward Cycle 10',
        period: 'Apr 24 to May 7 2025',
        amount: '0',
        token: 'CYPR',
      },
      {
        id: '4',
        name: 'Reward Cycle 09',
        period: 'Apr 24 to May 7 2025',
        amount: '0',
        token: 'CYPR',
      },
      {
        id: '5',
        name: 'Reward Cycle 08',
        period: 'Apr 24 to May 7 2025',
        amount: '0',
        token: 'CYPR',
      },
    ],
    referralTransactions: [
      {
        id: '1',
        hash: '0xAce....1111',
        amount: '',
        status: 'Pending',
        date: 'Apr 24, 2024',
      },
      {
        id: '2',
        hash: '0x000....DeAd',
        amount: '13.32',
        status: 'Completed',
        date: 'Apr 24, 2024',
      },
      {
        id: '3',
        hash: '0x12e....beeF',
        amount: '71.3',
        status: 'Completed',
        date: 'Apr 24, 2024',
      },
      {
        id: '4',
        hash: '0x582....149F',
        amount: '3.32',
        status: 'Completed',
        date: 'Apr 24, 2024',
      },
      {
        id: '5',
        hash: '0x582....149F',
        amount: '3.32',
        status: 'Completed',
        date: 'Apr 24, 2024',
      },
    ],
  };

  const currentMerchantData = merchantData ?? defaultMerchantData;

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
   * Handles know more button press
   */
  const handleKnowMorePress = () => {
    console.log('Know More pressed for:', currentMerchantData.name);
    onKnowMorePress();
  };

  /**
   * Handles boost this merchant button press
   */
  const handleBoostMerchant = () => {
    console.log('Boost merchant pressed for:', currentMerchantData.name);
    // TODO: Implement boost merchant functionality
  };

  const { displayName, fontSize } = processMerchantName(
    currentMerchantData.name,
  );

  // Style objects for dynamic styling
  const overlayStyle = {
    backgroundColor: 'rgba(13, 13, 13, 0.7)',
  };

  const merchantTextStyle = {
    fontSize,
  };

  // Styles for blur effects
  const styles = StyleSheet.create({
    blurAbsolute: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
  });

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
                {currentMerchantData.name}
              </CyDText>

              {/* Blur Effect overlaying the big text */}
              <BlurView
                style={styles.blurAbsolute}
                blurType={'dark'}
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
          {currentMerchantData.logo ? (
            <CyDImage
              source={{ uri: currentMerchantData.logo }}
              className='w-16 h-16 rounded-full'
              resizeMode='contain'
            />
          ) : (
            <CyDText
              className='text-black font-bold text-center'
              style={merchantTextStyle}>
              {displayName}
            </CyDText>
          )}
        </CyDView>

        {/* Content Container */}
        <CyDView className='items-center justify-center py-10'>
          {/* Merchant Name */}
          <CyDText className='text-[24px] font-bold text-center px-4'>
            {currentMerchantData.name}
          </CyDText>

          {/* Rewards Badge */}
          <CyDText className='text-green400 text-[18px] font-bold'>
            {currentMerchantData.multiplier} Rewards
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
              <CyDText className='text-n200 text-[12px]'>
                {currentMerchantData.baseReward}
              </CyDText>
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
            <CyDView className='items-end'>
              <CyDText className='text-[14px] font-medium'>
                {currentMerchantData.multiplier} Rewards
              </CyDText>
              <CyDText className='text-n200 text-[12px]'>
                {currentMerchantData.merchantReward}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>

      {/* Bonuses Section */}
      {currentMerchantData?.promotionalBonuses?.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[12px] font-medium mb-2'>Bonuses</CyDText>

          <CyDView
            className={`bg-base40 rounded-[12px] ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
            }`}>
            {currentMerchantData.promotionalBonuses?.map((bonus, index) => (
              <CyDView
                key={bonus.id}
                className={`p-4 ${
                  index < currentMerchantData.promotionalBonuses.length - 1
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
                      Avgl Booster
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
        className={`p-3 mb-4 rounded-[12px] bg-base40 mx-4 ${
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

        <CyDText className='text-n200 text-[14px] mb-4'>
          You haven&apos;t boosted this merchant
        </CyDText>

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
        <CyDView className='gap-y-3'>
          <CyDTouchView
            className='bg-yellow-400 rounded-[25px] py-4 items-center'
            onPress={handleBoostMerchant}>
            <CyDText className='text-black text-[16px] font-semibold'>
              Boost this merchant
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>

      {/* <CyDTouchView
        className='bg-base200 rounded-[25px] py-4 items-center mb-7 mx-4'
        onPress={handleKnowMorePress}>
        <CyDText className='text-white text-[16px] font-medium'>
          Know More about {currentMerchantData.name}
        </CyDText>
      </CyDTouchView> */}

      {/* Recent Transactions */}
      {currentMerchantData.recentTransactions?.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[12px] font-medium mb-2'>
            Recent Transaction on this Merchant
          </CyDText>

          <CyDView
            className={`bg-base40 rounded-[12px] overflow-hidden ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
            }`}>
            {currentMerchantData.recentTransactions
              ?.slice(0, 4)
              .map((transaction, index) => (
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
              }`}>
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
      {currentMerchantData.rewardCycles?.length > 0 && (
        <CyDView className='mb-6 mx-4'>
          <CyDText className='text-[16px] font-semibold mb-4'>
            Previous reward cycles earnings
          </CyDText>

          <CyDView
            className={`bg-base40 rounded-[12px] overflow-hidden ${
              isDarkMode ? 'bg-base40' : 'bg-n0'
            }`}>
            {currentMerchantData.rewardCycles
              ?.slice(0, 5)
              .map((cycle, index) => (
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
            <CyDTouchView
              className={`p-4 flex-row items-center justify-between ${
                isDarkMode ? 'bg-base200' : 'bg-n40'
              }`}>
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
