/**
 * @format
 * @flow
 */
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, BackHandler, FlatList, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import * as C from '../../constants/index';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import { ChooseChainModal, WHERE_PORTFOLIO } from '../../components/ChooseChainModal';
import EmptyView from '../../components/EmptyView';
import { CyDFastImage, CyDImage, CyDTouchView, CyDView, CyDText, CyDImageBackground, CyDSafeAreaView, CyDAnimatedView } from '../../styles/tailwindStyles';
import { Chain, QRScannerScreens, NotificationEvents } from '../../constants/server';
import CopytoKeyModal from '../../components/ShowPharseModal';
import { fetchTokenData, getCurrentChainHoldings, WalletHoldings } from '../../core/Portfolio';
import messaging from '@react-native-firebase/messaging';
import {
  PORTFOLIO_EMPTY,
  PORTFOLIO_ERROR,
  PORTFOLIO_NEW_LOAD,
  PORTFOLIO_LOADING
} from '../../reducers/portfolio_reducer';
import * as Sentry from '@sentry/react-native';
import DeviceInfo from 'react-native-device-info';
import {
  getBannerId,
  setBannerId,
  getDeveloperMode,
  getPortfolioData,
  getIBC,
  setHideBalanceStatus,
  getHideBalanceStatus
} from '../../core/asyncStorage';
import { useIsFocused } from '@react-navigation/native';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import HTML from 'react-native-render-html';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import LottieView from 'lottie-react-native';
import { GlobalContextType, TokenOverviewTabIndices } from '../../constants/enum';
import CyDTokenValue from '../../components/v2/tokenValue';
import { showToast } from '../utilities/toastUtility';
import appsFlyer from 'react-native-appsflyer';
import { TokenMeta } from '../../models/tokenMetaData.model';
import NFTScreen from '../NFT';
import Button from '../../components/v2/button';
import moment from 'moment';
import clsx from 'clsx';
import useAxios from '../../core/HttpRequest';
import PortfolioTokenItem from '../../components/v2/portfolioTokenItem';
import { SceneMap, TabView } from 'react-native-tab-view';

interface INotification {
  notification: { title: string, body: string }
  data: { title: string, url?: string }
}

interface HeaderProps {navigation: any, setChooseChain: Function, onWCSuccess: Function }

