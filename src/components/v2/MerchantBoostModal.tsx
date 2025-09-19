import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CyDModalLayout from './modal';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDFastImage,
  CyDTextInput,
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDFlatList,
  CyDKeyboardAwareScrollView,
} from '../../styles/tailwindComponents';
import useAxios from '../../core/HttpRequest';
import clsx from 'clsx';

import { capitalize, endsWith, floor } from 'lodash';
import Button from './button';
import InfiniteScrollFooterLoader from './InfiniteScrollFooterLoader';
import { SvgUri } from 'react-native-svg';

// --- Types and Interfaces ---
export interface GetMerchantsQuery {
  limit?: number;
  offset?: string;
  search?: string;
}
export interface MerchantListItem {
  groupId: string;
  candidateId: string;
  canonicalName: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  logoUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  isCandidate: boolean;
  currentEpochVotes: string;
  votePercentage: number;
  uniqueVoters: number;
  epochNumber: number;
  hasActiveBribes: boolean;
  totalBribes?: string;
}
export interface PaginatedMerchantsResponse {
  items: MerchantListItem[];
  total?: number;
  hasMore: boolean;
  nextOffset?: string;
}
export interface MerchantWithAllocation extends MerchantListItem {
  allocation: number;
}
interface MerchantBoostModalProps {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  onConfirm: (merchants: MerchantWithAllocation[]) => void;
  initialSelectedMerchants?: MerchantWithAllocation[];
}

const DEFAULT_LIMIT = 20;

