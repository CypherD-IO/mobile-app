import React, { useState, useCallback } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
} from '../../styles/tailwindComponents';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import useAxios from '../../core/HttpRequest';
import { ActivityIndicator } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  NavigationProp,
} from '@react-navigation/native';
import { screenTitle } from '../../constants';
import { capitalize, startCase } from 'lodash';
import { RemoteLogo } from '../../core/util';
import { logAnalyticsToFirebase } from '../../core/analytics';

interface MerchantSpendRewardWidgetProps {
  onViewAllPress?: () => void;
  onMerchantPress?: (merchant: MerchantData) => void;
}

interface MerchantData {
  id: string;
  name: string;
  logo?: string;
  rewardMultiplier: number;
  totalAllocated: number;
  totalSpend: number;
}

interface SpendLeaderboardEntry {
  parentMerchantId?: string;
  candidateId?: string;
  brand?: string;
  canonicalName?: string;
  logoUrl?: string;
  rewardMultiplier?: number;
  tokenAllocation?: number;
  currentEpochSpend?: number;
}

const MerchantSpendRewardWidget: React.FC<MerchantSpendRewardWidgetProps> = ({
  onViewAllPress,
  onMerchantPress,
}) => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;
  const { getWithAuth } = useAxios();
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();

  const [loading, setLoading] = useState<boolean>(true);
  const [merchantData, setMerchantData] = useState<{
    merchants: MerchantData[];
  }>({
    merchants: [],
  });

  /**
   * Fetches top merchants by reward multiplier using spend leaderboard API.
   */
  const fetchTopMerchants = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const resp = await getWithAuth('/v1/testnet-protocol/spend-leaderboard');
      const { isError, data } = resp;

      if (!isError && data) {
        const items: SpendLeaderboardEntry[] =
          (data as SpendLeaderboardEntry[]) ?? [];
        const processedMerchants: MerchantData[] = items
          .slice(0, 6)
          .map(entry => ({
            id: (entry.parentMerchantId ?? entry.candidateId ?? '').toString(),
            name: startCase(
              capitalize(entry.brand ?? entry.canonicalName ?? ''),
            ),
            logo: entry.logoUrl,
            rewardMultiplier: Number(entry.rewardMultiplier ?? 0),
            totalAllocated: Math.round(entry.tokenAllocation ?? 0),
            totalSpend: Math.round(entry.currentEpochSpend ?? 0),
          }));

        setMerchantData(prev => ({
          ...prev,
          merchants: processedMerchants,
        }));
      } else {
        console.warn('Failed to fetch merchant rewards', data?.error);
      }
    } catch (err) {
      console.error('Failed to fetch merchant rewards', err);
    } finally {
      setLoading(false);
    }
  }, []); // stable reference – avoids re-creating on every render

  // Fetch every time the screen gains focus (also runs on first mount)
  useFocusEffect(
    useCallback(() => {
      void fetchTopMerchants();
    }, []),
  );

  const handleMerchantPress = (merchant: MerchantData): void => {
    // Analytics: merchant clicked
    void logAnalyticsToFirebase('merchant_rewards_merchant_click', {
      id: merchant.id,
      name: merchant.name,
      multiplier: merchant.rewardMultiplier,
      totalAllocated: merchant.totalAllocated,
      totalSpend: merchant.totalSpend,
    });
    const redirectURI = 'https://app.cypherhq.io/#/rewards/leaderboard';
    navigation.navigate(screenTitle.OPTIONS);
    setTimeout(() => {
      navigation.navigate(screenTitle.OPTIONS, {
        screen: screenTitle.SOCIAL_MEDIA_SCREEN,
        params: {
          title: 'Rewards Leaderboard',
          uri: redirectURI,
        },
      });
    }, 250);
    onMerchantPress?.(merchant);
  };

  const handleViewAllPress = (): void => {
    // Analytics: view all clicked
    void logAnalyticsToFirebase('merchant_rewards_view_all_click', {
      displayedCount: merchantData.merchants?.length ?? 0,
    });
    const redirectURI = 'https://app.cypherhq.io/#/rewards/leaderboard';
    navigation.navigate(screenTitle.OPTIONS);
    setTimeout(() => {
      navigation.navigate(screenTitle.OPTIONS, {
        screen: screenTitle.SOCIAL_MEDIA_SCREEN,
        params: {
          title: 'Rewards Leaderboard',
          uri: redirectURI,
        },
      });
    }, 250);
    onViewAllPress?.();
  };

  const processMerchantName = (
    name: string,
  ): { displayName: string; fontSize: number } => {
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

  const renderMerchantCard = (
    merchant: MerchantData,
    index: number,
  ): JSX.Element => {
    return (
      <CyDTouchView
        key={merchant.id || index.toString()}
        className='items-center mb-6 w-[100px]'
        onPress={() => handleMerchantPress(merchant)}>
        {/* Merchant Icon with Multiplier Badge */}
        <CyDView className='relative mb-2'>
          <CyDView
            className={`w-16 h-16 bg-white p-1 rounded-full items-center justify-center ${
              isDarkMode ? '' : 'border-[1px] border-n40'
            }`}>
            {/* Merchant logo */}
            {merchant.logo ? (
              typeof merchant.logo === 'string' ? (
                <RemoteLogo
                  uri={merchant.logo}
                  className='w-full h-full rounded-full'
                  resizeMode='cover'
                />
              ) : (
                <CyDImage
                  source={merchant.logo}
                  className='w-full h-full rounded-full'
                  resizeMode='cover'
                />
              )
            ) : (
              <CyDText className='text-[12px] font-bold text-gray-800'>
                {processMerchantName(merchant.name).displayName}
              </CyDText>
            )}
          </CyDView>

          {/* Multiplier Badge */}
          <CyDView
            className={`absolute -top-3 rounded-full px-2 py-1 self-center bg-green400`}>
            <CyDText className='text-white text-[12px] font-bold'>
              {Number(merchant.rewardMultiplier ?? 0).toFixed(1)}X
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Merchant Name */}
        <CyDText
          className={`text-[14px] font-medium`}
          numberOfLines={1}
          ellipsizeMode='tail'>
          {merchant.name}
        </CyDText>
      </CyDTouchView>
    );
  };

  return (
    <CyDView className='mx-4 rounded-[12px] py-4 mt-4 bg-n0 border border-n40'>
      {/* Header Section */}
      <CyDView className='flex-row justify-between items-center mb-4 px-4'>
        <CyDView className='flex-1'>
          <CyDText className='text-[14px] font-medium tracking-[2px]'>
            SPEND REWARDS
          </CyDText>
          <CyDText className='text-n200 text-[10px] font-medium'>
            Earn rewards every time you spend with your Cypher card at the
            merchants below. Your rewards are earned in testnet $CYPR and can be
            claimed in USDC at the end of each 2-week Reward Cycle.
          </CyDText>
        </CyDView>
      </CyDView>

      <CyDView className='w-full h-[1px] bg-n40 mb-4' />

      {/* Additional Rewards Section */}
      <CyDView className='px-4 mb-[20px]'>
        <CyDText className='text-n200 text-[14px] font-medium text-center'>
          Merchant spend rewards
        </CyDText>
      </CyDView>

      {/* Merchants Grid */}
      {!loading ? (
        <CyDView className='px-4'>
          <CyDView className='flex-row justify-center gap-3 mb-4'>
            {merchantData.merchants
              .slice(0, 3)
              .map((merchant, index) => renderMerchantCard(merchant, index))}
          </CyDView>

          <CyDView className='flex-row justify-center gap-3'>
            {merchantData.merchants
              .slice(3, 6)
              .map((merchant, index) =>
                renderMerchantCard(merchant, index + 3),
              )}
          </CyDView>
        </CyDView>
      ) : (
        <CyDView className='items-center justify-center -mt-[14px] mb-[8px]'>
          <ActivityIndicator />
        </CyDView>
      )}

      {/* View All Button */}
      <CyDView className='px-4'>
        <CyDTouchView
          className={`bg-base200 rounded-[25px] py-3 items-center ${
            isDarkMode ? 'bg-base200' : 'bg-n30'
          }`}
          onPress={handleViewAllPress}>
          <CyDText className='text-[16px] font-medium'>
            View all Merchants
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};

export default MerchantSpendRewardWidget;
