import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages, { AppImagesMap } from '../../../assets/images/appImages';
import {
  CyDSafeAreaView,
  CyDView,
  CyDTouchView,
  CyDText,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
} from '../../styles/tailwindComponents';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Video from 'react-native-video';
import GradientText from '../../components/gradientText';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';
import { PieChart } from 'react-native-svg-charts';
import { screenTitle } from '../../constants';
import { useNavigation } from '@react-navigation/native';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import { Theme, useTheme as useAppTheme } from '../../reducers/themeReducer';
import CypherTokenBottomSheetContent from '../../components/v2/cypherTokenBottomSheetContent';
// NOTE: Import for ReferralsViewAll component (ready for navigation integration)
// import ReferralsViewAll from './ReferralsViewAll';

const RewardTrendsContent = () => {
  // Dummy data for the donut chart - will be replaced with API data
  const [timeFilter, setTimeFilter] = React.useState('All time');
  const [totalRewards] = React.useState(100.0);
  const [chartData] = React.useState([
    {
      key: 'bonus',
      value: 50,
      svg: { fill: '#F7C645' },
      arc: { outerRadius: '100%', cornerRadius: 4 },
    }, // Yellow
    {
      key: 'spends',
      value: 30,
      svg: { fill: '#2685CA' },
      arc: { outerRadius: '100%', cornerRadius: 4 },
    }, // Blue
    {
      key: 'merchant',
      value: 15,
      svg: { fill: '#E25C5C' },
      arc: { outerRadius: '100%', cornerRadius: 4 },
    }, // Red
    {
      key: 'referrals',
      value: 5,
      svg: { fill: '#C2C7D0' },
      arc: { outerRadius: '100%', cornerRadius: 4 },
    }, // Gray
  ]);

  // Dummy transaction data
  const [transactionData] = React.useState([
    {
      id: '1',
      date: '12 May 2024',
      transactions: [
        {
          merchant: '7eleven cozumel',
          amount: '$43.23',
          status: 'Pending',
          time: '02:29 PM',
        },
        {
          merchant: 'Amazon india, Mumbai',
          amount: '$117.23',
          status: 'Pending',
          time: '02:29 PM',
        },
        {
          merchant: 'Wallmart, USA',
          amount: '$92.23',
          status: 'Pending',
          time: '02:29 PM',
        },
      ],
    },
    {
      id: '2',
      date: '11 May 2024',
      transactions: [
        {
          merchant: '7eleven cozumel',
          amount: '$43.23',
          status: 'Pending',
          time: '02:29 PM',
          reward: '322.11',
        },
        {
          merchant: 'Amazon india, Mumbai',
          amount: '$117.23',
          status: 'Pending',
          time: '02:29 PM',
          reward: '220.11',
        },
        {
          merchant: 'Uber, Illinois, USA',
          amount: '$92.23',
          status: 'Pending',
          time: '02:29 PM',
        },
      ],
    },
  ]);

  const renderTransactionItem = (transaction: any) => (
    <CyDView
      key={transaction.merchant}
      className='flex-row justify-between items-center py-3 border-b border-n40'>
      <CyDView className='flex-1'>
        <CyDText className='text-white text-[14px] font-medium'>
          {transaction.merchant}
        </CyDText>
        <CyDText className='text-n200 text-[12px]'>
          {transaction.amount} • {transaction.status} • {transaction.time}
        </CyDText>
        {transaction.reward && (
          <CyDText className='text-red300 text-[12px] mt-1'>
            Earned additional reward
          </CyDText>
        )}
      </CyDView>
      <CyDView className='items-end'>
        <CyDView className='flex-row items-center'>
          <CyDView className='w-2 h-2 bg-n200 rounded-full mr-2' />
          <CyDText className='text-n200 text-[12px]'>
            {transaction.status}
          </CyDText>
        </CyDView>
        {transaction.reward && (
          <CyDView className='flex-row items-center mt-1'>
            <CyDImage
              source={AppImages.CYPR_TOKEN}
              className='w-4 h-4 mr-1'
              resizeMode='contain'
            />
            <CyDText className='text-white text-[12px] font-medium'>
              {transaction.reward}
            </CyDText>
          </CyDView>
        )}
      </CyDView>
    </CyDView>
  );

  return (
    <CyDView className='flex-1 bg-n0'>
      <CyDView className='bg-n20 px-4 mb-[12px]'>
        {/* Time Filter */}
        <CyDView className='flex-row justify-between items-center py-4'>
          <CyDView />
          <CyDTouchView className='flex-row items-center rounded-lg px-3 py-2'>
            <CyDText className='text-white text-[14px] mr-2'>
              {timeFilter}
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-down'
              size={16}
              className='text-white'
            />
          </CyDTouchView>
        </CyDView>

        {/* Chart Section */}
        <CyDView className='items-center py-6'>
          <CyDView className='relative items-center justify-center'>
            <PieChart
              style={styles.pieChart}
              data={chartData}
              innerRadius='70%'
              outerRadius='90%'
              padAngle={0.02}
            />
            {/* Center content - positioned absolutely in the exact center */}
            <CyDView
              className='absolute items-center justify-center'
              style={styles.centerContent}>
              <CyDView className='relative'>
                <CyDImage
                  source={AppImages.CYPR_TOKEN}
                  className='w-12 h-12'
                  resizeMode='contain'
                />
                <CyDView className='absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full items-center justify-center'>
                  <CyDImage
                    source={AppImages.BASE_LOGO}
                    className='w-5 h-5'
                    resizeMode='contain'
                  />
                </CyDView>
              </CyDView>
              <CyDText className='text-white text-[24px] font-bold'>
                {totalRewards.toFixed(2)}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Total Rewards Earned Label */}
        <CyDView className='mb-6'>
          <CyDText className='text-n200 text-[14px]'>
            Total Rewards Earned
          </CyDText>
        </CyDView>

        {/* Reward Breakdown */}
        <CyDView className='mb-6'>
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDView className='flex-row items-center'>
              <CyDView className='w-3 h-3 bg-p150 rounded-full mr-3' />
              <CyDText className='text-white text-[14px]'>Bonus</CyDText>
            </CyDView>
            <CyDText className='text-p150 text-[14px] font-medium'>
              100.00 $CYPR
            </CyDText>
          </CyDView>
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDView className='flex-row items-center'>
              <CyDView className='w-3 h-3 bg-blue200 rounded-full mr-3' />
              <CyDText className='text-white text-[14px]'>From spends</CyDText>
            </CyDView>
            <CyDText className='text-p150 text-[14px] font-medium'>
              0.0 $CYPR
            </CyDText>
          </CyDView>
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDView className='flex-row items-center'>
              <CyDView className='w-3 h-3 bg-red300 rounded-full mr-3' />
              <CyDText className='text-white text-[14px]'>
                Merchant Spends
              </CyDText>
            </CyDView>
            <CyDText className='text-red300 text-[14px] font-medium'>
              0.0 $CYPR
            </CyDText>
          </CyDView>
          <CyDView className='flex-row justify-between items-center mb-3'>
            <CyDView className='flex-row items-center'>
              <CyDView className='w-3 h-3 bg-blue200 rounded-full mr-3' />
              <CyDText className='text-white text-[14px]'>
                Referrals Rewards
              </CyDText>
            </CyDView>
            <CyDText className='text-blue200 text-[14px] font-medium'>
              0.0 $CYPR
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>

      {/* Reward Transaction Section */}
      <CyDView className='flex-1'>
        <CyDText className='text-white text-[18px] font-bold mb-4 mx-4'>
          Reward Transaction
        </CyDText>

        {transactionData.map(dayData => (
          <CyDView key={dayData.id} className='mb-6 px-4'>
            <CyDText className='text-n200 text-[12px] font-medium mb-3'>
              {dayData.date}
            </CyDText>
            {dayData.transactions.map(renderTransactionItem)}
          </CyDView>
        ))}
      </CyDView>
    </CyDView>
  );
};

