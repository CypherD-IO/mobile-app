import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDSafeAreaView,
  CyDView,
  CyDTouchView,
  CyDText,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDImage,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';

// NOTE: Interface for referral data structure
interface ReferralItem {
  id: string;
  address: string;
  reward?: string;
  status: 'completed' | 'pending';
}

interface ReferralGroup {
  month: string;
  referrals: ReferralItem[];
}

// NOTE: DUMMY REFERRAL DATA GROUPED BY MONTHS 🍎🍎🍎🍎🍎🍎
const allReferralsData: ReferralGroup[] = [
  {
    month: 'May 2025',
    referrals: [
      {
        id: '1',
        address: '0xACE....1111',
        status: 'pending',
      },
      {
        id: '2',
        address: '0xACE....1111',
        status: 'pending',
      },
      {
        id: '3',
        address: '0xBFA....2233',
        reward: '150.75',
        status: 'completed',
      },
      {
        id: '4',
        address: '0x3D4....4cba',
        status: 'pending',
      },
      {
        id: '5',
        address: '0x1C1....8f90',
        reward: '200.00',
        status: 'completed',
      },
    ],
  },
  {
    month: 'Feb 2025',
    referrals: [
      {
        id: '6',
        address: '0xACE....1111',
        reward: '112.23',
        status: 'completed',
      },
      {
        id: '7',
        address: '0x4e....2efa',
        status: 'pending',
      },
      {
        id: '8',
        address: '0xBFA....2233',
        reward: '150.75',
        status: 'completed',
      },
      {
        id: '9',
        address: '0xACE....1111',
        reward: '112.23',
        status: 'completed',
      },
      {
        id: '10',
        address: '0x4e....2efa',
        status: 'pending',
      },
      {
        id: '11',
        address: '0xBFA....2233',
        reward: '150.75',
        status: 'completed',
      },
    ],
  },
];

// NOTE: DUMMY DETAILED REFERRAL DATA 🍎🍎🍎🍎🍎🍎
interface DetailedReferralData {
  address: string;
  totalRewards: number;
  daysLeft: number;
  vestingDate: string;
  signupRewards: {
    cardSignup: {
      completed: boolean;
      reward: number;
    };
  };
  merchantBonus: {
    description: string;
    merchants: Array<{
      id: string;
      name: string;
      description: string;
      rewardRange: string;
      icon: any;
    }>;
  };
}

const getDetailedReferralData = (referralId: string): DetailedReferralData => {
  // NOTE: Dummy data - will be replaced with API call
  return {
    address: '0xACE....1111',
    totalRewards: 100.0,
    daysLeft: 14,
    vestingDate: 'Jun 24, 2025',
    signupRewards: {
      cardSignup: {
        completed: true,
        reward: 50.0,
      },
    },
    merchantBonus: {
      description:
        'Earn rewards when your friend uses their Cypher card at businesses where you activated for extra rewards.',
      merchants: [
        {
          id: '1',
          name: 'Walmart inc',
          description: 'Rewards on Referral spending on Walmart',
          rewardRange: '104 $CYPR - 2201 $CYPR',
          icon: AppImages.SHOP_3D,
        },
        {
          id: '2',
          name: 'Safeway',
          description: 'Rewards on Referral spending on Safeway',
          rewardRange: '200',
          icon: AppImages.SHOP_3D,
        },
      ],
    },
  };
};

