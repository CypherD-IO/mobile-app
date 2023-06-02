/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import { AppState, BackHandler, FlatList, Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import * as C from '../../constants/index';
import { useTranslation } from 'react-i18next';
import SwitchView from '../../components/SwitchView';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import { ChooseChainModal, WHERE_PORTFOLIO } from '../../components/ChooseChainModal';
import EmptyView from '../../components/EmptyView';
import { CyDFastImage, CyDImage, CyDTouchView, CyDView, CyDText, CyDImageBackground } from '../../styles/tailwindStyles';
import { CHAIN_EVMOS, CHAIN_COSMOS, CHAIN_OSMOSIS, CHAIN_JUNO, CHAIN_STARGAZE, ChainBackendNames, Chain, CosmosStakingTokens, QRScannerScreens, NotificationEvents, ChainNames, FundWalletAddressType } from '../../constants/server';
import CopytoKeyModal from '../../components/ShowPharseModal';
import { fetchNftDatav2, fetchTokenData, getCurrentChainHoldings, WalletHoldings } from '../../core/Portfolio';
import messaging from '@react-native-firebase/messaging';
import {
  PORTFOLIO_EMPTY,
  PORTFOLIO_ERROR,
  PORTFOLIO_NEW_LOAD,
  PORTFOLIO_LOADING
} from '../../reducers/portfolio_reducer';
import * as Sentry from '@sentry/react-native';
import DeviceInfo, { isEmulatorSync } from 'react-native-device-info';
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
import { fetchRPCEndpointsFromServer, GlobalContext, GlobalContextDef } from '../../core/globalContext';
import HTML from 'react-native-render-html';
import { getNftExplorerUrl, HdWalletContext, PortfolioContext } from '../../core/util';
import axios from '../../core/Http';
import FastImage from 'react-native-fast-image';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import LottieView from 'lottie-react-native';
import { GlobalContextType, TokenOverviewTabIndices, TokenOverviewTabs } from '../../constants/enum';
import { hostWorker } from '../../global';
import { get } from 'lodash';
import { cosmosConfig } from '../../constants/cosmosConfig';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import CyDTokenValue from '../../components/v2/tokenValue';
import { showToast } from '../utilities/toastUtility';

const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
  DynamicTouchView
} = require('../../styles');

interface INotification {
  notification: { title: string, body: string }
  data: { title: string, url?: string }
}

