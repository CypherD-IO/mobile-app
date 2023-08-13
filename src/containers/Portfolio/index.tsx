/**
 * @format
 * @flow
 */
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, useWindowDimensions, FlatList } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import * as C from '../../constants/index';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { ChooseChainModal, WHERE_PORTFOLIO } from '../../components/ChooseChainModal';
import EmptyView from '../../components/EmptyView';
import { CyDImage, CyDTouchView, CyDView, CyDText, CyDSafeAreaView, CyDAnimatedView } from '../../styles/tailwindStyles';
import { Chain, NotificationEvents } from '../../constants/server';
import CopytoKeyModal from '../../components/ShowPharseModal';
import { fetchTokenData, WalletHoldings } from '../../core/Portfolio';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { PORTFOLIO_ERROR, PORTFOLIO_NEW_LOAD, PORTFOLIO_LOADING, PortfolioState } from '../../reducers/portfolio_reducer';
import * as Sentry from '@sentry/react-native';
import { getDeveloperMode, getPortfolioData, getIBC, getHideBalanceStatus } from '../../core/asyncStorage';
import { useIsFocused } from '@react-navigation/native';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { GlobalContextType, ScrollableType, TokenOverviewTabIndices } from '../../constants/enum';
import appsFlyer from 'react-native-appsflyer';
import { TokenMeta } from '../../models/tokenMetaData.model';
import NFTScreen from './NFT';
import Button from '../../components/v2/button';
import clsx from 'clsx';
import { TabView } from 'react-native-tab-view';
import { Tokens } from './Tokens';
import { MessageBanner } from './components/MessageBanner';
import { HeaderBar } from './components/HeaderBar';
import { BalanceBanner } from './components/BBWA';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { BarCodeReadEvent } from 'react-native-camera';
import { Extrapolate, interpolate, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { H_BALANCE_BANNER, H_TAB_BAR, OFFSET_TABVIEW } from './constants';
import { RefreshTimerBar } from './Tokens/RefreshTimerBar';
import { AnimatedBanner, AnimatedTabBar } from './animatedComponents';
import { PortfolioTabView, TabBar, TabRoute } from './components';
import { useScrollManager } from '../../hooks/useScrollManager';
import { Scene } from './components/Scene';

export default function Portfolio (props: { navigation: any | { navigate: (arg0: string, arg1: { params?: { url: string }, screen?: string, tokenData?: any, url?: string } | undefined) => void } }) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const globalStateContext = useContext<GlobalContextDef | null>(GlobalContext);
  const hdWallet = useContext<HdWalletContextDef | null>(HdWalletContext);
  const portfolioState = useContext<PortfolioState | any>(PortfolioContext);
  const { showModal, hideModal } = useGlobalModalContext();

  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [isVerifyCoinChecked, setIsVerifyCoinChecked] = useState<boolean>(true);
  const [copyToClipBoard, setCopyToClipBoard] = useState<boolean>(false);
  const [appState, setAppState] = useState<string>('');
  const [refreshData, setRefreshData] = useState({
    isRefreshing: false,
    shouldRefreshAssets: false
  });

  const tabs = [
    { key: 'token', title: t('TOKENS') },
    { key: 'nft', title: t('NFTS') }
  ];

  // not mentioning the scrollableType correctly will result in errors.
  const tabsWithScrollableType = [
    { key: 'token', title: t('TOKENS'), scrollableType: ScrollableType.FLATLIST },
    { key: 'nft', title: t('NFTS'), scrollableType: ScrollableType.FLATLIST }
  ];

  const {
    scrollY,
    index,
    setIndex,
    getRefForKey,
    ...sceneProps
  } = useScrollManager(tabsWithScrollableType);

  const ethereum = hdWallet?.state.wallet.ethereum;

  const handleBackButton = () => {
    props.navigation.popToTop();
    return true;
  };

  const appHandler = (changeType: any) => {
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
      props.navigation.navigate(C.screenTitle.PIN, { lockScreen: true });
    }
  }, [appState]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      if (
        portfolioState.statePortfolio.portfolioState === PORTFOLIO_ERROR
      ) {
        void analytics().logEvent('portfolio_load_error', {
          from: ethereum?.address
        });
        showModal('state', { type: 'error', title: t('NETWORK_ERROR'), description: t('UNABLE_TO_LOAD_WALLET'), onSuccess: () => { hideModal(); void refresh(); }, onFailure: () => { hideModal(); void refresh(); } });
      } else if (portfolioState.statePortfolio.portfolioState === PORTFOLIO_NEW_LOAD) {
        void refresh();
      }
      void getHideBalanceStatus().then(resp => {
        if (resp && resp === 'true') {
          hdWallet?.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: true } });
        } else {
          hdWallet?.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: false } });
        }
      });
    }
  }, [portfolioState.statePortfolio.portfolioState]);

  useEffect(() => {
    if (isFocused) {
      messaging().onNotificationOpenedApp(handlePushNotification);

      void messaging().getInitialNotification().then(handlePushNotification);

      getDeveloperMode()
        .then((developerMode: boolean) => {
          if (portfolioState?.statePortfolio?.developerMode !== developerMode) portfolioState.dispatchPortfolio({ value: { developerMode } });
        })
        .catch((e) => {
          Sentry.captureException(e.message);
        });

      const getIBCStatus = async () => {
        const data = await getIBC();
        let IBCStatus = false;
        if (data === 'true') IBCStatus = true;
        if (globalStateContext?.globalState?.ibc !== IBCStatus) globalStateContext?.globalDispatch({ type: GlobalContextType.IBC, ibc: IBCStatus });
      };

      getIBCStatus().catch(error => {
        Sentry.captureException(error.message);
      });
    }
  }, [isFocused]);

  const constructTokenMeta = (localPortfolio: any, event: string) => {
    switch (event) {
      case NotificationEvents.EVMOS_STAKING: {
        const [tokenData] = localPortfolio.data.evmos.holdings.filter((holding: TokenMeta) => holding.name === 'Evmos');
        return tokenData;
      }
      case NotificationEvents.COSMOS_STAKING: {
        const [tokenData] = localPortfolio.data.cosmos.holdings.filter((holding: TokenMeta) => holding.name === 'ATOM');
        return tokenData;
      }
      case NotificationEvents.OSMOSIS_STAKING: {
        const [tokenData] = localPortfolio.data.osmosis.holdings.filter((holding: TokenMeta) => holding.name === 'Osmosis');
        return tokenData;
      }
      case NotificationEvents.JUNO_STAKING: {
        const [tokenData] = localPortfolio.data.juno.holdings.filter((holding: TokenMeta) => holding.name === 'Juno');
        return tokenData;
      }
      case NotificationEvents.STARGAZE_STAKING: {
        const [tokenData] = localPortfolio.data.stargaze.holdings.filter((holding: TokenMeta) => holding.name === 'Stargaze');
        return tokenData;
      }
      case NotificationEvents.NOBLE_STAKING: {
        const [tokenData] = localPortfolio.data.noble.holdings.filter((holding: TokenMeta) => holding.name === 'Noble');
        return tokenData;
      }
    }
  };

  async function handlePushNotification (remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) {
    //   'Notification caused app to open from background state:',
    if (ethereum) {
      const localPortfolio = await getPortfolioData(ethereum, portfolioState);
      if (remoteMessage?.data) {
        void appsFlyer.logEvent('notification_opened', remoteMessage.data);
        switch (remoteMessage.data.title) {
          case NotificationEvents.DAPP_BROWSER_OPEN: {
            void analytics().logEvent(`DAPP_${remoteMessage.data.title}`, {
              from: ethereum.address
            });
            props.navigation.navigate(C.screenTitle.BROWSER, {
              params: { url: remoteMessage.data.url ?? '' },
              screen: C.screenTitle.BROWSER_SCREEN
            });
            break;
          }
          case NotificationEvents.BEEFY_FINANCE: {
            void analytics().logEvent('beefy_cta', {
              from: ethereum.address
            });
            props.navigation.navigate(C.screenTitle.BROWSER, {
              params: { url: remoteMessage.data.url ?? 'https://app.beefy.com/' },
              screen: C.screenTitle.BROWSER_SCREEN
            });
            break;
          }
          case NotificationEvents.EVMOS_STAKING: {
            void analytics().logEvent('evmos_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.evmos.address],
              chain: 'EVMOS'
            });
            const tknData = constructTokenMeta(localPortfolio, NotificationEvents.EVMOS_STAKING);
            props.navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING
            });
            break;
          }
          case NotificationEvents.COSMOS_STAKING: {
            void analytics().logEvent('cosmos_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.cosmos.address],
              chain: 'COSMOS'
            });
            const tknData = constructTokenMeta(localPortfolio, NotificationEvents.COSMOS_STAKING);
            props.navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING
            });
            break;
          }
          case NotificationEvents.OSMOSIS_STAKING: {
            void analytics().logEvent('osmosis_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.osmosis.address],
              chain: 'OSMOSIS'
            });
            const tknData = constructTokenMeta(localPortfolio, NotificationEvents.OSMOSIS_STAKING);
            props.navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING
            });
            break;
          }
          case NotificationEvents.JUNO_STAKING: {
            void analytics().logEvent('juno_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.juno.address],
              chain: 'JUNO'
            });
            const tknData = constructTokenMeta(localPortfolio, NotificationEvents.JUNO_STAKING);

            props.navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING
            });
            break;
          }
          case NotificationEvents.STARGAZE_STAKING: {
            void analytics().logEvent('stargaze_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.stargaze.address],
              chain: 'STARGAZE'
            });
            const tknData = constructTokenMeta(localPortfolio, NotificationEvents.STARGAZE_STAKING);
            props.navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING
            });
            break;
          }
          case NotificationEvents.NOBLE_STAKING: {
            void analytics().logEvent('noble_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.noble.address],
              chain: 'NOBLE'
            });
            const tknData = constructTokenMeta(localPortfolio, NotificationEvents.NOBLE_STAKING);
            props.navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING
            });
            break;
          }
          case NotificationEvents.ACTIVITY_UPDATE: {
            void analytics().logEvent('activity_cta', {
              from: ethereum.address
            });
            props.navigation.navigate(C.screenTitle.ACTIVITIES);
            break;
          }
          case NotificationEvents.ORBITAL_APES: {
            void analytics().logEvent('orbital_apes_cta', {
              from: ethereum.address
            });
            if (remoteMessage.data.url) {
              props.navigation.navigate(C.screenTitle.BROWSER, {
                params: { url: remoteMessage.data.url },
                screen: C.screenTitle.BROWSER_SCREEN
              });
            }
            break;
          }
          case NotificationEvents.ADDRESS_ACTIVITY_WEBHOOK: {
            void analytics().logEvent('address_activity_cta', {
              from: ethereum.address
            });
            const url = remoteMessage.data.url;
            if (url) {
              props.navigation.navigate(C.screenTitle.TRANS_DETAIL, { url });
            }
            break;
          }
          case NotificationEvents.CARD_APPLICATION_UPDATE: {
            void analytics().logEvent('address_activity_cta', {
              from: ethereum.address
            });
            const url = remoteMessage.data.url;
            if (url) {
              props.navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, { url });
            }
            break;
          }
          case NotificationEvents.CARD_TXN_UPDATE: {
            void analytics().logEvent('address_activity_cta', {
              from: ethereum.address
            });
            const url = remoteMessage.data.url;
            if (url) {
              props.navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, { url });
            }
            break;
          }
        }
      }
    }
  }

  async function refresh () {
    if (hdWallet) { await fetchTokenData(hdWallet, portfolioState); }
  }

  const onRefresh = useCallback(async (pullToRefresh: boolean = true) => {
    if (hdWallet) {
      setRefreshData({ isRefreshing: true, shouldRefreshAssets: pullToRefresh });
      await fetchTokenData(hdWallet, portfolioState);
      setRefreshData({ isRefreshing: false, shouldRefreshAssets: false });
    }
  }, []);

  useEffect(() => {
    if (isFocused && portfolioState.statePortfolio.portfolioState !== PORTFOLIO_LOADING) {
      void onRefresh(false);
    }
  }, [isFocused]);

  const getAllChainBalance = (portfolioState: { statePortfolio: { selectedChain: Chain, tokenPortfolio: WalletHoldings } }): number => {
    const { totalBalance, totalStakedBalance, totalUnverifiedBalance, totalUnbondingBalance } = portfolioState?.statePortfolio?.tokenPortfolio ?? {};
    if (isVerifyCoinChecked) {
      return Number(totalBalance) + Number(totalStakedBalance) + Number(totalUnbondingBalance);
    } else {
      return Number(totalBalance) + Number(totalUnverifiedBalance) + Number(totalStakedBalance) + Number(totalUnbondingBalance);
    }
  };

  const onWCSuccess = (e: BarCodeReadEvent) => {
    const link = e.data;
    portfolioState.dispatchPortfolio({ value: { walletConnectURI: link } });
    props.navigation.navigate(C.screenTitle.WALLET_CONNECT);
  };

  const isPortfolioLoading = () => {
    return (portfolioState.statePortfolio.portfolioState === PORTFOLIO_NEW_LOAD || portfolioState.statePortfolio.portfolioState === PORTFOLIO_LOADING);
  };

  const isPortfolioError = () => {
    return portfolioState.statePortfolio.portfolioState === PORTFOLIO_ERROR;
  };

  const RenderNFTTab = () => {
    return <CyDView className='mx-[10px] mt-[10px] border border-sepratorColor rounded-t-[24px]'>
              <NFTScreen selectedChain={portfolioState.statePortfolio.selectedChain.symbol} navigation={props.navigation}></NFTScreen>
          </CyDView>;
  };

  const RenderTabView = () => {
    const layout = useWindowDimensions();

    const [index, setIndex] = useState(0);
    const [routes] = useState([
      { key: 'token', title: t('TOKENS') },
      { key: 'nft', title: t('NFTS') }
    ]);

    const tabkeyToScrollableChildRef = useRef<{[key: string]: FlatList}>({}).current;
    const tabkeyToScrollPosition = useRef<{[key: string]: number}>({}).current;

    const trackRef = (key: string, ref: FlatList) => {
      tabkeyToScrollableChildRef[key] = ref;
    };

    const syncScrollOffset = () => {
      const activeTabKey = routes[index].key;
      const scrollValue = tabkeyToScrollPosition[activeTabKey];

      Object.keys(tabkeyToScrollableChildRef).forEach((key) => {
        const scrollRef = tabkeyToScrollableChildRef[key];
        if (!scrollRef || key === activeTabKey) {
          return;
        }

        if (scrollValue <= OFFSET_TABVIEW + H_BALANCE_BANNER) {
          /* header visible */
          scrollRef.scrollToOffset({
            offset: Math.max(
              Math.min(scrollValue, OFFSET_TABVIEW + H_BALANCE_BANNER),
              OFFSET_TABVIEW
            ),
            animated: false
          });
          tabkeyToScrollPosition[key] = scrollValue;
        } else if (
          tabkeyToScrollPosition[key] < OFFSET_TABVIEW + H_BALANCE_BANNER ||
          tabkeyToScrollPosition[key] == null
        ) {
          /* header hidden */
          scrollRef.scrollToOffset({
            offset: OFFSET_TABVIEW + H_BALANCE_BANNER,
            animated: false
          });
          tabkeyToScrollPosition[key] =
            OFFSET_TABVIEW + H_BALANCE_BANNER;
        }
      });
    };

    useAnimatedReaction(
      () => { return scrollY.value; },
      (value) => { const activeTab = routes[index].key; tabkeyToScrollPosition[activeTab] = value; },
      [index, scrollY, routes, tabkeyToScrollPosition]
    );

    useEffect(() => {
      if (isFocused && !portfolioState.statePortfolio.developerMode && index === 1) {
        setIndex(0);
      }
    }, [portfolioState.statePortfolio.developerMode]);

    const RenderTabViewTabBar = () => {
      const animatedTranslateY = useAnimatedStyle(() => {
        const translateY = interpolate(scrollY.value, [OFFSET_TABVIEW, OFFSET_TABVIEW + H_BALANCE_BANNER], [H_BALANCE_BANNER, 0], Extrapolate.CLAMP);
        return {
          transform: [{ translateY }]
        };
      });
      const animatedOpacity = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [OFFSET_TABVIEW + H_BALANCE_BANNER, OFFSET_TABVIEW + H_BALANCE_BANNER + H_TAB_BAR], [0, 1], Extrapolate.CLAMP);
        return {
          opacity
        };
      });
      return (
        <CyDView>
          <CyDAnimatedView className={'z-10 w-full bg-white'} style={animatedTranslateY}>
            <CyDAnimatedView className='flex flex-row mx-[20px] py-[10px]'>
              {routes.map((route, i) => {
                return (
                  <CyDTouchView
                    key={i}
                    className={clsx('rounded-[8px] px-[14px] py-[5px]', { 'bg-privacyMessageBackgroundColor': i === index })}
                    onPress={() => setIndex(i)}>
                    <CyDText>{route.title}</CyDText>
                  </CyDTouchView>
                );
              })}
            </CyDAnimatedView>
              <CyDAnimatedView className={'bg-sepratorColor h-[1px]'} style={animatedOpacity} />
            <RefreshTimerBar isRefreshing={false} isVerifiedCoinCheckedState={[isVerifyCoinChecked, setIsVerifyCoinChecked]} />
          </CyDAnimatedView>
        </CyDView>
      );
    };

    return (
      <TabView
        lazy
        navigationState={{ index, routes }}
        renderTabBar={RenderTabViewTabBar}
        renderScene={({ route }) => {
          switch (route.key) {
            case 'token':
              return <Tokens navigation={props.navigation} getAllChainBalance={getAllChainBalance} scrollY={scrollY} trackRef={trackRef} syncScrollOffset={syncScrollOffset} refreshState={[refreshData, setRefreshData]} isVerifiedCoinCheckedState={[isVerifyCoinChecked, setIsVerifyCoinChecked]} />;
            case 'nft':
              return <RenderNFTTab />;
            default:
              return null;
          }
        }}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />
    );
  };

  const renderScene = useCallback(
    ({ route: tab }: { route: TabRoute }) => (
      <Scene
        {...sceneProps}
        isActive={tabsWithScrollableType[index].key === tab.key}
        routeKey={tab.key}
        routeScrollableType={tabsWithScrollableType[index].scrollableType}
        scrollY={scrollY}
      />
    ),
    [getRefForKey, index, tabs, scrollY]
  );

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      { isPortfolioLoading() &&
          <CyDView className='justify-center items-center'>
            <EmptyView
              text={'Loading..'}
              image={AppImages.LOADING_IMAGE}
              buyVisible={false}
              marginTop={0}
              isLottie={true}
              />
          </CyDView>
      }

      {isPortfolioError() &&
        <CyDView className='h-full justify-center items-center'>
          <CyDImage source={AppImages.NETWORK_ERROR} className='h-[90px] w-[90px]' resizeMode='contain'/>
          <Button title='Retry' onPress={() => {
            void onRefresh();
          }} style='px-[45px] mt-[20px]'/>
        </CyDView>
      }
      <ChooseChainModal
        isModalVisible={chooseChain}
        onPress={() => {
          setChooseChain(false);
        }}
        where={WHERE_PORTFOLIO}
        />
      <CopytoKeyModal
        isModalVisible={copyToClipBoard}
        onClipClick={() => setCopyToClipBoard(false)}
        onPress={() => setCopyToClipBoard(false)}
        />
      {
        ethereum?.address
          ? <MessageBanner navigation={props.navigation} ethAddress={ethereum.address} isFocused={isFocused}/>
          : null
      }
      <HeaderBar navigation={props.navigation} setChooseChain={setChooseChain} scrollY={scrollY} onWCSuccess={onWCSuccess} />
      <AnimatedBanner scrollY={scrollY}>
        <BalanceBanner isVerifyCoinChecked={isVerifyCoinChecked} getAllChainBalance={getAllChainBalance} />
      </AnimatedBanner>
      <PortfolioTabView
        index={index}
        setIndex={setIndex}
        routes={tabs}
        width={useWindowDimensions().width}
        renderTabBar={(p) => (
          <AnimatedTabBar scrollY={scrollY}>
            <TabBar {...p} />
          </AnimatedTabBar>
        )}
        renderScene={renderScene}
      />
    </CyDSafeAreaView>
  );
}
