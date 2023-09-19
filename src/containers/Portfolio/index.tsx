/**
 * @format
 * @flow
 */
import React, { ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, BackHandler, useWindowDimensions } from 'react-native';
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
} from '../../styles/tailwindStyles';
import { Chain, NotificationEvents } from '../../constants/server';
import CopytoKeyModal from '../../components/ShowPharseModal';
import {
  ChainHoldings,
  fetchTokenData,
  getCurrentChainHoldings,
  WalletHoldings,
} from '../../core/Portfolio';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {
  PORTFOLIO_ERROR,
  PORTFOLIO_NEW_LOAD,
  PORTFOLIO_LOADING,
} from '../../reducers/portfolio_reducer';
import * as Sentry from '@sentry/react-native';
import {
  getDeveloperMode,
  getPortfolioData,
  getIBC,
  getHideBalanceStatus,
} from '../../core/asyncStorage';
import { useIsFocused } from '@react-navigation/native';
import { GlobalContext } from '../../core/globalContext';
import { ActivityContext, HdWalletContext, PortfolioContext } from '../../core/util';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import {
  GlobalContextType,
  ScrollableType,
  TokenOverviewTabIndices,
} from '../../constants/enum';
import appsFlyer from 'react-native-appsflyer';
import { TokenMeta } from '../../models/tokenMetaData.model';
import Button from '../../components/v2/button';
import {
  MessageBanner,
  HeaderBar,
  Banner,
  PortfolioTabView,
  TabBar,
  TabRoute,
  RefreshTimerBar,
} from './components';
import { BarCodeReadEvent } from 'react-native-camera';
import { AnimatedBanner, AnimatedTabBar } from './animatedComponents';
import { useScrollManager } from '../../hooks/useScrollManager';
import { NFTScene, TokenScene, TXNScene } from './scenes';
import CyDTokenValue from '../../components/v2/tokenValue';
import moment from 'moment';
import clsx from 'clsx';
import { isIOS } from '../../misc/checkers';
import FilterBar from './components/FilterBar';
import CardCarousel from './components/CardCarousel';
import PendingActivityCard from './components/CardCarousel/PendingActivityCard';
import { ActivityAny, ActivityReducerAction, ActivityStatus, ActivityType, DebitCardTransaction, ExchangeTransaction } from '../../reducers/activity_reducer';
import { ACTIVITIES_REFRESH_TIMEOUT } from '../../constants/timeOuts';
import { hostWorker } from '../../global';
import axios from 'axios';
import { showToast } from '../utilities/toastUtility';

export interface PortfolioProps {
  navigation: any;
}

const ARCH_HOST = hostWorker.getHost('ARCH_HOST');