// NOTE: This screen currently renders static / dummy data.\n//       API integrations and real data mapping will be implemented later.\n//       All onPress handlers are placeholders.\n
export default function Rewards() {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  // NOTE: Casting navigation to `any` as we navigate to multiple stacks without strict typing.
  // This prevents TypeScript linter errors while keeping the API unchanged.
  const navigation: any = useNavigation();
  // Dummy state values – these will be replaced by API data in future iterations.
  const [tokenBalance] = React.useState<number>(121.0);
  const [usedBooster] = React.useState<number>(0);
  const [unusedBooster] = React.useState<number>(0);
  const { theme } = useAppTheme();
  const colorScheme = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  console.log('isDarkMode :', isDarkMode);

  /* -------------------------------------------------------------------------- */
  /*                               Progress State                               */
  /* -------------------------------------------------------------------------- */
  // Animated value for reward booster progress (dummy 40% for now)
  const [progressAnimation] = React.useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: 0.4, // 40% complete – replace with real percentage later
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  // NOTE: DUMMY REFERRAL DATA 🍎🍎🍎🍎🍎🍎
  const referralData = [
    {
      id: '1',
      address: '0xACE....1111',
      reward: '112.23',
      status: 'completed',
    },
    {
      id: '2',
      address: '0xACE....beef',
      reward: '112.23',
      status: 'completed',
    },
    {
      id: '3',
      address: '0x2e3a....6d5f',
      reward: null,
      status: 'pending',
    },
  ];

  // NOTE: DUMMY FUNCTIONS 🍎🍎🍎🍎🍎🍎
  const handleKnowMorePress = () => {
    showRewardTrendsBottomSheet();
  };
  const handleDepositTokenPress = () => {
    // TODO: Implement logic / navigation
  };
  const handleBoosterInfoPress = () => {
    // TODO: Implement logic / navigation
  };
  const handleWhatIsCypherTokenPress = () => {
    showBottomSheet({
      id: 'cypher-token-details',
      snapPoints: ['75%', Platform.OS === 'android' ? '100%' : '93%'],
      showCloseButton: true,
      scrollable: true,
      content: <CypherTokenBottomSheetContent />,
      onClose: () => {
        console.log('Cypher token details bottom sheet closed');
      },
      backgroundColor: 'rgba(15, 15, 15, 0.95)',
    });
  };
  const handleViewAllReferralsPress = () => {
    // TODO: Navigate to ReferralsViewAll screen
    // This will be implemented when navigation is properly set up
    navigation.navigate(screenTitle.REFERRALS_VIEW_ALL);
    console.log('Navigate to View All Referrals screen');
  };
  const handleInviteFriendsPress = () => {
    // Navigate to the Referrals page when the user taps "Invite Friends".
    // This allows users to invite friends and track referral rewards.
    navigation.navigate(screenTitle.REFERRALS);
    console.log('Navigate to Referrals screen (Invite Friends)');
  };

  /* -------------------------------------------------------------------------- */
  /*                        Reward Trends Bottom Sheet                         */
  /* -------------------------------------------------------------------------- */
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  const showRewardTrendsBottomSheet = () => {
    showBottomSheet({
      id: 'reward-trends',
      title: 'Reward Trends',
      snapPoints: ['80%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      content: <RewardTrendsContent />,
      onClose: () => {
        console.log('Reward trends bottom sheet closed');
      },
    });
  };

  // NOTE: RENDER METHOD 🍎🍎🍎🍎🍎🍎
  return (
    <CyDSafeAreaView className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-n30'}`}>
      {/* Header */}
      <CyDView
        className={`flex-row justify-between items-center mx-[24px] mt-[8px] ${
          isDarkMode ? 'text-white' : 'bg-n30'
        }`}>
        <CyDText className='text-[28px] font-extrabold text-base400'>
          {t('REWARDS', 'Rewards')}
        </CyDText>
        <CyDTouchView onPress={handleWhatIsCypherTokenPress}>
          <CyDText className='text-blue200 font-medium text-[12px]'>
            {t('WHAT_IS_CYPHER_TOKEN', 'What is Cypher token?')}
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CyDScrollView className='flex-1'>
        {/* Body */}
        <CyDView className='flex-1 bg-n20 pb-[48px]'>
          {/* Token Summary */}
          <CyDView
            className={`items-center pt-[24px] pb-[24px] rounded-b-[16px] ${
              isDarkMode ? 'bg-black' : 'bg-n30'
            }`}>
            <CyDView className='h-[110px] w-[110px]'>
              <Video
                source={{
                  uri: isDarkMode
                    ? AppImagesMap.common.CYPR_TOKEN_REWARD.uri
                    : AppImagesMap.common.CYPR_TOKEN_REWARD_LIGHT.uri,
                }}
                style={styles.rewardTokenVideo}
                resizeMode='cover'
                repeat={true}
                paused={false}
                muted={true}
                controls={false}
                playInBackground={false}
                playWhenInactive={false}
              />
            </CyDView>

            <GradientText
              textElement={
                <CyDText className='text-[44px] font-bold font-newyork'>
                  {tokenBalance.toFixed(2)}
                </CyDText>
              }
              gradientColors={
                isDarkMode ? ['#FFFFFF', '#999999'] : ['#959595', '#000000']
              }
              useAngle
              angle={75}
            />
            <CyDText className='text-[12px] text-base150 tracking-[1px]'>
              $CYPRXBASE
            </CyDText>

            {/* Know more */}
            <CyDTouchView onPress={handleKnowMorePress} className='mt-[32px]'>
              <CyDView
                className={`flex-row items-center rounded-[24px] px-[20px] py-[8px] ${
                  isDarkMode ? 'bg-n30' : 'bg-n50'
                }`}>
                <CyDText className='font-semibold text-[14px] mr-[5px]'>
                  {t('Know more')}
                </CyDText>
                <CyDMaterialDesignIcons
                  name='chevron-down'
                  size={20}
                  className='text-base400'
                />
              </CyDView>
            </CyDTouchView>
          </CyDView>

          <CyDView className='flex-1 bg-n20'>
            <CyDView className='flex flex-row justify-between items-center p-4 rounded-[16px] bg-base400 mx-[16px] mt-[24px] mb-[16px]'>
              <CyDView className='flex flex-col'>
                <CyDView className='flex-row items-center mb-2'>
                  <CyDImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-[22px] h-[22px] mr-1'
                    resizeMode='contain'
                  />
                  <CyDText className='text-n0 text-[20px] font-extrabold'>
                    {tokenBalance.toFixed(2)}
                  </CyDText>
                </CyDView>
                <CyDText className='text-[14px] font-medium text-n0'>
                  {'Rewards available to claim'}
                </CyDText>
              </CyDView>
              <Button
                title={'Claim'}
                onPress={() => {
                  navigation.navigate(screenTitle.CLAIM_REWARD);
                }}
                type={ButtonType.PRIMARY}
                style='rounded-full px-8'
                paddingY={8}
              />
            </CyDView>
            {/* Action Cards */}
            <CyDView className='flex-row justify-between mx-[16px]'>
              {/* Cypher Deposit */}
              <CyDView
                className='flex-1 bg-base40 rounded-[12px] p-[12px] mr-[8px]'
                onPress={handleDepositTokenPress}>
                <CyDView className='flex-row justify-between items-center mb-4'>
                  <CyDView className='flex-row items-center'>
                    <CyDText className='font-bold text-[18px] mr-[2px]'>
                      Cypher
                    </CyDText>
                    <CyDText className='font-medium text-[18px] text-n200'>
                      Deposit
                    </CyDText>
                  </CyDView>
                </CyDView>

                <CyDImage
                  source={AppImages.CYPR_TOKEN_STACK}
                  resizeMode='contain'
                  className='h-[58px] w-[89px]'
                />
                <CyDView className='flex flex-row items-center justify-between'>
                  <CyDText className='text-[14px] mr-[6px]'>{'💡'}</CyDText>
                  <CyDText className='text-[12px] text-n200 font-medium flex-1'>
                    {t('Deposit cypher token to get reward booster')}
                  </CyDText>
                </CyDView>

                <CyDTouchView
                  onPress={handleDepositTokenPress}
                  className={`bg-base150 mt-[20px] py-[8px] rounded-full items-center ${
                    isDarkMode ? 'bg-base200' : 'bg-n50'
                  }`}>
                  <CyDText className='text-base100 text-[14px] '>
                    {'View More'}
                  </CyDText>
                </CyDTouchView>
              </CyDView>

              {/* Reward Booster */}
              <CyDView className='flex-1 bg-base40 rounded-[12px] p-[12px] ml-[8px]'>
                <CyDView className='flex-row items-center'>
                  <CyDText className='font-bold text-[18px] mr-[2px]'>
                    Reward
                  </CyDText>
                  <CyDText className='font-medium text-[18px] text-n200'>
                    Booster
                  </CyDText>
                </CyDView>

                <CyDView className='flex-row items-center mt-[12px]'>
                  <CyDMaterialDesignIcons
                    name='lightning-bolt'
                    size={24}
                    className='text-p150'
                  />
                  <CyDText className='text-[24px] font-extrabold ml-[4px]'>
                    0
                  </CyDText>
                  <CyDText className='text-[12px] text-n200 ml-[4px] mt-[6px]'>
                    veCypher
                  </CyDText>
                </CyDView>

                {/* Progress Bar */}
                <CyDView className='w-full h-[24px] bg-n40 rounded-[1px] overflow-hidden mt-[16px]'>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </CyDView>

                {/* Used / Unused */}
                <CyDView className='flex-row justify-between mt-[8px]'>
                  <CyDView className='flex-row items-center'>
                    <CyDView className='h-[6px] w-[6px] bg-p150 rounded-full mr-[4px]' />
                    <CyDText className='text-[12px]'>Used</CyDText>
                  </CyDView>
                  <CyDText className='text-[12px]'>{usedBooster}</CyDText>
                </CyDView>

                <CyDView className='flex-row justify-between mt-[4px]'>
                  <CyDView className='flex-row items-center'>
                    <CyDView className='h-[6px] w-[6px] bg-green200 rounded-full mr-[4px]' />
                    <CyDText className='text-[12px]'>Un-used</CyDText>
                  </CyDView>
                  <CyDText className='text-[12px]'>{unusedBooster}</CyDText>
                </CyDView>

                <CyDTouchView
                  onPress={handleBoosterInfoPress}
                  className='mt-[12px]'>
                  <CyDText className='text-blue200 underline text-[12px]'>
                    {t('WHAT_IS_BOOSTER', 'what is booster?')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            </CyDView>

            {/* Referrals Section */}
            <CyDView className='mx-[16px] mt-[16px]'>
              <CyDText className='text-[16px] font-medium mb-[8px]'>
                {'Referrals'}
              </CyDText>

              <CyDView className='mb-[40px]'>
                {/* Referrals List */}
                <CyDView className='bg-base40 rounded-[12px]'>
                  {referralData.map((referral, index) => (
                    <CyDView
                      key={referral.id}
                      className={`flex-row justify-between items-center py-[12px] px-[16px] ${
                        index < referralData.length - 1
                          ? 'border-b border-n40'
                          : ''
                      }`}>
                      <CyDText className='text-[14px] font-medium flex-1'>
                        {referral.address}
                      </CyDText>
                      <CyDView className='flex-row items-center'>
                        {referral.status === 'completed' ? (
                          <CyDText className='text-blue200 text-[14px] font-medium mr-[8px]'>
                            {referral.reward} CYPR
                          </CyDText>
                        ) : (
                          <CyDView className='bg-n60 rounded-[16px] px-[12px] py-[4px] mr-[8px]'>
                            <CyDText className='text-n200 text-[12px]'>
                              Pending
                            </CyDText>
                          </CyDView>
                        )}
                        <CyDMaterialDesignIcons
                          name='chevron-right'
                          size={16}
                          className='text-n200'
                        />
                      </CyDView>
                    </CyDView>
                  ))}

                  {/* View All Button */}
                  <CyDTouchView
                    className={`flex-row justify-between items-center py-[16px] mt-[8px] rounded-b-[12px] px-[16px] ${
                      isDarkMode ? 'bg-base200' : 'bg-n40'
                    }`}
                    onPress={handleViewAllReferralsPress}>
                    <CyDText className='text-[16px] font-medium'>
                      View All
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='chevron-right'
                      size={20}
                      className='text-base400'
                    />
                  </CyDTouchView>
                </CyDView>

                {/* Action Buttons */}
                <CyDView className='flex-row mt-[16px] gap-x-[12px]'>
                  <CyDTouchView
                    className={`flex-1 rounded-[24px] py-[8px] flex-row items-center justify-center ${
                      isDarkMode ? 'bg-base200' : 'bg-n40'
                    }`}
                    onPress={handleInviteFriendsPress}>
                    <CyDMaterialDesignIcons
                      name='account-group'
                      size={24}
                      className='text-base400 mr-[8px]'
                    />
                    <CyDText className='text-base100 text-[14px] font-medium'>
                      Invite Friends
                    </CyDText>
                  </CyDTouchView>

                  <CyDTouchView
                    className={`flex-1 rounded-[24px] py-[8px] items-center justify-center ${
                      isDarkMode ? 'bg-base200' : 'bg-n40'
                    }`}
                    onPress={() => {
                      // TODO: Implement learn how referral works functionality
                    }}>
                    <CyDText className='text-[14px] font-medium'>
                      Learn how referral works
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F7C645', // golden yellow progress color
  },
  pieChart: {
    height: 200,
    width: 200,
  },
  centerContent: {
    top: 85, // Half of pie chart height (200/2)
    left: 85, // Half of pie chart width (200/2)
    transform: [{ translateX: -24 }, { translateY: -24 }], // Offset by half the content size to center perfectly
  },
  rewardTokenVideo: {
    width: '100%',
    height: '100%',
  },
});
