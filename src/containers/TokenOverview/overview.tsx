/* eslint-disable react-native/no-inline-styles */
import { t } from 'i18next';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  beautifyPriceWithUSDDenom,
  convertFromUnitAmount,
  copyToClipboard,
  HdWalletContext,
  isABasicCosmosStakingToken,
  isNativeToken,
} from '../../core/util';
import {
  COSMOS_STAKING_LOADING,
  CosmosStakingContext,
} from '../../reducers/cosmosStakingReducer';
import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import {
  useIsFocused,
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Dimensions,
  RefreshControl,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import {
  ChartDot,
  ChartPath,
  ChartPathProvider,
  monotoneCubicInterpolation,
  simplifyData,
  ChartYLabel,
  ChartXLabel,
} from '@cypherd-io/animated-charts';
import AppImages from '../../../assets/images/appImages';
import FastImage from 'react-native-fast-image';
import { Colors } from '../../constants/theme';
import HTML from 'react-native-render-html';
import { screenTitle } from '../../constants';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import clsx from 'clsx';
import { isAndroid } from '../../misc/checkers';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import CyDTokenValue from '../../components/v2/tokenValue';
import useAxios from '../../core/HttpRequest';
import Intercom from '@intercom/intercom-react-native';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';
import Loading from '../../components/v2/loading';
import { has } from 'lodash';
import Tooltip from 'react-native-walkthrough-tooltip';
import { getDateFormatBasedOnLocaleForTimestamp } from '../../core/locale';
import { getCosmosStakingData } from '../../core/cosmosStaking';
import { GlobalContext } from '../../core/globalContext';
import { showToast } from '../utilities/toastUtility';

const { width } = Dimensions.get('window');

export const graphs = [
  {
    label: '1D',
    value: 0,
    dataSource: 0,
  },
  {
    label: '1W',
    value: 1,
    dataSource: 1,
  },
  {
    label: '1M',
    value: 2,
    dataSource: 2,
  },
  {
    label: '1Y',
    value: 3,
    dataSource: 3,
  },
  {
    label: 'ALL',
    value: 4,
    dataSource: 4,
  },
] as const;

const SELECTION_WIDTH = width - 32;
const BUTTON_WIDTH = (width - 32) / graphs.length;

export default function Overview({
  tokenData,
  navigation,
  otherChainsWithToken,
}: {
  tokenData: TokenMeta;
  otherChainsWithToken: any[];
  navigation: NavigationProp<ParamListBase>;
}) {
  const isFocused = useIsFocused();
  const { getWithAuth } = useAxios();
  const cosmosStaking = useContext<any>(CosmosStakingContext);
  const cosmosStakingContextStatus = cosmosStaking.cosmosStakingState.status;
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalStateContext = useContext<any>(GlobalContext);
  const chain = hdWalletContext.state.wallet[tokenData.chainDetails.chainName];
  const { width: SIZE } = Dimensions.get('window');
  const [loadMoreAbout, setLoadMoreAbout] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState({
    points: [],
    smoothingFactor: 0.45,
    smoothingStrategy: 'bezier',
  });
  const [dataSource, setDataSource] = useState(0);
  const simplifying = false;

  const numberOfPointsInterpolated = 200;
  const smoothingStrategy = 'bezier';
  const pickRange = 10;
  const includeExtremes = true;

  const [, setBalanceLoading] = useState(true);
  const [chartData, setChartData] = useState();
  const [chartloading, setChartLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState(0);
  const scrollViewRef = useRef<ScrollView>();

  const [marketDistribution, setMarketDistribution] = useState();
  const [marketDistributionLoading, setMarketDistributionLoading] =
    useState(true);
  const [loading, setLoading] = useState<boolean>(false);
  let chartTimeout: ReturnType<typeof setTimeout>;
  let marketDistributionTimeout: ReturnType<typeof setTimeout>;
  const [showMarketCapTip, setMarketCapTip] = useState(false);
  const [showCirculatingSupplyTip, setCirculatingSupplyTip] = useState(false);
  const [showVolumeTip, setVolumeTip] = useState(false);
  const [showMaxSupplyTip, setMaxSupplyTip] = useState(false);
  const [showTotalSupplyTip, setTotalSupplyTip] = useState(false);
  const chartXValue = useSharedValue('');
  const [tokenDescription, setTokenDescription] = useState<string>('');
  const [totalValueInAmount, setTotalAmountInValue] = useState(
    `${
      +tokenData.totalValue +
      +tokenData.actualStakedBalance +
      +tokenData.actualUnbondingBalance
    }`,
  );
  const [totalValue, setTotalValue] = useState(
    `${
      +tokenData.actualBalance +
      +tokenData.stakedBalanceTotalValue +
      +tokenData.unbondingBalanceTotalValue
    }`,
  );
  const [chartVisible, setChartVisible] = useState(false);
  useEffect(() => {
    setChartVisible(true);
  }, [data, chartData]);

  useEffect(() => {
    if (isFocused) {
      setLoading(true);
      if (tokenData.isVerified && tokenData?.coinGeckoId !== '') {
        initialize();
      } else {
        setChartLoading(false);
        setBalanceLoading(false);
        setMarketDistributionLoading(false);
      }
      setLoading(false);
    }
    return () => {
      clearTimeout(chartTimeout);
      clearTimeout(marketDistributionTimeout);
    };
  }, [isFocused]);

  const initialize = () => {
    void getChartData();
    void getMarketDistribution();
  };

  const getChartData = async () => {
    const resp = await getWithAuth(
      `/v1/portfolio/historical/${tokenData.coinGeckoId}`,
    );
    if (!resp.isError) {
      const { data } = resp;
      if (data?.day1?.data.length > 0) {
        setChartData(data);
        setDataSource(0);
        setSelectedTrend(data.day1.trend);
        setChartLoading(false);
      } else {
        if (isFocused) {
          chartTimeout = setTimeout(() => {
            void getChartData();
          }, 5000);
        } else {
          setChartLoading(false);
        }
      }
    } else {
      setChartLoading(false);
    }
  };

  const getMarketDistribution = async () => {
    const resp = await getWithAuth(
      `/v1/portfolio/tokenMetaData/${tokenData.coinGeckoId}`,
    );
    if (!resp.isError) {
      const { data } = resp;
      if (has(data, 'marketCap')) {
        setMarketDistribution(data);
        setMarketDistributionLoading(false);
        setTokenDescription(data.description);
      } else {
        if (isFocused) {
          marketDistributionTimeout = setTimeout(() => {
            void getMarketDistribution();
          }, 5000);
        } else {
          setMarketDistributionLoading(false);
        }
      }
    } else {
      setMarketDistributionLoading(false);
    }
  };

  const getRawData = () => {
    switch (dataSource) {
      case 0:
        setSelectedTrend(chartData.day1?.trend);
        return chartData.day1.data;
      case 1:
        setSelectedTrend(chartData.week1.trend);
        return chartData.week1.data;
      case 2:
        setSelectedTrend(chartData.month1.trend);
        return chartData.month1.data;
      case 3:
        setSelectedTrend(chartData.year1.trend);
        return chartData.year1.data;
      case 4:
        setSelectedTrend(chartData.all.trend);
        return chartData.all.data;
    }
  };

  useEffect(() => {
    if (chartData) {
      const origData = getRawData();
      const rawData = origData.map(([x, y]) => ({ x, y }));
      const simplifiedData = simplifying
        ? simplifyData(rawData, pickRange, includeExtremes)
        : rawData;
      const intepolatedData = (() => {
        return monotoneCubicInterpolation({
          data: simplifiedData,
          range: numberOfPointsInterpolated,
        });
      })();
      const data = {
        points: intepolatedData,
        smoothingFactor: 0.45,
        smoothingStrategy,
      };
      setData(data);
      setChartLoading(false);
    }
  }, [dataSource, chartData]);

  type GraphIndex = 0 | 1 | 2 | 3 | 4;
  const transition = useSharedValue(0);
  const previous = useSharedValue<GraphIndex>(0);
  const current = useSharedValue<GraphIndex>(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(BUTTON_WIDTH * current.value) }],
  }));

  const getDateTime = (value: number) => {
    const dateTime = getDateFormatBasedOnLocaleForTimestamp(value);
    chartXValue.value = dateTime;
  };

  const formatPriceValue = (value: string) => {
    'worklet';
    if (value === '') {
      return `$${parseFloat(tokenData.price).toFixed(2)}`;
    }
    return `$${parseFloat(value).toFixed(2)}`;
  };

  const formatTimestamp = (value: string) => {
    'worklet';
    if (value !== '') {
      runOnJS(getDateTime)(+value);
      return chartXValue.value;
    } else {
      return '';
    }
  };

  const getStakingMetaData = async () => {
    await getStakingData();
  };

  const getStakingData = async () => {
    await getCosmosStakingData(
      cosmosStaking.cosmosStakingDispatch,
      globalStateContext.globalState,
      tokenData.chainDetails.backendName,
      chain.wallets[chain.currentIndex].address,
      tokenData.denom,
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    void getStakingMetaData();
    getTotalTokens();
    getTotalValue();
    setRefreshing(false);
  };

  useEffect(() => {
    if (cosmosStakingContextStatus !== COSMOS_STAKING_LOADING) {
      onRefresh();
    }
  }, [tokenData]);

  const getTotalTokens = () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      setTotalValue(
        `${convertFromUnitAmount(
          (
            Number(cosmosStaking.cosmosStakingState.balance) +
            Number(cosmosStaking.cosmosStakingState.stakedBalance)
          ).toString(),
          tokenData.contractDecimals,
        )}`,
      );
    } else {
      setTotalValue(`${tokenData.actualBalance}`);
    }
  };

  const getTotalValue = () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      setTotalAmountInValue(
        `${
          Number(tokenData.price) *
          +convertFromUnitAmount(
            (
              Number(cosmosStaking.cosmosStakingState.balance) +
              Number(cosmosStaking.cosmosStakingState.stakedBalance)
            ).toString(),
            tokenData.contractDecimals,
          )
        }`,
      );
    } else {
      setTotalAmountInValue(`${tokenData.totalValue}`);
    }
  };

  const { width } = Dimensions.get('window');

  const renderersProps = {
    a: {
      onPress: (event: any, href: string) => {
        navigation.navigate(screenTitle.GEN_WEBVIEW, {
          url: href,
        });
      },
    },
  };

  const TokenSummary = () => {
    return (
      <CyDView className='flex flex-row items-center mt-[12px] mx-[12px] border-[1px] rounded-[8px] border-fadedGrey'>
        <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center px-[10px]'>
          <CyDFastImage
            className={'h-[35px] w-[35px] rounded-[50px]'}
            source={{ uri: tokenData?.logoUrl }}
            resizeMode='contain'
          />
          <CyDView className='absolute top-[54%] right-[5px]'>
            <CyDFastImage
              className={
                'h-[20px] w-[20px] rounded-[50px] border-[1px] border-white bg-white'
              }
              source={
                tokenData.chainDetails.logo_url ??
                'https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/assets/images/common/unknown.png'
              }
              resizeMode={FastImage.resizeMode.contain}
            />
          </CyDView>
        </CyDView>
        <CyDView style={{ display: 'flex', width: '85%' }}>
          <CyDView className='flex flex-row w-full justify-between items-center rounded-r-[20px] py-[15px] pr-[20px]'>
            <CyDView className='ml-[10px] max-w-[60%]'>
              <CyDView className={'flex flex-row items-center align-center'}>
                <CyDText className={'font-extrabold text-[16px]'}>
                  {tokenData.name}{' '}
                </CyDText>
                <CyDView className='bg-gray-200 rounded-[5px] px-[4px]'>
                  <CyDText className={'text-[12px]'}>
                    {tokenData.symbol}
                  </CyDText>
                </CyDView>
                <CyDText>
                  {' '}
                  {tokenData?.isVerified && (
                    <CyDImage
                      source={AppImages.VERIFIED_ICON}
                      className={'w-[16px] h-[16px] mt-[-1px]'}
                    />
                  )}
                </CyDText>
              </CyDView>
              {tokenData.contractAddress && !isNativeToken(tokenData) && (
                <CyDView className='flex flex-row items-center'>
                  <CyDText className={'text-[12px]'}>
                    {`${tokenData.contractAddress.substring(0, 6)}...${tokenData.contractAddress.substring(tokenData.contractAddress.length - 6)}`}
                  </CyDText>
                  <CyDTouchView
                    onPress={() => {
                      copyToClipboard(tokenData.contractAddress);
                      showToast(`${t('CONTRACT_ADDRESS_COPY_ALL_SMALL')}`);
                    }}>
                    <CyDImage
                      source={AppImages.COPY}
                      className='h-[10px] w-[10px] ml-[3px]'
                      resizeMode='contain'
                    />
                  </CyDTouchView>
                </CyDView>
              )}
            </CyDView>
            <CyDView className='flex self-center items-end'>
              <CyDView>
                {tokenData?.isVerified && tokenData.price ? (
                  <ChartYLabel
                    style={styles.chartYLabel}
                    format={formatPriceValue}
                  />
                ) : (
                  <CyDText style={styles.chartYLabel}>$0.00</CyDText>
                )}
              </CyDView>
              {selectedTrend !== 0 && (
                <CyDView
                  className={clsx('flex flex-row justify-end items-center', {
                    'mt-[-12px]': isAndroid(),
                  })}>
                  <CyDImage
                    source={
                      selectedTrend > 0
                        ? AppImages.TREND_UP
                        : AppImages.TREND_DOWN
                    }
                    className='h-[18px] w-[18px]'
                    resizeMode='contain'
                  />
                  <CyDText
                    className={clsx('text-[14px] font-bold ml-[3px]', {
                      'text-lightGreen': selectedTrend > 0,
                      'text-redColor': selectedTrend < 0,
                    })}>
                    {Math.abs(selectedTrend).toFixed(2)}%
                  </CyDText>
                </CyDView>
              )}
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const UserBalance = useMemo(() => {
    return (
      <CyDView className={'m-[12px] border rounded-[8px] border-fadedGrey'}>
        {/* {balanceloading && <CyDView style={styles.balanceLoadingContainer}>
          <ActivityIndicator size="small" color={Colors.appColor} />
        </CyDView>} */}
        {
          <CyDView
            className={
              'flex flex-row justify-between items-center px-[10px] py-[14px] w-[100%]'
            }>
            <CyDView className={'w-[75%]'}>
              <CyDText className={'text-[12px] font-bold mb-[2px]'}>
                {t<string>('YOUR_BALANCE_PASCAL_CASE')}
              </CyDText>
              <CyDView className='flex flex-row items-center flex-wrap'>
                {/* <CyDTokenAmount className={'text-[18px] font-semibold'} decimalPlaces={5}>{getTotalTokens()}</CyDTokenAmount> */}
                <CyDTokenAmount className={'text-[18px] font-extrabold'}>
                  {totalValue}
                </CyDTokenAmount>
              </CyDView>
            </CyDView>
            <CyDView>
              {/* <CyDTokenValue className={'text-center text-[18px] font-bold'}>{getTotalValue()}</CyDTokenValue> */}
              <CyDTokenValue
                className={'text-center text-[18px] font-extrabold '}>
                {totalValueInAmount}
              </CyDTokenValue>
            </CyDView>
          </CyDView>
        }
      </CyDView>
    );
  }, [totalValue, totalValueInAmount]);

  const AboutTheToken = () => {
    return (
      <CyDView className={'m-[12px]'}>
        <CyDText className={'text-[16px] font-bold mb-[4px]'}>{`${t<string>(
          'ABOUT_INIT_CAPS',
        )} ${tokenData.name}`}</CyDText>
        <CyDView>
          <HTML
            systemFonts={['Manrope']}
            baseStyle={{
              fontSize: '14px',
              fontFamily: 'Manrope',
              color: Colors.primaryTextColor,
              lineHeight: 22,
            }}
            contentWidth={width}
            renderersProps={renderersProps}
            source={{
              html:
                tokenDescription.split(' ').length > 50 && loadMoreAbout
                  ? tokenDescription.split(' ').slice(0, 50).join(' ')
                  : tokenDescription,
            }}
          />
          {tokenDescription.length > 0 && loadMoreAbout && (
            <CyDTouchView
              className={'justify-start mt-[6px]'}
              onPress={() => {
                setLoadMoreAbout(false);
              }}>
              <CyDText
                className={
                  'font-bold text-[14px] text-toastColor text-center underline'
                }>
                {t<string>('VIEW_MORE')}
              </CyDText>
            </CyDTouchView>
          )}
        </CyDView>
      </CyDView>
    );
  };

  const OtherChainsWithToken = () => {
    return (
      <CyDView className='mx-[12px]'>
        <CyDText className='text-[16px] font-bold mb-[8px]'>
          {t('TOKEN_IN_OTHER_CHAIN_HOLDINGS')}
        </CyDText>
        {otherChainsWithToken.filter(
          otherChainItem => otherChainItem !== tokenData,
        ).length ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={otherChainsWithToken.filter(
              otherChainItem => otherChainItem !== tokenData,
            )}
            renderItem={({ item }) => {
              const tokenVal = `${
                +item.totalValue +
                +item.actualStakedBalance +
                +item.actualUnbondingBalance
              }`;
              const tokenAmt = `${
                +item.actualBalance +
                +item.stakedBalanceTotalValue +
                +item.unbondingBalanceTotalValue
              }`;
              return (
                <CyDTouchView
                  onPress={() => {
                    navigation.reset({
                      index: 0,
                      routes: [
                        { name: screenTitle.PORTFOLIO_SCREEN },
                        {
                          name: screenTitle.TOKEN_OVERVIEW,
                          params: {
                            tokenData: item,
                          },
                        },
                      ],
                    });
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                  className='rounded-[8px] flex flex-row justify-center items-center bg-privacyMessageBackgroundColor mr-[10px] p-[5px]'>
                  <CyDFastImage
                    className='h-[30px] w-[30px] mx-[10px]'
                    source={item.chainDetails.logo_url}
                    resizeMode='contain'
                  />
                  <CyDView className='flex flex-col mx-[10px] justify-center items-end'>
                    <CyDTokenValue className='text-[16px] font-extrabold'>
                      {tokenVal}
                    </CyDTokenValue>
                    <CyDTokenAmount className='text-[12px]'>
                      {tokenAmt}
                    </CyDTokenAmount>
                  </CyDView>
                </CyDTouchView>
              );
            }}
          />
        ) : (
          <CyDText className='text-[14px] mb-[8px]'>
            {t('TOKEN_NOT_HELD_IN_ANYOTHER_SUPPORTED_CHAIN')}
          </CyDText>
        )}
      </CyDView>
    );
  };

  const MarketDistribution = () => {
    return (
      <CyDView className={'mx-[12px] mt-[12px] mb-[20px]'}>
        <CyDView className={'flex flex-row justify-between mb-[10px]'}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDImage
              source={AppImages.MARKET_CAP_ICON}
              resizeMode='contain'
              className={'w-[14px] h-[14px]'}
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('MARKET_CAP_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showMarketCapTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px]'}>
                    <CyDView>
                      <CyDText className={'mb-[5px] font-bold text-[15px]'}>
                        {t<string>('MARKET_CAP_FORMULA')}
                      </CyDText>
                    </CyDView>
                    <CyDView>
                      <CyDText>{t<string>('MARKET_CAP_TOOLTIP')}</CyDText>
                    </CyDView>
                  </CyDView>
                }
                onClose={() => setMarketCapTip(false)}
                placement='top'>
                <CyDTouchView onPress={() => setMarketCapTip(true)}>
                  <CyDImage
                    source={AppImages.INFO_ICON}
                    resizeMode='contain'
                    className={'w-[14px] h-[14px] ml-[8px]'}
                  />
                </CyDTouchView>
              </Tooltip>
            </CyDView>
          </CyDView>
          <CyDText className={'text-[14px]'}>
            {beautifyPriceWithUSDDenom(marketDistribution.marketCap) !== 'null'
              ? `$${beautifyPriceWithUSDDenom(marketDistribution.marketCap)}`
              : '\u221E'}
          </CyDText>
        </CyDView>
        <CyDView className={'flex flex-row justify-between mb-[12px]'}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDImage
              source={AppImages.BAR_GRAPH_ICON}
              resizeMode='contain'
              className={'w-[14px] h-[14px]'}
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('VOLUME_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showVolumeTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px]'}>
                    <CyDView>
                      <CyDText className={'mb-[5px] font-bold text-[15px]'}>
                        {t<string>('VOLUME_TOOLTIP')}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                }
                onClose={() => setVolumeTip(false)}
                placement='top'>
                <CyDTouchView onPress={() => setVolumeTip(true)}>
                  <CyDImage
                    source={AppImages.INFO_ICON}
                    resizeMode='contain'
                    className={'w-[14px] h-[14px] ml-[8px]'}
                  />
                </CyDTouchView>
              </Tooltip>
            </CyDView>
          </CyDView>
          <CyDText className={'text-[14px]'}>
            {beautifyPriceWithUSDDenom(marketDistribution.totalVolume) !==
            'null'
              ? `$${beautifyPriceWithUSDDenom(marketDistribution.totalVolume)}`
              : '\u221E'}
          </CyDText>
        </CyDView>
        <CyDView className={'flex flex-row justify-between mb-[12px]'}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDImage
              source={AppImages.CIRCULAR_ARROWS_ICON}
              resizeMode='contain'
              className={'w-[14px] h-[14px]'}
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('CURRENT_SUPPLY_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showCirculatingSupplyTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px]'}>
                    <CyDView>
                      <CyDText className={'mb-[5px] font-bold text-[15px]'}>
                        {t<string>('CIRCULATING_SUPPLY_TOOLTIP')}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                }
                onClose={() => setCirculatingSupplyTip(false)}
                placement='top'>
                <CyDTouchView onPress={() => setCirculatingSupplyTip(true)}>
                  <CyDImage
                    source={AppImages.INFO_ICON}
                    resizeMode='contain'
                    className={'w-[14px] h-[14px] ml-[8px]'}
                  />
                </CyDTouchView>
              </Tooltip>
            </CyDView>
          </CyDView>
          <CyDText className={'text-[14px]'}>
            {beautifyPriceWithUSDDenom(marketDistribution.currentSupply) !==
            'null'
              ? beautifyPriceWithUSDDenom(marketDistribution.currentSupply)
              : '\u221E'}
          </CyDText>
        </CyDView>
        <CyDView className={'flex flex-row justify-between mb-[12px]'}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDImage
              source={AppImages.TOTAL_SUPPLY_ICON}
              resizeMode='contain'
              className={'w-[14px] h-[14px]'}
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('TOTAL_SUPPLY_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showTotalSupplyTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px]'}>
                    <CyDView>
                      <CyDText className={'mb-[5px] font-bold text-[15px]'}>
                        {t<string>('TOTAL_SUPPLY_FORMULA')}
                      </CyDText>
                    </CyDView>
                    <CyDView>
                      <CyDText>{t<string>('TOTAL_SUPPLY_TOOLTIP')}</CyDText>
                    </CyDView>
                  </CyDView>
                }
                onClose={() => setTotalSupplyTip(false)}
                placement='top'>
                <CyDTouchView onPress={() => setTotalSupplyTip(true)}>
                  <CyDImage
                    source={AppImages.INFO_ICON}
                    resizeMode='contain'
                    className={'w-[14px] h-[14px] ml-[8px]'}
                  />
                </CyDTouchView>
              </Tooltip>
            </CyDView>
          </CyDView>
          <CyDText className={'text-[14px]'}>
            {beautifyPriceWithUSDDenom(marketDistribution.totalSupply) !==
            'null'
              ? beautifyPriceWithUSDDenom(marketDistribution.totalSupply)
              : '\u221E'}
          </CyDText>
        </CyDView>
        <CyDView className={'flex flex-row justify-between mb-[12px]'}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDImage
              source={AppImages.METER_MAX_ICON}
              resizeMode='contain'
              className={'w-[14px] h-[14px]'}
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('MAXIMUM_SUPPLY_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showMaxSupplyTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px]'}>
                    <CyDView>
                      <CyDText className={'mb-[5px] font-bold text-[15px]'}>
                        {t<string>('MAX_SUPPLY_FORMULA')}
                      </CyDText>
                    </CyDView>
                    <CyDView>
                      <CyDText>{t<string>('MAX_SUPPLY_TOOLTIP')}</CyDText>
                    </CyDView>
                  </CyDView>
                }
                onClose={() => setMaxSupplyTip(false)}
                placement='top'>
                <CyDTouchView onPress={() => setMaxSupplyTip(true)}>
                  <CyDImage
                    source={AppImages.INFO_ICON}
                    resizeMode='contain'
                    className={'w-[14px] h-[14px] ml-[8px]'}
                  />
                </CyDTouchView>
              </Tooltip>
            </CyDView>
          </CyDView>
          <CyDText className={'text-[14px]'}>
            {beautifyPriceWithUSDDenom(marketDistribution.maxSupply) !== 'null'
              ? beautifyPriceWithUSDDenom(marketDistribution.maxSupply)
              : '\u221E'}
          </CyDText>
        </CyDView>
      </CyDView>
    );
  };

  const Feedback = () => {
    return (
      <CyDView className={'mb-[60px]'}>
        <CyDTouchView
          className={'mb-[15px]'}
          onPress={() => {
            void Intercom.present();
            sendFirebaseEvent(hdWalletContext, 'support');
          }}>
          <CyDText
            className={
              'text-blue-700 font-bold underline underline-offset-2 text-center'
            }>
            {t<string>(
              tokenData?.isVerified
                ? 'NEED_SOMETHING_ELSE'
                : 'MARK_TOKEN_VERIFIED',
            )}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    );
  };

  return loading && data.points.length === 0 ? (
    <Loading />
  ) : (
    <CyDScrollView
      ref={scrollViewRef}
      className={'bg-white'}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <ChartPathProvider data={data}>
        <TokenSummary />
        {chartloading && (
          <CyDView style={styles.chartLoadingContainer}>
            <ActivityIndicator size='small' color={Colors.appColor} />
          </CyDView>
        )}
        {!chartloading && chartData && chartVisible && (
          <CyDView>
            <CyDView className={'flex flex-row justify-center'}>
              <ChartXLabel
                style={styles.chartXLabel}
                format={formatTimestamp}
              />
            </CyDView>
            <CyDView>
              <ChartPath
                height={SIZE / 3}
                stroke={Colors.buttonColor}
                strokeWidth={2}
                selectedStrokeWidth={3.2}
                width={SIZE}
                gestureEnabled={true}
                gradientEnabled={true}
                backgroundGradientFrom={Colors.buttonColor}
                backgroundGradientTo={Colors.white}
                fill='none'
              />
              <ChartDot size={12} style={styles.chartDot} />
            </CyDView>
            <CyDView style={styles.selection}>
              <CyDView style={StyleSheet.absoluteFill}>
                <Animated.View style={[styles.backgroundSelection, style]} />
              </CyDView>
              <CyDView className={'flex flex-row'}>
                {graphs.map((graph, index) => {
                  return (
                    <TouchableWithoutFeedback
                      key={graph.label}
                      onPress={() => {
                        setDataSource(graph.dataSource);
                        previous.value = current.value;
                        transition.value = 0;
                        current.value = index as GraphIndex;
                        transition.value = withTiming(1);
                      }}>
                      <Animated.View style={styles.labelContainer}>
                        <CyDText style={styles.label}>{graph.label}</CyDText>
                      </Animated.View>
                    </TouchableWithoutFeedback>
                  );
                })}
              </CyDView>
            </CyDView>
          </CyDView>
        )}
        {UserBalance}
        <OtherChainsWithToken />
        {tokenDescription && tokenDescription !== ' ' && <AboutTheToken />}
        {!marketDistributionLoading && marketDistribution && (
          <MarketDistribution />
        )}
        {marketDistributionLoading && (
          <CyDView style={styles.chartLoadingContainer}>
            <ActivityIndicator size='small' color={Colors.appColor} />
          </CyDView>
        )}
        <CyDView>
          <Feedback />
        </CyDView>
      </ChartPathProvider>
    </CyDScrollView>
  );
}

const styles = StyleSheet.create({
  chartDot: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    height: 14,
    width: 14,
    borderRadius: 14,
    marginBottom: 1,
    borderColor: Colors.buttonColor,
  },
  backgroundSelection: {
    backgroundColor: Colors.buttonColor,
    ...StyleSheet.absoluteFillObject,
    width: BUTTON_WIDTH,
    borderRadius: 8,
  },
  selection: {
    marginTop: 20,
    flexDirection: 'row',
    width: SELECTION_WIDTH,
    alignSelf: 'center',
  },
  labelContainer: {
    padding: 10,
    width: BUTTON_WIDTH,
  },
  label: {
    fontSize: 14,
    color: Colors.secondaryTextColor,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chartYLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.secondaryTextColor,
    textAlign: 'right',
  },
  chartXLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.secondaryTextColor,
    textAlign: 'right',
    marginTop: 15,
    marginBottom: 5,
    marginLeft: 5,
  },
  chartLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
});
