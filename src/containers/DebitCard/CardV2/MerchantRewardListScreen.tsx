import React, { useEffect, useRef, useState } from 'react';
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
import AppImages from '../../../../assets/images/appImages';
import { MerchantLogo } from '../../../components/v2/MerchantLogo';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import useAxios from '../../../core/HttpRequest';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import MerchantRewardDetailContent from '../../../components/v2/MerchantRewardDetailContent';
import Fuse from 'fuse.js';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

/**
 * Interface for merchant data returned by the legacy /merchants endpoint.
 * This is kept as-is so existing UI and bottom sheet behaviour continue working
 * for all sort options other than Reward Multiplier.
 */
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
  userVoteData: {
    hasVoted: boolean;
  };
  metrics: {
    averageTransactionSize: number;
    totalSpend: number;
    transactionCount: number;
    uniqueSpenders: number;
  };
  projectedCYPRReward?: string;
}

/**
 * Interface for merchant reward data returned from
 * /v1/cypher-protocol/merchants/rewards endpoint.
 */
interface MerchantRewardData {
  parentMerchantId: string;
  candidateId: string;
  canonicalName: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  logoUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  isCandidate: boolean;
  votesGained: string;
  emissionGained: string;
  votePercentage: number;
  uniqueVoters: number;
  currentSpend: number;
  currentTransactionCount: number;
  projectedCYPRReward: string;
}

interface PaginatedMerchantRewardsResponse {
  items?: MerchantRewardData[];
  referenceAmount?: number;
  hasMore?: boolean;
  nextOffset?: string;
}

const MerchantRewardListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { showBottomSheet } = useGlobalBottomSheet();
  const { getWithAuth } = useAxios();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const LIMIT = 150;
  const offsetRef = useRef<string | undefined>(undefined);
  const inFlightRef = useRef<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchText, setSearchText] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [selectedSort, setSelectedSort] = useState<{
    label: string;
    value: string;
  }>({ label: 'Reward Multiplier', value: 'multiplier' });

  const sortOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Total Votes', value: 'votes' },
    { label: 'Total Spend', value: 'spending' },
    { label: 'Total Voters', value: 'voters' },
    { label: '$CYPR Rewards', value: 'multiplier' },
    { label: 'Incentives', value: 'bribes' },
  ];

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

  /**
   * Reward reference amount returned by /merchants/rewards.
   * This represents the spend amount corresponding to the projected CYPR
   * reward value shown in the list (e.g. "for every 10$ Spend").
   */
  const [rewardReferenceAmount, setRewardReferenceAmount] = useState<
    number | null
  >(null);

  const fetchMerchants = async (showLoading = true): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (showLoading) {
      setState(prev => ({
        ...prev,
        ...(offsetRef.current ? { isLoadingMore: true } : { isLoading: true }),
      }));
    }

    try {
      const params: Record<string, unknown> = {
        limit: LIMIT,
        sortBy: selectedSort.value,
        ...(offsetRef.current ? { offset: offsetRef.current } : {}),
      };

      const resp = await getWithAuth(
        '/v1/cypher-protocol/merchants/rewards',
        params,
      );
      inFlightRef.current = false;

      if (!resp.isError && resp.data) {
        const {
          items: rewardItems = [],
          referenceAmount,
          nextOffset,
        } = (resp.data ?? {}) as PaginatedMerchantRewardsResponse;

        // Map reward API response into the richer MerchantData shape used
        // throughout the screen and in the detail bottom sheet.
        const mappedMerchants: MerchantData[] = rewardItems.map(item => ({
          groupId: item.parentMerchantId,
          candidateId: item.candidateId,
          brand: item.brand ?? item.canonicalName,
          canonicalName: item.canonicalName,
          category: item.category ?? '',
          subcategory: item.subcategory ?? '',
          logoUrl: item.logoUrl,
          historicalMultiplier: {
            current: 0,
            max: 0,
          },
          votePercentage: item.votePercentage,
          voteRank: 0,
          isActive: item.isActive,
          isVerified: item.isVerified,
          hasActiveBribes: false,
          userVoteData: {
            hasVoted: false,
          },
          metrics: {
            averageTransactionSize: 0,
            totalSpend: item.currentSpend,
            transactionCount: item.currentTransactionCount,
            uniqueSpenders: item.uniqueVoters,
          },
          projectedCYPRReward: item.projectedCYPRReward,
        }));

        setState(prev => ({
          ...prev,
          merchants: offsetRef.current
            ? [...prev.merchants, ...mappedMerchants]
            : mappedMerchants,
          isLoading: false,
          isLoadingMore: false,
          isSearchingMore: false,
          hasMore: Boolean(nextOffset),
        }));
        offsetRef.current = nextOffset;

        setRewardReferenceAmount(
          typeof referenceAmount === 'number' ? referenceAmount : null,
        );
      } else {
        console.warn(
          '[MerchantRewardListScreen] Failed to fetch merchant rewards',
          resp?.error,
        );
        setState(prev => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          isSearchingMore: false,
        }));
        setRewardReferenceAmount(null);
      }
    } catch (err) {
      console.error(
        '[MerchantRewardListScreen] Error fetching merchant rewards',
        err,
      );
      inFlightRef.current = false;
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        isSearchingMore: false,
      }));
      setRewardReferenceAmount(null);
    }
  };

  useEffect(() => {
    void fetchMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Effect to refetch merchants when sort option changes
   * Resets pagination and fetches fresh data with new sort order
   */
  useEffect(() => {
    // Skip initial mount (already fetched in first useEffect)
    if (state.merchants.length > 0) {
      offsetRef.current = undefined;
      setState(prev => ({ ...prev, merchants: [], hasMore: false }));
      void fetchMerchants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSort.value]);

  // Search helpers
  const searchInBatch = (batch: MerchantData[], term: string) => {
    if (!term.trim()) return batch;
    const localFuse = new Fuse(batch, {
      keys: ['brand', 'canonicalName', 'category'],
      threshold: 0.3,
      includeScore: true,
    });
    return localFuse.search(term).map(r => r.item);
  };

  const [filteredMerchants, setFilteredMerchants] = useState<MerchantData[]>(
    [],
  );

  /**
   * Debounced search effect.
   *
   * Behaviour:
   * 1. Immediately searches within the currently loaded merchants and updates the UI.
   * 2. If there are no local matches but additional pages are available, flips `isSearchingMore`
   *    to true to trigger background pagination.
   * 3. When search text is cleared, it resets to showing all loaded merchants.
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const term = searchText.trim();

    // When there is no active search term, always show the full loaded list
    if (!term) {
      setFilteredMerchants(state.merchants);
      setState(prev => ({
        ...prev,
        isSearchingMore: false,
      }));
      return;
    }

    // Use a relatively small debounce value to keep the search feeling responsive,
    // while still avoiding excessive re-computation and network calls.
    searchTimeoutRef.current = setTimeout(() => {
      const localResults = searchInBatch(state.merchants, term);
      setFilteredMerchants(localResults);

      const needsMoreData =
        localResults.length === 0 && state.hasMore && !state.isLoading;

      setState(prev => ({
        ...prev,
        // When we have no matches locally and more pages are available, we mark
        // that we are "searching more" so another effect can progressively
        // fetch additional pages in the background.
        isSearchingMore: needsMoreData,
      }));
    }, 10);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, state.merchants]);

  /**
   * Progressive, paginated search effect.
   *
   * Once the debounced search determines that there are zero matches in the
   * already loaded merchants *and* more pages are available, this effect will:
   * - Fetch the next page of merchants in the background.
   * - Allow the debounced search effect (above) to re-run when `state.merchants`
   *   updates, which will then:
   *     - Either find matches and turn `isSearchingMore` off, or
   *     - Find no matches and, if more pages remain, keep `isSearchingMore` on.
   *
   * This continues until a match is found or all pages have been exhausted.
   */
  useEffect(() => {
    const term = searchText.trim();

    if (!term) {
      return;
    }

    if (!state.isSearchingMore || !state.hasMore) {
      return;
    }

    // Avoid overlapping background fetches; we rely on `inFlightRef` which is
    // already used by `fetchMerchants` to guard concurrent requests.
    if (inFlightRef.current) {
      return;
    }

    void fetchMerchants(false);
  }, [state.isSearchingMore, state.hasMore, searchText]);

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
    setSelectedMerchant(merchant);

    showBottomSheet({
      id: 'merchant-reward-detail',
      topBarColor: isDarkMode ? '#595959' : '#FFFFFF',
      backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
      snapPoints: ['70%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      content: (
        <MerchantRewardDetailContent
          merchantData={merchant}
          navigation={navigation}
        />
      ),
      onClose: () => {
        setSelectedMerchant(null);
      },
    });
  };

  /**
   * Handles filter button press to toggle dropdown visibility
   */
  const handleFilterPress = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  /**
   * Handles sort option selection from dropdown
   * Updates selected sort option and closes dropdown
   */
  const handleSortSelect = (option: { label: string; value: string }) => {
    setSelectedSort(option);
    setShowFilterDropdown(false);
  };

  /**
   * Style for search bar container with elevated z-index
   */
  const searchBarContainerStyle = {
    zIndex: 999,
  };

  /**
   * Style for filter button container with elevated z-index
   */
  const filterButtonContainerStyle = {
    zIndex: 1000,
  };

  /**
   * Shadow style for dropdown menu
   * Uses high elevation and zIndex to ensure dropdown appears above other content
   */
  const dropdownShadowStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 1000,
    zIndex: 1000,
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (showFilterDropdown) {
          setShowFilterDropdown(false);
        }
      }}>
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
        <CyDView className='px-4 py-3' style={searchBarContainerStyle}>
          <CyDView className='flex-row items-center'>
            <CyDView
              className={`flex-1 flex-row items-center rounded-[12px] px-3 py-2 bg-base40`}>
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
                placeholder='Search Merchants or Categories'
              />
            </CyDView>

            {/* Filter Button */}
            <CyDView className='relative' style={filterButtonContainerStyle}>
              <CyDTouchView
                className={`ml-3 p-3 rounded-[12px] ${showFilterDropdown ? 'bg-orange500' : 'bg-base40'}`}
                onPress={handleFilterPress}>
                <CyDMaterialDesignIcons
                  name='filter-variant'
                  size={20}
                  className={
                    showFilterDropdown
                      ? 'text-white'
                      : isDarkMode
                        ? 'text-gray-400'
                        : 'text-gray-600'
                  }
                />
              </CyDTouchView>

              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <CyDView
                  className={`absolute top-[50px] right-0 w-[200px] rounded-[12px] shadow-lg ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}
                  style={dropdownShadowStyle}>
                  {sortOptions.map((option, index) => (
                    <CyDTouchView
                      key={option.value}
                      className={`flex-row items-center justify-between px-4 py-3 ${
                        index !== sortOptions.length - 1
                          ? isDarkMode
                            ? 'border-b border-gray-700'
                            : 'border-b border-gray-200'
                          : ''
                      }`}
                      onPress={() => handleSortSelect(option)}>
                      <CyDText
                        className={`text-[14px] ${
                          selectedSort.value === option.value
                            ? 'text-orange500 font-semibold'
                            : isDarkMode
                              ? 'text-white'
                              : 'text-black'
                        }`}>
                        {option.label}
                      </CyDText>
                      {selectedSort.value === option.value && (
                        <CyDView
                          className={`w-5 h-5 rounded-full items-center justify-center bg-orange500`}>
                          <CyDView className='w-2 h-2 rounded-full bg-white' />
                        </CyDView>
                      )}
                    </CyDTouchView>
                  ))}
                </CyDView>
              )}
            </CyDView>
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
              renderItem={({ item }) => {
                const projectedReward =
                  item.projectedCYPRReward != null
                    ? Number.parseFloat(
                        item.projectedCYPRReward as unknown as string,
                      ).toFixed(2)
                    : null;

                return (
                  <CyDTouchView
                    className={`flex-row items-center justify-between py-4 px-4 border-b ${
                      isDarkMode ? 'border-gray-800' : 'border-gray-200'
                    }`}
                    onPress={() => handleMerchantPress(item)}>
                    <CyDView className='flex-row items-center flex-1'>
                      {/* Merchant Icon */}
                      <CyDView className='relative mr-3'>
                        <MerchantLogo
                          merchant={{
                            brand: item.brand ?? item.canonicalName,
                            canonicalName: item.canonicalName,
                            logoUrl: item.logoUrl,
                          }}
                          size={48}
                          hasUserVoted={item.userVoteData?.hasVoted}
                          showBorder={!isDarkMode}
                        />
                      </CyDView>

                      {/* Merchant Info */}
                      <CyDView className='flex-1'>
                        <CyDText
                          className={`text-[18px] font-semibold ${
                            isDarkMode ? 'text-white' : 'text-black'
                          }`}>
                          {item.brand ?? item.canonicalName}
                        </CyDText>
                        <CyDText
                          className={`text-[14px] ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          {item.category ?? ''}
                        </CyDText>
                      </CyDView>
                    </CyDView>

                    {/* Right-side reward section – always show projected CYPR reward */}
                    <CyDView className='items-end ml-3'>
                      <CyDView className='flex-row items-center'>
                        <CyDImage
                          source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                          className='w-[24px] h-[24px] mr-1'
                          resizeMode='contain'
                        />
                        <CyDText
                          className={`text-[18px] font-semibold ${
                            isDarkMode ? 'text-white' : 'text-black'
                          }`}>
                          {projectedReward ?? '--'}
                        </CyDText>
                      </CyDView>
                      <CyDText
                        className={`text-[12px] mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        for every {rewardReferenceAmount ?? '-'}$ Spend
                      </CyDText>
                    </CyDView>
                    <CyDMaterialDesignIcons
                      name='chevron-right'
                      size={20}
                      className={`ml-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    />
                  </CyDTouchView>
                );
              }}
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
    </TouchableWithoutFeedback>
  );
};

export default MerchantRewardListScreen;