export default function Portfolio({ navigation }: PortfolioProps) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const globalStateContext = useContext(GlobalContext);
  const hdWallet = useContext(HdWalletContext);
  const portfolioState = useContext(PortfolioContext);
  const activityContext = useContext(ActivityContext);
  const { showModal, hideModal } = useGlobalModalContext();

  const getPendingActivities = () => {
    const allActivities = activityContext?.state.activityObjects;
    if (allActivities?.length === 0) {
      return [];
    }
    const pendingCardsAndBridges: ActivityAny[] = [];
    allActivities?.forEach(activity => {
      if (activity?.type && [ActivityType.BRIDGE, ActivityType.CARD].includes(activity.type)) {
        if ([ActivityStatus.DELAYED, ActivityStatus.INPROCESS, ActivityStatus.PENDING].includes(activity.status)) {
          pendingCardsAndBridges.push(activity);
        }
      }
    });
    return pendingCardsAndBridges;
  };

  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [isVerifyCoinChecked, setIsVerifyCoinChecked] = useState<boolean>(true);
  const [copyToClipBoard, setCopyToClipBoard] = useState<boolean>(false);
  const [appState, setAppState] = useState<string>('');
  const [refreshData, setRefreshData] = useState({
    isRefreshing: false,
    shouldRefreshAssets: false,
  });
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [cards, setCards] = useState<ReactNode[]>([]);

  const tabs = [
    { key: 'token', title: t('TOKENS') },
    { key: 'nft', title: t('NFTS') },
    { key: 'txn', title: t('TXNS') },
  ];

  // not mentioning the scrollableType correctly will result in errors.
  const tabsWithScrollableType = [
    {
      key: 'token',
      title: t('TOKENS'),
      scrollableType: ScrollableType.FLATLIST,
    },
    { key: 'nft', title: t('NFTS'), scrollableType: ScrollableType.SCROLLVIEW },
    { key: 'txn', title: t('TXNS'), scrollableType: ScrollableType.FLATLIST },
  ];

  const { scrollY, index, setIndex, bannerHeight, setBannerHeight, getRefForKey, ...sceneProps } =
    useScrollManager(tabsWithScrollableType);

  const ethereum = hdWallet?.state.wallet.ethereum;

  const handleBackButton = () => {
    navigation.popToTop();
    return true;
  };

  const appHandler = (changeType: any) => {
    if (changeType === 'active' || changeType === 'background') {
      if (hdWallet?.state.pinValue) {
        setAppState(() => changeType);
      }
    }
  };

  const getUpdatedActivityStatus = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return ActivityStatus.SUCCESS;
      case 'DELAYED':
        return ActivityStatus.DELAYED;
      case 'IN_PROGRESS':
        return ActivityStatus.INPROCESS;
      case 'PENDING':
        return ActivityStatus.PENDING;
      case 'FAILED':
        return ActivityStatus.FAILED;
      default:
        return ActivityStatus.SUCCESS;
    }
  };

  const updateStatusForCardOrBridge = async (activity: ActivityAny) => {
    const currentActivityStatus = activity.status;
    const activityQuoteId = (activity as ExchangeTransaction | DebitCardTransaction).quoteId;
    if (currentActivityStatus === ActivityStatus.INPROCESS || currentActivityStatus === ActivityStatus.DELAYED || currentActivityStatus === ActivityStatus.PENDING && activityQuoteId) {
      const uri = `${ARCH_HOST}/v1/activities/status/${activity.type}/${activityQuoteId}`;
      try {
        const res = await axios.get(uri, { timeout: 3000 });
        const { data: { activityStatus: { status, quoteId } } }: { data: { activityStatus: { status: string, quoteId: string } } } = res;
        if (quoteId === activityQuoteId) {
          const updatedStatus = getUpdatedActivityStatus(status);
          if (currentActivityStatus !== updatedStatus) {
            if (updatedStatus === ActivityStatus.SUCCESS) {
              activityContext?.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activity.id,
                  status: updatedStatus,
                }
              });
            }
          }
          const returnActivity = activity;
          returnActivity.status = updatedStatus;
          return returnActivity;
        } else {
          throw new Error(`Mismatch in quoteIds: ${activityQuoteId} and ${quoteId} or status: ${status}.`);
        }
      } catch (e) {
        const errorObject = {
          e,
          activity,
          message: 'Error when updating status for Card or Bridge in Portfolio.'
        };
        Sentry.captureException(errorObject);
      }
    }
    return activity;
  };

  useEffect(() => {
    const checkActivities = async () => {
      const pendingActivities = getPendingActivities();
      const cardsToSet: ReactNode[] = [];
      if (pendingActivities.length === 0) {
        clearInterval(refreshActivityInterval);
        void refresh();
        // To show completion and flush the cards in a while.
        setTimeout(() => {
          setCards([]);
          setBannerHeight(160);
        }, 5000);
      } else {
        if (bannerHeight !== 260) {
          setBannerHeight(260);
        }
        for (const pa of pendingActivities) {
          const updatedActivity = await updateStatusForCardOrBridge(pa);
          if (pa.status !== updatedActivity.status) {
            if (updatedActivity.status === ActivityStatus.SUCCESS) {
              showToast(`${pa.type} activity complete.`);
            }
          }
          if (pa.type === ActivityType.BRIDGE) {
            const { fromChain, fromSymbol, fromTokenAmount, toChain, toSymbol, toTokenAmount } = updatedActivity as ExchangeTransaction;
            cardsToSet.push(<PendingActivityCard
              type={updatedActivity.type}
              status={updatedActivity.status}
              bridgePayload={{
                fromChain,
                fromSymbol,
                fromTokenAmount,
                toChain,
                toSymbol,
                toTokenAmount,
              }}
            />);
          } else if (pa.type === ActivityType.CARD) {
            const { amount, amountInUsd, tokenSymbol } = updatedActivity as DebitCardTransaction;
            cardsToSet.push(<PendingActivityCard
              type={updatedActivity.type}
              status={updatedActivity.status}
              cardPayload={{
                amount,
                amountInUsd,
                tokenSymbol,
              }}
            />);
          }
        }
        setCards(cardsToSet);
      }
    };
    const refreshActivityInterval = setInterval(() => {
      void checkActivities();
    }, ACTIVITIES_REFRESH_TIMEOUT);

    return () => {
      clearInterval(refreshActivityInterval);
    };
  }, [activityContext?.state.activityObjects, isFocused]);


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
    if (isFocused) {
      if (portfolioState.statePortfolio.portfolioState === PORTFOLIO_ERROR) {
        void analytics().logEvent('portfolio_load_error', {
          from: ethereum?.address,
        });
        showModal('state', {
          type: 'error',
          title: t('NETWORK_ERROR'),
          description: t('UNABLE_TO_LOAD_WALLET'),
          onSuccess: () => {
            hideModal();
            void refresh();
          },
          onFailure: () => {
            hideModal();
            void refresh();
          },
        });
      } else if (
        portfolioState.statePortfolio.portfolioState === PORTFOLIO_NEW_LOAD
      ) {
        void refresh();
      }
      void getHideBalanceStatus().then((resp) => {
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
  }, [portfolioState.statePortfolio.portfolioState]);

  useEffect(() => {
    if (isFocused) {
      messaging().onNotificationOpenedApp(handlePushNotification);

      void messaging().getInitialNotification().then(handlePushNotification);

      getDeveloperMode()
        .then((developerMode: boolean) => {
          if (portfolioState?.statePortfolio?.developerMode !== developerMode)
            portfolioState.dispatchPortfolio({ value: { developerMode } });
        })
        .catch((e) => {
          Sentry.captureException(e.message);
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

      getIBCStatus().catch((error) => {
        Sentry.captureException(error.message);
      });
    }
  }, [isFocused]);

  const constructTokenMeta = (localPortfolio: any, event: string) => {
    switch (event) {
      case NotificationEvents.EVMOS_STAKING: {
        const [tokenData] = localPortfolio.data.evmos.holdings.filter(
          (holding: TokenMeta) => holding.name === 'Evmos'
        );
        return tokenData;
      }
      case NotificationEvents.COSMOS_STAKING: {
        const [tokenData] = localPortfolio.data.cosmos.holdings.filter(
          (holding: TokenMeta) => holding.name === 'ATOM'
        );
        return tokenData;
      }
      case NotificationEvents.OSMOSIS_STAKING: {
        const [tokenData] = localPortfolio.data.osmosis.holdings.filter(
          (holding: TokenMeta) => holding.name === 'Osmosis'
        );
        return tokenData;
      }
      case NotificationEvents.JUNO_STAKING: {
        const [tokenData] = localPortfolio.data.juno.holdings.filter(
          (holding: TokenMeta) => holding.name === 'Juno'
        );
        return tokenData;
      }
      case NotificationEvents.STARGAZE_STAKING: {
        const [tokenData] = localPortfolio.data.stargaze.holdings.filter(
          (holding: TokenMeta) => holding.name === 'Stargaze'
        );
        return tokenData;
      }
      case NotificationEvents.NOBLE_STAKING: {
        const [tokenData] = localPortfolio.data.noble.holdings.filter(
          (holding: TokenMeta) => holding.name === 'Noble'
        );
        return tokenData;
      }
    }
  };

  async function handlePushNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage | null
  ) {
    //   'Notification caused app to open from background state:',
    if (ethereum) {
      const localPortfolio = await getPortfolioData(ethereum, portfolioState);
      if (remoteMessage?.data) {
        void appsFlyer.logEvent('notification_opened', remoteMessage.data);
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
          case NotificationEvents.EVMOS_STAKING: {
            void analytics().logEvent('evmos_staking_cta', {
              from: [ethereum.address, hdWallet.state.wallet.evmos.address],
              chain: 'EVMOS',
            });
            const tknData = constructTokenMeta(
              localPortfolio,
              NotificationEvents.EVMOS_STAKING
            );
            navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
              tokenData: tknData,
              navigateTo: TokenOverviewTabIndices.STAKING,
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
              NotificationEvents.COSMOS_STAKING
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
              NotificationEvents.OSMOSIS_STAKING
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
              NotificationEvents.JUNO_STAKING
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
              NotificationEvents.STARGAZE_STAKING
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
              NotificationEvents.NOBLE_STAKING
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

  async function refresh() {
    if (hdWallet) {
      await fetchTokenData(hdWallet, portfolioState);
    }
  }

  const onRefresh = useCallback(async (pullToRefresh = true) => {
    if (hdWallet) {
      setRefreshData({
        isRefreshing: true,
        shouldRefreshAssets: pullToRefresh,
      });
      await fetchTokenData(hdWallet, portfolioState);
      setRefreshData({ isRefreshing: false, shouldRefreshAssets: false });
    }
  }, []);

  useEffect(() => {
    const currTimestamp =
      portfolioState.statePortfolio.selectedChain.backendName !== 'ALL'
        ? portfolioState?.statePortfolio?.tokenPortfolio[
          portfolioState.statePortfolio.selectedChain.backendName.toLowerCase()
        ]?.timestamp || new Date().toISOString() // use the time for individual chain
        : portfolioState.statePortfolio.rtimestamp;

    const oneMinuteHasPassed =
      moment().diff(moment(currTimestamp), 'minutes') >= 1;
    if (
      isFocused &&
      (portfolioState?.statePortfolio?.tokenPortfolio === undefined ||
        oneMinuteHasPassed)
    ) {
      void onRefresh(false);
    }
  }, [isFocused]);

  const getAllChainBalance = (portfolioState: {
    statePortfolio: { selectedChain: Chain; tokenPortfolio: WalletHoldings };
  }): number => {
    const {
      totalBalance,
      totalStakedBalance,
      totalUnverifiedBalance,
      totalUnbondingBalance,
    } = portfolioState?.statePortfolio?.tokenPortfolio ?? {};
    if (isVerifyCoinChecked) {
      return (
        Number(totalBalance) +
        Number(totalStakedBalance) +
        Number(totalUnbondingBalance)
      );
    } else {
      return (
        Number(totalBalance) +
        Number(totalUnverifiedBalance) +
        Number(totalStakedBalance) +
        Number(totalUnbondingBalance)
      );
    }
  };

  const checkAll = (portfolioState: {
    statePortfolio: { selectedChain: Chain; tokenPortfolio: WalletHoldings };
  }) => {
    if (portfolioState.statePortfolio.selectedChain.backendName !== 'ALL') {
      const currentChainHoldings = getCurrentChainHoldings(
        portfolioState.statePortfolio.tokenPortfolio,
        portfolioState.statePortfolio.selectedChain
      );
      if (currentChainHoldings) {
        const {
          chainTotalBalance,
          chainStakedBalance,
          chainUnbondingBalance,
          chainUnVerifiedBalance,
        } = currentChainHoldings as ChainHoldings; // Type-assertion (currentChainHoldings can only be of type ChainHoldings if selectedChain.backendName !== 'ALL')
        return isVerifyCoinChecked
          ? Number(chainTotalBalance) +
          Number(chainStakedBalance) +
          Number(chainUnbondingBalance)
          : Number(chainTotalBalance) +
          Number(chainUnVerifiedBalance) +
          Number(chainStakedBalance) +
          Number(chainUnbondingBalance);
      } else {
        return '...';
      }
    } else {
      return getAllChainBalance(portfolioState);
    }
  };

  const onWCSuccess = (e: BarCodeReadEvent) => {
    const link = e.data;
    portfolioState.dispatchPortfolio({ value: { walletConnectURI: link } });
    navigation.navigate(C.screenTitle.WALLET_CONNECT);
  };

  const isPortfolioLoading = () => {
    return (
      portfolioState.statePortfolio.portfolioState === PORTFOLIO_NEW_LOAD ||
      portfolioState.statePortfolio.portfolioState === PORTFOLIO_LOADING
    );
  };

  const isPortfolioError = () => {
    return portfolioState.statePortfolio.portfolioState === PORTFOLIO_ERROR;
  };

  const renderScene = useCallback(
    ({ route: tab }: { route: TabRoute }) => {
      switch (tab.key) {
        case 'token':
          return (
            <CyDView className='flex-1 h-full'>
              <AnimatedTabBar scrollY={scrollY} bannerHeight={bannerHeight}>
                {renderTabBarFooter(tab.key)}
              </AnimatedTabBar>
              <TokenScene
                {...sceneProps}
                routeKey={'token'}
                scrollY={scrollY}
                navigation={navigation}
                bannerHeight={bannerHeight}
                isVerifyCoinChecked={isVerifyCoinChecked}
                getAllChainBalance={getAllChainBalance}
                setRefreshData={setRefreshData}
              />
            </CyDView>
          );
        case 'nft':
          return (
            <CyDView className='flex-1 h-full'>
              <AnimatedTabBar scrollY={scrollY} bannerHeight={bannerHeight}>
                {renderTabBarFooter(tab.key)}
              </AnimatedTabBar>
              <NFTScene
                {...sceneProps}
                routeKey={tab.key}
                scrollY={scrollY}
                navigation={navigation}
                bannerHeight={bannerHeight}
                selectedChain={
                  portfolioState.statePortfolio.selectedChain.symbol
                }
              />
            </CyDView>
          );
        case 'txn':
          return (
            <CyDView className='flex-1 h-full mx-[10px]'>
              <AnimatedTabBar scrollY={scrollY} bannerHeight={bannerHeight}>
                {renderTabBarFooter(tab.key)}
              </AnimatedTabBar>
              <TXNScene
                {...sceneProps}
                routeKey={tab.key}
                scrollY={scrollY}
                navigation={navigation}
                bannerHeight={bannerHeight}
                filterModalVisibilityState={[filterModalVisible, setFilterModalVisible]}
              />
            </CyDView>
          );
        default:
          return null;
      }
    },
    [getRefForKey, isVerifyCoinChecked, scrollY]
  );

  const renderTabBarFooter = useCallback(
    (tabKey: string) => {
      switch (tabKey) {
        case 'token':
          return (
            <RefreshTimerBar
              isRefreshing={refreshData.isRefreshing}
              isVerifiedCoinCheckedState={[
                isVerifyCoinChecked,
                setIsVerifyCoinChecked,
              ]}
            />
          );
        case 'nft':
          return null;
        case 'txn':
          return (
            <FilterBar
              setFilterModalVisible={setFilterModalVisible}
            />
          );
        default:
          return null;
      }
    },
    [getRefForKey, tabs, refreshData.isRefreshing]
  );

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      {isPortfolioLoading() && (
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

      {isPortfolioError() && (
        <CyDView className='h-full justify-center items-center'>
          <CyDImage
            source={AppImages.NETWORK_ERROR}
            className='h-[90px] w-[90px]'
            resizeMode='contain'
          />
          <Button
            title='Retry'
            onPress={() => {
              void onRefresh();
            }}
            style='px-[45px] mt-[20px]'
          />
        </CyDView>
      )}
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
      {ethereum?.address && globalStateContext?.globalState?.token ? (
        <MessageBanner
          navigation={navigation}
          ethAddress={ethereum.address}
          isFocused={isFocused}
        />
      ) : null}
      <HeaderBar
        navigation={navigation}
        renderTitleComponent={
          <CyDTokenValue className='text-[24px] font-extrabold text-primaryTextColor'>
            {checkAll(portfolioState)}
          </CyDTokenValue>
        }
        setChooseChain={setChooseChain}
        scrollY={scrollY}
        bannerHeight={bannerHeight}
        onWCSuccess={onWCSuccess}
      />
      <AnimatedBanner
        scrollY={scrollY}
        bannerHeight={bannerHeight}>
        <Banner bannerHeight={bannerHeight} checkAllBalance={checkAll(portfolioState)} />
        <CardCarousel cards={cards} />
      </AnimatedBanner>

      <CyDView className={clsx('flex-1 pb-[40px]', { 'pb-[75px]': !isIOS() })}>
        <PortfolioTabView
          index={index}
          setIndex={setIndex}
          routes={tabs}
          width={useWindowDimensions().width}
          renderTabBar={(p) => (
            <AnimatedTabBar bannerHeight={bannerHeight} scrollY={scrollY}>
              <TabBar {...p} />
            </AnimatedTabBar>
          )}
          renderScene={renderScene}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
