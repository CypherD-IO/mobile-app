import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Holding } from '../../core/portfolio';
import { SwapToken } from '../../models/swapToken.interface';
import { HyperLiquidAccount, TokenModalType } from '../../constants/enum';
import {
  ALL_FUNDABLE_CHAINS,
  Chain,
  CHAIN_ETH,
  ChainBackendNames,
  COSMOS_CHAINS,
} from '../../constants/server';
import Fuse from 'fuse.js';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDTextInput,
  CyDText,
  CyDTouchView,
  CyDView,
  CyDFlatList,
  CyDScrollView,
  CyDLottieView,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import { endsWith, capitalize } from 'lodash';
import { SvgUri } from 'react-native-svg';
import clsx from 'clsx';
import { StyleSheet, Animated, StatusBar, Platform } from 'react-native';
import { t } from 'i18next';
import { useTranslation } from 'react-i18next';
import usePortfolio from '../../hooks/usePortfolio';
import { useGlobalModalContext } from './GlobalModal';
import useAxios from '../../core/HttpRequest';
import { ChainNameToChainMapping } from '../../constants/data';
import AppImages from '../../../assets/images/appImages';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSupportedChains from '../../hooks/useSupportedChains/index';
import { formatCurrencyWithSuffix, parseErrorMessage } from '../../core/util';
import Toast from 'react-native-toast-message';
import CyDTokenValue from './tokenValue';

interface TokenModal {
  tokenList?: Holding[];
  isChooseTokenModalVisible: boolean;
  setIsChooseTokenModalVisible: Dispatch<SetStateAction<boolean>>;
  minTokenValueLimit?: number;
  minTokenValueEth?: number;
  minTokenValueHlSpot?: number;
  onSelectingToken: (token: Holding | SwapToken) => void;
  type?: TokenModalType;
  onCancel?: () => void;
  noTokensAvailableMessage?: string;
}

interface TokenHoldings {
  originalHoldings: Holding[];
  filteredHoldings: Array<Holding | SupportedToken>;
  hyperliquidHoldings: Holding[];
}

interface SupportedToken extends Omit<Holding, 'totalValue' | 'balance'> {
  isSupported: boolean;
  totalValue: string;
  balance: string;
  contractAddress: string;
  coingeckoId: string;
  isInfLimit: boolean;
  maxQuoteLimit: number;
}

interface ISupportedToken {
  coingeckoId: string;
  tokenAddress: string;
  decimals: number;
  symbol: string;
  name: string;
  logo: string;
  chain: string;
  isInfLimit: boolean;
  maxQuoteLimit: number;
}

interface PaginationState {
  page: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function ChainSelectionView({
  chainData,
  selectedChain,
  setSelectedChain,
  onBack,
  isFullHeight,
  onScroll,
  heightAnim,
}: {
  chainData: Chain[];
  selectedChain: Chain;
  setSelectedChain: (chain: Chain) => void;
  onBack: () => void;
  isFullHeight: boolean;
  onScroll: (event: any) => void;
  heightAnim: Animated.Value;
}) {
  const allChainsData = useMemo(() => {
    const otherChains = chainData.filter(
      chain => chain.chain_id !== ALL_FUNDABLE_CHAINS[0].chain_id,
    );
    return [ALL_FUNDABLE_CHAINS[0], ...otherChains];
  }, [chainData]);

  return (
    <Animated.View
      style={[
        styles.modalContainer,
        {
          height: heightAnim.interpolate({
            inputRange: [80, 95],
            outputRange: ['80%', '100%'],
          }),
          borderTopLeftRadius: isFullHeight ? 0 : 16,
          borderTopRightRadius: isFullHeight ? 0 : 16,
        },
      ]}
      className='bg-n0 border-1 px-[8px]'>
      <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mt-[16px]' />

      <CyDView className='flex-row items-center py-[24px]'>
        <CyDTouchView onPress={onBack} className='absolute left-[16px] z-10'>
          <CyDMaterialDesignIcons
            name='arrow-left'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        <CyDText className='text-[18px] font-nunito font-bold flex-1 text-center'>
          Select Chain
        </CyDText>
      </CyDView>

      <CyDScrollView onScroll={onScroll} scrollEventThrottle={16}>
        <CyDView className='flex-wrap flex-row items-start justify-evenly'>
          {allChainsData.map(item => (
            <CyDTouchView
              onPress={() => {
                setSelectedChain(item);
                onBack();
              }}
              key={item.chain_id}
              className={clsx(
                'border-[1px] border-n40 rounded-[6px] flex-col items-center justify-center bg-n30 h-[74px] w-[104px] mb-[12px]',
                {
                  'bg-p10': selectedChain?.chain_id === item.chain_id,
                },
              )}>
              <CyDView className='flex flex-col items-center h-[50px] w-[46px]'>
                <CyDFastImage
                  source={item.logo_url}
                  className='w-[32px] h-[32px] rounded-full'
                />
                <CyDText className='text-[10px] mt-[6px] font-normal text-center w-[60px]'>
                  {capitalize(item.name.split(' ')[0])}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          ))}
        </CyDView>
      </CyDScrollView>
    </Animated.View>
  );
}

const formatBalance = (balance: string | number | undefined): string => {
  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 4,
  }).format(Number(balance) || 0);
};