const MerchantBoostModal: React.FC<MerchantBoostModalProps> = ({
  isVisible,
  setIsVisible,
  onConfirm,
  initialSelectedMerchants = [],
}) => {
  // --- State ---
  const { getWithAuth } = useAxios();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [merchants, setMerchants] = useState<MerchantWithAllocation[]>([]);
  const [selected, setSelected] = useState<MerchantWithAllocation[]>(
    initialSelectedMerchants,
  );
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [view, setView] = useState<'selected' | 'add'>('selected');
  const [error, setError] = useState<string | null>(null);

  // Infinite scroll state
  const merchantRetrievalOffset = useRef<string | undefined>();
  const [isEndReached, setIsEndReached] = useState(false);
  const fetchDebounced = useRef<ReturnType<typeof setTimeout>>();

  // Animation state
  const [isFullHeight, setIsFullHeight] = useState(false);
  const heightAnim = useRef(new Animated.Value(80)).current;

  // --- Update selected merchants when initialSelectedMerchants changes ---
  useEffect(() => {
    setSelected(initialSelectedMerchants);
  }, [initialSelectedMerchants]);

  // --- Debounce search input ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // --- Calculate total allocation ---
  const totalAllocation = selected.reduce(
    (sum, m) => sum + (m.allocation ?? 0),
    0,
  );
  const remainingPower = floor(100 - totalAllocation, 0);

  // --- Clear error when modal becomes visible ---
  useEffect(() => {
    if (isVisible) {
      setError(null);
    }
  }, [isVisible]);

  // --- Clear error when modal becomes visible ---
  useEffect(() => {
    if (isVisible) {
      setError(null);
    }
  }, [isVisible]);

  // --- Fetch merchants from API (infinite scroll) ---
  const fetchMerchants = useCallback(
    async (reset = false) => {
      if (loading || (isEndReached && !reset)) return; // Prevent multiple simultaneous requests

      setLoading(true);
      setError(null);
      try {
        const params: GetMerchantsQuery = {
          limit: DEFAULT_LIMIT,
          offset: reset ? undefined : merchantRetrievalOffset.current,
          search: debouncedSearch || undefined,
        };

        const res = await getWithAuth(`/v1/cypher-protocol/merchants`, params);
        if (res.isError)
          throw new Error(res.error || 'Failed to fetch merchants');
        const data: PaginatedMerchantsResponse = res.data;

        if (reset) {
          // Reset mode: replace all merchants
          setMerchants(data.items.map(m => ({ ...m, allocation: 0 })));
          merchantRetrievalOffset.current = data.nextOffset;
          setIsEndReached(!data.hasMore);
        } else {
          // Pagination mode: append new merchants, prevent duplicates
          setMerchants(prev => {
            const existingIds = new Set(prev.map(m => m.candidateId));
            const newMerchants = data.items
              .filter(m => !existingIds.has(m.candidateId))
              .map(m => ({ ...m, allocation: 0 }));
            return [...prev, ...newMerchants];
          });

          // Update offset and end reached state
          if (merchantRetrievalOffset.current !== data.nextOffset) {
            merchantRetrievalOffset.current = data.nextOffset;
          } else {
            setIsEndReached(true);
          }
        }
      } catch (e: any) {
        const errorMessage =
          e.message || 'Failed to fetch merchants. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, getWithAuth, loading, isEndReached],
  );

  // --- Reset search and fetch when search changes ---
  useEffect(() => {
    if (isVisible && view === 'add') {
      // Reset pagination when search changes
      merchantRetrievalOffset.current = undefined;
      setIsEndReached(false);
      setMerchants([]); // Clear existing merchants
      void fetchMerchants(true);
    }
  }, [isVisible, view, debouncedSearch]);

  // --- Handle end reached for infinite scroll ---
  const handleEndReached = useCallback(() => {
    if (fetchDebounced.current) {
      clearTimeout(fetchDebounced.current);
    }

    fetchDebounced.current = setTimeout(() => {
      if (!isEndReached && !loading) {
        void fetchMerchants(false);
      }
    }, 100);
  }, [isEndReached, loading, fetchMerchants]);

  // --- Handle merchant selection (multi-select) ---
  const handleSelect = (merchant: MerchantWithAllocation) => {
    if (selected.find(m => m.candidateId === merchant.candidateId)) {
      setSelected(selected.filter(m => m.candidateId !== merchant.candidateId));
    } else {
      setSelected([
        ...selected,
        {
          ...merchant,
          allocation:
            typeof merchant.allocation === 'number' ? merchant.allocation : 0,
        },
      ]);
    }
  };

  // --- Handle chip selection ---
  const handleChipSelect = (candidateId: string, percentage: number) => {
    const otherMerchantsTotal = selected.reduce(
      (sum, m) =>
        m.candidateId === candidateId ? sum : sum + (m.allocation ?? 0),
      0,
    );
    const maxPossibleValue = 100 - otherMerchantsTotal;
    const adjustedValue = Math.min(percentage, maxPossibleValue);

    setSelected(prev =>
      prev.map(m =>
        m.candidateId === candidateId ? { ...m, allocation: adjustedValue } : m,
      ),
    );
  };

  // --- Handle custom input ---
  const handleCustomInput = (candidateId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const otherMerchantsTotal = selected.reduce(
      (sum, m) =>
        m.candidateId === candidateId ? sum : sum + (m.allocation ?? 0),
      0,
    );
    const maxPossibleValue = 100 - otherMerchantsTotal;
    const adjustedValue = Math.min(numValue, maxPossibleValue);

    setSelected(prev =>
      prev.map(m =>
        m.candidateId === candidateId ? { ...m, allocation: adjustedValue } : m,
      ),
    );
  };

  // --- Confirm selection ---
  const handleConfirm = () => {
    setConfirming(true);
    setError(null);
    const total = selected.reduce((sum, m) => sum + (m.allocation ?? 0), 0);
    if (total !== 100) {
      setError(
        'Total allocation must be exactly 100%. Please adjust your selections.',
      );
      setConfirming(false);
      return;
    }
    onConfirm(selected);
    setIsVisible(false);
    setConfirming(false);
  };

  // --- Animation functions ---
  const animateToFullHeight = () => {
    if (!isFullHeight) {
      setIsFullHeight(true);
      Animated.timing(heightAnim, {
        toValue: 95,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleModalClose = () => {
    setIsFullHeight(false);
    heightAnim.setValue(80);
    setView('selected');
    setError(null);
    setIsVisible(false);
  };

  const handleScroll = (event: any) => {
    if (event.nativeEvent.contentOffset.y > 0) {
      animateToFullHeight();
    }
  };

  // Reset height when modal visibility changes
  useEffect(() => {
    if (!isVisible) {
      setIsFullHeight(false);
      heightAnim.setValue(80);
    }
  }, [isVisible]);

  // --- Render error message ---
  const renderErrorMessage = () => {
    if (!error) return null;

    return (
      <CyDView className='bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4'>
        <CyDText className='text-red-400 text-sm text-center'>{error}</CyDText>
      </CyDView>
    );
  };

  // --- Render selected merchants (with percentage editing) ---
  const renderSelectedMerchant = (item: MerchantWithAllocation) => (
    <CyDView
      key={item.candidateId}
      className='!bg-[#202020] rounded-[12px] mb-[16px]'>
      {/* Top section: Merchant info */}
      <CyDView className='flex-row items-center justify-between px-[16px] pt-[16px]'>
        <CyDView className='flex-row items-center flex-1'>
          {item.logoUrl ? (
            renderImage(item.logoUrl)
          ) : (
            <CyDView className='w-[24px] h-[24px] rounded-full bg-blue20' />
          )}
          <CyDText className='text-lg font-bold text-white'>
            {capitalize(item.canonicalName)}
          </CyDText>
        </CyDView>
        <CyDTouchView onPress={() => handleSelect(item)}>
          <CyDIcons name='delete' size={28} color='#A6AEBB' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='h-[1px] !bg-[#444444] w-full my-[16px]' />

      {/* Bottom section: Reward Booster */}
      <CyDView className='px-[16px] pb-[20px]'>
        <CyDView className='flex-row items-center justify-between'>
          <CyDText className='!text-[#F4F4F4] font-medium !text-[14px]'>
            Reward Booster
          </CyDText>
          <CyDView className='flex-row items-center'>
            <CyDView className='!bg-[#000000] rounded-[4px] px-[12px] py-[8px] flex-row items-center'>
              <CyDTextInput
                className='!text-[#FFFFFF] !text-[16px] font-semibold !bg-[#000000] p-0'
                placeholder='00'
                placeholderTextColor='#888888'
                keyboardType='numeric'
                value={item.allocation === 0 ? '' : item.allocation.toString()}
                onChangeText={value =>
                  handleCustomInput(item.candidateId, value)
                }
              />
              <CyDText className='!text-[#FFFFFF] !text-[16px] font-semibold'>
                %
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Chips */}
        <CyDView className='mt-[12px]'>
          <CyDView className='flex-row justify-evenly gap-[6px]'>
            {[10, 25, 50, 75, 100].map(percentage => (
              <CyDTouchView
                key={percentage}
                className={clsx('px-[12px] py-[6px] rounded-[4px] flex-1', {
                  '!bg-[#303030] border !border-[#666666]':
                    item.allocation === percentage,
                  '!border-[#444444] border !bg-[#444444]':
                    item.allocation !== percentage,
                })}
                onPress={() => handleChipSelect(item.candidateId, percentage)}>
                <CyDText
                  className={clsx(
                    '!text-[13px] font-medium text-center !text-[#FFFFFF]',
                  )}>
                  {percentage}%
                </CyDText>
              </CyDTouchView>
            ))}
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );

  const renderImage = (logoUrl: string) => {
    const isSvg = endsWith(logoUrl, '.svg');
    return isSvg ? (
      <CyDView className='w-[32px] h-[32px] rounded-full bg-white overflow-hidden items-center justify-center mr-4'>
        <SvgUri uri={logoUrl ?? ''} width={24} height={24} />
      </CyDView>
    ) : (
      <CyDView className='w-[32px] h-[32px] rounded-full bg-white overflow-hidden items-center justify-center mr-4'>
        <CyDFastImage
          source={{ uri: logoUrl ?? '' }}
          className='w-[24px] h-[24px]'
        />
      </CyDView>
    );
  };

  // --- Render merchant row in add merchant view ---
  const renderMerchant = ({ item }: { item: MerchantWithAllocation }) => {
    const isSelected = !!selected.find(m => m.candidateId === item.candidateId);
    return (
      <CyDTouchView
        className={clsx(
          'bg-transparent p-4 flex-row items-center border-b-[1px] border-[#202020]',
        )}
        style={styles.minHeight80}
        onPress={() => handleSelect(item)}>
        {item.logoUrl ? (
          renderImage(item.logoUrl)
        ) : (
          <CyDView className='w-[32px] h-[32px] rounded-full bg-n40 mr-2' />
        )}
        <CyDText className='!text-[20px] font-bold flex-1 text-white'>
          {item.brand ?? item.canonicalName}
        </CyDText>
        <CyDText className='text-p50'>{isSelected ? '◉' : '○'}</CyDText>
      </CyDTouchView>
    );
  };

  // --- Main render ---
  return (
    <CyDModalLayout
      setModalVisible={handleModalClose}
      isModalVisible={isVisible}
      style={styles.modalLayout}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          handleModalClose();
        }
      }}
      swipeDirection={['down']}
      propagateSwipe={true}
      disableBackDropPress={false}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View
          style={[
            styles.animatedContainer,
            isFullHeight
              ? styles.animatedContainerFull
              : styles.animatedContainerCompact,
            {
              height: heightAnim.interpolate({
                inputRange: [80, 95],
                outputRange: ['80%', '100%'],
              }),
            },
          ]}
          className='bg-black px-[24px]'>
          {/* Content */}
          {view === 'selected' ? (
            <>
              <CyDView className='w-[32px] h-[4px] !bg-[#d9d9d9] self-center mt-[16px]' />
              <CyDView className='flex-row items-center justify-between'>
                <CyDView />
                <CyDText className='text-xl font-bold text-white'>
                  Select Merchant
                </CyDText>
                <CyDTouchView onPress={handleModalClose}>
                  <CyDIcons name='close' size={24} color='white' />
                </CyDTouchView>
              </CyDView>

              <CyDTouchView
                className='!bg-[#515151] rounded-[12px] p-[12px] mt-[24px]'
                onPress={() => setView('add')}>
                <CyDText className='text-white font-bold text-center'>
                  + Add Merchant
                </CyDText>
              </CyDTouchView>
              <CyDKeyboardAwareScrollView
                className='flex-1 mt-[24px]'
                contentContainerStyle={styles.scrollViewContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}>
                <CyDTouchView className='' activeOpacity={1}>
                  {renderErrorMessage()}
                  {selected.length === 0 ? (
                    <CyDText className='text-center mt-8'>
                      No merchants selected.
                    </CyDText>
                  ) : (
                    selected.map(renderSelectedMerchant)
                  )}
                </CyDTouchView>
              </CyDKeyboardAwareScrollView>
              <CyDView className='p-4'>
                {remainingPower === 0 ? (
                  <CyDTouchView
                    className={clsx(
                      'bg-p50 rounded-full py-4 items-center',
                      confirming && 'opacity-50',
                    )}
                    onPress={handleConfirm}
                    disabled={confirming}>
                    <CyDText className='text-lg font-bold text-black'>
                      Confirm Merchants
                    </CyDText>
                  </CyDTouchView>
                ) : (
                  <CyDView className='bg-n30 rounded-full py-4 items-center'>
                    <CyDText className='text-lg font-bold'>
                      {remainingPower > 0
                        ? `${remainingPower}% remaining`
                        : `${Math.abs(remainingPower)}% over limit`}
                    </CyDText>
                  </CyDView>
                )}
              </CyDView>
            </>
          ) : (
            <>
              <CyDView className='w-[32px] h-[4px] !bg-[#d9d9d9] self-center mt-[16px]' />
              <CyDView className='flex-row items-center justify-between'>
                <CyDView />
                <CyDText className='text-xl font-bold text-white'>
                  Select Merchant
                </CyDText>
                <CyDView />
              </CyDView>
              <CyDView className='mt-[32px] flex-1'>
                <CyDView className='flex-row items-center gap-x-[8px] !bg-[#202020] rounded-[10px] p-[8px]'>
                  <CyDMaterialDesignIcons
                    name='magnify'
                    size={24}
                    color='#C2C7D0'
                  />
                  <CyDTextInput
                    className='flex-1 !bg-[#202020] !text-[#C2C7D0] !text-[16px] font-normal'
                    value={search}
                    onChangeText={text => {
                      setSearch(text);
                    }}
                    placeholder='Search Merchants'
                    autoCapitalize='none'
                    autoCorrect={false}
                    onFocus={animateToFullHeight}
                    placeholderTextColor='#C2C7D0'
                  />
                  {search.length > 0 && (
                    <CyDTouchView onPress={() => setSearch('')}>
                      <CyDMaterialDesignIcons
                        name='close-circle'
                        size={20}
                        color='#C2C7D0'
                      />
                    </CyDTouchView>
                  )}
                </CyDView>

                <CyDView className='my-[16px] flex-row items-center gap-x-[6px]'>
                  <CyDIcons name='merchant' size={24} color='#C2C7D0' />
                  <CyDText className='!text-[#C2C7D0] !text-[12px] font-medium'>
                    Merchants on Cypher
                  </CyDText>
                </CyDView>

                {renderErrorMessage()}

                {loading && merchants.length === 0 ? (
                  <CyDView className='flex-1 items-center justify-center'>
                    <CyDMaterialDesignIcons
                      name='loading'
                      size={40}
                      color='#FFB900'
                    />
                  </CyDView>
                ) : (
                  <CyDFlatList
                    data={merchants as unknown[]}
                    keyExtractor={(item: unknown) =>
                      (item as MerchantWithAllocation).candidateId
                    }
                    renderItem={({ item }) =>
                      renderMerchant({
                        item: item as MerchantWithAllocation,
                      })
                    }
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    removeClippedSubviews={false}
                    maintainVisibleContentPosition={{
                      minIndexForVisible: 0,
                      autoscrollToTopThreshold: 10,
                    }}
                    ListEmptyComponent={
                      <CyDText className='text-center mt-8'>
                        {error
                          ? 'Failed to load merchants'
                          : 'No merchants found.'}
                      </CyDText>
                    }
                    ListFooterComponent={
                      <InfiniteScrollFooterLoader
                        refreshing={loading}
                        style={styles.infiniteScrollFooterLoaderStyle}
                      />
                    }
                  />
                )}
              </CyDView>
              <CyDView className='p-4'>
                <Button title='Confirm' onPress={() => setView('selected')} />
              </CyDView>
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  animatedContainer: {
    width: '100%',
  },
  animatedContainerFull: {
    width: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  animatedContainerCompact: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  minHeight80: {
    minHeight: 80,
  },
  infiniteScrollFooterLoaderStyle: {
    height: 40,
  },
});

export default MerchantBoostModal;
