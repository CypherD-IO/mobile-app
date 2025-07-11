import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import {
  CyDSafeAreaView,
  CyDView,
  CyDText,
  CyDTouchView,
  CyDTextInput,
  CyDMaterialDesignIcons,
  CyDIcons,
  CyDImage,
} from '../../../styles/tailwindComponents';
import { ActivityIndicator, FlatList, Platform } from 'react-native';
import useAxios from '../../../core/HttpRequest';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import MerchantRewardDetailContent from '../../../components/v2/MerchantRewardDetailContent';
import Fuse from 'fuse.js';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

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
  hasActiveBribes: boolean;
  metrics: {
    averageTransactionSize: number;
    totalSpend: number;
    transactionCount: number;
    uniqueSpenders: number;
  };
}

const MerchantRewardListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { showBottomSheet } = useGlobalBottomSheet();
  const { getWithAuth } = useAxios();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const LIMIT = 20;
  const offsetRef = useRef<string | undefined>(undefined);
  const inFlightRef = useRef<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchText, setSearchText] = useState<string>('');

  const [state, setState] = useState<{
    merchants: MerchantData[];
    isLoading: boolean;
    isLoadingMore: boolean;
    isSearchingMore: boolean;
    hasMore: boolean;
  }>({
    merchants: [],
    isLoading: true,
    isLoadingMore: false,
    isSearchingMore: false,
    hasMore: false,
  });

  const [selectedMerchant, setSelectedMerchant] = useState<MerchantData | null>(
    null,
  );

  const fetchMerchants = async (showLoading = true) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (showLoading) {
      setState(prev => ({
        ...prev,
        ...(offsetRef.current ? { isLoadingMore: true } : { isLoading: true }),
      }));
    }

    try {
      const params: any = {
        limit: LIMIT,
        sortBy: 'multiplier',
        ...(offsetRef.current ? { offset: offsetRef.current } : {}),
      };

      const resp = await getWithAuth('/v1/cypher-protocol/merchants', params);
      console.log('resp : : : : ', resp);
      inFlightRef.current = false;

      if (!resp.isError) {
        const { items = [], nextOffset } = resp.data ?? {};
        setState(prev => ({
          ...prev,
          merchants: offsetRef.current ? [...prev.merchants, ...items] : items,
          isLoading: false,
          isLoadingMore: false,
          isSearchingMore: false,
          hasMore: Boolean(nextOffset),
        }));
        offsetRef.current = nextOffset;
      } else {
        console.warn('Failed to fetch merchants', resp?.error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          isSearchingMore: false,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch merchants', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        isSearchingMore: false,
      }));
    }
  };

  useEffect(() => {
    void fetchMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search helpers
  const searchInBatch = (batch: MerchantData[], term: string) => {
    if (!term.trim()) return batch;
    const localFuse = new Fuse(batch, {
      keys: ['brand', 'category'],
      threshold: 0.3,
      includeScore: true,
    });
    return localFuse.search(term).map(r => r.item);
  };

  const [filteredMerchants, setFilteredMerchants] = useState<MerchantData[]>(
    [],
  );

  const progressiveSearch = async (term: string) => {
    let currentResults = searchInBatch(state.merchants, term);
    setFilteredMerchants(currentResults);

    if (!term.trim()) {
      setState(prev => ({ ...prev, isSearchingMore: false }));
      return;
    }

    if (currentResults.length > 0 || !state.hasMore) {
      setState(prev => ({ ...prev, isSearchingMore: false }));
      return;
    }

    setState(prev => ({ ...prev, isSearchingMore: true }));

    while (offsetRef.current) {
      await fetchMerchants(false);
      currentResults = searchInBatch(state.merchants, term);
      setFilteredMerchants(currentResults);
      if (currentResults.length > 0 || !offsetRef.current) break;
    }

    setState(prev => ({ ...prev, isSearchingMore: false }));
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchText.trim()) {
      setFilteredMerchants(state.merchants);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      void progressiveSearch(searchText);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, state.merchants]);

  useEffect(() => {
    if (!searchText.trim()) setFilteredMerchants(state.merchants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.merchants]);

  /**
   * Handles navigation back to previous screen
   */
  const handleBack = () => {
    navigation.goBack();
  };

  /**
   * Handles merchant selection and shows detail bottom sheet
   * Displays comprehensive merchant information and reward details
   */
  const handleMerchantPress = (merchant: MerchantData) => {
    console.log('Merchant selected:', merchant);

    setSelectedMerchant(merchant);

    showBottomSheet({
      id: 'merchant-reward-detail',
      backgroundColor: isDarkMode ? '#595959' : '#FFFFFF',
      snapPoints: ['70%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      content: (
        <MerchantRewardDetailContent
          merchantData={merchant}
          onKnowMorePress={() => {
            console.log('Know more pressed for:', merchant.brand);
          }}
          onRemoveBoosterPress={() => {
            console.log('Remove booster pressed for:', merchant.brand);
          }}
        />
      ),
      onClose: () => {
        console.log('Merchant detail bottom sheet closed');
        setSelectedMerchant(null);
      },
    });
  };

  /**
   * Handles filter functionality (placeholder for future implementation)
   */
  const handleFilterPress = () => {
    console.log('Filter functionality - to be implemented');
    // TODO: Implement filter modal/bottom sheet
  };

  /**
   * Processes merchant name for display in the circle
   * - If name has multiple words, takes first word only
   * - If name is longer than 8 characters, truncates to 8
   * - Returns processed name and appropriate font size
   */
  const processMerchantName = (name: string) => {
    const firstWord = name.split(' ')[0];
    const displayName =
      firstWord.length > 8 ? firstWord.substring(0, 8) : firstWord;

    // Calculate font size based on name length
    let fontSize = 16;
    if (displayName.length >= 8) {
      fontSize = 12;
    } else if (displayName.length > 5) {
      fontSize = 14;
    }

    return { displayName, fontSize };
  };

  return (
    <CyDSafeAreaView
      className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      {/* Header */}
      <CyDView
        className={`flex-row justify-between items-center px-4 pt-4 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <CyDTouchView onPress={handleBack} className='p-2'>
          <CyDIcons
            name='arrow-left'
            size={24}
            className={isDarkMode ? 'text-white' : 'text-black'}
          />
        </CyDTouchView>
        {/* <CyDText
          className={`text-[20px] font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Merchant Rewards
        </CyDText> */}
        <CyDView className='w-10' />
      </CyDView>

      {/* Search Bar */}
      <CyDView className='px-4 py-3'>
        <CyDView
          className={`flex-row items-center rounded-[12px] px-3 py-2 bg-base40`}>
          <CyDMaterialDesignIcons
            name='magnify'
            size={20}
            className={`mr-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          />
          <CyDTextInput
            className={`flex-1 text-[16px] !bg-base40 ${isDarkMode ? 'text-white' : 'text-black'}`}
            value={searchText}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={setSearchText}
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            placeholder='Search Merchants'
          />
          {/* Filters Button */}
          <CyDTouchView
            className={`flex-row items-center ml-3 px-3 py-2 rounded-[8px] bg-base40`}
            onPress={handleFilterPress}>
            <CyDMaterialDesignIcons
              name='filter-variant'
              size={16}
              className={`mr-1 ${isDarkMode ? 'text-white' : 'text-black'}`}
            />
            <CyDText
              className={`text-[12px] font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Filters
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-down'
              size={16}
              className={`ml-1 ${isDarkMode ? 'text-white' : 'text-black'}`}
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>

      {/* Merchant List */}
      <CyDView className='flex-1'>
        {state.isLoading && !state.merchants.length ? (
          <CyDView className='flex-1 items-center justify-center p-4'>
            <ActivityIndicator
              size='large'
              color={isDarkMode ? '#ffffff' : '#000000'}
            />
          </CyDView>
        ) : (
          <FlatList
            data={filteredMerchants}
            renderItem={({ item }) => (
              <CyDTouchView
                className={`flex-row items-center justify-between py-4 px-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}
                onPress={() => handleMerchantPress(item)}>
                <CyDView className='flex-row items-center flex-1'>
                  {/* Merchant Icon */}
                  <CyDView className='w-12 h-12 bg-white rounded-full items-center justify-center mr-3 border border-gray-200'>
                    {item.logoUrl ? (
                      <CyDImage
                        source={{ uri: item.logoUrl }}
                        className='w-10 h-10 rounded-full'
                        resizeMode='contain'
                      />
                    ) : (
                      <CyDText
                        className='font-bold text-gray-800'
                        style={{
                          fontSize: processMerchantName(item.brand).fontSize,
                        }}>
                        {processMerchantName(item.brand).displayName}
                      </CyDText>
                    )}
                  </CyDView>

                  {/* Merchant Info */}
                  <CyDView className='flex-1'>
                    <CyDText
                      className={`text-[18px] font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      {item.brand ?? ''}
                    </CyDText>
                    <CyDText
                      className={`text-[14px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.category ?? ''}
                    </CyDText>
                  </CyDView>
                </CyDView>

                {/* Reward Multiplier */}
                <CyDView className='flex flex-row items-center'>
                  <CyDView className='bg-green400 rounded-full px-3 py-1 mr-2'>
                    <CyDText className='text-white text-[12px] font-bold'>
                      {item.historicalMultiplier.current.toFixed(1)}X Rewards
                    </CyDText>
                  </CyDView>
                  <CyDMaterialDesignIcons
                    name='chevron-right'
                    size={20}
                    className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                  />
                </CyDView>
              </CyDTouchView>
            )}
            keyExtractor={item => item.candidateId}
            onEndReached={() => {
              if (
                state.hasMore &&
                !state.isLoadingMore &&
                !state.isSearchingMore
              ) {
                void fetchMerchants();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              state.isLoadingMore || state.isSearchingMore ? (
                <CyDView className='items-center py-4'>
                  <ActivityIndicator
                    size='small'
                    color={isDarkMode ? '#ffffff' : '#000000'}
                  />
                </CyDView>
              ) : null
            }
            ListEmptyComponent={
              filteredMerchants.length === 0 &&
              !state.isLoading &&
              !state.isSearchingMore ? (
                <CyDView className='flex-1 items-center justify-center p-4'>
                  <CyDMaterialDesignIcons
                    name='store-outline'
                    size={48}
                    className={`mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  />
                  <CyDText
                    className={`text-center text-[16px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No merchants found
                  </CyDText>
                  <CyDText
                    className={`text-center text-[12px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Try adjusting your search terms
                  </CyDText>
                </CyDView>
              ) : null
            }
          />
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
};

export default MerchantRewardListScreen;