const RenderToken = React.memo(
  ({
    item,
    selected,
    setSelected,
    setModalVisible,
    minTokenValueLimit = 0,
    minTokenValueEth = 0,
    minTokenValueHlSpot = 0,
    onSelectingToken,
    setErrorMessage,
    type,
  }: {
    item: Holding | SupportedToken;
    selected: Holding | null;
    setSelected: (token: Holding | null) => void;
    setModalVisible: (visible: boolean) => void;
    minTokenValueLimit?: number;
    minTokenValueEth?: number;
    minTokenValueHlSpot?: number;
    onSelectingToken: (token: Holding | SwapToken) => void;
    setErrorMessage: (errorMessage: string) => void;
    type?: TokenModalType;
  }) => {
    const { t } = useTranslation();
    const getMinimumTokenValue = (token: Holding | SupportedToken) => {
      if (
        type === TokenModalType.CARD_LOAD &&
        token.chainDetails.chain_id === CHAIN_ETH.chain_id &&
        !['usd-coin', 'tether'].includes(token.coinGeckoId)
      ) {
        return minTokenValueEth;
      } else if (
        type === TokenModalType.CARD_LOAD &&
        token.accountType === 'spot'
      ) {
        return minTokenValueHlSpot;
      }
      return minTokenValueLimit;
    };

    // minvalue for eth is $50 check
    const minimumValue = getMinimumTokenValue(item);
    const isDisabled = Number(item.totalValue) < minimumValue;
    const isSelected =
      item.symbol === selected?.symbol &&
      item.chainDetails.name === selected?.chainDetails.name;
    const { validateChainSupport } = useSupportedChains();

    const handleModalClose = () => {
      setModalVisible(false);
    };

    return (
      <CyDTouchView
        className={clsx('flex flex-row p-[8px] items-center justify-between', {
          'bg-n30': isSelected,
          'opacity-50': isDisabled,
        })}
        style={styles.tokenItem}
        onPress={() => {
          const { isSupported, errorMessage } = validateChainSupport(
            item.chainDetails,
          );
          if (!isSupported) {
            setErrorMessage(errorMessage);
            return;
          }
          if (isDisabled) {
            setErrorMessage(
              t('MINIMUM_TOKEN_VALUE_ERROR', {
                value: currencyFormatter.format(minimumValue),
              }),
            );
            return;
          }
          handleModalClose();
          setSelected(item as Holding);
          onSelectingToken(item);
        }}>
        <CyDView className={'flex flex-row items-center'}>
          <CyDView className={'flex flex-row items-center'}>
            {endsWith(item.logoUrl, '.svg') ? (
              <SvgUri
                width='32'
                height='32'
                className='w-[32px] h-[32px] rounded-full'
                uri={item.logoUrl}
              />
            ) : (
              <CyDFastImage
                source={
                  item.logoUrl
                    ? {
                        uri: item.logoUrl,
                      }
                    : AppImages.UNKNOWN_TXN_TOKEN
                }
                className={'w-[32px] h-[32px] rounded-full'}
              />
            )}

            <CyDView className='-ml-[12px] mt-[20px] bg-n0 p-[2px] rounded-full'>
              {endsWith(item.chainDetails.logo_url, '.svg') ? (
                <SvgUri
                  width='16'
                  height='16'
                  className='rounded-full'
                  uri={item.chainDetails.logo_url}
                />
              ) : (
                <CyDFastImage
                  source={item.chainDetails.logo_url}
                  className={'w-[16px] h-[16px] rounded-full'}
                />
              )}
            </CyDView>

            <CyDView className='w-[120px] ml-[12px]'>
              <CyDView className='overflow-hidden'>
                <CyDText
                  numberOfLines={1}
                  className={
                    'text-base400 text-[16px] font-nunito font-semibold'
                  }>
                  {item.name}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row items-center'>
                <CyDText
                  className={'text-n200 text-[12px] font-nunito font-regular'}>
                  {item.chainDetails.name}
                </CyDText>
                {item.isInfLimit && (
                  <>
                    <CyDView className='h-[6px] w-[6px] rounded-full bg-n200 mx-[6px]' />
                    <CyDView className='px-2 bg-green400 rounded-full'>
                      <CyDText className='text-white text-[10px] font-medium'>
                        {t('LOAD_UP_TO', {
                          maxLoadLimit: formatCurrencyWithSuffix(
                            item.maxQuoteLimit,
                          ),
                        })}
                      </CyDText>
                    </CyDView>
                  </>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>

        <CyDView>
          <CyDTokenValue
            parentClass='justify-end'
            className='text-[16px] font-medium'>
            {item.totalValue}
          </CyDTokenValue>
          <CyDView className='flex flex-row items-center justify-end'>
            <CyDText
              className={
                'font-semibold text-subTextColor text-[12px] text-right'
              }>
              {formatBalance(item.balanceDecimal)}
            </CyDText>
            <CyDText
              className={
                'font-semibold text-subTextColor text-[12px] ml-[4px]'
              }>
              {item.symbol}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.contractAddress === nextProps.item.contractAddress &&
      prevProps.item.chainDetails.name === nextProps.item.chainDetails.name &&
      prevProps.selected?.contractAddress ===
        nextProps.selected?.contractAddress &&
      prevProps.selected?.chainDetails.name ===
        nextProps.selected?.chainDetails.name &&
      prevProps.minTokenValueLimit === nextProps.minTokenValueLimit &&
      prevProps.minTokenValueEth === nextProps.minTokenValueEth &&
      prevProps.minTokenValueHlSpot === nextProps.minTokenValueHlSpot &&
      prevProps.type === nextProps.type
    );
  },
);
RenderToken.displayName = 'RenderToken';

const getChainDetails = (chainName: string) => {
  // Convert chain name to match ChainBackendNames format
  const chainKey = chainName.toUpperCase() as ChainBackendNames;
  const chainDetails = ChainNameToChainMapping[chainKey];

  if (!chainDetails) {
    // Fallback to default chain details if not found
    return {
      chain_id: chainName,
      name: chainName,
      logo_url: '',
    };
  }

  return {
    chain_id: chainDetails.chain_id,
    name: chainDetails.name,
    logo_url: chainDetails.logo_url,
  };
};

const updateStatusBarStyle = (
  isFullScreen: boolean,
  theme: Theme,
  colorScheme: string,
) => {
  if (Platform.OS === 'android') {
    // Android: Set both background color and style
    const bgColor = isFullScreen
      ? theme === Theme.SYSTEM
        ? colorScheme === 'dark'
          ? '#000000ff'
          : '#ffffffff'
        : theme === Theme.DARK
          ? '#000000ff'
          : '#ffffffff'
      : 'transparent';

    StatusBar.setBackgroundColor(bgColor);
  }

  // Both platforms: Set status bar style
  const barStyle =
    theme === Theme.SYSTEM
      ? colorScheme === Theme.DARK
        ? 'light-content'
        : 'dark-content'
      : theme === Theme.DARK
        ? 'light-content'
        : 'dark-content';

  StatusBar.setBarStyle(barStyle);
};

// Add these before the main component
const ListFooterLoader = () => (
  <CyDView className='py-4 items-center justify-center'>
    <CyDLottieView
      source={AppImages.LOADING_SPINNER}
      autoPlay
      loop
      style={styles.listFooterLoader}
    />
  </CyDView>
);

const EmptyListMessage = ({
  noTokensAvailableMessage,
}: {
  noTokensAvailableMessage: string;
}) => (
  <CyDView className='flex-1 items-center justify-center p-4'>
    <CyDText className='text-center text-n200'>
      {noTokensAvailableMessage}
    </CyDText>
  </CyDView>
);

const getTokenKey = (item: Holding | SupportedToken) => {
  const chainId = item.chainDetails?.chain_id || '';
  const address =
    item.contractAddress ||
    (COSMOS_CHAINS.includes(item.chainDetails.chainName) ? item.denom : '');
  const symbol = item.symbol || '';
  const accountType = (item as any).accountType || '';
  const key = `${chainId}-${address}-${symbol}-${accountType}`;
  return key;
};

export default function ChooseTokenModalV2(props: TokenModal) {
  const {
    isChooseTokenModalVisible,
    setIsChooseTokenModalVisible,
    tokenList,
    minTokenValueLimit = 0,
    minTokenValueEth = 0,
    minTokenValueHlSpot = 0,
    onSelectingToken,
    type = TokenModalType.PORTFOLIO,
    noTokensAvailableMessage = t('NO_TOKENS_FOUND'),
    onCancel = () => {},
  } = props;
  const { getWithoutAuth } = useAxios();
  const { getLocalPortfolio } = usePortfolio();
  const [searchText, setSearchText] = useState<string>('');
  const [totalHoldings, setTotalHoldings] = useState<TokenHoldings>({
    originalHoldings: [],
    filteredHoldings: [],
    hyperliquidHoldings: [],
  });

  const [selectedToken, setSelectedToken] = useState<Holding | null>(null);
  const { supportedChains } = useSupportedChains();
  const [selectedChain, setSelectedChain] = useState<Chain>(
    supportedChains[0] || ALL_FUNDABLE_CHAINS[0],
  );
  const chainData = useMemo(() => {
    if (type === TokenModalType.CARD_LOAD) {
      return supportedChains;
    }
    // Add ALL_FUNDABLE_CHAINS[0] (All Chains option) to supported chains
    return [ALL_FUNDABLE_CHAINS[0], ...supportedChains];
  }, [supportedChains, type]);
  const { showModal } = useGlobalModalContext();
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 30,
    hasMore: true,
    isLoading: false,
  });
  const [searchResults, setSearchResults] = useState<
    Array<Holding | SupportedToken>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentView, setCurrentView] = useState<'tokens' | 'chains'>('tokens');
  const [isFullHeight, setIsFullHeight] = useState(false);
  const heightAnim = useRef(new Animated.Value(80)).current;
  const { theme } = useTheme();
  const [backdropOpacity, setBackdropOpacity] = useState(0.5);
  const colorScheme = useColorScheme();
  const [combinedTokensList, setCombinedTokensList] = useState<
    Array<Holding | SupportedToken>
  >([]);

  useEffect(() => {
    if (isChooseTokenModalVisible) {
      if (tokenList) {
        // If tokenList is provided, use it directly
        setTotalHoldings({
          originalHoldings: tokenList,
          filteredHoldings: [],
          hyperliquidHoldings: [],
        });
      } else {
        // Otherwise fetch holdings
        void fetchTotalHoldings();

        // Only fetch supported tokens if needed
        if (type === TokenModalType.CARD_LOAD) {
          void fetchSupportedTokens();
        }
      }
    }
  }, [isChooseTokenModalVisible, type, tokenList]);

  // Update the combinedTokensList effect to properly deduplicate
  useEffect(() => {
    if (type === TokenModalType.CARD_LOAD) {
      // Create a Map using chainId-contractAddress as key for deduplication
      const uniqueTokens = new Map();

      // First add supported tokens
      supportedTokens.forEach(token => {
        const key = getTokenKey(token);
        uniqueTokens.set(key, token);
      });

      // Then override with holdings where they exist (to show actual balances)
      // Only include holdings that have isFundable flag set to true
      totalHoldings.originalHoldings
        .filter(token => token.isFundable)
        .forEach(token => {
          const key = getTokenKey(token);
          // If token already exists in the Map, merge properties
          const existingToken = uniqueTokens.get(key);
          const mergedToken = {
            ...existingToken,
            ...token,
          };
          uniqueTokens.set(key, mergedToken);
        });

      setCombinedTokensList(Array.from(uniqueTokens.values()));
    } else {
      // For other types, show only holdings with non-zero total value
      setCombinedTokensList(
        totalHoldings.originalHoldings.filter(
          token => Number(token.totalValue) > 0,
        ),
      );
    }
  }, [supportedTokens, totalHoldings.originalHoldings, type]);

  // Update the paginatedTokens memo for better performance
  const paginatedTokens = useMemo(() => {
    // Cache the filtered tokens to avoid recalculating
    const getFilteredTokens = () => {
      let tokens = combinedTokensList;

      // Apply search filter if needed
      if (searchText) {
        const fuse = new Fuse(tokens, {
          keys: ['symbol', 'name'],
          threshold: 0.3,
        });
        tokens = fuse.search(searchText).map(result => result.item);
      }

      // Apply chain filter only if not "all" chains
      if (selectedChain?.chain_id !== ALL_FUNDABLE_CHAINS[0].chain_id) {
        tokens = tokens.filter(
          token => token.chainDetails.chain_id === selectedChain?.chain_id,
        );
      }

      return tokens;
    };

    const filteredTokens = getFilteredTokens();

    // Sort only once
    const sortedTokens = filteredTokens.sort(
      (a, b) => Number(b.totalValue) - Number(a.totalValue),
    );

    // Apply pagination
    const start = 0;
    const end = pagination.page * pagination.limit;
    return sortedTokens.slice(start, end);
  }, [combinedTokensList, searchText, selectedChain, pagination]);

  // Update loadMoreTokens for better performance
  const loadMoreTokens = useCallback(() => {
    if (!pagination.hasMore || pagination.isLoading) return;

    setPagination(prev => {
      const currentCount = prev.page * prev.limit;
      const totalCount = combinedTokensList.length;
      const hasMore = currentCount < totalCount;

      return {
        ...prev,
        page: hasMore ? prev.page + 1 : prev.page,
        hasMore,
        isLoading: false,
      };
    });
  }, [pagination.hasMore, pagination.isLoading, combinedTokensList.length]);

  const fetchSupportedTokens = async () => {
    try {
      setIsLoading(true);
      const response = await getWithoutAuth('/v1/portfolio/supported-tokens');
      if (response.data) {
        const transformedTokens: SupportedToken[] = response.data.map(
          (token: ISupportedToken) => {
            const chainDetails = getChainDetails(token.chain);

            return {
              // Use token.tokenAddress instead of undefined
              contractAddress: token.tokenAddress || token.address || '', // Fallback to empty string if both are undefined
              symbol: token.symbol,
              name: token.name,
              logoUrl: token.logo,
              decimals: token.decimals,
              balanceDecimal: '0',
              balance: '0',
              totalValue: '0',
              isSupported: true,
              chainDetails,
              coingeckoId: token.coingeckoId,
              isInfLimit: token.isInfLimit,
              maxQuoteLimit: token.maxQuoteLimit,
            };
          },
        );

        setSupportedTokens(transformedTokens);
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('ERROR'),
        message: t('FAILED_TO_FETCH_SUPPORTED_TOKENS'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTotalHoldings = async () => {
    try {
      const localPortfolio = await getLocalPortfolio();
      const valuedTokens =
        localPortfolio?.totalHoldings?.filter(token => token.isVerified) ?? [];

      setTotalHoldings({
        originalHoldings: valuedTokens,
        filteredHoldings: [], // Start empty, will be populated by combinedTokens effect
        hyperliquidHoldings: localPortfolio?.hyperliquid?.totalHoldings ?? [],
      });
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('ERROR'),
        message: t('SOMETHING_WENT_WRONG'),
      });
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setPagination({
      page: 1,
      limit: 30,
      hasMore: true,
      isLoading: false,
    });
    searchTokens(text);
  };

  const handleChainSelect = (chain: Chain) => {
    setSelectedChain(chain);
    setErrorMessage('');
    setPagination({
      page: 1,
      limit: 30,
      hasMore: true,
      isLoading: false,
    });
  };

  const searchTokens = (searchText: string) => {
    try {
      if (!searchText.trim()) {
        setSearchResults([]);
        return;
      }

      const tokensToSearch =
        selectedChain.chain_id === ALL_FUNDABLE_CHAINS[0].chain_id
          ? combinedTokensList
          : combinedTokensList.filter(
              token => token.chainDetails.chain_id === selectedChain.chain_id,
            );

      const fuse = new Fuse(tokensToSearch, {
        keys: ['name', 'symbol'],
        threshold: 0.3,
      });

      const results = fuse
        .search(searchText)
        .map(result => result.item)
        .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));

      setSearchResults(results);
      setPagination(prev => ({
        ...prev,
        page: 1,
        hasMore: results.length > pagination.limit,
      }));
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: parseErrorMessage(error),
        position: 'top',
      });
    }
  };

  const animateToFullHeight = () => {
    if (!isFullHeight) {
      setIsFullHeight(true);
      setBackdropOpacity(0);

      Animated.timing(heightAnim, {
        toValue: 95,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        updateStatusBarStyle(true, theme, colorScheme.colorScheme);
      });
    }
  };

  const handleModalClose = () => {
    setIsFullHeight(false);
    setBackdropOpacity(0.5);
    updateStatusBarStyle(false, theme, colorScheme.colorScheme);
    heightAnim.setValue(80);
    setErrorMessage('');
    setIsChooseTokenModalVisible(false);
  };

  const handleScroll = (event: any) => {
    if (event.nativeEvent.contentOffset.y > 0) {
      animateToFullHeight();
    }
  };

  // Add effect to reset height when modal visibility changes
  useEffect(() => {
    if (!isChooseTokenModalVisible) {
      setIsFullHeight(false);
      setErrorMessage('');
      heightAnim.setValue(80);
    }
  }, [isChooseTokenModalVisible]);

  return (
    <CyDModalLayout
      setModalVisible={handleModalClose}
      isModalVisible={isChooseTokenModalVisible}
      style={styles.modalLayout}
      backdropOpacity={backdropOpacity}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          handleModalClose();
          onCancel();
        }
      }}
      swipeDirection={['down']}
      propagateSwipe={true}
      disableBackDropPress={false}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {currentView === 'chains' ? (
          <ChainSelectionView
            chainData={chainData}
            selectedChain={selectedChain}
            setSelectedChain={handleChainSelect}
            onBack={() => setCurrentView('tokens')}
            isFullHeight={isFullHeight}
            onScroll={handleScroll}
            heightAnim={heightAnim}
          />
        ) : (
          <Animated.View
            style={[
              styles.modalContainer,
              {
                height: heightAnim.interpolate({
                  inputRange: [80, 95],
                  outputRange: ['80%', '100%'],
                }),
                borderTopLeftRadius: isFullHeight ? 0 : 16,
                borderTopRightRadius: isFullHeight ? 0 : 16,
              },
            ]}
            className='bg-n0 border-1 px-[8px]'>
            <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mt-[16px]' />
            <CyDView className=''>
              <CyDView className='flex-row items-center justify-center pt-[24px] pb-[8px]'>
                <CyDText className='text-[18px] font-nunito font-bold'>
                  {'Select Token'}
                </CyDText>
              </CyDView>

              <CyDView className='flex flex-row items-center justify-evenly py-[12px]'>
                {(() => {
                  const displayChains = [...chainData];
                  const selectedIndex = displayChains.findIndex(
                    chain => chain.chain_id === selectedChain?.chain_id,
                  );

                  if (selectedIndex >= 4) {
                    const _selected = displayChains[selectedIndex];
                    displayChains.splice(selectedIndex, 1);
                    displayChains.unshift(_selected);
                  }

                  return displayChains.slice(0, 4).map((chain, index) => (
                    <CyDTouchView
                      onPress={() => handleChainSelect(chain)}
                      key={chain.chain_id}
                      className={clsx('p-[10px] rounded-[8px] bg-n30', {
                        'bg-p40': selectedChain?.chain_id === chain.chain_id,
                      })}>
                      <CyDFastImage
                        source={chain.logo_url}
                        className='w-[36px] h-[36px] rounded-full'
                      />
                    </CyDTouchView>
                  ));
                })()}

                {chainData.length > 4 && (
                  <CyDTouchView
                    onPress={() => setCurrentView('chains')}
                    className='p-[10px] rounded-[8px] bg-n30'>
                    <CyDView className='w-[40px] h-[40px] rounded-full items-center justify-center'>
                      <CyDText className='text-[14px] font-bold'>
                        +{chainData.length - 4}
                      </CyDText>
                      <CyDText className='text-[10px]'>Chains</CyDText>
                    </CyDView>
                  </CyDTouchView>
                )}
              </CyDView>
            </CyDView>

            <CyDView className='bg-n0 p-[12px] pt-[0px] flex-1'>
              <CyDView
                className={clsx(
                  'mb-[16px] flex flex-row justify-between items-center self-center border-[1px] w-full rounded-[8px] px-[12px] py-[0px] border-n40',
                )}>
                <CyDTextInput
                  className={clsx('self-center py-[12px] w-[95%] text-base400')}
                  value={searchText}
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={handleSearchTextChange}
                  onFocus={animateToFullHeight}
                  placeholderTextColor={'#6B788E'}
                  placeholder='Search Token'
                />
              </CyDView>

              {errorMessage ? (
                <CyDView className='mb-[8px] p-[3px] rounded-[8px]'>
                  <CyDText className=' font-medium'>{errorMessage}</CyDText>
                </CyDView>
              ) : null}

              {isLoading ? (
                <CyDView className='flex-1 items-center justify-center'>
                  <CyDLottieView
                    source={AppImages.LOADING_SPINNER}
                    autoPlay
                    loop
                    style={{ width: 40, height: 40 }}
                  />
                </CyDView>
              ) : (
                <>
                  <CyDFlatList
                    data={paginatedTokens}
                    keyExtractor={getTokenKey}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    updateCellsBatchingPeriod={50}
                    onEndReachedThreshold={0.5}
                    onEndReached={loadMoreTokens}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    renderItem={({
                      item,
                    }: {
                      item: Holding | SupportedToken;
                    }) => (
                      <RenderToken
                        item={item}
                        selected={selectedToken}
                        setSelected={setSelectedToken}
                        onSelectingToken={onSelectingToken}
                        setModalVisible={setIsChooseTokenModalVisible}
                        minTokenValueLimit={minTokenValueLimit}
                        minTokenValueEth={minTokenValueEth}
                        minTokenValueHlSpot={minTokenValueHlSpot}
                        setErrorMessage={setErrorMessage}
                        type={type}
                      />
                    )}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                      pagination.isLoading ? ListFooterLoader : null
                    }
                    ListEmptyComponent={
                      <EmptyListMessage
                        noTokensAvailableMessage={noTokensAvailableMessage}
                      />
                    }
                  />
                </>
              )}
            </CyDView>
          </Animated.View>
        )}
      </SafeAreaView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  tokenItem: {
    height: 58,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  listFooterLoader: {
    width: 40,
    height: 40,
  },
});