// NOTE: REFERRAL DETAIL BOTTOM SHEET CONTENT 🍎🍎🍎🍎🍎🍎
const ReferralDetailContent = ({ referralId }: { referralId: string }) => {
  const { t } = useTranslation();
  const detailData = getDetailedReferralData(referralId);

  return (
    <CyDScrollView className='flex-1 px-4 bg-n0'>
      <CyDText className='text-white text-[20px] font-bold mb-4'>
        {detailData.address}
      </CyDText>
      {/* Header Section */}
      <CyDView className='flex flex-row items-center justify-between py-6'>
        <CyDView>
          <CyDView className='flex-row items-center'>
            <CyDImage
              source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
              className='w-[34px] h-[34px] mr-1'
              resizeMode='contain'
            />
            <CyDText className='text-white text-[22px] font-medium'>
              {detailData.totalRewards.toFixed(2)}
            </CyDText>
          </CyDView>
          <CyDText className='text-n200 text-[12px]'>
            Total rewards earned
          </CyDText>
        </CyDView>

        <CyDView className='flex flex-col items-end bg-base40 rounded-[6px] px-4 py-2'>
          <CyDText className='text-white text-[12px] font-medium'>
            {detailData.daysLeft} days Left
          </CyDText>
          <CyDText className='text-n200 text-[12px]'>
            Vesting on {detailData.vestingDate}
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Signup Rewards Section */}
      <CyDView className='mb-6'>
        <CyDText className='text-white text-[18px] font-bold mb-4'>
          Signup Rewards
        </CyDText>

        <CyDView className='bg-base40 rounded-[12px] p-4 mb-4'>
          <CyDView className='mb-3'>
            <CyDView className='flex-row items-center mb-4'>
              <CyDView className='w-6 h-6 bg-p150 rounded-full items-center justify-center mr-3'>
                <CyDMaterialDesignIcons
                  name='check'
                  size={16}
                  className='text-white'
                />
              </CyDView>
              <CyDText className='text-white text-[16px] font-medium flex-1'>
                Signed up for the cypher Card
              </CyDText>
            </CyDView>

            {/* Reward Earned Card */}
            <CyDView className='bg-green-600 rounded-[12px] p-4'>
              <CyDView className='flex-row items-center'>
                <CyDText className='text-[28px] mr-2'>🎉</CyDText>
                <CyDView className='mt-1'>
                  <CyDText className='text-white text-[16px] font-medium flex-1'>
                    Hurray! You have earned
                  </CyDText>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-8 h-8 mr-2'
                      resizeMode='contain'
                    />
                    <CyDText className='text-white text-[20px] font-bold'>
                      {detailData.signupRewards.cardSignup.reward.toFixed(2)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>

          {/* <CyDView className='flex-row items-center mb-3'>
            <CyDMaterialDesignIcons
              name='check-circle'
              size={16}
              className='text-green-500 mr-2'
            />
            <CyDText className='text-green-500 text-[14px]'>Completed</CyDText>
          </CyDView> */}
        </CyDView>
      </CyDView>

      {/* Merchant Bonus Section */}
      <CyDText className='text-white text-[18px] font-bold mb-4'>
        Merchant Bonus
      </CyDText>
      <CyDView className='mb-6 bg-base40 rounded-[12px] p-4'>
        <CyDView className='flex-col mb-4'>
          <CyDImage
            source={AppImages.SHOP_3D}
            className='w-12 h-12'
            resizeMode='contain'
          />
          <CyDText className='text-white text-[14px]'>
            {detailData.merchantBonus.description}
          </CyDText>
        </CyDView>

        {/* Merchant List */}
        {detailData.merchantBonus.merchants.map(merchant => (
          <CyDView key={merchant.id} className='bg-n40 rounded-[12px] p-4 mb-4'>
            <CyDView className='flex-row items-center mb-3'>
              <CyDImage
                source={merchant.icon}
                className='w-8 h-8 mr-3'
                resizeMode='contain'
              />
              <CyDText className='text-white text-[16px] font-medium'>
                {merchant.name}
              </CyDText>
            </CyDView>

            <CyDText className='text-n200 text-[14px] mb-3'>
              {merchant.description}
            </CyDText>

            <CyDView className='flex-row items-center'>
              <CyDText className='text-n200 text-[14px] mr-2'>
                Any referral spend at {merchant.name.split(' ')[0]}, gets you
              </CyDText>
            </CyDView>

            <CyDView className='flex-row items-center mt-2'>
              {merchant.id === '2' ? (
                <>
                  <CyDText className='text-n200 text-[14px] mr-2'>
                    Earn up to
                  </CyDText>
                  <CyDView className='flex-row items-center'>
                    <CyDImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-6 h-6 mr-1'
                      resizeMode='contain'
                    />
                    <CyDText className='text-white text-[16px] font-medium'>
                      {merchant.rewardRange}
                    </CyDText>
                  </CyDView>
                </>
              ) : (
                <CyDText className='text-white text-[14px] font-medium'>
                  {merchant.rewardRange}
                </CyDText>
              )}
            </CyDView>
          </CyDView>
        ))}
      </CyDView>

      {/* Bottom padding for scrolling */}
      <CyDView className='h-[40px]' />
    </CyDScrollView>
  );
};

