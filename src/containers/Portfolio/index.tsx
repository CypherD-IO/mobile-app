/**
 * @format
 * @flow
 */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  BackHandler,
  FlatList,
  ListRenderItem,
  SectionList,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import analytics from '@react-native-firebase/analytics';
import * as C from '../../constants/index';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import {
  ChooseChainModal,
  WHERE_PORTFOLIO,
} from '../../components/ChooseChainModal';
import EmptyView from '../../components/EmptyView';
import {
  CyDImage,
  CyDView,
  CyDSafeAreaView,
  CyDFlatList,
  CyDText,
  CyDTouchView,
} from '../../styles/tailwindStyles';
import {
  CHAIN_COLLECTION,
  Chain,
  ChainBackendNames,
  NotificationEvents,
} from '../../constants/server';
import CopytoKeyModal from '../../components/ShowPharseModal';
import {
  getCurrentChainHoldings,
  Holding,
  WalletHoldings,
} from '../../core/portfolio';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import {
  getPortfolioData,
  getIBC,
  getHideBalanceStatus,
} from '../../core/asyncStorage';
import { useIsFocused } from '@react-navigation/native';
import { GlobalContext } from '../../core/globalContext';
import { HdWalletContext } from '../../core/util';
import {
  GlobalContextType,
  TokenOverviewTabIndices,
} from '../../constants/enum';
import Button from '../../components/v2/button';
import { HeaderBar, Banner, RefreshTimerBar } from './components';
import { BarCodeReadEvent } from 'react-native-camera';
import { DeFiScene, NFTScene, TXNScene } from './scenes';
import CyDTokenValue from '../../components/v2/tokenValue';
import moment from 'moment';
import clsx from 'clsx';
import FilterBar from './components/FilterBar';
import BannerCarousel from './components/BannerCarousel';
import { DeFiFilter, protocolOptionType } from '../../models/defi.interface';
import { isEmpty } from 'lodash';
import {
  BridgeContext,
  BridgeContextDef,
  BridgeReducerAction,
} from '../../reducers/bridge.reducer';
import useAxios from '../../core/HttpRequest';
import { SwapBridgeChainData, SwapBridgeTokenData } from '../Bridge';
import usePortfolio from '../../hooks/usePortfolio';
import { IPortfolioData } from '../../models/portfolioData.interface';
import PortfolioTokenItem from '../../components/v2/portfolioTokenItem';
import { Swipeable } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';

