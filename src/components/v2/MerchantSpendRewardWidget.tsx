import React, { useState, useCallback, useEffect } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
} from '../../styles/tailwindComponents';
// Removed AppImages import since merchant icons will be fetched from API
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import useAxios from '../../core/HttpRequest';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import GradientText from '../gradientText';

interface MerchantSpendRewardWidgetProps {
  onViewAllPress?: () => void;
  onMerchantPress?: (merchant: any) => void;
  isPremium?: boolean; // Indicates if user has Pro plan
}

interface MerchantData {
  groupId: string;
  candidateId: string;
  brand: string;
  canonicalName: string;
  category: string;
  subcategory: string;
  logoUrl?: string;
  historicalMultiplier: {
    current: number;
    max: number;
  };
  votePercentage: number;
  voteRank: number;
  isActive: boolean;
  isVerified: boolean;
}

const MerchantSpendRewardWidget: React.FC<MerchantSpendRewardWidgetProps> = ({
  onViewAllPress,
  onMerchantPress,
  isPremium,
}) => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  // isPremium = true; // Remove this test line
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;
  const { getWithAuth, getWithoutAuth } = useAxios();

  const [loading, setLoading] = useState<boolean>(true);
  const [merchantData, setMerchantData] = useState<{
    merchants: MerchantData[];
  }>({
    merchants: [],
  });

  // Base reward string (e.g., "1X Rewards" or "2X Rewards")
  const [epochData, setEpochData] = useState<any>(null);

  /**
   * Fetches top merchants by reward multiplier.
   * NOTE: Replace the endpoint below with the actual backend endpoint once finalised.
   */
  const fetchTopMerchants = useCallback(async () => {
    try {
      setLoading(true);
      console.log('~~~ fetching top merchants and epoch details');
      // Adjust the endpoint & params as per backend specification
      const resp = await getWithAuth(
        '/v1/cypher-protocol/merchants?sortBy=multiplier&limit=6',
      );

      console.log('~~~ resp merchants', resp);
      console.log('~~~ resp merchants list : ', resp.data.items);

      const { isError, data } = resp;

      if (!isError && data) {
        // Expected response shape (update if backend differs):
        // {
        //   baseReward: string;
        //   baseRewardDescription: string;
        //   merchants: MerchantData[];
        // }

        const processedMerchants: MerchantData[] = (data?.items ?? []).slice(
          0,
          6,
        );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable reference – avoids re-creating on every render

  // Fetch epoch details once (and if premium flag changes)
  useEffect(() => {
    const fetchEpoch = async () => {
      try {
        const epochResp = await getWithoutAuth('/v1/cypher-protocol/epoch');
        console.log(
          '~~~ epochResp : ',
          epochResp.data.parameters.tierMultipliers,
        );
        setEpochData(epochResp.data);
      } catch (err) {
        console.warn('Failed to fetch epoch details', err);
      }
    };

    void fetchEpoch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  // Fetch every time the screen gains focus (also runs on first mount)
  useFocusEffect(
    useCallback(() => {
      void fetchTopMerchants();
    }, [fetchTopMerchants]),
  );

  const handleMerchantPress = (merchant: MerchantData) => {
    console.log('Merchant pressed:', merchant);
    onMerchantPress?.(merchant);
  };

  const handleViewAllPress = () => {
    console.log('View all merchant bonus pressed');
    onViewAllPress?.();
  };

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

  const renderMerchantCard = (merchant: MerchantData, index: number) => (
    <CyDTouchView
      // key={merchant.candidateId + index.toString()}
      key={merchant.candidateId}
      className='items-center mb-6 w-[100px]'
      onPress={() => handleMerchantPress(merchant)}>
      {/* Merchant Icon with Multiplier Badge */}
      <CyDView className='relative mb-2'>
        <CyDView
          className={`w-16 h-16 bg-white rounded-full items-center justify-center border border-n40`}>
          {/* Merchant logo */}
          {merchant.logoUrl ? (
            <CyDImage
              source={
                typeof merchant.logoUrl === 'string'
                  ? { uri: merchant.logoUrl }
                  : merchant.logoUrl
              }
              className='w-full h-full'
              resizeMode='cover'
            />
          ) : (
            <CyDText className='text-[12px] font-bold text-gray-800'>
              {processMerchantName(merchant.brand).displayName}
            </CyDText>
          )}
        </CyDView>

        {/* Multiplier Badge */}
        <CyDView className='absolute -top-3 bg-green400 rounded-full px-2 py-1 self-center'>
          <CyDText className='text-white text-[12px] font-bold'>
            {merchant.historicalMultiplier.current.toFixed(1)}X
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Merchant Name */}
      <CyDText
        className={`text-[14px] font-medium`}
        numberOfLines={1}
        ellipsizeMode='tail'>
        {merchant.brand}
      </CyDText>
    </CyDTouchView>
  );

  return (
    <CyDView
      className={`mx-4 rounded-[12px] py-4 ${
        isDarkMode ? 'bg-base40' : 'bg-n0 border border-n40'
      }`}>
      {/* Header Section */}
      <CyDView className='flex-row justify-between items-center  mb-4 px-4'>
        <CyDView className='flex-1'>
          {isPremium && (
            <GradientText
              textElement={
                <CyDText className='text-[14px] font-extrabold'>
                  Premium
                </CyDText>
              }
              gradientColors={[
                '#FA9703',
                '#ECD821',
                '#F7510A',
                '#ECD821',
                '#F48F0F',
                '#F7510A',
                '#F89408',
              ]}
            />
          )}
          <CyDText className='text-n200 text-[14px]'>REWARDS</CyDText>
          <CyDText className='text-n200 text-[12px] font-medium'>
            On all Transaction
          </CyDText>
        </CyDView>

        {isPremium ? (
          <>
            {/* Premium gradient multiplier */}
            <GradientText
              textElement={
                <CyDText className='text-[20px] font-bold'>
                  {epochData?.parameters?.tierMultipliers?.pro_plan_v1}X Rewards
                </CyDText>
              }
              gradientColors={[
                '#F89408',
                '#FA9703',
                '#ECD821',
                '#FA9703',
                '#F6510A',
              ]}
            />
            <CyDText className='text-[14px] line-through text-n200'>
              {epochData?.parameters?.tierMultipliers?.basic_plan_v1}X Rewards
            </CyDText>
          </>
        ) : (
          <CyDText className='text-[20px]'>
            {epochData?.parameters?.tierMultipliers?.basic_plan_v1}X Rewards
          </CyDText>
        )}
      </CyDView>

      <CyDView className='w-full h-[1px] bg-n40 mb-4' />

      {/* Additional Rewards Section */}
      <CyDView className='px-4 mb-[20px]'>
        <CyDText className='text-n200 text-[14px] font-medium text-center'>
          Additional rewards on merchants
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
            View all Merchant bonus
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};

export default MerchantSpendRewardWidget;
