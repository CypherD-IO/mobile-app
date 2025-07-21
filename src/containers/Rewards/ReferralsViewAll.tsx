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
import { Platform, useColorScheme } from 'react-native';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { getMaskedAddress } from '../../core/util';
import { ReferralOnboardingStatus } from '../../constants/enum';
import ReferralDetailContent from '../../components/v2/ReferralDetailContent';

// Interfaces based on new referral summary response

interface Referee {
  address: string;
  totalRewardsEarned: number;
  onboardingStatus: string;
  signupDate?: number;
  epoch: number;
}

interface EpochGroup {
  epoch: number;
  epochStartTime: number;
  epochEndTime: number;
  referees: Referee[];
}

// Props expect navigation route param refereesByEpoch
interface ReferralsViewAllRouteParams {
  refereesByEpoch: Record<
    string,
    {
      epochStartTime: number;
      epochEndTime: number;
      referees: any[];
    }
  >;
  votedMerchants?: Array<
    import('../../components/v2/ReferralDetailContent').VotedMerchant
  >;
}

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

// const getDetailedReferralData = (referralId: string): DetailedReferralData => {
//   // NOTE: Dummy data - will be replaced with API call
//   return {
//     address: '0xACE....1111',
//     totalRewards: 100.0,
//     daysLeft: 14,
//     vestingDate: 'Jun 24, 2025',
//     signupRewards: {
//       cardSignup: {
//         completed: true,
//         reward: 50.0,
//       },
//     },
//     merchantBonus: {
//       description:
//         'Earn rewards when your friend uses their Cypher card at businesses where you activated for extra rewards.',
//       merchants: [
//         {
//           id: '1',
//           name: 'Walmart inc',
//           description: 'Rewards on Referral spending on Walmart',
//           rewardRange: '104 $CYPR - 2201 $CYPR',
//           icon: AppImages.SHOP_3D,
//         },
//         {
//           id: '2',
//           name: 'Safeway',
//           description: 'Rewards on Referral spending on Safeway',
//           rewardRange: '200',
//           icon: AppImages.SHOP_3D,
//         },
//       ],
//     },
//   };
// };

// NOTE: REFERRAL DETAIL BOTTOM SHEET CONTENT 🍎🍎🍎🍎🍎🍎

interface ReferralsViewAllProps {
  // NOTE: Navigation prop will be added when integrated with navigation
  navigation?: any;
}

export default function ReferralsViewAll({
  navigation,
  route,
}: ReferralsViewAllProps & {
  route?: { params?: ReferralsViewAllRouteParams };
}) {
  const { t } = useTranslation();
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Helper to shorten address
  const handleBackPress = () => {
    if (navigation) {
      navigation.goBack();
    }
    // TODO: Implement navigation back logic
  };

  const votedMerchants = route?.params?.votedMerchants ?? [];

  /* ------------------------- Bottom Sheet --------------------------- */

  const showReferralDetailBottomSheet = (ref: Referee) => {
    showBottomSheet({
      id: `referral-detail-${ref.address}-${performance.now()}`,
      title: '',
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

  const epochGroups: EpochGroup[] = React.useMemo(() => {
    const map = route?.params?.refereesByEpoch ?? {};
    const groups: EpochGroup[] = [];
    Object.entries(map).forEach(([epochKey, epochData]: [string, any]) => {
      const epochNum = Number(epochKey);
      const referees: Referee[] = (epochData.referees ?? []).map(
        (ref: any) => ({
          address: ref.address,
          totalRewardsEarned: ref.totalRewardsEarned ?? 0,
          onboardingStatus: ref.onboardingStatus ?? 'PENDING',
          signupDate: ref.signupDate,
          epoch: epochNum,
        }),
      );
      groups.push({
        epoch: epochNum,
        epochStartTime: epochData.epochStartTime,
        epochEndTime: epochData.epochEndTime,
        referees,
      });
    });

    // Sort descending by epoch
    groups.sort((a, b) => b.epoch - a.epoch);
    return groups;
  }, [route?.params]);

  // Helper – formats epoch start/end (seconds) to "Apr 24 to May 7 2025"
  const formatEpochRange = (startSec: number, endSec: number): string => {
    const startDate = new Date(startSec * 1000);
    const endDate = new Date(endSec * 1000);

    const startMonth = startDate.toLocaleString('default', { month: 'short' });
    const endMonth = endDate.toLocaleString('default', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const endYear = endDate.getFullYear();
    const startYear = startDate.getFullYear();

    // If years are same -> "Apr 1 to Apr 14 2025" else "Apr 24 2024 to May 7 2025"
    if (startYear === endYear) {
      return `${startMonth} ${startDay} to ${endMonth} ${endDay} ${startYear}`;
    }

    return `${startMonth} ${startDay} ${startYear} to ${endMonth} ${endDay} ${endYear}`;
  };

  /* ------------------------- Handlers --------------------------- */

  const handleReferralItemPress = (ref: Referee) => {
    showReferralDetailBottomSheet(ref);
  };

  /* -------------------------------------------------------------------------- */
  /*                                Renderers                                   */
  /* -------------------------------------------------------------------------- */

  const renderReferralItem = (ref: Referee, isLast: boolean) => {
    console.log('R E F E R R A L  I T E M :', ref);
    return (
      <CyDTouchView
        key={`${ref.address}-${ref.epoch}`}
        className={`flex-row justify-between items-center py-[16px] px-[20px] ${
          !isLast ? 'border-b border-n40' : ''
        }`}
        onPress={() => handleReferralItemPress(ref)}>
        <CyDText className='text-[16px] font-medium flex-1'>
          {getMaskedAddress(ref.address, 6)}
        </CyDText>
        <CyDView className='flex-row items-center'>
          {ref.totalRewardsEarned > 0 ? (
            <CyDText className='text-blue200 text-[16px] font-medium mr-[8px]'>
              {ref.totalRewardsEarned} $CYPR
            </CyDText>
          ) : (
            <CyDText className='text-n200 text-[16px] mr-[8px]'>
              Pending
            </CyDText>
          )}
          <CyDMaterialDesignIcons
            name='chevron-right'
            size={20}
            className='text-n200'
          />
        </CyDView>
      </CyDTouchView>
    );
  };

  // NOTE: RENDER METHOD 🍎🍎🍎🍎🍎🍎
  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      {/* Header */}
      <CyDView className='flex-row items-center px-[20px] py-[16px] bg-n0'>
        <CyDTouchView onPress={handleBackPress} className='mr-[16px] p-[4px]'>
          <CyDMaterialDesignIcons
            name='chevron-left'
            size={28}
            className='text-base400'
          />
        </CyDTouchView>
        <CyDText className='text-[20px] font-bold'>
          {t('REFERRALS', 'Referrals')}
        </CyDText>
      </CyDView>

      {/* Scrollable Content */}
      <CyDScrollView className='flex-1 bg-n0'>
        {epochGroups.map((group, groupIndex) => (
          <CyDView key={group.epoch} className='mb-[8px]'>
            {/* Month Header */}
            <CyDView className='flex flex-row justify-between px-[20px] py-[12px]'>
              <CyDText className='text-[14px] font-medium'>
                Reward Cycle {group.epoch}
              </CyDText>
              <CyDText className='text-n200 text-[12px]'>
                {formatEpochRange(group.epochStartTime, group.epochEndTime)}
              </CyDText>
            </CyDView>

            {/* Referral Items for this month */}
            <CyDView className='bg-n20'>
              {group.referees.map((referral, index) =>
                renderReferralItem(
                  referral,
                  index === group.referees.length - 1,
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
