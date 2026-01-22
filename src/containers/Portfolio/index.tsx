import notifee, { EventType } from '@notifee/react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {
  ParamListBase,
  useIsFocused,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { get, isEmpty, has } from 'lodash';
import moment from 'moment';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppState,
  BackHandler,
  ListRenderItem,
  SectionList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import AppImages from '../../../assets/images/appImages';
import ChooseChainModalV2 from '../../components/v2/chooseChainModal';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import PortfolioTokenItem from '../../components/v2/portfolioTokenItem';
import { use3DSecure } from '../../components/v2/threeDSecureApprovalModalContext';
import { QUICK_ACTION_NOTIFICATION_CATEGORY_IDS } from '../../constants/data';
import {
  CypherDeclineCodes,
  GlobalContextType,
  GlobalModalType,
  RPCODES,
  CardProviders,
  ConnectionTypes,
} from '../../constants/enum';
import * as C from '../../constants/index';
import {
  Chain,
  CHAIN_COLLECTION,
  ChainBackendNames,
  NotificationEvents,
  CHAIN_ETH,
  CHAIN_AVALANCHE,
  CHAIN_POLYGON,
  CHAIN_ARBITRUM,
  CHAIN_BSC,
  CHAIN_COSMOS,
  FundWalletAddressType,
} from '../../constants/server';
import {
  getFirstLaunchAfterWalletCreation,
  getHideBalanceStatus,
  getIBC,
} from '../../core/asyncStorage';
import { GlobalContext } from '../../core/globalContext';
import useAxios from '../../core/HttpRequest';
import {
  getCurrentChainHoldings,
  Holding,
  WalletHoldings,
} from '../../core/portfolio';
import {
  HdWalletContext,
  findChainOfAddress,
  extractAddressFromURI,
  getAvailableChains,
} from '../../core/util';
import usePortfolio from '../../hooks/usePortfolio';
import { DeFiFilter } from '../../models/defi.interface';
import { IPortfolioData } from '../../models/portfolioData.interface';
import { RouteNotificationAction } from '../../notification/pushNotification';
import {
  BridgeContext,
  BridgeContextDef,
  BridgeReducerAction,
} from '../../reducers/bridge.reducer';
import {
  CyDFastImage,
  CyDFlatList,
  CyDImage,
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { SwapBridgeChainData, SwapBridgeTokenData } from '../Bridge';
import { Banner, HeaderBar, RefreshTimerBar } from './components';
import BannerCarousel from './components/BannerCarousel';
import FilterBar from './components/FilterBar';
import { DeFiScene, NFTScene, TXNScene } from './scenes';
import Loading from '../../components/v2/loading';
import GetFirstTokenComponent from '../../components/v2/GetFirstTokenComponent';
import useConnectionManager from '../../hooks/useConnectionManager';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import GetTokenBottomSheetContent from '../../components/v2/GetTokenBottomSheetContent';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { colorScheme } from 'nativewind';
import CyDModalLayout from '../../components/v2/modal';
import type { QRScanEvent } from '../../types/qr';

export interface PortfolioProps {
  navigation: NativeStackNavigationProp<ParamListBase>;
}

interface IBuyOptionsData {
  index: number;
  title: string;
  displayTitle: string;
  logo: any;
  supportedChains: Chain[];
  currencyType: CurrencyTypes;
  screenTitle: string;
  supportedPaymentModes: string;
  isVisibileInUI: boolean;
}

interface ISellOptionsData {
  index: number;
  title: string;
  displayTitle: string;
  logo: any;
  supportedChains: Chain[];
  currencyType: CurrencyTypes;
  screenTitle: string;
  supportedPaymentModes: string;
  isVisibileInUI: boolean;
}

enum CurrencyTypes {
  USD = 'USD',
  INR = 'INR',
  FIAT = 'FIAT',
}

enum BuyOptions {
  ONMETA = 'ONMETA',
  COINBASE = 'COINBASE',
  TRANSFI = 'TRANSFI',
}

enum SellOptions {
  ONMETA = 'ONMETA',
}

export default function Portfolio({ navigation }: PortfolioProps) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  // Access navigation params to check if we arrived from the Card welcome screen.
  const route = useRoute<any>();
  // fromCardWelcome may be provided directly or nested (if additional params wrapper exists)
  const fromCardWelcome: boolean =
    route?.params?.fromCardWelcome ??
    route?.params?.params?.fromCardWelcome ??
    false;
  const globalStateContext = useContext(GlobalContext);
  const hdWallet = useContext(HdWalletContext);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState<boolean>();
  const [isPortfolioRefreshing, setIsPortfolioRefreshing] =
    useState<boolean>(false);
  const [portfolioData, setPortfolioData] = useState<IPortfolioData>();
  const [portfolioBalance, setPortfolioBalance] = useState<number | string>('');
  const [selectedChain, setSelectedChain] = useState<Chain>(CHAIN_COLLECTION);
  const { dispatch: bridgeDispatch } = useContext(
    BridgeContext,
  ) as BridgeContextDef;
  const { getWithAuth } = useAxios();
  const { deleteSocialAuthWalletIfSessionExpired, connectionType } =
    useConnectionManager();

  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [isVerifyCoinChecked, setIsVerifyCoinChecked] = useState<boolean>(true);
  const [appState, setAppState] = useState<string>('');
  const backgroundTimestampRef = useRef<number | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  // Buy modal states
  const [buyModalVisible, setBuyModalVisible] = useState<boolean>(false);
  const [buyChooseChainModalVisible, setBuyChooseChainModalVisible] =
    useState<boolean>(false);
  const [buyType, setBuyType] = useState<IBuyOptionsData>();
  const [chainData, setChainData] = useState<Chain[]>([CHAIN_COLLECTION]);
  const [pendingBuyAction, setPendingBuyAction] = useState<boolean>(false);

  // Sell modal states
  const [sellModalVisible, setSellModalVisible] = useState<boolean>(false);
  const [sellChooseChainModalVisible, setSellChooseChainModalVisible] =
    useState<boolean>(false);
  const [sellType, setSellType] = useState<ISellOptionsData>();
  const [pendingSellAction, setPendingSellAction] = useState<boolean>(false);

  // Receive modal states
  const [chooseChainModal, setChooseChainModal] = useState<boolean>(false);

  const { theme } = useTheme();
  const isDarkMode =
    theme === Theme.DARK ||
    (theme === Theme.SYSTEM && colorScheme.get() === 'dark');

  // Buy options data
  const buyOptionsData: IBuyOptionsData[] = [
    {
      index: 0,
      title: BuyOptions.ONMETA,
      displayTitle: t('ONMETA_BUY_DISPLAY_TITLE') ?? 'OnMeta',
      logo: AppImages.ONMETA,
      supportedChains: [
        CHAIN_ETH,
        CHAIN_AVALANCHE,
        CHAIN_POLYGON,
        CHAIN_ARBITRUM,
        CHAIN_BSC,
      ],
      currencyType: CurrencyTypes.INR,
      screenTitle: C.screenTitle.ON_META,
      supportedPaymentModes: 'UPI',
      isVisibileInUI: true,
    },
    {
      index: 1,
      title: BuyOptions.COINBASE,
      displayTitle: t('COINBASE_DISPLAY_TITLE') ?? 'Coinbase',
      logo: AppImages.COINBASE,
      supportedChains: [
        CHAIN_ETH,
        CHAIN_COSMOS,
        CHAIN_AVALANCHE,
        CHAIN_POLYGON,
      ],
      currencyType: CurrencyTypes.USD,
      screenTitle: C.screenTitle.CB_PAY,
      supportedPaymentModes: '',
      isVisibileInUI: true,
    },
  ];

  // Sell options data
  const sellOptionsData: ISellOptionsData[] = [
    {
      index: 0,
      title: SellOptions.ONMETA,
      displayTitle: t('ONMETA_SELL_DISPLAY_TITLE') ?? 'OnMeta',
      logo: AppImages.ONMETA,
      supportedChains: [
        CHAIN_ETH,
        CHAIN_AVALANCHE,
        CHAIN_POLYGON,
        CHAIN_ARBITRUM,
        CHAIN_BSC,
      ],
      currencyType: CurrencyTypes.FIAT,
      screenTitle: C.screenTitle.ON_META,
      supportedPaymentModes: 'Instant Bank Deposit using IMPS',
      isVisibileInUI: true,
    },
  ];

  const handleShowGetTokenSheet = () => {
    showBottomSheet({
      id: 'getTokenOptions',
      snapPoints: ['40%'],
      showCloseButton: true,
      scrollable: false,
      topBarColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      content: (
        <GetTokenBottomSheetContent
          close={() => hideBottomSheet('getTokenOptions')}
          onBuyPress={handleShowBuyModal}
          onReceivePress={handleShowReceiveModal}
        />
      ),
    });
  };

  const handleShowBuyModal = (): void => {
    hideBottomSheet('getTokenOptions');
    setTimeout(() => setBuyModalVisible(true), 250);
  };

  const handleShowReceiveModal = (): void => {
    hideBottomSheet('getTokenOptions');
    if (hdWallet) {
      setChainData(getAvailableChains(hdWallet));
    }
    setTimeout(() => setChooseChainModal(true), 250);
  };

  /**
   * Navigates to the send/enter amount screen
   */
  const handleSendPress = (): void => {
    navigation.navigate(C.screenTitle.ENTER_AMOUNT);
  };

  /**
   * Opens the receive modal with chain selection
   */
  const handleReceivePress = (): void => {
    if (hdWallet) {
      setChainData(getAvailableChains(hdWallet));
    }
    setChooseChainModal(true);
  };

  /**
   * Navigates to the swap screen
   */
  const handleSwapPress = (): void => {
    navigation.navigate(C.screenTitle.SWAP_SCREEN);
  };

  /**
   * Opens the more options bottom sheet with Buy and Sell options
   */
  const handleMorePress = (): void => {
    showBottomSheet({
      id: 'moreOptions',
      snapPoints: ['40%'],
      showCloseButton: true,
      scrollable: false,
      topBarColor: isDarkMode ? '#0D0D0D' : '#FFFFFF',
      content: (
        <GetTokenBottomSheetContent
          close={() => hideBottomSheet('moreOptions')}
          onBuyPress={handleBuyFromMore}
          onSellPress={handleSellFromMore}
          mode='moreOptions'
        />
      ),
    });
  };

  /**
   * Handle Buy press from More Options bottom sheet
   */
  const handleBuyFromMore = (): void => {
    hideBottomSheet('moreOptions');
    setTimeout(() => setBuyModalVisible(true), 250);
  };

  /**
   * Handle Sell press from More Options bottom sheet
   */
  const handleSellFromMore = (): void => {
    hideBottomSheet('moreOptions');
    setTimeout(() => setSellModalVisible(true), 250);
  };

  /**
   * Shared renderer for platform items (Buy/Sell)
   * Extracts common UI logic to reduce duplication
   */
  const renderPlatformItem = (
    item: IBuyOptionsData | ISellOptionsData,
    onPress: () => void,
    showPaymentModes = true,
  ): JSX.Element | null => {
    if (!item.isVisibileInUI) return null;
    return (
      <CyDTouchView
        className={'mb-[16px]'}
        activeOpacity={0.7}
        onPress={onPress}>
        <CyDView className={'bg-n0 p-[16px] rounded-[18px]'}>
          <CyDView className={'flex flex-row justify-between'}>
            <CyDView className={'flex flex-row items-center'}>
              <CyDImage
                source={item.logo}
                className={'w-[22px] h-[22px] mr-[6px]'}
              />
              <CyDText className={'font-bold text-[18px]'}>
                {item.displayTitle}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className={'flex flex-row flex-wrap mt-[16px] pl-[2px]'}>
            {item.supportedChains.map(chain => (
              <CyDView
                key={chain.backendName}
                className={'flex flex-row items-center mr-[12px] mb-[6px]'}>
                <CyDImage
                  source={chain.logo_url}
                  className={'w-[12px] h-[12px] mr-[4px]'}
                />
                <CyDText
                  className={'text-subTextColor font-medium text-[12px]'}>
                  {chain.name.toUpperCase()}
                </CyDText>
              </CyDView>
            ))}
          </CyDView>
          <CyDView className={'w-full h-[1px] bg-n40 my-[16px]'} />
          {showPaymentModes && (
            <CyDView className='pl-[2px]'>
              <CyDText className={'text-subTextColor'}>
                {t('MODES_INIT_CAPS')} :{' '}
                <CyDText className={'font-black text-subTextColor'}>
                  {item.supportedPaymentModes}
                </CyDText>
              </CyDText>
            </CyDView>
          )}
        </CyDView>
      </CyDTouchView>
    );
  };

  const renderBuyPlatformItem = (item: IBuyOptionsData): JSX.Element | null => {
    const shouldShowPaymentModes =
      item.title !== BuyOptions.COINBASE && item.title !== BuyOptions.TRANSFI;

    return renderPlatformItem(
      item,
      () => {
        setBuyType(item);
        setChainData(item.supportedChains);
        setPendingBuyAction(true);
        setBuyModalVisible(false);
      },
      shouldShowPaymentModes,
    );
  };

  const renderChainItem = (item: Chain) => {
    return (
      <CyDTouchView
        className={'p-[20px] bg-n0 rounded-[18px] mb-[10px]'}
        onPress={() => {
          setBuyChooseChainModalVisible(false);
          if (buyType) {
            navigation.navigate(buyType.screenTitle, {
              url: item.backendName,
              operation: 'buy',
            });
          }
        }}>
        <CyDView className={'flex flex-row items-center justify-between'}>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              source={item.logo_url}
              className={'w-[18px] h-[18px] mr-[10px]'}
            />
            <CyDText className={'font-medium text-[17px] '}>
              {item.name.toUpperCase()}
            </CyDText>
          </CyDView>
          <CyDMaterialDesignIcons
            name='open-in-new'
            size={18}
            className='text-base400 ml-[10px]'
          />
        </CyDView>
      </CyDTouchView>
    );
  };

  const renderSellPlatformItem = (
    item: ISellOptionsData,
  ): JSX.Element | null => {
    return renderPlatformItem(
      item,
      () => {
        setSellType(item);
        setChainData(item.supportedChains);
        setPendingSellAction(true);
        setSellModalVisible(false);
      },
      true, // Always show payment modes for sell
    );
  };

  const renderSellChainItem = (item: Chain) => {
    return (
      <CyDTouchView
        className={'p-[20px] bg-n0 rounded-[18px] mb-[10px]'}
        activeOpacity={0.7}
        onPress={() => {
          setSellChooseChainModalVisible(false);
          if (sellType) {
            navigation.navigate(sellType.screenTitle, {
              url: item.backendName,
              operation: 'sell',
            });
          }
        }}>
        <CyDView className={'flex flex-row items-center justify-between'}>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              source={item.logo_url}
              className={'w-[18px] h-[18px] mr-[10px]'}
            />
            <CyDText className={'font-medium text-[17px] '}>
              {item.name.toUpperCase()}
            </CyDText>
          </CyDView>
          <CyDMaterialDesignIcons
            name='open-in-new'
            size={18}
            className='text-base400 ml-[10px]'
          />
        </CyDView>
      </CyDTouchView>
    );
  };

  const onSelectingChain = ({ item }: { item: Chain }) => {
    let addressTypeQRCode = FundWalletAddressType.EVM;
    switch (item.backendName) {
      case ChainBackendNames.POLYGON:
        addressTypeQRCode = FundWalletAddressType.POLYGON;
        break;
      case ChainBackendNames.BSC:
        addressTypeQRCode = FundWalletAddressType.BSC;
        break;
      case ChainBackendNames.AVALANCHE:
        addressTypeQRCode = FundWalletAddressType.AVALANCHE;
        break;
      case ChainBackendNames.ARBITRUM:
        addressTypeQRCode = FundWalletAddressType.ARBITRUM;
        break;
      case ChainBackendNames.OPTIMISM:
        addressTypeQRCode = FundWalletAddressType.OPTIMISM;
        break;
      case ChainBackendNames.COSMOS:
        addressTypeQRCode = FundWalletAddressType.COSMOS;
        break;
      case ChainBackendNames.OSMOSIS:
        addressTypeQRCode = FundWalletAddressType.OSMOSIS;
        break;
      case ChainBackendNames.NOBLE:
        addressTypeQRCode = FundWalletAddressType.NOBLE;
        break;
      case ChainBackendNames.COREUM:
        addressTypeQRCode = FundWalletAddressType.COREUM;
        break;
      case ChainBackendNames.INJECTIVE:
        addressTypeQRCode = FundWalletAddressType.INJECTIVE;
        break;
      case ChainBackendNames.SOLANA:
        addressTypeQRCode = FundWalletAddressType.SOLANA;
        break;
    }
    setChooseChainModal(false);
    setTimeout(
      () =>
        navigation.navigate(C.screenTitle.QRCODE, {
          addressType: addressTypeQRCode,
        }),
      70,
    );
  };

  /**
   * Handle chain selection for receive flow
   * Simplified callback that properly handles the chain selection
   */
  const handleReceiveChainSelection = (chain: Chain) => {
    onSelectingChain({ item: chain });
  };

  const [deFiFilters, setDeFiFilters] = useState<DeFiFilter>({
    chain: ChainBackendNames.ALL,
    positionTypes: [],
    protocols: [],
    activePositionsOnly: 'No',
  });
  const [fetchDefiData, setFetchDefiData] = useState<boolean>(false);
  const { fetchPortfolio, getLocalPortfolio } = usePortfolio();
  const tabs = [
    { key: 'token', title: t('TOKENS') },
    { key: 'defi', title: t('DEFI') },
    { key: 'nft', title: t('NFTS') },
    { key: 'txn', title: t('TXNS') },
  ];
  const [tabIndex, setTabIndex] = useState<number>(0);

  const swipeableRefs: Array<Swipeable | null> = [];
  let previousOpenedSwipeableRef: Swipeable | null;

  const { show3DSecureModal } = use3DSecure();

  // Redirect logic for imported wallets that do not yet have an RC card
  const hasRedirectedToCard = useRef<boolean>(false);

  useEffect(() => {
    const checkRedirectToCard = async () => {
      // Suppress redirect if user explicitly came from Card Welcome (skip flow)
      if (isFocused && !hasRedirectedToCard.current && !fromCardWelcome) {
        const cardProfile = globalStateContext?.globalState?.cardProfile;
        const isFirstLaunch = await getFirstLaunchAfterWalletCreation();
        if (
          cardProfile &&
          !has(cardProfile, CardProviders.REAP_CARD) &&
          !isFirstLaunch
        ) {
          hasRedirectedToCard.current = true;

          navigation.navigate(C.screenTitle.CARD);
        }
      }
    };

    void checkRedirectToCard();
  }, [
    isFocused,
    fromCardWelcome,
    globalStateContext?.globalState?.cardProfile,
  ]);

  const onSwipe = (key: number) => {
    if (
      previousOpenedSwipeableRef &&
      previousOpenedSwipeableRef !== swipeableRefs[key]
    ) {
      previousOpenedSwipeableRef.close();
    }
    previousOpenedSwipeableRef = swipeableRefs[key];
  };

  const setSwipeableRefs = (index: number, ref: Swipeable | null) => {
    swipeableRefs[index] = ref;
    ref?.close();
  };

  const jwtToken = globalStateContext?.globalState.token;
  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );
  const windowWidth = useWindowDimensions().width;

  const handleBackButton = () => {
    navigation.popToTop();
    return true;
  };

  const appHandler = useCallback(
    (changeType: string) => {
      if (changeType === 'active' || changeType === 'background') {
        if (hdWallet?.state.pinValue) {
          if (changeType === 'background') {
            // Store timestamp when app goes to background
            backgroundTimestampRef.current = Date.now();
          } else if (changeType === 'active') {
            // Check grace period when app becomes active
            const now = Date.now();
            const gracePeriodMs = 2 * 60 * 1000; // 2 minutes in milliseconds

            if (
              backgroundTimestampRef.current &&
              now - backgroundTimestampRef.current < gracePeriodMs
            ) {
              // Within grace period, don't show pin screen
              backgroundTimestampRef.current = null;
              return;
            }

            // Grace period expired or no background timestamp, show pin screen
            backgroundTimestampRef.current = null;
          }
          setAppState(() => changeType);
        }
      }
    },
    [hdWallet?.state.pinValue],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', appHandler);
    return () => {
      subscription.remove();
    };
  }, [appHandler]);

  useEffect(() => {
    const isBackground = appState === 'background';
    const isActive = appState === 'active';

    if (isBackground) {
      // Don't navigate to PIN on background, just store timestamp (handled in appHandler)
      return;
    }

    if (isActive) {
      // Navigate to PIN screen when coming back to active (after grace period check)
      navigation.navigate(C.screenTitle.PIN, { lockScreen: true });
    }
  }, [appState]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const currTimestamp = portfolioData?.lastUpdatedAt;
    const oneMinuteHasPassed = currTimestamp
      ? moment().diff(moment(currTimestamp), 'minutes') >= 1
      : true;
    if (isFocused && (oneMinuteHasPassed || !portfolioData?.portfolio)) {
      void fetchPortfolioData();
      void getHideBalanceStatus().then(resp => {
        if (resp && resp === 'true') {
          hdWallet?.dispatch({
            type: 'TOGGLE_BALANCE_VISIBILITY',
            value: { hideBalance: true },
          });
        } else {
          hdWallet?.dispatch({
            type: 'TOGGLE_BALANCE_VISIBILITY',
            value: { hideBalance: false },
          });
        }
      });
    }
  }, [isFocused]);

  const fetchPortfolioData = async (
    tempIsVerifiedCoinChecked = isVerifyCoinChecked,
  ) => {
    if (isEmpty(portfolioData?.portfolio)) {
      setIsPortfolioLoading(true);
    }
    const localPortfolio = await getLocalPortfolio();
    if (localPortfolio && isEmpty(portfolioData?.portfolio)) {
      setPortfolioBalance(calculatePortfolioBalance(localPortfolio));
      setPortfolioData({
        portfolio: localPortfolio,
        isError: false,
        isPortfolioEmpty: !localPortfolio?.totalHoldings?.length,
        lastUpdatedAt: new Date().toISOString(),
      });
      setIsPortfolioLoading(false);
    }
    setIsPortfolioRefreshing(true);
    const response = await fetchPortfolio(tempIsVerifiedCoinChecked);
    if (response && !response?.isError) {
      if (response.data) {
        setPortfolioBalance(calculatePortfolioBalance(response.data));
      }
      setPortfolioData({
        portfolio: response.data,
        isError: response.isError,
        isPortfolioEmpty: response.isPortfolioEmpty,
        lastUpdatedAt: new Date().toISOString(),
      });
    }
    setIsPortfolioLoading(false);
    setIsPortfolioRefreshing(false);
  };

  const calculatePortfolioBalance = (portfolio: WalletHoldings) => {
    const { totalBalance, totalUnverifiedBalance } =
      getCurrentChainHoldings(portfolio, selectedChain) ?? {};
    const safeTotalBalance = totalBalance ?? 0;
    const safeUnverifiedBalance = totalUnverifiedBalance ?? 0;
    if (isVerifyCoinChecked) {
      return safeTotalBalance.toString();
    } else {
      return safeUnverifiedBalance.toString();
    }
  };

  useEffect(() => {
    void messaging()
      .getInitialNotification()
      .then(async response => {
        await handlePushNotification(response);
      });

    void messaging().onNotificationOpenedApp(async response => {
      await handlePushNotification(response);
    });

    notifee
      .getInitialNotification()
      .then(async response => {
        if (response?.notification) {
          await handlePushNotification(response?.notification as any);
        }
      })
      .catch(error => {
        Sentry.captureException(error);
      });

    notifee.onBackgroundEvent(async remoteMessage => {
      const { type, detail } = remoteMessage;

      if (type === EventType.ACTION_PRESS) {
        const { notification, pressAction } = detail;
        if (notification?.id && pressAction?.id) {
          await RouteNotificationAction({
            notificationId: notification?.id,
            actionId: pressAction?.id,
            data: notification?.data,
            navigation,
            showModal,
            hideModal,
          });
        }
      }
    });

    const unsubscribe = notifee.onForegroundEvent(remoteMessage => {
      const { type, detail } = remoteMessage;
      if (type === EventType.ACTION_PRESS) {
        const { notification, pressAction } = detail;
        if (notification?.id && pressAction?.id) {
          RouteNotificationAction({
            notificationId: notification?.id,
            actionId: pressAction?.id,
            data: notification?.data,
            navigation,
            showModal,
            hideModal,
          }).catch(error => {
            Sentry.captureException(error);
          });
        }
      }
    });

    const getIBCStatus = async () => {
      const data = await getIBC();
      let IBCStatus = false;
      if (data === 'true') IBCStatus = true;
      if (globalStateContext?.globalState?.ibc !== IBCStatus)
        globalStateContext?.globalDispatch({
          type: GlobalContextType.IBC,
          ibc: IBCStatus,
        });
    };

    getIBCStatus().catch(error => {
      Sentry.captureException(error.message);
    });

    void getBridgeData().catch;
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (deFiFilters.chain !== selectedChain.backendName)
      setDeFiFilters({
        ...deFiFilters,
        chain: selectedChain.backendName,
      });
    if (portfolioData?.portfolio) {
      setPortfolioBalance(calculatePortfolioBalance(portfolioData?.portfolio));
    }
  }, [selectedChain]);

  useEffect(() => {
    if (
      connectionType &&
      [
        ConnectionTypes.SOCIAL_LOGIN_EVM,
        ConnectionTypes.SOCIAL_LOGIN_SOLANA,
      ].includes(connectionType)
    ) {
      void deleteSocialAuthWalletIfSessionExpired();
    }
  }, [connectionType, isFocused]);

  const getBridgeData = async () => {
    bridgeDispatch({
      type: BridgeReducerAction.FETCHING,
    });
    const {
      isError: isFetchChainError,
      data: fetchChainData,
      error: fetchChainDataError,
    } = await getWithAuth('/v1/swap/chains?newData=true');

    const {
      isError: isFetchTokenError,
      data: fethcTokenData,
      error: fetchTokenDataError,
    } = await getWithAuth('/v1/swap/tokens?newData=true');

    if (isFetchChainError || isFetchTokenError) {
      bridgeDispatch({
        type: BridgeReducerAction.ERROR,
      });
      if (fetchChainDataError) Sentry.captureException(fetchChainDataError);
      else if (fetchTokenDataError)
        Sentry.captureException(fetchTokenDataError);
    } else {
      const chainData: SwapBridgeChainData[] = fetchChainData;
      const tokenData: Record<string, SwapBridgeTokenData[]> = fethcTokenData;

      bridgeDispatch({
        type: BridgeReducerAction.SUCCESS,
        payload: {
          chainData,
          tokenData,
        },
      });
    }
  };
  async function handlePushNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
  ) {
    if (ethereumAddress) {
      // const localPortfolio = await getPortfolioData(ethereumAddress);
      if (remoteMessage?.data) {
        switch (remoteMessage.data.title) {
          case NotificationEvents.DAPP_BROWSER_OPEN: {
            void logAnalyticsToFirebase(`DAPP_${remoteMessage.data.title}`, {
              from: ethereumAddress,
            });
            navigation.navigate(C.screenTitle.OPTIONS, {
              params: { url: remoteMessage.data.url ?? '' },
              screen: C.screenTitle.BROWSER,
            });
            break;
          }
          case NotificationEvents.ACTIVITY_UPDATE: {
            void logAnalyticsToFirebase('activity_cta', {
              from: ethereumAddress,
            });
            navigation.navigate(C.screenTitle.OPTIONS, {
              screen: C.screenTitle.ACTIVITIES,
            });
            break;
          }
          case NotificationEvents.ADDRESS_ACTIVITY_WEBHOOK: {
            void logAnalyticsToFirebase('address_activity_cta', {
              from: ethereumAddress,
            });
            const url = remoteMessage.data.url;
            if (url) {
              navigation.navigate(C.screenTitle.TRANS_DETAIL, { url });
            }
            break;
          }
          case NotificationEvents.CARD_APPLICATION_UPDATE: {
            void logAnalyticsToFirebase('card_application_cta', {
              from: ethereumAddress,
            });
            const url = remoteMessage.data.url;
            if (url) {
              navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, { url });
            }
            break;
          }
          case NotificationEvents.CARD_TXN_UPDATE: {
            const { categoryId, cardId, url, provider, declineCode } =
              remoteMessage.data;

            if (
              declineCode === CypherDeclineCodes.MERCHANT_DENIED ||
              declineCode === CypherDeclineCodes.NEW_MERCHANT_HIGH_SPEND_RULE ||
              declineCode === CypherDeclineCodes.MERCHANT_GLOBAL
            ) {
              showModal(GlobalModalType.TRANSACTION_DECLINE_HANDLING, {
                data: remoteMessage.data,
                closeModal: hideModal,
              });
            }

            if (categoryId && declineCode) {
              void logAnalyticsToFirebase(
                AnalyticEvent.CARD_DECLINE_ADD_TXN_CTA,
                {
                  from: ethereumAddress,
                },
              );

              if (cardId && provider) {
                if (
                  QUICK_ACTION_NOTIFICATION_CATEGORY_IDS.includes(
                    declineCode as CypherDeclineCodes | RPCODES,
                  )
                ) {
                  showModal(GlobalModalType.CARD_ACTIONS_FROM_NOTIFICATION, {
                    closeModal: () => {
                      hideModal();
                    },
                    data: {
                      ...remoteMessage.data,
                      navigation,
                    },
                  });
                } else {
                  navigation.navigate(C.screenTitle.CARD_CONTROLS, {
                    cardId,
                    currentCardProvider: provider,
                  });
                }
              }

              break;
            } else {
              void logAnalyticsToFirebase(AnalyticEvent.CARD_TXN_CTA, {
                from: ethereumAddress,
              });
              if (url) {
                navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, { url });
              }
              break;
            }
          }
          case NotificationEvents.THREE_DS_APPROVE: {
            show3DSecureModal({
              data: remoteMessage.data,
            });
            break;
          }
        }
      }
    }
  }

  const onWCSuccess = (e: QRScanEvent) => {
    const link = e.data;
    if (link.startsWith('wc')) {
      navigation.navigate(C.screenTitle.OPTIONS, {
        params: { walletConnectURI: link },
        screen: C.screenTitle.WALLET_CONNECT,
      });
    } else {
      // Extract address from URI schemes using utility function
      const extractedAddress = extractAddressFromURI(link);

      // Validate if the extracted string is a valid wallet address for any supported chain
      if (extractedAddress) {
        const detectedChain = findChainOfAddress(extractedAddress);

        if (detectedChain) {
          // Valid wallet address detected, navigate to enter_amount screen

          // Log analytics for wallet address QR scan
          void logAnalyticsToFirebase('qr_wallet_address_scanned', {
            chain: detectedChain,
            from: ethereumAddress,
          });

          navigation.navigate(C.screenTitle.ENTER_AMOUNT, {
            sendAddress: extractedAddress,
          });
        } else {
          // Not a valid wallet address, show error
          showModal('state', {
            type: 'error',
            title: t('UNRECOGNIZED_QR_CODE'),
            description: t('UNRECOGNIZED_QR_CODE_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        // Could not extract any address from the scanned data
        showModal('state', {
          type: 'error',
          title: t('UNRECOGNIZED_QR_CODE'),
          description: t('UNRECOGNIZED_QR_CODE_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    }
  };

  const renderPortfolioItem: ListRenderItem<Holding> = ({ item, index }) => {
    return (
      <CyDView className='mx-[10px]'>
        <PortfolioTokenItem
          item={item}
          index={index}
          isVerifyCoinChecked={false}
          navigation={navigation}
          onSwipe={onSwipe}
          setSwipeableRefs={setSwipeableRefs}
        />
      </CyDView>
    );
  };

  const RenderPortfolioTokensList = useCallback(() => {
    const tempTotalHoldings = portfolioData?.portfolio
      ? getCurrentChainHoldings(portfolioData?.portfolio, selectedChain)
          ?.totalHoldings
      : [];
    return (
      <CyDFlatList
        data={tempTotalHoldings}
        scrollEnabled={false}
        renderItem={renderPortfolioItem as ListRenderItem<unknown>}
        getItemLayout={(_data, index) => ({
          length: 60,
          offset: 60 * index,
          index,
        })}
        ListEmptyComponent={
          <TokenListEmptyComponent
            navigation={navigation}
            isPortfolioEmpty={portfolioData?.isPortfolioEmpty ?? false}
            onRefresh={() => {
              void fetchPortfolioData();
            }}
          />
        }
      />
    );
  }, [portfolioData, selectedChain]);

  const RenderPortfolioTokens = useMemo(() => {
    return (
      <CyDView style={{ width: windowWidth }}>
        <RefreshTimerBar
          isRefreshing={isPortfolioRefreshing}
          isVerifyCoinChecked={isVerifyCoinChecked}
          setIsVerifyCoinChecked={(isVerified: boolean) => {
            void fetchPortfolioData(isVerified);
            setIsVerifyCoinChecked(isVerified);
          }}
          lastUpdatedAt={portfolioData?.lastUpdatedAt ?? ''}
        />
        <RenderPortfolioTokensList />
      </CyDView>
    );
  }, [
    portfolioData,
    portfolioBalance,
    isPortfolioRefreshing,
    isVerifyCoinChecked,
    selectedChain,
  ]);

  const RenderDefiScene = useMemo(() => {
    return (
      <CyDView style={{ width: windowWidth }}>
        <DeFiScene
          navigation={navigation}
          filters={deFiFilters}
          setFilters={setDeFiFilters}
          refreshDefiData={fetchDefiData}
          setRefreshDefiData={setFetchDefiData}
        />
      </CyDView>
    );
  }, [deFiFilters, fetchDefiData]);

  const RenderNftScene = useMemo(() => {
    return (
      <CyDView style={{ width: windowWidth }}>
        <NFTScene
          navigation={navigation}
          selectedChain={selectedChain.symbol}
        />
      </CyDView>
    );
  }, [selectedChain]);

  const RenderTxnHistoryScene = useMemo(() => {
    return (
      <CyDView style={{ width: windowWidth }}>
        <FilterBar setFilterModalVisible={setFilterModalVisible} />
        <TXNScene
          navigation={navigation}
          selectedChain={selectedChain}
          filterModalVisibilityState={[
            filterModalVisible,
            setFilterModalVisible,
          ]}
        />
      </CyDView>
    );
  }, [selectedChain.chainIdNumber, filterModalVisible, setFilterModalVisible]);

  const scenesData = [
    {
      title: 'tokens',
      scene: RenderPortfolioTokens,
    },
    {
      title: 'defi',
      scene: RenderDefiScene,
    },
    {
      title: 'nft',
      scene: RenderNftScene,
    },
    { title: 'txnHistory', scene: RenderTxnHistoryScene },
  ];

  // Render sticky tabs header
  const renderTabsHeader = (): JSX.Element => {
    return (
      <CyDView className='bg-n20 pt-[12px] px-[20px]'>
        <CyDView className='flex flex-row items-center gap-[20px]'>
          {tabs.map((tab, index) => {
            return (
              <CyDTouchView
                className='pb-[12px]'
                key={index}
                onPress={() => {
                  setTabIndex(index);
                }}>
                <CyDText
                  className={clsx('text-[16px]', {
                    'font-bold text-base400': index === tabIndex,
                    'font-normal text-n100': index !== tabIndex,
                  })}>
                  {tab.title}
                </CyDText>
              </CyDTouchView>
            );
          })}
        </CyDView>
      </CyDView>
    );
  };

  // Sections for SectionList
  const sections = [
    {
      title: 'balance',
      data: ['StaticView1'],
      renderItem: () => (
        <Banner
          portfolioBalance={portfolioBalance}
          selectedChain={selectedChain}
          onChainPress={() => setChooseChain(true)}
          onSendPress={handleSendPress}
          onReceivePress={handleReceivePress}
          onSwapPress={handleSwapPress}
          onMorePress={handleMorePress}
        />
      ),
    },
    // Show "Get your first token" banner for new wallets with zero balance
    ...(portfolioBalance === '' ||
    portfolioBalance === '0' ||
    Number(portfolioBalance) === 0
      ? [
          {
            title: 'getFirstToken',
            data: ['StaticView0'],
            renderItem: () => (
              // Ensure the promo card stretches full-width so its gradient border
              // is visible on all edges under RN 0.83 + Fabric.
              <CyDView className='bg-n20 px-[10px] pt-[16px] pb-[16px] w-full'>
                <GetFirstTokenComponent
                  onGetTokenPress={handleShowGetTokenSheet}
                />
              </CyDView>
            ),
          },
        ]
      : []),
    {
      title: 'banners',
      data: ['StaticView2'],
      renderItem: () => (
        <CyDView className='bg-n20'>
          {jwtToken !== undefined ? <BannerCarousel /> : <></>}
        </CyDView>
      ),
    },
    {
      title: 'scenes',
      data: ['tabContent'],
      renderItem: () => scenesData[tabIndex].scene,
    },
  ];

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      {isPortfolioLoading && (
        <CyDView className='justify-center items-center bg-n20'>
          <Loading />
        </CyDView>
      )}

      {portfolioData?.isError && (
        <CyDView className='h-full justify-center items-center bg-n20'>
          <CyDImage
            source={AppImages.NETWORK_ERROR}
            className='h-[90px] w-[90px]'
            resizeMode='contain'
          />
          <Button
            title='Retry'
            onPress={() => {
              void fetchPortfolioData();
            }}
            style='px-[45px] mt-[20px]'
          />
        </CyDView>
      )}
      {!isPortfolioLoading ? (
        <>
          <ChooseChainModalV2
            isModalVisible={chooseChain}
            setModalVisible={setChooseChain}
            data={hdWallet ? getAvailableChains(hdWallet) : []}
            title={t('CHOOSE_CHAIN') ?? 'Choose Chain'}
            selectedItem={selectedChain.name}
            onPress={(item: { item: Chain }) => {
              setSelectedChain(item.item);
              setChooseChain(false);
            }}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
          />
          {/* Header on dark background */}
          <CyDView className='bg-n0'>
            <HeaderBar
              navigation={navigation}
              onWCSuccess={onWCSuccess}
              selectedChain={selectedChain}
            />
          </CyDView>
          <SectionList
            className='bg-n20'
            sections={sections}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ section }) => section.renderItem()}
            renderSectionHeader={({ section }) => {
              // Only render sticky header for the 'scenes' section (tabs)
              if (section.title === 'scenes') {
                return renderTabsHeader();
              }
              return null;
            }}
            showsVerticalScrollIndicator={false}
            refreshing={false}
            onRefresh={() => {
              if (tabIndex === 0) {
                void fetchPortfolioData();
              } else if (tabIndex === 1) {
                setFetchDefiData(true);
              }
            }}
            stickySectionHeadersEnabled={true}
            contentContainerStyle={styles.contentContainer}
          />

          {/* Buy coin modal */}
          <CyDModalLayout
            isModalVisible={buyModalVisible}
            setModalVisible={setBuyModalVisible}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
            onModalHide={() => {
              if (pendingBuyAction) {
                setBuyChooseChainModalVisible(true);
                setPendingBuyAction(false);
              }
            }}
            style={styles.bottomModalNoPadding}>
            <CyDView
              className={
                'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px] max-h-[90%]'
              }>
              <CyDTouchView
                onPress={() => setBuyModalVisible(false)}
                className={'z-50 absolute top-[24px] right-[24px]'}>
                <CyDMaterialDesignIcons
                  name={'close'}
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
              <CyDText
                className={'text-center font-bold text-[22px] mb-[14px]'}>
                {'Choose platform to buy'}
              </CyDText>
              <CyDFlatList
                data={buyOptionsData}
                renderItem={({ item }) =>
                  renderBuyPlatformItem(item as IBuyOptionsData)
                }
                keyExtractor={(item: unknown) =>
                  (item as IBuyOptionsData).index.toString()
                }
                showsVerticalScrollIndicator={true}
              />
            </CyDView>
          </CyDModalLayout>

          {/* Select chain in buy coin modal */}
          <CyDModalLayout
            isModalVisible={buyChooseChainModalVisible}
            setModalVisible={setBuyChooseChainModalVisible}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
            style={styles.bottomModalNoPadding}>
            <CyDView
              className={'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px]'}>
              <CyDView
                className={'flex flex-row justify-between items-center '}>
                <CyDTouchView
                  onPress={() => {
                    setBuyChooseChainModalVisible(false);
                    setTimeout(() => setBuyModalVisible(true), 250);
                  }}
                  className={''}>
                  <CyDMaterialDesignIcons
                    name={'arrow-left'}
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
                <CyDView className={'flex flex-row'}>
                  {buyType && (
                    <>
                      <CyDImage
                        source={buyType.logo}
                        className={'w-[20px] h-[20px]'}
                      />
                      <CyDText
                        className={
                          'text-center font-bold text-[16px] ml-[6px]'
                        }>
                        {buyType.title}
                      </CyDText>
                    </>
                  )}
                </CyDView>
                <CyDTouchView
                  onPress={() => setBuyChooseChainModalVisible(false)}
                  className={''}>
                  <CyDMaterialDesignIcons
                    name={'close'}
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>
              <CyDText
                className={'text-center font-bold text-[22px] my-[20px]'}>
                {t('CHOOSE_CHAIN') ?? 'Choose Chain'}
              </CyDText>
              <CyDFlatList
                data={chainData}
                renderItem={({ item }) => renderChainItem(item as Chain)}
                keyExtractor={(item: unknown) => (item as Chain).backendName}
                showsVerticalScrollIndicator={true}
              />
            </CyDView>
          </CyDModalLayout>

          {/* Sell coin modal */}
          <CyDModalLayout
            isModalVisible={sellModalVisible}
            setModalVisible={setSellModalVisible}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
            onModalHide={() => {
              if (pendingSellAction) {
                setSellChooseChainModalVisible(true);
                setPendingSellAction(false);
              }
            }}
            style={styles.bottomModalNoPadding}>
            <CyDView
              className={
                'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px] max-h-[90%]'
              }>
              <CyDTouchView
                onPress={() => setSellModalVisible(false)}
                className={'z-50 absolute top-[24px] right-[24px]'}>
                <CyDMaterialDesignIcons
                  name={'close'}
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
              <CyDText
                className={'text-center font-bold text-[22px] mb-[14px]'}>
                {t('CHOOSE_PLATFORM_TO_SELL', 'Choose platform to sell')}
              </CyDText>
              <CyDFlatList
                data={sellOptionsData}
                renderItem={({ item }) =>
                  renderSellPlatformItem(item as ISellOptionsData)
                }
                keyExtractor={(item: unknown) =>
                  (item as ISellOptionsData).index.toString()
                }
                showsVerticalScrollIndicator={true}
              />
            </CyDView>
          </CyDModalLayout>

          {/* Select chain in sell coin modal */}
          <CyDModalLayout
            isModalVisible={sellChooseChainModalVisible}
            setModalVisible={setSellChooseChainModalVisible}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
            style={styles.bottomModalNoPadding}>
            <CyDView
              className={'relative bg-n20 p-[40px] rounded-t-[36px] pb-[40px]'}>
              <CyDView
                className={'flex flex-row justify-between items-center '}>
                <CyDTouchView
                  onPress={() => {
                    setSellChooseChainModalVisible(false);
                    setTimeout(() => setSellModalVisible(true), 250);
                  }}
                  className={''}>
                  <CyDMaterialDesignIcons
                    name={'arrow-left'}
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
                <CyDView className={'flex flex-row'}>
                  {sellType && (
                    <>
                      <CyDImage
                        source={sellType.logo}
                        className={'w-[20px] h-[20px]'}
                      />
                      <CyDText
                        className={
                          'text-center font-bold text-[16px] ml-[6px]'
                        }>
                        {sellType.title}
                      </CyDText>
                    </>
                  )}
                </CyDView>
                <CyDTouchView
                  onPress={() => setSellChooseChainModalVisible(false)}
                  className={''}>
                  <CyDMaterialDesignIcons
                    name={'close'}
                    size={24}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>
              <CyDText
                className={'text-center font-bold text-[22px] my-[20px]'}>
                {t('CHOOSE_CHAIN') ?? 'Choose Chain'}
              </CyDText>
              <CyDFlatList
                data={chainData}
                renderItem={({ item }) => renderSellChainItem(item as Chain)}
                keyExtractor={(item: unknown) => (item as Chain).backendName}
                showsVerticalScrollIndicator={true}
              />
            </CyDView>
          </CyDModalLayout>

          {/* Choose chain modal for receive */}
          <ChooseChainModalV2
            setModalVisible={setChooseChainModal}
            isModalVisible={chooseChainModal}
            data={chainData}
            title={t('CHOOSE_CHAIN') ?? 'Choose Chain'}
            selectedItem={'Ethereum'}
            onPress={(item: { item: Chain; index: number }) =>
              handleReceiveChainSelection(item.item)
            }
            customStyle={styles.chooseChainModalStyle}
            isClosable={true}
            animationOut={'slideOutDown'}
            animationIn={'slideInUp'}
          />
        </>
      ) : null}
    </CyDSafeAreaView>
  );
}

interface TokenListEmptyComponentProps {
  navigation: any;
  isPortfolioEmpty: boolean;
  onRefresh: () => void;
}

const TokenListEmptyComponent = ({
  navigation,
  isPortfolioEmpty,
  onRefresh,
}: TokenListEmptyComponentProps) => {
  const { t } = useTranslation();
  if (isPortfolioEmpty) {
    return (
      <CyDView className={'flex h-full justify-start items-center mt-[5px]'}>
        <CyDLottieView
          source={AppImages.PORTFOLIO_EMPTY}
          autoPlay
          loop
          style={styles.lottieView}
        />
        <Button
          title={t('FUND_WALLET')}
          onPress={() => {
            navigation.navigate(C.screenTitle.QRCODE);
          }}
          style='mt-[-40px] px-[20px] h-[40px] py-[0px]'
          titleStyle='text-[14px]'
          image={AppImages.RECEIVE}
          imageStyle='h-[12px] w-[12px] mr-[15px]'
        />
        <CyDTouchView
          className='mt-[20px]'
          onPress={() => {
            void onRefresh();
          }}>
          <CyDText className='text-center text-blue-500 underline'>
            {t<string>('CLICK_TO_REFRESH')}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    );
  } else {
    return (
      <CyDView className='flex flex-col justify-start items-center w-[100px] mt-8'>
        <CyDFastImage
          source={AppImages.EMPTY}
          className='w-[150px] h-[150px]'
        />
        <CyDText className='mt-[15px] text-[14px]'>
          {t('NO_CURRENT_HOLDINGS')}
        </CyDText>
      </CyDView>
    );
  }
};

const styles = StyleSheet.create({
  lottieView: {
    width: '60%',
  },
  bottomModalNoPadding: {
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  chooseChainModalStyle: {
    justifyContent: 'flex-end',
    padding: 0,
  },
  contentContainer: {
    paddingBottom: 50,
  },
});