interface ReferralsViewAllProps {
  // NOTE: Navigation prop will be added when integrated with navigation
  navigation?: any;
}

export default function ReferralsViewAll({
  navigation,
}: ReferralsViewAllProps) {
  const { t } = useTranslation();
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  // NOTE: DUMMY FUNCTIONS 🍎🍎🍎🍎🍎🍎
  const handleBackPress = () => {
    if (navigation) {
      navigation.goBack();
    }
    // TODO: Implement navigation back logic
  };

  const showReferralDetailBottomSheet = (referralId: string) => {
    showBottomSheet({
      id: 'referral-detail',
      title: '', // No title needed as content has its own header
      snapPoints: ['90%', '95%'],
      showCloseButton: true,
      scrollable: true,
      content: <ReferralDetailContent referralId={referralId} />,
      onClose: () => {
        console.log('Referral detail bottom sheet closed');
      },
    });
  };

  const handleReferralItemPress = (referralId: string) => {
    // Show detailed referral information in bottom sheet
    showReferralDetailBottomSheet(referralId);
    console.log('Referral item pressed:', referralId);
  };

  // NOTE: RENDER REFERRAL ITEM COMPONENT 🍎🍎🍎🍎🍎🍎
  const renderReferralItem = (referral: ReferralItem, isLast: boolean) => (
    <CyDTouchView
      key={referral.id}
      className={`flex-row justify-between items-center py-[16px] px-[20px] ${
        !isLast ? 'border-b border-n40' : ''
      }`}
      onPress={() => handleReferralItemPress(referral.id)}>
      <CyDText className='text-white text-[16px] font-medium flex-1'>
        {referral.address}
      </CyDText>
      <CyDView className='flex-row items-center'>
        {referral.status === 'completed' ? (
          <CyDText className='text-blue200 text-[16px] font-medium mr-[8px]'>
            {referral.reward} $CYPR
          </CyDText>
        ) : (
          <CyDText className='text-n200 text-[16px] mr-[8px]'>Pending</CyDText>
        )}
        <CyDMaterialDesignIcons
          name='chevron-right'
          size={20}
          className='text-n200'
        />
      </CyDView>
    </CyDTouchView>
  );

  // NOTE: RENDER METHOD 🍎🍎🍎🍎🍎🍎
  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      {/* Header */}
      <CyDView className='flex-row items-center px-[20px] py-[16px] bg-n0'>
        <CyDTouchView onPress={handleBackPress} className='mr-[16px] p-[4px]'>
          <CyDMaterialDesignIcons
            name='chevron-left'
            size={28}
            className='text-white'
          />
        </CyDTouchView>
        <CyDText className='text-white text-[20px] font-bold'>
          {t('REFERRALS', 'Referrals')}
        </CyDText>
      </CyDView>

      {/* Scrollable Content */}
      <CyDScrollView className='flex-1 bg-n0'>
        {allReferralsData.map((group, groupIndex) => (
          <CyDView key={group.month} className='mb-[32px]'>
            {/* Month Header */}
            <CyDView className='px-[20px] py-[12px]'>
              <CyDText className='text-n200 text-[14px] font-medium'>
                {group.month}
              </CyDText>
            </CyDView>

            {/* Referral Items for this month */}
            <CyDView className='bg-n20'>
              {group.referrals.map((referral, index) =>
                renderReferralItem(
                  referral,
                  index === group.referrals.length - 1,
                ),
              )}
            </CyDView>
          </CyDView>
        ))}

        {/* Bottom spacing for better scrolling experience */}
        <CyDView className='h-[40px]' />
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