export default function Portfolio (props: { navigation: any | { navigate: (arg0: string, arg1: { params?: { url: string }, screen?: string, tokenData?: any, url?: string } | undefined) => void } }) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const [valueChange, setValueChange] = useState<boolean>(false);
  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [verifyCoinChecked, setVerifyCoinChecked] = useState<boolean>(true);
  const [indexTab, setIndexTab] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isNftRefreshing, setNftIsRefreshing] = useState<boolean>(false);
  const [copyToClipBoard, setCopyToClipBoard] = useState<boolean>(false);
  const [nftHoldings, setNftHoldings] = useState<any>({
    ETH: [],
    MATIC: [],
    AVAX: [],
    BNB: [],
    FTM: [],
    OPTIMISM: [],
    ARBITRUM: [],
    EVMOS: [],
    COSMOS: [],
    OSMO: [],
    'ALL CHAINS': []
  });
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });
  const [isLoadingNft, setIsLoadingNft] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const ethereum = hdWallet.state.wallet.ethereum;
  const stargaze = hdWallet.state.wallet.stargaze;
  const [bannerData, setBannerData] = useState<any>({ data: {} });
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);
  const isEmulator = isEmulatorSync();
  const { showModal, hideModal } = useGlobalModalContext();
  const [appState, setAppState] = useState();
  const portfolioBackgroundImage = 'https://public.cypherd.io/icons/portfolio-bg.png';
  const { hideBalance } = hdWallet.state;
  const swipeableRefs: any[] = [];
  let previousOpenedSwipeableRef;
  const minFundCardValue = 10;

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  const handleBackButton = () => {
    props.navigation.goBack();
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
      hdWallet.dispatch({ type: 'HIDE_TAB_BAR', value: { tabBarHidden: true } });
    }
  }, [appState]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
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
    setIsLoading(false);
  }, [portfolioState.statePortfolio.portfolioState]);

  async function refreshNftPortfolio () {
    setIsLoadingNft(true);
    const localNftData = await getPortfolioData(ethereum, portfolioState, 'ALL_NFT');
    if (localNftData) {
      setNftHoldings(localNftData);
      setIsLoadingNft(false);
    }
    const nftData = await fetchNftDatav2(portfolioState, ethereum, stargaze);
    if (nftData) {
      setNftHoldings(nftData);
    }
    setIsLoadingNft(false);
  }

  useEffect(() => {
    if (!portfolioState.statePortfolio.developerMode && indexTab === 1) {
      setIndexTab(0);
    }
    if (portfolioState.statePortfolio.developerMode) {
      refreshNftPortfolio();
    }
  }, [portfolioState.statePortfolio.developerMode]);

  useEffect(() => {
    if (isFocused) {
      messaging().onNotificationOpenedApp(handlePushNotification);

      messaging().getInitialNotification().then(handlePushNotification);

      getDeveloperMode()
        .then((developerMode: boolean) => {
          portfolioState.dispatchPortfolio({ value: { developerMode } });
        })
        .catch((e) => {
          Sentry.captureException(e.message);
        });

      const getIBCStatus = async () => {
        const data = await getIBC();
        let IBCStatus = false;
        if (data === 'true') IBCStatus = true;
        globalStateContext.globalDispatch({ type: GlobalContextType.IBC, ibc: IBCStatus });
      };

      getIBCStatus().catch(error => {
        Sentry.captureException(error.message);
      });

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

      axios
        .get(
          `${ARCH_HOST}/v1/configuration/device/banner-info/${ethereum.address}`
        )
        .then((response) => {
          if (response.data.isBannerAvailable) {
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
        })
        .catch((error) => {
          void analytics().logEvent('banner_data_fetch_failed');
          Sentry.captureException(error);
        });
    }
  }, [isFocused]);

  async function handlePushNotification (remoteMessage: INotification) {
    //   'Notification caused app to open from background state:',
    if (remoteMessage?.data) {
      switch (remoteMessage.data.title) {
        case NotificationEvents.BEEFY_FINANCE: {
          void analytics().logEvent('beefy_cta', {
            from: ethereum.address
          });
          props.navigation.navigate(C.screenTitle.BROWSER, {
            params: { url: 'https://app.beefy.com/' },
            screen: C.screenTitle.BROWSER_SCREEN
          });
          break;
        }
        case NotificationEvents.EVMOS_STAKING: {
          void analytics().logEvent('evmos_staking_cta', {
            from: [ethereum.address, hdWallet.state.wallet.evmos.address],
            chain: 'EVMOS'
          });
          const tokenPriceData = await axios.get(
            `${ARCH_HOST}/v1/prices/native/EVMOS`
          );
          const tknData = {
            chainDetails: CHAIN_EVMOS,
            contractAddress: CHAIN_EVMOS.secondaryAddress,
            contractDecimals: cosmosConfig.evmos.contractDecimal,
            isVerified: true,
            logoUrl: 'https://assets.coingecko.com/coins/images/24023/large/evmos.png',
            name: CHAIN_EVMOS.name,
            price: tokenPriceData.data.usd,
            symbol: CHAIN_EVMOS.symbol
          };
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
          const tokenPriceData = await axios.get(
            `${ARCH_HOST}/v1/prices/native/COSMOS`
          );
          const tknData = {
            chainDetails: CHAIN_COSMOS,
            contractAddress: CHAIN_COSMOS.secondaryAddress,
            contractDecimals: cosmosConfig.cosmos.contractDecimal,
            isVerified: true,
            logoUrl: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
            name: CosmosStakingTokens.COSMOS,
            price: tokenPriceData.data.usd,
            symbol: CHAIN_COSMOS.symbol
          };
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
          const tokenPriceData = await axios.get(
            `${ARCH_HOST}/v1/prices/native/OSMOSIS`
          );
          const tknData = {
            chainDetails: CHAIN_OSMOSIS,
            contractAddress: CHAIN_OSMOSIS.secondaryAddress,
            contractDecimals: cosmosConfig.osmosis.contractDecimal,
            isVerified: true,
            logoUrl: 'https://assets.coingecko.com/coins/images/16724/large/osmo.png',
            name: CHAIN_OSMOSIS.name,
            price: tokenPriceData.data.usd,
            symbol: CHAIN_OSMOSIS.symbol
          };
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
          const tokenPriceData = await axios.get(
            `${ARCH_HOST}/v1/prices/native/JUNO`
          );
          const tknData = {
            chainDetails: CHAIN_JUNO,
            contractAddress: CHAIN_JUNO.secondaryAddress,
            contractDecimals: cosmosConfig.juno.contractDecimal,
            isVerified: true,
            logoUrl: 'https://assets.coingecko.com/coins/images/19249/large/juno.png',
            name: CHAIN_JUNO.name,
            price: tokenPriceData.data.usd,
            symbol: CHAIN_JUNO.symbol
          };
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
          const tokenPriceData = await axios.get(
            `${ARCH_HOST}/v1/prices/native/STARGAZE`
          );
          const tknData = {
            chainDetails: CHAIN_STARGAZE,
            contractAddress: CHAIN_STARGAZE.secondaryAddress,
            contractDecimals: cosmosConfig.stargaze.contractDecimal,
            isVerified: true,
            logoUrl: 'https://public.cypherd.io/icons/stars.png',
            name: CHAIN_STARGAZE.name,
            price: tokenPriceData.data.usd,
            symbol: CHAIN_STARGAZE.symbol
          };
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

  const [time, setTime] = useState('Retrieving...');
  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  function calculateTimeDiff (currTimestamp: string) {
    const ms =
        Date.parse(String(new Date())) -
        Date.parse(currTimestamp);
    const seconds: number = Number.parseInt((ms / 1000).toFixed(0));
    const minutes: number = Number.parseInt((ms / (1000 * 60)).toFixed(0));
    const hours: number = Number.parseInt((ms / (1000 * 60 * 60)).toFixed(0));
    const days: number = Number.parseInt(
      (ms / (1000 * 60 * 60 * 24)).toFixed(0)
    );
    if (seconds < 60) return '< 1 Min ago';
    else if (minutes < 60) return `${minutes} Min ago`;
    else if (hours === 1) return `${hours} Hr ago`;
    else if (hours < 24) return `${hours} Hrs ago`;
    else if (days === 1) return `${days} Day ago`;
    else if (days < 6) return `${days} Days ago`;
    else return 'Long time Ago';
  }

  useEffect(() => {
    const timeUpdateRunner = setInterval(function time () {
      if (!isRefreshing) {
        const chainName = (portfolioState.statePortfolio.selectedChain.backendName).toLowerCase();
        const currTimestamp = portfolioState.statePortfolio.selectedChain.backendName !== 'ALL'
          ? getCurrentChainRefreshTime(chainName) // use the time for individual chain
          : portfolioState.statePortfolio.rtimestamp; // use rtimestamp for all chain data
        setTime(calculateTimeDiff(currTimestamp));
      }
    }, 1000);

    return () => {
      clearInterval(timeUpdateRunner);
    };

    function getCurrentChainRefreshTime (chainName: any) {
      return portfolioState?.statePortfolio?.tokenPortfolio[chainName]?.timestamp || new Date('1970-01-01');
    }
  }, [portfolioState.statePortfolio.rtimestamp, portfolioState.statePortfolio.selectedChain, isRefreshing]);

  async function refresh () {
    setIsRefreshing(true);
    setTime('Retrieving Data ...');
    await fetchTokenData(hdWallet, portfolioState);
    setIsRefreshing(false);
    const isDevMode = await getDeveloperMode();
    if (Platform.OS !== 'ios' || isDevMode) {
      setIsLoadingNft(true);
      await refreshNftPortfolio();
      setIsLoadingNft(false);
    }
  }

  const onRefresh = async (pullToRefresh: boolean = true) => {
    if (indexTab === 0) {
      if (pullToRefresh) setIsRefreshing(true);
      setTime('Retrieving Data ...');
      await fetchTokenData(hdWallet, portfolioState);
      if (pullToRefresh) setIsRefreshing(false);
    } else if (indexTab === 1 && (Platform.OS !== 'ios' || portfolioState.statePortfolio.developerMode)) {
      setNftIsRefreshing(true);
      const nftData = await fetchNftDatav2(portfolioState, ethereum, stargaze);
      if (nftData) {
        setNftHoldings(nftData);
      }
      setNftIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsRefreshing(false);
    if (isFocused && portfolioState.statePortfolio.portfolioState !== PORTFOLIO_LOADING) {
      void onRefresh(false);
      fetchRPCEndpointsFromServer(globalStateContext.globalDispatch).catch((e) => {
        Sentry.captureException(e.message);
      });
    }
  }, [isFocused]);

  const randomColor = [
    AppImages.RED_COIN,
    AppImages.CYAN_COIN,
    AppImages.GREEN_COIN,
    AppImages.PINK_COIN,
    AppImages.BLUE_COIN,
    AppImages.PURPLE_COIN
  ];

  const isBasicCosmosChain = (backendName: string) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE].includes(backendName);

  const isCosmosStakingToken = (chain: string, tokenData: any) => tokenData.chainDetails.backendName === ChainBackendNames[chain as ChainBackendNames] && tokenData.name === CosmosStakingTokens[chain as CosmosStakingTokens];

  const isACosmosStakingToken = (tokenData: any) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE].some(chain => isCosmosStakingToken(chain as string, tokenData));

  const onSwipe = (key) => {
    if (previousOpenedSwipeableRef && previousOpenedSwipeableRef !== swipeableRefs[key]) {
      previousOpenedSwipeableRef.close();
    }
    previousOpenedSwipeableRef = swipeableRefs[key];
    // swipeableRefs[key].close();
  };

  const Item = ({ item, index }) =>
    (verifyCoinChecked && item.isVerified) || !verifyCoinChecked
      ? (
        <>
          <DynamicTouchView
            sentry-label="see-token-txns"
            dynamic
            dynamicWidth
            width={100}
            fD={'row'}
            pV={16}
            pH={15}
            onPress={() => {
              props.navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
                tokenData: item
              });
            }}
          >
            <DynamicView dynamic pos={'relative'}>
              {item.logoUrl
                ? (
                  <CyDFastImage
                    className={'h-[50px] w-[50px]'}
                    source={{
                      uri: item.logoUrl
                    }}
                  />
                  )
                : (
                  <DynamicView
                    dynamic
                    dynamicWidthFix
                    dynamicHeightFix
                    height={54}
                    width={54}
                    aLIT="center"
                    fD={'row'}
                    jC="center"
                    bGC={Colors.appColor}
                    bR={50}
                  >
                    <DynamicImage
                      dynamic
                      dynamicWidth
                      height={50}
                      width={50}
                      resizemode="contain"
                      source={
                        randomColor[Math.floor(Math.random() * randomColor.length)]
                      }
                    />
                  </DynamicView>
                  )}
              <DynamicView
                dynamic
                style={{ position: 'absolute', top: 35, right: -5 }}
              >
                <CyDFastImage
                  className={'h-[20px] w-[20px] rounded-[50px] border-[1px] border-white bg-white'}
                  source={item.chainDetails.logo_url ?? 'https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/assets/images/common/unknown.png'}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </DynamicView>
            </DynamicView>
            <Swipeable
              key={index}
              ref={ref => { swipeableRefs[index] = ref; }}
              friction={1}
              rightThreshold={0}
              renderRightActions={() => RenderRightActions(item)}
              onSwipeableWillOpen={() => { onSwipe(index); }}
            >
              <CyDView className='w-[100%] flex flex-row bg-white'>
                <DynamicView dynamic dynamicHeightFix height={54} fD={'row'} bR={20}>
                  <DynamicView
                    dynamic
                    dynamicWidthFix
                    width={145}
                    dynamicHeightFix
                    height={54}
                    aLIT="flex-start"
                    fD={'column'}
                    jC="center"
                    pH={8}
                  >
                    <DynamicView
                      dynamic
                      dynamicWidthFix
                      width={150}
                      fD={'row'}
                      jC={'flex-start'}
                    >
                      <CText
                        numberOfLines={2}
                        tA={'left'}
                        dynamic
                        fF={C.fontsName.FONT_BOLD}
                        fS={16}
                        color={Colors.primaryTextColor}
                      >
                        {item.name}
                      </CText>
                      {(isACosmosStakingToken(item)) &&
                        (
                          <CText
                            tA={'left'}
                            dynamic
                            fF={C.fontsName.FONT_REGULAR}
                            fS={10}
                            bGC={Colors.appColor}
                            style={{ paddingHorizontal: 8 }}
                            mL={8}
                            color={Colors.secondaryTextColor}
                          >
                            stake
                          </CText>
                        )}
                    </DynamicView>
                    <CText
                      dynamic
                      fF={C.fontsName.FONT_SEMI_BOLD}
                      fS={12}
                      tA={'left'}
                      color={Colors.subTextColor}
                    >
                      {item.symbol}
                    </CText>
                  </DynamicView>
                </DynamicView>
                <DynamicView
                  dynamic
                  dynamicHeightFix
                  height={54}
                  fD={'row'}
                  jC="center"
                >
                  <DynamicView
                    dynamic
                    dynamicWidthFix
                    width={120}
                    dynamicHeightFix
                    height={54}
                    aLIT="flex-end"
                    fD={'column'}
                    jC="center"
                    pH={8}
                  >
                    <CyDTokenValue className='text-[18px] font-bold'>
                      {item.totalValue + item.actualStakedBalance}
                    </CyDTokenValue>
                    <CyDTokenAmount className='text-[14px]'>
                      {item.actualBalance + item.stakedBalanceTotalValue}
                    </CyDTokenAmount>
                  </DynamicView>
                </DynamicView>
              </CyDView>
            </Swipeable>
          </DynamicTouchView>
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeightFix
            height={1}
            width={100}
            bGC={Colors.portfolioBorderColor}
          />
        </>
        )
      : (
        <></>
        );

  const renderImageItem = (item: { item: { symbol: string, address: string, tokenId: string, image: string } }) => {
    return (
      <>
        <DynamicTouchView
          sentry-label="txn-detail-explorer"
          dynamic
          fD={'row'}
          pV={8}
          onPress={() => {
            portfolioState.statePortfolio.selectedChain.backendName !== 'ALL'
              ? props.navigation.navigate(C.screenTitle.NFTS_DETAIL, {
                url: getNftExplorerUrl(
                  item.item.symbol,
                  item.item.address,
                  item.item.tokenId
                )
              })
              : '';
          }}
        >
          {item.item.image && !item.item.image.startsWith('ipfs') && (
            <CyDImage
              id="nft_image"
              source={{ uri: item.item.image }}
              className={'h-[100px] w-[100px] rounded-[9px] mx-[10] mv-[10]'}
            />
          )}
        </DynamicTouchView>
      </>
    );
  };

  const ItemNFT = ({ item, index }) => {
    return (
      <>
        <DynamicTouchView
          sentry-label="portfolio-nft-item"
          dynamic
          fD={'row'}
          pV={8}
          onPress={() => {
            setSelectedIndex(selectedIndex === index ? -1 : index);
            void analytics().logEvent('clicks', {
              item: 'nft detail',
              where: 'portfolio'
            });
          }}
          bGC={Colors.whiteColor}
        >
          <DynamicView dynamic dynamicHeightFix height={84} fD={'row'} bR={30}>
            <DynamicView
              dynamic
              dynamicHeightFix
              height={84}
              aLIT="flex-start"
              fD={'column'}
              jC="center"
              pH={8}
            >
              <CText
                dynamic
                fF={C.fontsName.FONT_EXTRA_BOLD}
                fS={15}
                color={
                  selectedIndex === index
                    ? Colors.selectedTextColor
                    : Colors.primaryTextColor
                }
              >
                {item.name}
              </CText>
              <CText
                dynamic
                fF={C.fontsName.FONT_BOLD}
                fS={14}
                tA={'left'}
                color={Colors.subTextColor}
              >
                {item.count}
              </CText>
              <CText
                dynamic
                fF={C.fontsName.FONT_REGULAR}
                fS={12}
                tA={'left'}
                color={Colors.primaryTextColor}
              >
                {item.description ? item.description.split('.')[0] + '.' : ''}
              </CText>
            </DynamicView>
          </DynamicView>
          <DynamicImage
            dynamic
            dynamicWidth
            height={6}
            width={6}
            resizemode="contain"
            source={
              selectedIndex === index ? AppImages.UP_ARROW : AppImages.DOWN_ARROW
            }
          />
        </DynamicTouchView>
        {
          selectedIndex === index && (
            // <DynamicView dynamic dynamicHeightFix height={item.images.length <= 2 ? 160 : 320} fD={'row'} bR={20}>
            <FlatList
              nestedScrollEnabled
              data={item.collections}
              numColumns={2}
              renderItem={renderImageItem}
              keyExtractor={item => item.id}
            />
          )

          // </DynamicView>
        }
        <DynamicView
          dynamic
          dynamicWidth
          dynamicHeightFix
          height={1}
          width={100}
          bGC={Colors.portfolioBorderColor}
        />
      </>
    );
  };

  const emptyView = (view: any) => {
    return (
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        height={50}
        width={100}
        mT={0}
        bGC={Colors.whiteColor}
        aLIT={'center'}
      >
        {view === 'empty'
          ? (
            <EmptyView
              text={t('NO_CURRENT_HOLDINGS')}
              image={AppImages.EMPTY}
              buyVisible={false}
              marginTop={80}
            />
            )
          : (
            <EmptyView
              text={t('LOADING...')}
              image={AppImages.EMPTY}
              buyVisible={false}
              marginTop={80}
            />
            )}
      </DynamicView>
    );
  };

  const renderersProps = {
    a: {
      onPress: (event: any, href: string) => {
        props.navigation.navigate(C.screenTitle.GEN_WEBVIEW, {
          url: href
        });
      }
    }
  };
  const canShowIBC = (tokenData: any) => {
    return globalStateContext.globalState.ibc && (isBasicCosmosChain(tokenData.chainDetails.backendName) || (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && (tokenData.name === CosmosStakingTokens.EVMOS || tokenData.name.includes('IBC'))));
  };
  const canShowBridge = (tokenData: any) => {
    return tokenData.isVerified && (ChainNames.ETH === tokenData.chainDetails.chainName || isACosmosStakingToken(tokenData));
  };

  const canShowFundCard = (tokenData: any) => {
    return (Number(tokenData.totalValue) >= minFundCardValue);
  };

  const RenderRightActions = (tokenData: any) => {
    return (
      <CyDView className={'flex flex-row justify-evenly items-center'}>
        <CyDView>
          <CyDTouchView className={'flex items-center justify-center mx-[15px]'} onPress={() => {
            props.navigation.navigate(C.screenTitle.ENTER_AMOUNT, {
              tokenData
            });
          } }>
            <CyDImage source={AppImages.SEND_SHORTCUT} className={'w-[35px] h-[35px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('SEND')}</CyDText>
        </CyDView>

        {canShowIBC(tokenData) && <CyDView>
          <CyDTouchView className={' bg-appColor rounded-full flex items-center justify-center mx-[15px] p-[11px]'}
            onPress={() => {
              props.navigation.navigate(C.screenTitle.IBC_SCREEN, {
                tokenData
              });
            } }>
            <CyDImage source={AppImages.IBC} className={'w-[15px] h-[15px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('IBC')}</CyDText>
        </CyDView>}

        {/* {canShowFundCard(tokenData) && <CyDView>
            <CyDTouchView className={'flex items-center justify-center'}
              onPress={() => {
                props.navigation.navigate(C.screenTitle.DEBIT_CARD, {
                  screen: C.screenTitle.SOLID_FUND_CARD_SCREEN, params: { tokenData, navigation: props.navigation }, initial: false
                });
              }}
            >
                <CyDImage source={AppImages.FUND_CARD_SHORTCUT} className={'w-[35px] h-[35px]'} />
            </CyDTouchView>
            <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('FUND_CARD')}</CyDText>
        </CyDView>} */}

        {canShowBridge(tokenData) && <CyDView>
          <CyDTouchView className={'flex items-center justify-center mx-[15px]'}
                        onPress={() => {
                          props.navigation.navigate(C.screenTitle.BRIDGE_SCREEN, {
                            fromChainData: tokenData
                          });
                        }}>
            <CyDImage source={AppImages.BRIDGE_SHORTCUT} className={'w-[35px] h-[35px]'}/>
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('BRIDGE')}</CyDText>
        </CyDView>}

        <CyDView>
          <CyDTouchView className={' flex items-center justify-center mx-[15px]'} onPress={() => {
            let addressTypeQRCode;
            if (tokenData.chainDetails.backendName === ChainBackendNames.COSMOS) {
              addressTypeQRCode = FundWalletAddressType.COSMOS;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.OSMOSIS) {
              addressTypeQRCode = FundWalletAddressType.OSMOSIS;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
              addressTypeQRCode = FundWalletAddressType.EVMOS;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.ETH) {
              addressTypeQRCode = FundWalletAddressType.EVM;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.JUNO) {
              addressTypeQRCode = FundWalletAddressType.JUNO;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.STARGAZE) {
              addressTypeQRCode = FundWalletAddressType.STARGAZE;
            }
            props.navigation.navigate(C.screenTitle.QRCODE, { addressType: addressTypeQRCode });
          } }>
            <CyDImage source={AppImages.RECEIVE_SHORTCUT} className={'w-[35px] h-[35px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px]  text-[12px] font-bold'}>{t<string>('RECEIVE')}</CyDText>
        </CyDView>
      </CyDView>
    );
  };

  const renderItem = ({ item, index }) => {
    return (indexTab === 0
      ? (
          <Item item={item} key={index} index={index} />
        )
      : (
        <ItemNFT item={item} index={index} />
        ));
  };

  const checkAll = (portfolioState: { statePortfolio: { selectedChain: Chain, tokenPortfolio: WalletHoldings } }) => {
    if (portfolioState.statePortfolio.selectedChain.backendName !== 'ALL') {
      const currentChainHoldings = getCurrentChainHoldings(
        portfolioState.statePortfolio.tokenPortfolio,
        portfolioState.statePortfolio.selectedChain
      );
      return verifyCoinChecked
        ? currentChainHoldings.chainTotalBalance + currentChainHoldings.chainStakedBalance
        : currentChainHoldings.chainUnVerifiedBalance + currentChainHoldings.chainStakedBalance;
    } else {
      return verifyCoinChecked
        ? portfolioState.statePortfolio.tokenPortfolio.totalBalance + portfolioState.statePortfolio.tokenPortfolio.totalStakedBalance
        : portfolioState.statePortfolio.tokenPortfolio.totalUnverifiedBalance + portfolioState.statePortfolio.tokenPortfolio.totalStakedBalance;
    }
  };

  const extractHoldingsData = (portfolioState: { statePortfolio: { selectedChain: Chain, tokenPortfolio: WalletHoldings } }) => {
    if (portfolioState.statePortfolio.selectedChain.backendName !== 'ALL') {
      return getCurrentChainHoldings(
        portfolioState.statePortfolio.tokenPortfolio,
        portfolioState.statePortfolio.selectedChain
      )
        ? getCurrentChainHoldings(
          portfolioState.statePortfolio.tokenPortfolio,
          portfolioState.statePortfolio.selectedChain
        ).holdings
        : [];
    } else {
      const data = getCurrentChainHoldings(
        portfolioState.statePortfolio.tokenPortfolio,
        portfolioState.statePortfolio.selectedChain
      )
        ? getCurrentChainHoldings(
          portfolioState.statePortfolio.tokenPortfolio,
          portfolioState.statePortfolio.selectedChain
        )
        : [];
      return data;
    }
  };

  const onSuccess = (e) => {
    const link = e.data;
    portfolioState.dispatchPortfolio({ value: { walletConnectURI: link } });
    props.navigation.goBack();
    props.navigation.navigate(C.screenTitle.WALLET_CONNECT);
  };

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

  const hideBalances = async () => {
    showToast(hideBalance ? t<string>('PRIVACY_MODE_OFF') : t<string>('PRIVACY_MODE_ON'));
    await setHideBalanceStatus(!hideBalance);
    hdWallet.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: !hideBalance } });
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <>
      {isLoading || portfolioState.statePortfolio.portfolioState === PORTFOLIO_NEW_LOAD || portfolioState.statePortfolio.portfolioState === PORTFOLIO_LOADING
        ? (
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={100}
            width={100}
            jC="flex-start"
            bGC={Colors.whiteColor}
          >
            <EmptyView
              text={'Loading..'}
              image={AppImages.LOADING_IMAGE}
              buyVisible={false}
              marginTop={-50}
              isLottie={true}
            />
          </DynamicView>
          )
        : (
          <></>
          )}

      {portfolioState.statePortfolio.portfolioState === PORTFOLIO_ERROR
        ? (
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={100}
            width={100}
            jC="center"
            bGC={Colors.whiteColor}
          >
            <DynamicImage
              dynamic
              resizemode="contain"
              source={AppImages.NETWORK_ERROR}
              style={{ height: 100, width: 100 }}
            />
            <DynamicTouchView
              sentry-label="portfolio-empty-refresh-page"
              mT={7}
              dynamic
              dynamicWidth
              width={100}
              fD={'row'}
              jC="center"
              pV={8}
              onPress={() => {
                void onRefresh();
              }}
            >
              <CText
                dynamic
                fF={C.fontsName.FONT_BOLD}
                fS={14}
                tA={'center'}
                color={Colors.redColor}
              >
                {t('RETRY')}
              </CText>
            </DynamicTouchView>
          </DynamicView>
          )
        : (
          <></>
          )}

        <SafeAreaView dynamic>
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
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={100}
            width={100}
            jC="flex-start"
            bGC={Colors.whiteColor}
          >
            {bannerVisible && (
              <DynamicView
                dynamic
                fD={'row'}
                bGC={
                  bannerData.type ? getBannerColor[bannerData.type] : 'black'
                }
                dynamicWidth
                width={100}
                pH={16}
                mT={12}
              >
                <DynamicView
                  dynamic
                  fD={'row'}
                  dynamicWidth
                  width={bannerData.isClosable ? 93 : 100}
                >
                  <HTML
                  contentWidth={bannerData.isClosable ? 93 : 100}
                    baseStyle={{
                      fontSize: '14px',
                      fontWeight: '400',
                      color:
                    bannerData.type
                      ? getBannerTextColor[bannerData.type]
                      : 'black'
                    }} renderersProps={renderersProps} source={{ html: bannerData.message }}/>
                </DynamicView>

                {bannerData.isClosable && (
                  <DynamicTouchView
                    dynmaic
                    onPress={() => {
                      setBannerVisible(false);
                      if (bannerData.isClosable) {
                        void setBannerId(bannerData.id);
                      }
                    }}
                  >
                    <DynamicImage
                      dynamic
                      resizemode="contain"
                      source={AppImages.CLOSE_CIRCLE}
                      dynamicTintColor
                      tC={
                        bannerData.type
                          ? getBannerTextColor[bannerData.type]
                          : 'black'
                      }
                    />
                  </DynamicTouchView>
                )}
              </DynamicView>
            )}
            <CyDImageBackground className='h-[26%] px-[20] w-[100%]' source={{ uri: portfolioBackgroundImage }} resizeMode={'stretch'}>
              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeightFix
                height={50}
                width={100}
                jC={'space-between'}
                aLIT="center"
                bR={8}
                fD={'row'}
              >
                <DynamicTouchView
                  sentry-label="portfolio-choose-chain"
                  dynamic
                  dynamicWidthFix
                  dynamicHeightFix
                  height={35}
                  width={52}
                  bGC={Colors.chainColor}
                  mT={10}
                  bR={36}
                  pH={8}
                  pV={4}
                  fD={'row'}
                  onPress={() => {
                    setChooseChain(true);
                  }}
                >
                  <DynamicImage
                    dynamic
                    dynamicWidth
                    height={55}
                    width={55}
                    resizemode="contain"
                    source={
                      portfolioState.statePortfolio.selectedChain.logo_url
                    }
                  />
                  <DynamicImage
                    dynamic
                    dynamicWidthFix
                    dynamicHeightFix
                    // marginHorizontal={4}
                    height={8}
                    width={8}
                    resizemode="contain"
                    source={AppImages.DOWN}
                  />
                </DynamicTouchView>
                {(Platform.OS !== 'ios' || portfolioState.statePortfolio.developerMode) &&
                  <SwitchView
                    index={indexTab}
                    setIndexChange={(index: React.SetStateAction<number>) => {
                      setIndexTab(index);
                      setValueChange(!valueChange);
                      void analytics().logEvent('clicks', {
                        item: index ? 'nft' : 'wallet',
                        where: 'token button'
                      });
                    }}
                    title1={t('COINS')}
                    title2={t('NFTS')}
                  />
                }
                <CyDTouchView
                  onPress={() => {
                    props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
                      fromPage: QRScannerScreens.WALLET_CONNECT,
                      onSuccess
                    });
                  }}
                >
                  <CyDImage source={AppImages.QR_CODE} className={'h-[25px] w-[25px] mt-[10px]'} />
                </CyDTouchView>
              </DynamicView>
              {indexTab === 0
                ? (
                  <DynamicView
                    dynamic
                    dynamicWidth
                    dynamicHeight
                    height={25}
                    width={100}
                    mT={30}
                    jC={'center'}
                    aLIT={'flex-start'}
                  >
                    { !portfolioState.statePortfolio.developerMode && Platform.OS === 'ios' && <CText
                      dynamic
                      fF={C.fontsName.FONT_SEMI_BOLD}
                      fS={14}
                      color={Colors.primaryTextColor}
                    >
                      Total balance
                    </CText>}
                    {getCurrentChainHoldings(
                      portfolioState.statePortfolio.tokenPortfolio,
                      portfolioState.statePortfolio.selectedChain
                    ) && (
                      <CyDView>
                        <CyDView className='flex flex-row items-center'>
                          <CyDTokenValue className='text-[32px] font-extrabold text-primaryTextColor'>
                            {checkAll(portfolioState)}
                          </CyDTokenValue>
                          <CyDTouchView onPress={async () => await hideBalances()}>
                            <CyDImage source={hideBalance ? AppImages.CYPHER_HIDE : AppImages.CYPHER_SHOW} className='h-[22px] w-[20px] ml-[15px]' resizeMode='contain'/>
                          </CyDTouchView>
                        </CyDView>
                      </CyDView>
                    )}
                  </DynamicView>
                  )
                : (
                  <DynamicView
                    dynamic
                    dynamicWidth
                    dynamicHeight
                    height={70}
                    width={100}
                    aLIT="flex-start"
                    bR={8}
                    jC="center"
                  >
                    <CText
                      dynamic
                      fF={C.fontsName.FONT_EXTRA_BOLD}
                      fS={35}
                      color={Colors.primaryTextColor}
                    >
                      {t('COLLECTIONS')}
                    </CText>
                  </DynamicView>
                  )}
            </CyDImageBackground>
            {indexTab === 0 && (
              <DynamicView
                dynamic
                dynamicWidth
                width={100}
                bGC={Colors.whiteColor}
                aLIT={'space-between'}
              >
                <DynamicView
                  dynamic
                  dynamicWidth
                  dynamicHeightFix
                  height={1}
                  width={100}
                  bGC={Colors.portfolioBorderColor}
                />
                <DynamicView
                  dynamic
                  dynamicWidth
                  width={100}
                  mV={5}
                  mT={10}
                  mB={10}
                  bR={15}
                  pH={10}
                  pV={5}
                  jC={'space-between'}
                  fD={'row'}
                >
                  <DynamicView dynamic fD={'row'} jC={'center'} >
                    <DynamicImage source={AppImages.CLOCK} dynamic dynamicHeightFix dynamicWidthFix height={14} width={14} mR={8} mL={8}/>
                    <CText
                      dynamic
                      fF={C.fontsName.FONT_REGULAR}
                      fS={12}
                      color={Colors.primaryTextColor}
                    >
                      {time}
                    </CText>
                  </DynamicView>
                  <DynamicView dynamic fD={'row'}>
                    <DynamicTouchView
                      sentry-label="verify-coin"
                      dynamic
                      bO={1}
                      bR={4}
                      dynamicWidthFix
                      dynamicHeightFix
                      height={15}
                      width={15}
                      mH={5}
                      bGC={verifyCoinChecked ? 'black' : 'transparent'}
                      onPress={() => {
                        setVerifyCoinChecked(!verifyCoinChecked);
                      }}
                    >
                      {verifyCoinChecked && (
                        <DynamicImage
                          dynamic
                          source={AppImages.CORRECT}
                          width={10}
                          height={12}
                        />
                      )}
                    </DynamicTouchView>
                    <CText
                      dynamic
                      fF={C.fontsName.FONT_REGULAR}
                      mH={5}
                      fS={12}
                      mL={3}
                      color={Colors.primaryTextColor}
                    >
                      Only verified coins
                    </CText>
                  </DynamicView>
                </DynamicView>
                <DynamicView
                  dynamic
                  dynamicWidth
                  dynamicHeightFix
                  height={1}
                  width={100}
                  bGC={Colors.portfolioBorderColor}
                />
              </DynamicView>
            )}
            {indexTab === 0 && portfolioState.statePortfolio.tokenPortfolio?.totalUnverifiedBalance > 0
              ? (
                <FlatList
                  nestedScrollEnabled
                  data={extractHoldingsData(portfolioState)}
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
                )
              : indexTab === 0 && portfolioState.statePortfolio.portfolioState === PORTFOLIO_EMPTY &&
                  <CyDView className={'mt-[15px]'}>
                    <LottieView source={AppImages.PORTFOLIO_EMPTY} autoPlay loop style={{ width: '60%' }} />
                    <CyDTouchView className={'flex-row bg-appColor rounded-[12px] justify-center items-center min-h-[40px]'} onPress={() => { props.navigation.navigate(C.screenTitle.QRCODE); }}>
                      <CyDImage source={AppImages.RECEIVE} className={'w-[12px] h-[12px] mr-[16]'}/>
                      <CyDText className={'font-bold text-[16px]'}>{t('FUND_WALLET').toString()}</CyDText>
                    </CyDTouchView>
                    <CyDTouchView className='mt-[20px]' onPress={() => {
                      void (async () => await onRefresh())();
                    }}>
                      <CyDText className='text-center text-blue-500 underline'>{t<string>('CLICK_TO_REFRESH')}</CyDText>
                    </CyDTouchView>
                  </CyDView>
            }
            {indexTab === 1 && typeof nftHoldings[
              portfolioState.statePortfolio.selectedChain.symbol
            ] === 'undefined'
              ? (
                  emptyView('loading')
                )
              : (
                <></>
                )}
            {typeof nftHoldings[
              portfolioState.statePortfolio.selectedChain.symbol
            ] !== 'undefined' &&
            indexTab === 1 &&
            nftHoldings[portfolioState.statePortfolio.selectedChain.symbol]
              .length !== 0
              ? (
                <FlatList
                  nestedScrollEnabled
                  data={
                    nftHoldings[
                      portfolioState.statePortfolio.selectedChain.symbol
                    ]
                  }
                  renderItem={renderItem}
                  onRefresh={onRefresh}
                  refreshing={isNftRefreshing}
                  style={{ width: '100%', backgroundColor: Colors.whiteColor }}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={emptyView('empty')}
                  showsVerticalScrollIndicator={false}
                />
                )
              : (
                <></>
                )}
            {typeof nftHoldings[
              portfolioState.statePortfolio.selectedChain.symbol
            ] !== 'undefined' &&
            !isLoadingNft &&
            indexTab === 1 &&
            nftHoldings[portfolioState.statePortfolio.selectedChain.symbol]
              .length === 0
              ? (
                  emptyView('empty')
                )
              : (
                <></>
                )}
            {indexTab === 1 && typeof nftHoldings[
              portfolioState.statePortfolio.selectedChain.symbol
            ] !== 'undefined' &&
            isLoadingNft &&
            indexTab === 1 &&
            nftHoldings[portfolioState.statePortfolio.selectedChain.symbol]
              .length === 0
              ? (
                  emptyView('loading')
                )
              : (
                <></>
                )}
          </DynamicView>
        </SafeAreaView>

    </>
  );
}
