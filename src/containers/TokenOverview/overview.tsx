/* eslint-disable react-native/no-inline-styles */
import {
  ChartDot,
  ChartPath,
  ChartPathProvider,
  ChartXLabel,
  ChartYLabel,
  monotoneCubicInterpolation,
  simplifyData,
} from '@cypherd-io/animated-charts';
import Intercom from '@intercom/intercom-react-native';
import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
} from '@react-navigation/native';
import clsx from 'clsx';
import { t } from 'i18next';
import { has } from 'lodash';
import { cssInterop } from 'nativewind';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import HTML from 'react-native-render-html';
import Tooltip from 'react-native-walkthrough-tooltip';
import AppImages from '../../../assets/images/appImages';
import Loading from '../../components/v2/loading';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import CyDTokenValue from '../../components/v2/tokenValue';
import { screenTitle } from '../../constants';
import { Colors } from '../../constants/theme';
import { getCosmosStakingData } from '../../core/cosmosStaking';
import { GlobalContext } from '../../core/globalContext';
import useAxios from '../../core/HttpRequest';
import { getDateFormatBasedOnLocaleForTimestamp } from '../../core/locale';
import {
  beautifyPriceWithUSDDenom,
  convertFromUnitAmount,
  copyToClipboard,
  HdWalletContext,
  isABasicCosmosStakingToken,
  isNativeToken,
} from '../../core/util';
import { isAndroid } from '../../misc/checkers';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  COSMOS_STAKING_LOADING,
  CosmosStakingContext,
} from '../../reducers/cosmosStakingReducer';
import {
  CyDAnimatedView,
  CyDFastImage,
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';
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

  const CyDChartYLabel = cssInterop(ChartYLabel, {
    className: 'style',
  });

  const CyDChartXLabel = cssInterop(ChartXLabel, {
    className: 'style',
  });

  const CyDChartDot = cssInterop(ChartDot, {
    className: 'style',
  });

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
      <CyDView className='flex flex-row items-center mt-[12px] mx-[12px] border-[1px] rounded-[8px] border-n40'>
        <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center px-[10px]'>
          <CyDFastImage
            className={'h-[35px] w-[35px] rounded-[50px]'}
            source={{ uri: tokenData?.logoUrl }}
            resizeMode='contain'
          />
          <CyDView className='absolute top-[54%] right-[5px]'>
            <CyDFastImage
              className={
                'h-[20px] w-[20px] rounded-[50px] border-[1px] border-n40'
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
                <CyDView className='bg-n40 rounded-[5px] px-[4px]'>
                  <CyDText className={'text-[12px]'}>
                    {tokenData.symbol}
                  </CyDText>
                </CyDView>

                {tokenData?.isVerified && (
                  <CyDMaterialDesignIcons
                    name='check-decagram'
                    size={16}
                    className='text-blue100 mt-[-1px] ml-[4px]'
                  />
                )}
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
                    <CyDMaterialDesignIcons
                      name={'content-copy'}
                      size={10}
                      className='text-base400 ml-[3px]'
                    />
                  </CyDTouchView>
                </CyDView>
              )}
            </CyDView>
            <CyDView className='flex self-center items-end'>
              <CyDView>
                {tokenData?.isVerified && tokenData.price ? (
                  <CyDChartYLabel
                    className='text-base400 text-[20px] font-semibold text-right'
                    format={formatPriceValue}
                  />
                ) : (
                  <CyDText className='text-base400 text-[20px] font-semibold text-right'>
                    $0.00
                  </CyDText>
                )}
              </CyDView>
              {selectedTrend !== 0 && (
                <CyDView
                  className={clsx('flex flex-row justify-end items-center', {
                    'mt-[-12px]': isAndroid(),
                  })}>
                  <CyDMaterialDesignIcons
                    name={selectedTrend > 0 ? 'trending-up' : 'trending-down'}
                    size={20}
                    className={clsx('text-green400 ml-[3px]', {
                      'text-red400': selectedTrend < 0,
                    })}
                  />
                  <CyDText
                    className={clsx('text-[14px] font-bold ml-[3px]', {
                      'text-lightGreen': selectedTrend > 0,
                      'text-red300': selectedTrend < 0,
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
      <CyDView className={'m-[12px] border rounded-[8px] border-n40'}>
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
              color: '#999999',
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
                  'font-bold text-[14px] text-base100 text-center underline'
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
                  className='rounded-[8px] flex flex-row justify-center items-center bg-blue20 mr-[10px] p-[5px]'>
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
            <CyDIcons
              name='trend-up'
              size={16}
              className='text-base400 ml-[4px]'
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('MARKET_CAP_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showMarketCapTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px] bg-n20'}>
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
                  <CyDIcons
                    name='information'
                    size={20}
                    className='text-base400 ml-[8px]'
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
            <CyDIcons
              name='bar-graph'
              size={16}
              className='text-base400 ml-[4px]'
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('VOLUME_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showVolumeTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px] bg-n20'}>
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
                  <CyDIcons
                    name='information'
                    size={20}
                    className='text-base400 ml-[8px]'
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
            <CyDMaterialDesignIcons
              name='sync'
              size={16}
              className='text-base400 ml-[4px]'
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('CURRENT_SUPPLY_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showCirculatingSupplyTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px] bg-n20'}>
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
                  <CyDIcons
                    name='information'
                    size={20}
                    className='text-base400 ml-[8px]'
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
            <CyDIcons
              name='connected'
              size={16}
              className='text-base400 ml-[4px]'
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('TOTAL_SUPPLY_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showTotalSupplyTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px] bg-n20'}>
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
                  <CyDIcons
                    name='information'
                    size={20}
                    className='text-base400 ml-[8px]'
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
            <CyDIcons
              name='meter'
              size={16}
              className='text-base400 ml-[4px]'
            />
            <CyDText className={'ml-[10px] text-[14px] font-semibold'}>
              {t<string>('MAXIMUM_SUPPLY_INIT_CAPS')}
            </CyDText>
            <CyDView>
              <Tooltip
                isVisible={showMaxSupplyTip}
                disableShadow={true}
                content={
                  <CyDView className={'p-[5px] bg-n20'}>
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
                  <CyDIcons
                    name='information'
                    size={20}
                    className='text-base400 ml-[8px]'
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
              'text-blue300 font-bold underline underline-offset-2 text-center'
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <ChartPathProvider data={data}>
        <TokenSummary />
        {chartloading && (
          <CyDView className='flex flex-1 justify-center items-center h-[100px]'>
            <ActivityIndicator size='small' color={Colors.appColor} />
          </CyDView>
        )}
        {!chartloading && chartData && chartVisible && (
          <CyDView>
            <CyDView className={'flex flex-row justify-center'}>
              <CyDChartXLabel
                className='text-base400 text-[10px] font-normal text-right mt-[15px] mb-[5px] ml-[5px]'
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
              <CyDChartDot
                size={12}
                className='bg-n20 border-[2px] border-p100 h-[14px] w-[14px] rounded-[14px] mb-[1px]'
              />
            </CyDView>
            <CyDView
              className={`flex flex-row mt-[20px] justify-center items-center`}>
              <CyDView className={'flex flex-row flex-1 justify-around'}>
                {graphs.map((graph, index) => {
                  const isSelected = graph.dataSource === dataSource;

                  return (
                    <CyDTouchView
                      key={graph.label}
                      onPress={() => {
                        setDataSource(graph.dataSource);
                        previous.value = current.value;
                        transition.value = 0;
                        current.value = index as GraphIndex;
                        transition.value = withTiming(1);
                      }}>
                      <CyDAnimatedView
                        className={clsx(
                          'p-[10px] rounded-[8px]',
                          isSelected ? 'bg-blue20' : 'bg-transparent',
                        )}>
                        <CyDText className='text-[14px] font-bold text-center'>
                          {graph.label}
                        </CyDText>
                      </CyDAnimatedView>
                    </CyDTouchView>
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
          <CyDView className='font-bold text-center text-base400 text-[14px]'>
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
  backgroundSelection: {
    backgroundColor: Colors.buttonColor,
    ...StyleSheet.absoluteFillObject,
    width: BUTTON_WIDTH,
    borderRadius: 8,
  },
});