export interface PortfolioProps {
  navigation: any;
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

  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [isVerifyCoinChecked, setIsVerifyCoinChecked] = useState<boolean>(true);
  const [copyToClipBoard, setCopyToClipBoard] = useState<boolean>(false);
  const [appState, setAppState] = useState<string>('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [deFiFilters, setDeFiFilters] = useState<DeFiFilter>({
    chain: ChainBackendNames.ALL,
    positionTypes: [],
    protocols: [],
    activePositionsOnly: 'No',
  });

  const [deFiFilterVisible, setDeFiFilterVisible] = useState<boolean>(false);
  const [userProtocols, setUserProtocls] = useState<protocolOptionType[]>([]);
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
  const ethereum = hdWallet?.state.wallet.ethereum;
  const windowWidth = useWindowDimensions().width;

  const handleBackButton = () => {
    navigation.popToTop();
    return true;
  };

  const appHandler = (changeType: string) => {
    if (changeType === 'active' || changeType === 'background') {
      if (hdWallet?.state.pinValue) {
        setAppState(() => changeType);
      }
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', appHandler);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const isBackground = appState === 'background';
    if (isBackground) {
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
    if (localPortfolio) {
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
    const {
      totalBalance,
      totalStakedBalance,
      totalUnverifiedBalance,
      totalUnbondingBalance,
    } = getCurrentChainHoldings(portfolio, selectedChain) ?? {};
    if (isVerifyCoinChecked) {
      return (
        Number(totalBalance) +
        Number(totalStakedBalance) +
        Number(totalUnbondingBalance)
      );
    } else {
      return (
        Number(totalUnverifiedBalance) +
        Number(totalStakedBalance) +
        Number(totalUnbondingBalance)
      );
    }
  };

  useEffect(() => {
    messaging().onNotificationOpenedApp(handlePushNotification);

    void messaging().getInitialNotification().then(handlePushNotification);
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
  }, []);

  useEffect(() => {
    console.log('useEffect chain');
    if (deFiFilters.chain !== selectedChain.backendName)
      setDeFiFilters({
        ...deFiFilters,
        chain: selectedChain.backendName as ChainBackendNames,
      });
    if (portfolioData?.portfolio) {
      setPortfolioBalance(calculatePortfolioBalance(portfolioData?.portfolio));
    }
  }, [selectedChain]);

  const getBridgeData = async () => {
    console.log('getBridgeData');
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

  const constructTokenMeta = (
    localPortfolio: { data: WalletHoldings },
    event: string,
  ) => {
    switch (event) {
      case NotificationEvents.COSMOS_STAKING: {
        const [tokenData] = localPortfolio.data.cosmos.totalHoldings.filter(
          (holding: Holding) => holding.name === 'ATOM',
        );
        return tokenData;
      }
      case NotificationEvents.OSMOSIS_STAKING: {
        const [tokenData] = localPortfolio.data.osmosis.totalHoldings.filter(
          (holding: Holding) => holding.name === 'Osmosis',
        );
        return tokenData;
      }
      case NotificationEvents.JUNO_STAKING: {
        const [tokenData] = localPortfolio.data.juno.totalHoldings.filter(
          (holding: Holding) => holding.name === 'Juno',
        );
        return tokenData;
      }
      case NotificationEvents.STARGAZE_STAKING: {
        const [tokenData] = localPortfolio.data.stargaze.totalHoldings.filter(
          (holding: Holding) => holding.name === 'Stargaze',
        );
        return tokenData;
      }
      case NotificationEvents.NOBLE_STAKING: {
        const [tokenData] = localPortfolio.data.noble.totalHoldings.filter(
          (holding: Holding) => holding.name === 'Noble',
        );
        return tokenData;
      }
    }
  };

  async function handlePushNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
  ) {
    //   'Notification caused app to open from background state:',
    if (ethereum) {
      const localPortfolio = await getPortfolioData(ethereum);
      if (remoteMessage?.data) {
        switch (remoteMessage.data.title) {
          case NotificationEvents.DAPP_BROWSER_OPEN: {
            void analytics().logEvent(`DAPP_${remoteMessage.data.title}`, {
              from: ethereum.address,
            });
            navigation.navigate(C.screenTitle.BROWSER, {
              params: { url: remoteMessage.data.url ?? '' },
              screen: C.screenTitle.BROWSER_SCREEN,
            });
            break;
          }
          case NotificationEvents.BEEFY_FINANCE: {
            void analytics().logEvent('beefy_cta', {
              from: ethereum.address,
            });
            navigation.navigate(C.screenTitle.BROWSER, {
              params: {
                url: remoteMessage.data.url ?? 'https://app.beefy.com/',
              },
              screen: C.screenTitle.BROWSER_SCREEN,
            });
            break;
          }
          case NotificationEvents.COSMOS_STAKING: {
            void analytics().logEvent('cosmos_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.cosmos.address],
              chain: 'COSMOS',
            });
            const tknData = constructTokenMeta(
              localPortfolio,
              NotificationEvents.COSMOS_STAKING,
            );
            navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING,
            });
            break;
          }
          case NotificationEvents.OSMOSIS_STAKING: {
            void analytics().logEvent('osmosis_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.osmosis.address],
              chain: 'OSMOSIS',
            });
            const tknData = constructTokenMeta(
              localPortfolio,
              NotificationEvents.OSMOSIS_STAKING,
            );
            navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING,
            });
            break;
          }
          case NotificationEvents.JUNO_STAKING: {
            void analytics().logEvent('juno_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.juno.address],
              chain: 'JUNO',
            });
            const tknData = constructTokenMeta(
              localPortfolio,
              NotificationEvents.JUNO_STAKING,
            );

            navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING,
            });
            break;
          }
          case NotificationEvents.STARGAZE_STAKING: {
            void analytics().logEvent('stargaze_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.stargaze.address],
              chain: 'STARGAZE',
            });
            const tknData = constructTokenMeta(
              localPortfolio,
              NotificationEvents.STARGAZE_STAKING,
            );
            navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING,
            });
            break;
          }
          case NotificationEvents.NOBLE_STAKING: {
            void analytics().logEvent('noble_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.noble.address],
              chain: 'NOBLE',
            });
            const tknData = constructTokenMeta(
              localPortfolio,
              NotificationEvents.NOBLE_STAKING,
            );
            navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING,
            });
            break;
          }
          case NotificationEvents.ACTIVITY_UPDATE: {
            void analytics().logEvent('activity_cta', {
              from: ethereum.address,
            });
            navigation.navigate(C.screenTitle.ACTIVITIES);
            break;
          }
          case NotificationEvents.ORBITAL_APES: {
            void analytics().logEvent('orbital_apes_cta', {
              from: ethereum.address,
            });
            if (remoteMessage.data.url) {
              navigation.navigate(C.screenTitle.BROWSER, {
                params: { url: remoteMessage.data.url },
                screen: C.screenTitle.BROWSER_SCREEN,
              });
            }
            break;
          }
          case NotificationEvents.ADDRESS_ACTIVITY_WEBHOOK: {
            void analytics().logEvent('address_activity_cta', {
              from: ethereum.address,
            });
            const url = remoteMessage.data.url;
            if (url) {
              navigation.navigate(C.screenTitle.TRANS_DETAIL, { url });
            }
            break;
          }
          case NotificationEvents.CARD_APPLICATION_UPDATE: {
            void analytics().logEvent('address_activity_cta', {
              from: ethereum.address,
            });
            const url = remoteMessage.data.url;
            if (url) {
              navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, { url });
            }
            break;
          }
          case NotificationEvents.CARD_TXN_UPDATE: {
            void analytics().logEvent('address_activity_cta', {
              from: ethereum.address,
            });
            const url = remoteMessage.data.url;
            if (url) {
              navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, { url });
            }
            break;
          }
        }
      }
    }
  }

  const onWCSuccess = (e: BarCodeReadEvent) => {
    const link = e.data;
    navigation.navigate(C.screenTitle.WALLET_CONNECT, {
      walletConnectURI: link,
    });
  };

  const renderPortfolioItem: ListRenderItem<Holding> = useCallback(
    ({ item, index }) => {
      return (
        <CyDView className='mx-[10px]'>
          <PortfolioTokenItem
            item={item}
            index={index}
            isVerifyCoinChecked={false}
            otherChainsWithToken={[]} // To Do
            navigation={navigation}
            onSwipe={onSwipe}
            setSwipeableRefs={setSwipeableRefs}
          />
        </CyDView>
      );
    },
    [portfolioBalance],
  );

  const RenderPortfolioTokens = useMemo(() => {
    const tempTotalHoldings = portfolioData?.portfolio
      ? getCurrentChainHoldings(portfolioData?.portfolio, selectedChain)
          ?.totalHoldings
      : [];
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
        <CyDFlatList
          data={tempTotalHoldings}
          scrollEnabled={false}
          renderItem={renderPortfolioItem}
          // refreshing={isPortfolioRefreshing}
          // onRefresh={() => {
          //   void fetchPortfolioData();
          // }}
          getItemLayout={(data, index) => ({
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
      </CyDView>
    );
  }, [
    portfolioData,
    portfolioBalance,
    isPortfolioRefreshing,
    isVerifyCoinChecked,
  ]);

  const RenderDefiScene = useMemo(() => {
    return (
      <CyDView style={{ width: windowWidth }}>
        {/* To DO */}
        {/* <DeFiFilterRefreshBar
          isRefreshing={deFiRefreshActivity.isRefreshing}
          lastRefreshed={deFiRefreshActivity.lastRefresh}
          filters={deFiFilters}
          setFilters={setDeFiFilters}
          isFilterVisible={deFiFilterVisible}
          setFilterVisible={setDeFiFilterVisible}
          userProtocols={userProtocols}
          isLoading={deFiLoading}
          setLoading={setDeFiLoading}
        /> */}
        <DeFiScene
          navigation={navigation}
          filters={deFiFilters}
          setFilters={setDeFiFilters}
          userProtocols={userProtocols}
          setUserProtocols={setUserProtocls}
          filterVisible={deFiFilterVisible}
          setFilterVisible={setDeFiFilterVisible}
        />
      </CyDView>
    );
  }, [deFiFilters, deFiFilterVisible, userProtocols]);

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
  }, [selectedChain, filterModalVisible, setFilterModalVisible]);

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
      renderItem: () => {
        return (
          <CyDFlatList
            ref={horrizontalFlatListRef}
            data={scenesData}
            horizontal={true}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={1}
            snapToAlignment='center' // Snap to center of each item
            snapToInterval={windowWidth} // Define the width of each item
            decelerationRate='fast' // Faster snapping effect
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            getItemLayout={(data, index) => ({
              length: windowWidth,
              offset: windowWidth * index,
              index,
            })}
            onMomentumScrollEnd={event => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const snappedIndex = Math.round(contentOffsetX / windowWidth);
              setTabIndex(snappedIndex);
            }}
            renderItem={({ item, index }) => {
              return item.scene;
            }}
          />
        );
      },
    },
  ];

  return (
    <CyDSafeAreaView className='flex-1 bg-white mb-[75px]'>
      {isPortfolioLoading && (
        <CyDView className='justify-center items-center'>
          <EmptyView
            text={'Loading..'}
            image={AppImages.LOADING_IMAGE}
            buyVisible={false}
            marginTop={0}
            isLottie={true}
          />
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
          <CopytoKeyModal
            isModalVisible={copyToClipBoard}
            onClipClick={() => setCopyToClipBoard(false)}
            onPress={() => setCopyToClipBoard(false)}
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
            stickySectionHeadersEnabled={true}
            renderSectionHeader={({ section: { title } }) =>
              title === 'scenes' ? (
                <CyDView className='flex flex-row justify-start items-center py-[12px] pl-[20px] bg-white'>
                  {tabs.map((tab, index) => {
                    return (
                      <CyDTouchView
                        className={clsx(
                          'mr-[16px] px-[12px] py-[2px] rounded-[6px]',
                          {
                            'bg-privacyMessageBackgroundColor':
                              index === tabIndex,
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
                            'font-semibold': index === tabIndex,
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
        <LottieView
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
      <CyDView className='flex flex-col justify-start items-center'>
        <EmptyView
          text={t('NO_CURRENT_HOLDINGS')}
          image={AppImages.EMPTY}
          buyVisible={false}
          marginTop={30}
        />
      </CyDView>
    );
  }
};

const styles = StyleSheet.create({
  lottieView: {
    width: '60%',
  },
});
