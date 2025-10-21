import notifee, { EventType } from '@notifee/react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { ParamListBase, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { get, isEmpty } from 'lodash';
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
  FlatList,
  ListRenderItem,
  SectionList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { BarCodeReadEvent } from 'react-native-camera';
import { Swipeable } from 'react-native-gesture-handler';
import AppImages from '../../../assets/images/appImages';
import {
  ChooseChainModal,
  WHERE_PORTFOLIO,
} from '../../components/ChooseChainModal';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import PortfolioTokenItem from '../../components/v2/portfolioTokenItem';
import { use3DSecure } from '../../components/v2/threeDSecureApprovalModalContext';
import CyDTokenValue from '../../components/v2/tokenValue';
import { QUICK_ACTION_NOTIFICATION_CATEGORY_IDS } from '../../constants/data';
import {
  ConnectionTypes,
  CypherDeclineCodes,
  GlobalContextType,
  GlobalModalType,
  RPCODES,
} from '../../constants/enum';
import * as C from '../../constants/index';
import {
  Chain,
  CHAIN_COLLECTION,
  ChainBackendNames,
  NotificationEvents,
} from '../../constants/server';
import { getHideBalanceStatus, getIBC } from '../../core/asyncStorage';
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
import useConnectionManager from '../../hooks/useConnectionManager';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

export interface PortfolioProps {
  navigation: NativeStackNavigationProp<ParamListBase>;
}

export default function Portfolio({ navigation }: PortfolioProps) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
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
  const horrizontalFlatListRef = useRef<FlatList>(null);

  const swipeableRefs: Array<Swipeable | null> = [];
  let previousOpenedSwipeableRef: Swipeable | null;

  const { show3DSecureModal } = use3DSecure();

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
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
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

  const onWCSuccess = (e: BarCodeReadEvent) => {
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

  // Sections for SectionList
  const sections = [
    {
      title: 'balance',
      data: ['StaticView1'],
      renderItem: () => <Banner portfolioBalance={portfolioBalance} />,
    },
    {
      title: 'banners',
      data: ['StaticView2'],
      renderItem: () => (jwtToken !== undefined ? <BannerCarousel /> : <></>),
    },
    {
      title: 'scenes',
      data: [''],
      renderItem: () => scenesData[tabIndex].scene,
    },
  ];

  return (
    <CyDSafeAreaView className='flex-1 bg-n20'>
      {isPortfolioLoading && (
        <CyDView className='justify-center items-center'>
          <Loading />
        </CyDView>
      )}

      {portfolioData?.isError && (
        <CyDView className='h-full justify-center items-center'>
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
          <ChooseChainModal
            isModalVisible={chooseChain}
            onPress={() => {
              setChooseChain(false);
            }}
            selectedChain={selectedChain}
            setSelectedChain={setSelectedChain}
            where={WHERE_PORTFOLIO}
          />
          <HeaderBar
            navigation={navigation}
            renderTitleComponent={
              <CyDTokenValue className='text-[24px] font-extrabold '>
                {portfolioBalance}
              </CyDTokenValue>
            }
            setChooseChain={setChooseChain}
            selectedChain={selectedChain}
            onWCSuccess={onWCSuccess}
          />
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, section }) => section.renderItem()}
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
            renderSectionHeader={({ section: { title } }) =>
              title === 'scenes' ? (
                <CyDView className='flex flex-row justify-start items-center py-[12px] pl-[20px] bg-n20'>
                  {tabs.map((tab, index) => {
                    return (
                      <CyDTouchView
                        className={clsx(
                          'mr-[16px] px-[12px] py-[2px] rounded-[6px]',
                          {
                            'bg-p40': index === tabIndex,
                          },
                        )}
                        key={index}
                        onPress={() => {
                          horrizontalFlatListRef?.current?.scrollToIndex({
                            index,
                            animated: true, // Scroll smoothly
                          });
                          setTabIndex(index);
                        }}>
                        <CyDText
                          className={clsx('', {
                            'font-semibold text-black': index === tabIndex,
                          })}>
                          {tab.title}
                        </CyDText>
                      </CyDTouchView>
                    );
                  })}
                </CyDView>
              ) : (
                <></>
              )
            }
            contentContainerStyle={styles.sectionListContent}
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
  sectionListContent: {
    paddingBottom: 80,
  },
});
