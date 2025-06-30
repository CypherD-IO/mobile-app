import React, { useRef, useEffect } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { CyDBottomSheet, CyDBottomSheetRef } from './bottomSheet';

interface MerchantRewardDetailModalProps {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  merchantData?: MerchantDetailData;
  onKnowMorePress?: () => void;
  onRemoveBoosterPress?: () => void;
}

interface MerchantDetailData {
  id: string;
  name: string;
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

const MerchantRewardDetailModal: React.FC<MerchantRewardDetailModalProps> = ({
  isVisible,
  setIsVisible,
  merchantData,
  onKnowMorePress = () => {
    // Handle know more press
  },
  onRemoveBoosterPress = () => {
    // Handle remove booster press
  },
}) => {
  console.log(
    '--------- MerchantRewardDetailModal is rendering with isVisible:',
    isVisible,
    'merchantData:',
    merchantData?.name ?? 'undefined',
  );
  const bottomSheetRef = useRef<CyDBottomSheetRef>(null);

  // Dummy merchant detail data - will be replaced with API call later
  const defaultMerchantData: MerchantDetailData = {
    id: '1',
    name: 'Walmart',
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

  const handleModalClose = () => {
    setIsVisible(false);
  };

  const handleKnowMorePress = () => {
    console.log('Know More pressed for:', currentMerchantData.name);
    onKnowMorePress();
  };

  const handleRemoveBoosterPress = () => {
    console.log('Remove booster pressed for:', currentMerchantData.name);
    onRemoveBoosterPress();
  };

  // Handle bottom sheet visibility
  useEffect(() => {
    console.log(
      'MerchantRewardDetailModal useEffect - isVisible:',
      isVisible,
      'merchantData:',
      merchantData?.name ?? 'using default data',
    );
    if (isVisible) {
      console.log(
        'Opening merchant detail sheet for:',
        currentMerchantData.name,
      );
      bottomSheetRef.current?.present();
    } else {
      console.log('Closing merchant detail sheet');
      bottomSheetRef.current?.dismiss();
    }
  }, [isVisible, currentMerchantData.name]);

  return (
    <CyDBottomSheet
      ref={bottomSheetRef}
      snapPoints={['80%', '95%']}
      initialSnapIndex={-1}
      title={`${currentMerchantData.name} Rewards`}
      showCloseButton={true}
      scrollable={true}
      onClose={handleModalClose}
      onOpen={() => console.log('Merchant detail sheet opened')}
      onChange={index => console.log('Bottom sheet index changed to:', index)}>
      {/* Scrollable content with proper gesture handling */}
      {/* Header Section */}
      <CyDView className='items-center py-[24px] px-[16px]'>
        {/* Merchant Icon */}
        <CyDView className='w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-4'>
          <CyDMaterialDesignIcons
            name='store'
            size={32}
            className='text-white'
          />
        </CyDView>

        {/* Merchant Name and Multiplier */}
        <CyDText className='text-white text-[24px] font-bold mb-2'>
          {currentMerchantData.name}
        </CyDText>
        <CyDView className='bg-green400 rounded-full px-4 py-2'>
          <CyDText className='text-white text-[16px] font-bold'>
            {currentMerchantData.multiplier} Rewards
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Description */}
      <CyDView className='mb-6 px-[16px]'>
        <CyDText className='text-n200 text-[14px] leading-5'>
          {currentMerchantData.description}
        </CyDText>
      </CyDView>

      {/* Reward Breakdown */}
      <CyDView className='mb-6 px-[16px]'>
        <CyDText className='text-white text-[16px] font-semibold mb-4'>
          Your spend on this merchant, earns
        </CyDText>

        {/* All Transaction Reward */}
        <CyDView className='bg-n40 rounded-[12px] p-4 mb-3'>
          <CyDView className='flex-row justify-between items-center'>
            <CyDText className='text-white text-[16px] font-medium'>
              All Transaction reward
            </CyDText>
            <CyDView className='items-end'>
              <CyDText className='text-white text-[14px] font-semibold'>
                1X Rewards
              </CyDText>
              <CyDText className='text-n200 text-[12px]'>
                {currentMerchantData.baseReward}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='flex-row justify-center mt-2'>
            <CyDMaterialDesignIcons
              name='plus'
              size={20}
              className='text-white'
            />
          </CyDView>
        </CyDView>

        {/* Merchant Reward */}
        <CyDView className='bg-n40 rounded-[12px] p-4'>
          <CyDView className='flex-row justify-between items-center'>
            <CyDText className='text-white text-[16px] font-medium'>
              Merchant reward
            </CyDText>
            <CyDView className='items-end'>
              <CyDText className='text-white text-[14px] font-semibold'>
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
      <CyDView className='mb-6 px-[16px]'>
        <CyDText className='text-white text-[16px] font-semibold mb-4'>
          Bonuses
        </CyDText>

        {/* Promotional Bonuses */}
        {currentMerchantData.promotionalBonuses?.map((bonus, index) => (
          <CyDView key={bonus.id} className='bg-n40 rounded-[12px] p-4 mb-3'>
            <CyDView className='flex-row justify-between items-center'>
              <CyDView>
                <CyDText className='text-white text-[14px] font-medium'>
                  {bonus.title}
                </CyDText>
                <CyDText className='text-n200 text-[12px]'>
                  {bonus.date}
                </CyDText>
              </CyDView>
              <CyDView className='flex-row items-center'>
                <CyDView className='w-6 h-6 bg-yellow-500 rounded-full mr-2' />
                <CyDText className='text-white text-[14px] font-semibold'>
                  {bonus.amount}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        ))}

        {/* Merchant Boost */}
        <CyDView className='bg-n40 rounded-[12px] p-4 mb-4'>
          <CyDText className='text-white text-[16px] font-semibold mb-2'>
            Merchant Boost
          </CyDText>
          <CyDText className='text-n200 text-[14px] mb-4'>
            Boosting is powered by the Cypher community. The more people who
            boost a merchant, the greater the reward potential — not just for
            you, but for everyone using Cypher.
          </CyDText>

          <CyDView className='border border-yellow-500 rounded-[12px] p-4 mb-4'>
            <CyDView className='flex-row justify-between items-center mb-2'>
              <CyDText className='text-white text-[14px]'>
                You have boosted this merchant for
              </CyDText>
              <CyDView className='w-12 h-12 bg-gray-600 rounded-full' />
            </CyDView>
            <CyDText className='text-white text-[18px] font-bold'>
              {currentMerchantData.boostedAmount}
            </CyDText>
            <CyDView className='flex-row justify-between mt-2'>
              <CyDText className='text-n200 text-[12px]'>
                Next month: ↘ {currentMerchantData.nextMonthDecrease}
              </CyDText>
            </CyDView>
            <CyDText className='text-n200 text-[12px] mt-2'>
              Boosted since
            </CyDText>
            <CyDText className='text-white text-[14px]'>
              {currentMerchantData.boostedSince}
            </CyDText>
          </CyDView>

          <CyDView className='flex-row items-center mb-4'>
            <CyDMaterialDesignIcons
              name='lightbulb-outline'
              size={16}
              className='text-yellow-500 mr-2'
            />
            <CyDText className='text-n200 text-[12px] flex-1'>
              Brands may offer exclusive bonuses when you boost them — giving
              you even more back for your support.
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Action Buttons */}
        <CyDView className='flex-row gap-3 mb-6'>
          <CyDTouchView
            className='flex-1 bg-n50 rounded-[25px] py-3 items-center'
            onPress={handleKnowMorePress}>
            <CyDText className='text-white text-[14px] font-medium'>
              Know More about {currentMerchantData.name}
            </CyDText>
          </CyDTouchView>
          <CyDTouchView
            className='flex-1 bg-red-600 rounded-[25px] py-3 items-center'
            onPress={handleRemoveBoosterPress}>
            <CyDText className='text-white text-[14px] font-medium'>
              Remove rewards booster
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>

      {/* Recent Transactions */}
      <CyDView className='mb-6 px-[16px]'>
        <CyDText className='text-white text-[16px] font-semibold mb-4'>
          Recent Transaction on this Merchant
        </CyDText>
        <CyDView className='bg-n40 rounded-[12px] overflow-hidden'>
          {currentMerchantData.recentTransactions?.map((transaction, index) => (
            <CyDView
              key={transaction.id}
              className={`p-4 flex-row items-center justify-between ${
                index <
                (currentMerchantData.recentTransactions?.length ?? 0) - 1
                  ? 'border-b border-n20'
                  : ''
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
                  <CyDText className='text-white text-[14px] font-medium'>
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
                    <CyDView className='w-5 h-5 bg-yellow-500 rounded-full mr-1' />
                    <CyDText className='text-white text-[14px] font-semibold'>
                      {transaction.amount}
                    </CyDText>
                  </CyDView>
                ) : (
                  <CyDText className='text-white text-[14px] font-semibold'>
                    {transaction.amount}
                  </CyDText>
                )}
              </CyDView>
            </CyDView>
          ))}
          <CyDTouchView className='p-4 flex-row items-center justify-between'>
            <CyDText className='text-white text-[14px] font-medium'>
              View All
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={20}
              className='text-white'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>

      {/* Previous Reward Cycles */}
      <CyDView className='mb-6 px-[16px]'>
        <CyDText className='text-white text-[16px] font-semibold mb-4'>
          Previous reward cycles earnings
        </CyDText>
        <CyDView className='bg-n40 rounded-[12px] overflow-hidden'>
          {currentMerchantData.rewardCycles?.map((cycle, index) => (
            <CyDView
              key={cycle.id}
              className={`p-4 flex-row items-center justify-between ${
                index < (currentMerchantData.rewardCycles?.length ?? 0) - 1
                  ? 'border-b border-n20'
                  : ''
              }`}>
              <CyDView>
                <CyDText className='text-white text-[14px] font-medium'>
                  {cycle.name}
                </CyDText>
                <CyDText className='text-n200 text-[12px]'>
                  {cycle.period}
                </CyDText>
              </CyDView>
              <CyDView className='flex-row items-center'>
                <CyDView className='w-5 h-5 bg-yellow-500 rounded-full mr-2' />
                <CyDText className='text-white text-[14px] font-semibold'>
                  {cycle.amount}
                </CyDText>
              </CyDView>
            </CyDView>
          ))}
          <CyDTouchView className='p-4 flex-row items-center justify-between'>
            <CyDText className='text-white text-[14px] font-medium'>
              View All
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={20}
              className='text-white'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>

      {/* Referral Transactions */}
      <CyDView className='mb-6 px-[16px]'>
        <CyDText className='text-white text-[16px] font-semibold mb-4'>
          Referral&apos;s Transaction
        </CyDText>
        <CyDView className='bg-n40 rounded-[12px] overflow-hidden'>
          {currentMerchantData.referralTransactions?.map((referral, index) => (
            <CyDView
              key={referral.id}
              className={`p-4 flex-row items-center justify-between ${
                index <
                (currentMerchantData.referralTransactions?.length ?? 0) - 1
                  ? 'border-b border-n20'
                  : ''
              }`}>
              <CyDView className='flex-1'>
                <CyDText className='text-white text-[14px] font-medium'>
                  {referral.hash}
                </CyDText>
                <CyDText className='text-n200 text-[12px]'>
                  {referral.date}
                </CyDText>
              </CyDView>
              <CyDView className='items-end'>
                {referral.status === 'Pending' ? (
                  <CyDView className='bg-yellow-500 rounded-full px-3 py-1'>
                    <CyDText className='text-black text-[12px] font-medium'>
                      {referral.status}
                    </CyDText>
                  </CyDView>
                ) : (
                  <CyDText className='text-white text-[14px]'>
                    {referral.amount} $CYPR
                  </CyDText>
                )}
              </CyDView>
            </CyDView>
          ))}
          <CyDTouchView className='p-4 flex-row items-center justify-between'>
            <CyDText className='text-white text-[14px] font-medium'>
              View All
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={20}
              className='text-white'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>

      {/* Disclaimer */}
      <CyDView className='mb-8 px-[16px]'>
        <CyDText className='text-n200 text-[10px] leading-4'>
          Disclaimer: All third-party trademarks, including logos and brand
          names, are the property of their respective owners. Their inclusion
          within this product is for identification and informational purposes
          only and does not imply any endorsement, sponsorship, or affiliation.
        </CyDText>
      </CyDView>
    </CyDBottomSheet>
  );
};

export default MerchantRewardDetailModal;