export default function Portfolio (props: { navigation: any | { navigate: (arg0: string, arg1: { params?: { url: string }, screen?: string, tokenData?: any, url?: string } | undefined) => void } }) {
  const { t } = useTranslation();

  const isFocused = useIsFocused();
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [verifyCoinChecked, setVerifyCoinChecked] = useState<boolean>(true);
  const [indexTab, setIndexTab] = useState<number>(0);
  const [refreshData, setRefreshData] = useState({
    isRefreshing: false,
    shouldRefreshAssets: false
  });
  const [copyToClipBoard, setCopyToClipBoard] = useState<boolean>(false);
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const { showModal, hideModal } = useGlobalModalContext();
  const [appState, setAppState] = useState<string>('');

  const handleBackButton = () => {
    props.navigation.popToTop();
    return true;
  };

  const appHandler = (changeType: any) => {
    if (changeType === 'active' || changeType === 'background') {
      if (hdWallet.state.pinValue) {
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
          from: ethereum.address
        });
        showModal('state', { type: 'error', title: t('NETWORK_ERROR'), description: t('UNABLE_TO_LOAD_WALLET'), onSuccess: () => { hideModal(), void refresh(); }, onFailure: () => { hideModal(), void refresh(); } });
      } else if (portfolioState.statePortfolio.portfolioState === PORTFOLIO_NEW_LOAD) {
        void refresh();
      }
      void getHideBalanceStatus().then(resp => {
        if (resp && resp === 'true') {
          hdWallet.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: true } });
        } else {
          hdWallet.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: false } });
        }
      });
    }
  }, [portfolioState.statePortfolio.portfolioState]);

  useEffect(() => {
    if (isFocused && !portfolioState.statePortfolio.developerMode && indexTab === 1) {
      setIndexTab(0);
    }
  }, [portfolioState.statePortfolio.developerMode]);

  useEffect(() => {
    if (isFocused) {
      messaging().onNotificationOpenedApp(handlePushNotification);

      messaging().getInitialNotification().then(handlePushNotification);

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
        if (globalStateContext?.globalState?.ibc !== IBCStatus) globalStateContext.globalDispatch({ type: GlobalContextType.IBC, ibc: IBCStatus });
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

  async function handlePushNotification (remoteMessage: INotification) {
    //   'Notification caused app to open from background state:',
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

  async function refresh () {
    await fetchTokenData(hdWallet, portfolioState);
  }

  const onRefresh = useCallback(async (pullToRefresh: boolean = true) => {
    if (indexTab === 0) {
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
    if (verifyCoinChecked) {
      return Number(totalBalance) + Number(totalStakedBalance) + Number(totalUnbondingBalance);
    } else {
      return Number(totalBalance) + Number(totalUnverifiedBalance) + Number(totalStakedBalance) + Number(totalUnbondingBalance);
    }
  };

  const extractHoldingsData = (portfolioState: { statePortfolio: { selectedChain: Chain, tokenPortfolio: WalletHoldings } }) => {
    const data = getCurrentChainHoldings(
      portfolioState.statePortfolio.tokenPortfolio,
      portfolioState.statePortfolio.selectedChain
    );
    if (portfolioState.statePortfolio.selectedChain.backendName !== 'ALL') {
      return data ? data.holdings : [];
    }
    return data || [];
  };

  const holdingsData = useMemo(() => extractHoldingsData(portfolioState), [portfolioState.statePortfolio.tokenPortfolio, portfolioState.statePortfolio.selectedChain]);

  const onWCSuccess = (e) => {
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

  const renderAssets = useMemo(() => {
    return <RenderPortfolioAssets holdingsData={holdingsData} verifyCoinChecked={verifyCoinChecked} navigation={props.navigation} onRefresh={onRefresh} isRefreshing={refreshData.shouldRefreshAssets}/>;
  }, [holdingsData, verifyCoinChecked, refreshData.shouldRefreshAssets]);

  const RenderTokensTab = () => {
    return (
      <CyDView className='mx-[10px] border border-sepratorColor rounded-t-[24px]'>
        <RenderTimer isRefreshing={refreshData.isRefreshing} verifyCoinChecked={verifyCoinChecked} setVerifyCoinChecked = {setVerifyCoinChecked}/>
        { getAllChainBalance(portfolioState) > 0
          ? (
              renderAssets
            )
          : indexTab === 0 && portfolioState.statePortfolio.portfolioState === PORTFOLIO_EMPTY &&
          <CyDView className={'flex justify-center items-center mt-[5px]'}>
            <LottieView source={AppImages.PORTFOLIO_EMPTY} autoPlay loop style={{ width: '60%' }} />
            <Button title={t('FUND_WALLET')} onPress={() => { props.navigation.navigate(C.screenTitle.QRCODE); }} style='mt-[-40px] px-[20px] h-[40px] py-[0px]' titleStyle='text-[14px]' image={AppImages.RECEIVE} imageStyle='h-[12px] w-[12px] mr-[15px]'/>
            <CyDTouchView className='mt-[20px]' onPress={() => {
              void (async () => await onRefresh())();
            }}>
              <CyDText className='text-center text-blue-500 underline'>{t<string>('CLICK_TO_REFRESH')}</CyDText>
            </CyDTouchView>
          </CyDView>
        }
      </CyDView>
    );
  };

  const RenderNFTTab = () => {
    return <CyDView className='mx-[10px] border border-sepratorColor rounded-t-[24px]'>
              <CyDView className='mt-[10px]'>
                <NFTScreen selectedChain={portfolioState.statePortfolio.selectedChain.symbol} navigation={props.navigation}></NFTScreen>
              </CyDView>
          </CyDView>;
  };

  const renderScene = SceneMap({
    token: RenderTokensTab,
    nft: RenderNFTTab
  });

  const RenderTabView = () => {
    const layout = useWindowDimensions();

    const [index, setIndex] = useState(0);
    const [routes] = useState([
      { key: 'token', title: t('TOKENS') },
      { key: 'nft', title: t('NFTS') }
    ]);

    const RenderTabViewTabBar = () => {
      return (
        <CyDView className='flex flex-row mx-[20px] py-[10px]'>
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
        </CyDView>
      );
    };

    return (
      <TabView
        lazy
        navigationState={{ index, routes }}
        renderTabBar={RenderTabViewTabBar}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />
    );
  };

  return (
    <CyDSafeAreaView className='flex h-full bg-white'>
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
      <RenderBanner navigation={props.navigation} ethAddress={ethereum.address}/>
      <RenderHeaderBar navigation={props.navigation} setChooseChain={setChooseChain} onWCSuccess={onWCSuccess} />
      <RenderPortfolioBalance verifyCoinChecked={verifyCoinChecked} getAllChainBalance={getAllChainBalance} />
      <RenderTabView />
    </CyDSafeAreaView>
  );
}

export const RenderPortfolioAssets = ({ holdingsData, verifyCoinChecked, navigation, onRefresh, isRefreshing }) => {
  const swipeableRefs: any[] = [];
  let previousOpenedSwipeableRef;
  const { t } = useTranslation();

  const onSwipe = (key) => {
    if (previousOpenedSwipeableRef && previousOpenedSwipeableRef !== swipeableRefs[key]) {
      previousOpenedSwipeableRef.close();
    }
    previousOpenedSwipeableRef = swipeableRefs[key];
  };

  const setSwipeableRefs = (index, ref) => {
    swipeableRefs[index] = ref;
    ref?.close();
  };

  const emptyView = (view: any) => {
    return (
      <CyDView className='flex items-center'>
        {view === 'empty'
          ? (
            <EmptyView
            text={t('NO_CURRENT_HOLDINGS')}
            image={AppImages.EMPTY}
            buyVisible={false}
            marginTop={30}
            />
            )
          : (
              <EmptyView
              text={t('LOADING...')}
              image={AppImages.EMPTY}
              buyVisible={false}
              marginTop={30}
              />
            )}
        </CyDView>
    );
  };

  const renderItem = ({ item, index }) => {
    return (
      <PortfolioTokenItem item={item} key={index} index={index} verifyCoinChecked={verifyCoinChecked} navigation={navigation} onSwipe={onSwipe} setSwipeableRefs={setSwipeableRefs} />
    );
  };

  return (
      <FlatList
      nestedScrollEnabled
      data={holdingsData}
      initialNumToRender={50}
      renderItem={renderItem}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
      style={{
        width: '100%',
        backgroundColor: Colors.whiteColor
      }}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={emptyView('empty')}
      showsVerticalScrollIndicator={false}
      />
  );
};

const RenderHeaderBar = ({ navigation, setChooseChain, onWCSuccess }: HeaderProps) => {
  const portfolioState = useContext<any>(PortfolioContext);
  const onSuccess = onWCSuccess;
  return (
      <CyDView className={'flex flex-row h-[50px] mx-[20px] justify-between items-center'}>
        <CyDTouchView onPress={() => { setChooseChain(true); }} className={'h-[40px] w-[54px] bg-chainColor mt-[10px] px-[8px] py-[4px] rounded-[18px] flex flex-row items-center justify-between border border-sepratorColor'}>
              <CyDFastImage className={'h-[22px] w-[22px]'} source={portfolioState.statePortfolio.selectedChain.logo_url} />
              <CyDFastImage className={'h-[8px] w-[8px]'} source={AppImages.DOWN} />
        </CyDTouchView>
        <CyDTouchView
          onPress={() => {
            navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
              navigation,
              fromPage: QRScannerScreens.WALLET_CONNECT,
              onSuccess
            });
          }}
        >
          <CyDFastImage source={AppImages.QR_CODE_SCANNER_BLACK} className={'h-[23px] w-[23px] mt-[10px]'} resizeMode='contain'/>
        </CyDTouchView>
      </CyDView>
  );
};

export const RenderPortfolioBalance = (props: { verifyCoinChecked: boolean, getAllChainBalance: Function}) => {
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const { hideBalance } = hdWallet.state;
  const portfolioBackgroundImage = 'https://public.cypherd.io/icons/portfolio-bg.png';
  const { t } = useTranslation();
  const { verifyCoinChecked, getAllChainBalance } = props;

  const checkAll = (portfolioState: { statePortfolio: { selectedChain: Chain, tokenPortfolio: WalletHoldings } }) => {
    if (portfolioState.statePortfolio.selectedChain.backendName !== 'ALL') {
      const currentChainHoldings = getCurrentChainHoldings(
        portfolioState.statePortfolio.tokenPortfolio,
        portfolioState.statePortfolio.selectedChain
      );
      const { chainTotalBalance, chainStakedBalance, chainUnbondingBalance, chainUnVerifiedBalance } = currentChainHoldings;
      return verifyCoinChecked
        ? Number(chainTotalBalance) + Number(chainStakedBalance) + Number(chainUnbondingBalance)
        : Number(chainTotalBalance) + Number(chainUnVerifiedBalance) + Number(chainStakedBalance) + Number(chainUnbondingBalance);
    } else {
      return getAllChainBalance(portfolioState);
    }
  };

  const hideBalances = async () => {
    showToast(hideBalance ? t<string>('PRIVACY_MODE_OFF') : t<string>('PRIVACY_MODE_ON'));
    await setHideBalanceStatus(!hideBalance);
    hdWallet.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: !hideBalance } });
  };
  return (
    <CyDAnimatedView className='h-[20%]'>
      <CyDImageBackground className='h-full rounded-[24px]' source={{ uri: portfolioBackgroundImage + '?' + String(new Date().getDay()) }} resizeMode='cover'>
        <CyDView className={'mt-[20px] mx-[24px] justify-center items-start'}>
          {getCurrentChainHoldings(
            portfolioState.statePortfolio.tokenPortfolio,
            portfolioState.statePortfolio.selectedChain
          ) && (
            <CyDView>
                <CyDView>
                  <CyDText>{t('TOTAL_BALANCE')}</CyDText>
                  <CyDView className='flex flex-row items-center py-[3px]'>
                    <CyDTokenValue className='text-[32px] font-extrabold text-primaryTextColor'>
                      {checkAll(portfolioState)}
                    </CyDTokenValue>
                    <CyDTouchView onPress={() => {
                      void hideBalances();
                    }}
                    className='h-[32px] flex flex-row items-end pl-[10px] gap-[5px]'>
                      <CyDImage source={hideBalance ? AppImages.CYPHER_HIDE : AppImages.CYPHER_SHOW} className='h-[16px] w-[16px] ml-[15px]' resizeMode='contain' />
                      <CyDText className='text-[12px]'>{hideBalance ? t('SHOW') : t('HIDE')}</CyDText>
                    </CyDTouchView>
                  </CyDView>
                </CyDView>
                {hideBalance
                  ? <CyDView className='flex flex-row items-center bg-privacyMessageBackgroundColor rounded-[8px] px-[10px] py-[5px]'>
                  <CyDText className='text-[12px]' >{t('ALL_BALANCES_HIDDEN')}</CyDText>
                </CyDView>
                  : <CyDView></CyDView>}
              </CyDView>
          )}
        </CyDView>
      </CyDImageBackground>
    </CyDAnimatedView>
  );
};

export const RenderTimer = (props: {isRefreshing: boolean, verifyCoinChecked: boolean, setVerifyCoinChecked: Dispatch<SetStateAction<boolean>>}) => {
  const [time, setTime] = useState('Retrieving...');
  const { isRefreshing, verifyCoinChecked, setVerifyCoinChecked } = props;
  const portfolioState = useContext<any>(PortfolioContext);
  moment.updateLocale('en', {
    relativeTime: {
      future: 'in %s',
      past: '%s',
      s: 'Just now',
      ss: '%d seconds ago',
      m: '1 minute ago',
      mm: '%d minutes ago',
      h: 'an hour ago',
      hh: '%d hours ago',
      d: 'a day ago',
      dd: '%d days ago',
      M: 'a month ago',
      MM: '%d months ago',
      y: 'a year ago',
      yy: '%d years ago'
    }
  });

  const calculateTimeDiff = (currTimestamp: string) => {
    return moment(currTimestamp).fromNow();
  };

  useEffect(() => {
    const timeUpdateRunner = setInterval(function time () {
      if (!isRefreshing) {
        const chainName = (portfolioState.statePortfolio.selectedChain.backendName).toLowerCase();
        const currTimestamp = portfolioState.statePortfolio.selectedChain.backendName !== 'ALL'
          ? getCurrentChainRefreshTime(chainName) // use the time for individual chain
          : portfolioState.statePortfolio.rtimestamp; // use rtimestamp for all chain data
        setTime(calculateTimeDiff(currTimestamp));
      } else {
        setTime('Retrieving...');
      }
    }, 1000);

    return () => {
      clearInterval(timeUpdateRunner);
    };

    function getCurrentChainRefreshTime (chainName: any) {
      return portfolioState?.statePortfolio?.tokenPortfolio[chainName]?.timestamp || new Date().toISOString();
    }
  }, [portfolioState.statePortfolio.rtimestamp, portfolioState.statePortfolio.selectedChain, isRefreshing]);

  return (
    <CyDView className='flex flex-row justify-between border-b border-sepratorColor py-[10px] px-[15px]'>
      <CyDView className='flex flex-row items-center'>
        <CyDImage source={AppImages.CLOCK} className='h-[16px] w-[16px]' resizeMode='contain'/>
        <CyDText className='ml-[10px]'>{time}</CyDText>
      </CyDView>
      <CyDTouchView className='flex flex-row items-center' onPress={() => {
        setVerifyCoinChecked(!verifyCoinChecked);
      }}>
        <CyDView
          className={clsx('h-[15px] w-[15px] justify-center items-center rounded-[4px] border-[1px] border-black', { 'bg-black': verifyCoinChecked, 'bg-transparent': !verifyCoinChecked })}
        >
          {verifyCoinChecked && <CyDImage source={AppImages.CORRECT} className='h-[14px] w-[10px]' resizeMode='contain'/>}
        </CyDView>
        <CyDText className='ml-[5px]'>Only verified coins</CyDText>
      </CyDTouchView>
    </CyDView>
  );
};

export const RenderBanner = (props) => {
  const [bannerData, setBannerData] = useState<any>({ data: {} });
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);
  const { getWithAuth } = useAxios();
  const isFocused = useIsFocused();

  const getBannerColor = {
    error: '#FCDBE3',
    warning: '#FDF2DF',
    success: '#D9F7ED',
    info: '#E7F0F9'
  };

  const getBannerTextColor = {
    error: '#BC0835',
    warning: '#F25500',
    success: '#00A06A',
    info: '#0E477B'
  };

  const renderersProps = useMemo(() => {
    return ({
      a: {
        onPress: (event: any, href: string) => {
          props.navigation.navigate(C.screenTitle.GEN_WEBVIEW, {
            url: href
          });
        }
      }
    });
  }, []);

  useEffect(() => {
    if (isFocused) {
      const isBannerLive = (fromBannerDate: string | number | Date, toBannerDate: string | number | Date) => {
        if (!fromBannerDate && !toBannerDate) {
          return true;
        } else if (fromBannerDate && !toBannerDate) {
          return new Date(fromBannerDate) <= new Date();
        } else if (!fromBannerDate && toBannerDate) {
          return new Date(toBannerDate) >= new Date();
        } else {
          return (
            new Date(fromBannerDate) <= new Date() &&
            new Date(toBannerDate) >= new Date()
          );
        }
      };

      const checkAppVersion = (currentVersion: number, versionFromData: number, condition: string) => {
        if (condition === '>') {
          return currentVersion > versionFromData;
        } else if (condition === '>=') {
          return currentVersion >= versionFromData;
        } else if (condition === '<') {
          return currentVersion < versionFromData;
        } else if (condition === '<=') {
          return currentVersion <= versionFromData;
        } else if (condition === '=') return currentVersion === versionFromData;
      };

      const getDeviceInfoForBanner = (data: any) => {
        if (data?.android) {
          if (Platform.OS === 'android') {
            return checkAppVersion(
              parseFloat(DeviceInfo.getVersion()),
              data.android.version,
              data.android.condition
            );
          } else {
            return false;
          }
        } else if (data?.ios) {
          if (Platform.OS === 'ios') {
            return checkAppVersion(
              parseFloat(DeviceInfo.getVersion()),
              data.ios.version,
              data.ios.condition
            );
          } else {
            return false;
          }
        } else {
          return true;
        }
      };

      getWithAuth(`/v1/configuration/device/banner-info/${props.ethAddress}`)
        .then((response) => {
          if (!response?.isError) {
            if (response.data.data) {
              const data = response.data.data;
              if (data.isClosable) {
                getBannerId()
                  .then((bannerID) => {
                    setBannerVisible(bannerID !== data.id && getDeviceInfoForBanner(data) &&
                    isBannerLive(data?.startDate, data?.endDate));
                  })
                  .catch((error) => {
                    Sentry.captureException(error);
                  });
              } else {
                setBannerVisible(() => {
                  return (
                    getDeviceInfoForBanner(data) &&
                    isBannerLive(data?.startDate, data?.endDate)
                  );
                });
              }
              setBannerData({ ...data });
            } else {
              setBannerVisible(false);
            }
          } else {
            void analytics().logEvent('banner_data_fetch_failed');
          }
        })
        .catch((error) => {
          Sentry.captureException(error);
        });
    }
  }, [isFocused]);

  const styles = StyleSheet.create(
    {
      bannerBackground: { backgroundColor: bannerData?.type ? getBannerColor[bannerData?.type] : 'black' },
      bannerHTMLBase: {
        fontSize: '14px',
        fontWeight: '400',
        color: bannerData.type ? getBannerTextColor[bannerData.type] : 'black'
      }
    }
  );

  return (
    bannerVisible
      ? <CyDView className={'flex flex-row px-[15px] py-[10px]'} style={styles.bannerBackground}>
          <CyDView className={clsx('', { 'w-[95%]': bannerData?.isClosable, 'w-[100%]': !bannerData?.isClosable })}>
            <HTML
              contentWidth={bannerData.isClosable ? 93 : 100}
              baseStyle={styles.bannerHTMLBase}
              renderersProps={renderersProps}
              source={{ html: bannerData.message }}
            />
          </CyDView>
          {bannerData?.isClosable &&
            <CyDTouchView
              onPress={() => {
                setBannerVisible(false);
                if (bannerData.isClosable) {
                  void setBannerId(bannerData.id);
                }
              }}
            >
              <CyDImage source={AppImages.CLOSE_CIRCLE} className='h-[25px] w-[25px]' resizeMode='contain'/>

            </CyDTouchView>
          }
        </CyDView>
      : <CyDView></CyDView>
  );
};
