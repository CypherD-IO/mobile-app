/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-raw-text */
import * as React from 'react';
import { t } from 'i18next';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView
} from '../../styles/tailwindStyles';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { beautifyPriceWithUSDDenom, convertFromUnitAmount, convertToEvmosFromAevmos, HdWalletContext, isABasicCosmosStakingToken, isCosmosStakingToken, StakingContext } from '../../core/util';
import { CosmosStakingContext } from '../../reducers/cosmosStakingReducer';
import { getCosmosStakingData } from '../../core/cosmosStaking';
import { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { useIsFocused } from '@react-navigation/native';
import getValidatorsForUSer from '../../core/Staking';
import { Dimensions, RefreshControl, StyleSheet, TouchableWithoutFeedback, Text, ActivityIndicator } from 'react-native';
import { ChartDot, ChartPath, ChartPathProvider, monotoneCubicInterpolation, simplifyData, ChartYLabel, ChartXLabel } from '@rainbow-me/animated-charts';
import AppImages from '../../../assets/images/appImages';
import FastImage from 'react-native-fast-image';
import { Colors } from '../../constants/theme';
import { REFRESH_CLOSING_TIMEOUT } from '../../constants/timeOuts';
import HTML from 'react-native-render-html';
import { screenTitle } from '../../constants';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../../misc/checkers';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import CyDTokenValue from '../../components/v2/tokenValue';
import useAxios from '../../core/HttpRequest';
import Intercom from '@intercom/intercom-react-native';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';

const { width } = Dimensions.get('window');

export const graphs = [
  {
    label: '1D',
    value: 0,
    dataSource: 0
  },
  {
    label: '1W',
    value: 1,
    dataSource: 1
  },
  {
    label: '1M',
    value: 2,
    dataSource: 2
  },
  {
    label: '1Y',
    value: 3,
    dataSource: 3
  },
  {
    label: 'ALL',
    value: 4,
    dataSource: 4
  }
] as const;

const SELECTION_WIDTH = width - 32;
const BUTTON_WIDTH = (width - 32) / graphs.length;

export default function Overview ({ tokenData, navigation }: { tokenData: TokenMeta, navigation: { navigate: (screen: string, { url }: { url: string | undefined }) => void } }) {
  const isFocused = useIsFocused();
  const { getWithAuth } = useAxios();
  const cosmosStaking = useContext<any>(CosmosStakingContext);
  const stakingValidators = useContext<any>(StakingContext);
  const globalStateContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const chain = hdWalletContext.state.wallet[tokenData.chainDetails.chainName];
  const evmos = hdWalletContext.state.wallet.evmos;
  const { width: SIZE } = Dimensions.get('window');
  const [loadMoreAbout, setLoadMoreAbout] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState();
  const [dataSource, setDataSource] = useState();
  const simplifying = false;

  const numberOfPointsInterpolated = 80;
  const smoothingStrategy = 'none';
  const pickRange = 10;
  const includeExtremes = true;

  const [balanceloading, setBalanceLoading] = useState(true);
  const [chartData, setChartData] = useState();
  const [chartloading, setChartLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState();
  const [showSelectedTrend, setShowSelectedTrend] = useState(true);

  const [marketDistribution, setMarketDistribution] = useState();
  const [marketDistributionLoading, setMarketDistributionLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      void getStakingMetaData();
      void getChartData();
      void getMarketDistribution();
    }
  }, [isFocused]);

  const getChartData = async () => {
    const data = await getWithAuth(`/v1/portfolio/historical/${tokenData.coinGeckoId}`);
    if (data && !data.error) {
      if (data?.day1?.data.length > 0) {
        setChartData(data);
        setDataSource(0);
        setSelectedTrend(data.day1.trend);
        setChartLoading(false);
      } else {
        if (tokenData.isVerified) {
          setTimeout(() => {
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
    const data = await getWithAuth(`/v1/portfolio/tokenMetaData/${tokenData.coinGeckoId}`);
    if (!data.error) {
      if (data?.marketCap) {
        setMarketDistribution(data);
        setMarketDistributionLoading(false);
      } else {
        if (tokenData.isVerified) {
          setTimeout(() => {
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
        setSelectedTrend(chartData?.day1?.trend);
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
          range: numberOfPointsInterpolated
        });
      })();
      const data = {
        points: intepolatedData,
        smoothingFactor: 0,
        smoothingStrategy
      };
      setData(data);
      setChartLoading(false);
    }
  }, [
    dataSource,
    numberOfPointsInterpolated,
    simplifying,
    smoothingStrategy
  ]);

  type GraphIndex = 0 | 1 | 2 | 3 | 4;
  const transition = useSharedValue(0);
  const previous = useSharedValue<GraphIndex>(0);
  const current = useSharedValue<GraphIndex>(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(BUTTON_WIDTH * current.value) }]
  }));

  const formatPriceValue = (value: string) => {
    'worklet';
    if (value === '') {
      return `$${parseFloat(tokenData.price).toFixed(2)}`;
    }
    return `$${parseFloat(value).toFixed(2)}`;
  };

  const toggle = (state: boolean) => {
    setShowSelectedTrend(state);
  };

  const formatTimestamp = (value: string) => {
    'worklet';
    if (value !== '') {
      runOnJS(toggle)(false);
      const date = new Date(+value);
      return `${date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()}/${date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1}/${date.getFullYear()} ${date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()}:${date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()}:${date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()}`;
    } else {
      runOnJS(toggle)(true);
      return '';
    }
  };

  const getStakingMetaData = async () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      await getStakingData();
    } else if (isCosmosStakingToken('EVMOS', tokenData)) {
      await getValidatorsForUSer(evmos.wallets[evmos.currentIndex].address, stakingValidators, globalStateContext);
    }
    setBalanceLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    void getStakingMetaData();
    setTimeout(() => {
      setRefreshing(false);
    }, REFRESH_CLOSING_TIMEOUT);
  };

  const getStakingData = async () => {
    await getCosmosStakingData(
      cosmosStaking.cosmosStakingDispatch,
      globalStateContext.globalState,
      tokenData.chainDetails.backendName,
      chain.wallets[chain.currentIndex].address
    );
  };

  const getTotalTokens = () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      return `${convertFromUnitAmount((Number(cosmosStaking.cosmosStakingState.balance) + Number(cosmosStaking.cosmosStakingState.stakedBalance)).toString(), tokenData.contractDecimals)}`;
    } else if (isCosmosStakingToken('EVMOS', tokenData)) {
      return `${convertToEvmosFromAevmos(Number(stakingValidators.stateStaking.totalStakedBalance) + Number(stakingValidators.stateStaking.unStakedBalance) + Number(stakingValidators.stateStaking.unBoundingTotal)).toFixed(6).toString()}`;
    } else {
      return tokenData.actualBalance;
    }
  };

  const getTotalValue = () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      return tokenData.price * +(convertFromUnitAmount((cosmosStaking.cosmosStakingState.balance + cosmosStaking.cosmosStakingState.stakedBalance).toString(), tokenData.contractDecimals));
    } else if (isCosmosStakingToken('EVMOS', tokenData)) {
      return tokenData.price * convertToEvmosFromAevmos(stakingValidators.stateStaking.totalStakedBalance + stakingValidators.stateStaking.unStakedBalance + stakingValidators.stateStaking.unBoundingTotal);
    } else {
      return tokenData.totalValue;
    }
  };

  const { width } = Dimensions.get('window');

  const renderersProps = {
    a: {
      onPress: (event: any, href: string) => {
        navigation.navigate(screenTitle.GEN_WEBVIEW, {
          url: href
        });
      }
    }
  };

  const TokenSummary = () => {
    return (
            <CyDView>
              <CyDView className={'m-[12px] border-[1px] rounded-[8px] border-fadedGrey'}>
                <CyDView className={clsx('flex flex-row px-[8px] w-[100%]', { 'py-[12px]': isIOS() })}>
                  <CyDView className={clsx('flex flex-row items-center w-[65%]')}>
                    <CyDView className={'mr-[8px]'}>
                      <CyDFastImage source={{ uri: tokenData.logoUrl }} className={' w-[40px] h-[40px]'} />
                      <CyDView className={'absolute ml-[24px] mt-[26px]'}>
                        <CyDFastImage
                          className={'h-[16px] w-[16px] rounded-[50px] border-[1px] border-white bg-white'}
                          source={tokenData.chainDetails.logo_url ?? 'https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/assets/images/common/unknown.png'}
                          resizeMode={FastImage.resizeMode.contain}
                        />
                      </CyDView>
                    </CyDView>
                    <CyDView className={'w-[75%]'}>
                      <CyDView className={'flex flex-row'}>
                      <CyDText className={'text-[18px] font-bold mr-[6px]'}>{tokenData.name} {tokenData?.isVerified && <CyDImage source={AppImages.VERIFIED_ICON} className={'w-[18px] h-[18px]'} />}</CyDText>
                      </CyDView>
                      <CyDView>
                        <CyDText className={'text-subTextColor font-bold text-[12px]'}>{tokenData.symbol}</CyDText>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                  <CyDView className={clsx('flex flex-col w-[35%]')}>
                      <ChartYLabel style={styles.chartYLabel} format={formatPriceValue} />
                      <ChartXLabel style={styles.chartXLabel} format={formatTimestamp} />
                      {selectedTrend && showSelectedTrend && <CyDView className={clsx('flex flex-row justify-end items-center', { 'mt-[-16px]': isIOS(), 'mt-[-32px] mb-[10px]': isAndroid() })}>
                        <CyDImage source={selectedTrend > 0 ? AppImages.TREND_UP : AppImages.TREND_DOWN} />
                        <CyDText className={clsx('text-[14px] font-bold ml-[3px]', { 'text-lightGreen': selectedTrend > 0, 'text-redColor': selectedTrend < 0 })}>{Math.abs(selectedTrend).toFixed(2)}%</CyDText>
                      </CyDView>}
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
    );
  };

  const UserBalance = () => {
    return (
      <CyDView className={'mx-[12px] mt-[22px] mb-[18px] border-[1px] rounded-[8px] border-fadedGrey'}>
        {balanceloading && <CyDView style={styles.balanceLoadingContainer}>
          <ActivityIndicator size="small" color={Colors.appColor} />
        </CyDView>}
        {!balanceloading && <CyDView className={'flex flex-row justify-between items-center px-[10px] py-[14px] w-[100%]'}>
          <CyDView className={'w-[75%]'}>
            <CyDText className={'text-[14px] font-semibold mb-[6px]'}>{t<string>('YOUR_BALANCE_PASCAL_CASE')}</CyDText>
            <CyDView className='flex flex-row items-center flex-wrap pl-[3px]'>
              <CyDTokenAmount className={'text-[18px] font-semibold'} decimalPlaces={5}>{getTotalTokens()}</CyDTokenAmount>
            </CyDView>
          </CyDView>
          <CyDView>
              <CyDTokenValue className={'text-center text-[18px] font-bold'}>{getTotalValue()}</CyDTokenValue>
            </CyDView>
        </CyDView>}
      </CyDView>
    );
  };

  const AboutTheToken = () => {
    return (
      <CyDView className={'m-[12px]'}>
        <CyDText className={'text-[18px] font-bold mb-[4px]'}>{`${t<string>('ABOUT_INIT_CAPS')} ${tokenData.name}`}</CyDText>
        <CyDView>
          <HTML baseStyle={{
            fontSize: '15px',
            color: Colors.primaryTextColor,
            lineHeight: 22
          }}
            contentWidth={width}
            renderersProps={renderersProps} source={{ html: tokenData.about.split(' ').length > 50 && loadMoreAbout ? tokenData.about.split(' ').slice(0, 50).join(' ') : tokenData.about }} />
          {tokenData.about.length > 0 && loadMoreAbout && <CyDTouchView className={'justify-start mt-[6px]'} onPress={() => { setLoadMoreAbout(false); }}>
            <CyDText className={'font-bold text-[16px] text-toastColor text-center underline'}>{t<string>('VIEW_MORE')}</CyDText>
          </CyDTouchView>
          }
        </CyDView>
        <CyDView className='h-[2px] w-[100%] bg-fadedGrey mt-[20px]'></CyDView>
      </CyDView>
    );
  };

  const MarketDistribution = () => {
    return (
      <CyDView className={'mx-[12px] mt-[12px] mb-[20px]'}>
        {<CyDView className={'flex flex-row justify-between mb-[10px]'}>
          <CyDView className={'flex flex-row'}>
            <CyDImage source={AppImages.BAR_GRAPH_ICON} className={'w-[20px] h-[20px]'} />
            <CyDText className={'ml-[10px] text-[18px] font-semibold'}>{t<string>('MARKET_CAP_INIT_CAPS')}</CyDText>
          </CyDView>
          <CyDText className={'text-[18px]'}>{beautifyPriceWithUSDDenom(marketDistribution.marketCap) !== '$null' ? beautifyPriceWithUSDDenom(marketDistribution.marketCap) : '\u221E'}</CyDText>
        </CyDView>}
        <CyDView className={'flex flex-row justify-between mb-[12px]'}>
          <CyDView className={'flex flex-row'}>
            <CyDImage source={AppImages.BAR_GRAPH_ICON} className={'w-[20px] h-[20px]'} />
            <CyDText className={'ml-[10px] text-[18px] font-semibold'}>{t<string>('VOLUME_INIT_CAPS')}</CyDText>
          </CyDView>
          <CyDText className={'text-[18px]'}>{beautifyPriceWithUSDDenom(marketDistribution.totalVolume) !== '$null' ? beautifyPriceWithUSDDenom(marketDistribution.totalVolume) : '\u221E'}</CyDText>
        </CyDView>
        <CyDView className={'flex flex-row justify-between mb-[12px]'}>
          <CyDView className={'flex flex-row'}>
            <CyDImage source={AppImages.BAR_GRAPH_ICON} className={'w-[20px] h-[20px]'} />
            <CyDText className={'ml-[10px] text-[18px] font-semibold'}>{t<string>('MAXIMUM_SUPPLY_INIT_CAPS')}</CyDText>
          </CyDView>
          <CyDText className={'text-[18px]'}>{beautifyPriceWithUSDDenom(marketDistribution.totalSupply) !== '$null' ? beautifyPriceWithUSDDenom(marketDistribution.totalSupply) : '\u221E'}</CyDText>
        </CyDView>
        <CyDView className={'flex flex-row justify-between mb-[12px]'}>
          <CyDView className={'flex flex-row'}>
            <CyDImage source={AppImages.BAR_GRAPH_ICON} className={'w-[20px] h-[20px]'} />
            <CyDText className={'ml-[10px] text-[18px] font-semibold'}>{t<string>('CURRENT_SUPPLY_INIT_CAPS')}</CyDText>
          </CyDView>
          <CyDText className={'text-[18px]'}>{beautifyPriceWithUSDDenom(marketDistribution.currentSupply) !== '$null' ? beautifyPriceWithUSDDenom(marketDistribution.currentSupply) : '\u221E'}</CyDText>
        </CyDView>
      </CyDView>
    );
  };

  const Feedback = () => {
    return (
      <CyDView className={'mb-[60px]'}>
        <CyDTouchView className={'mb-[15px]'} onPress={() => { void Intercom.displayMessenger(); sendFirebaseEvent(hdWalletContext, 'support'); }}>
          <CyDText className={'text-blue-700 font-bold underline underline-offset-2 text-center'}>{t<string>(tokenData?.isVerified ? 'NEED_SOMETHING_ELSE' : 'MARK_TOKEN_VERIFIED')}</CyDText>
        </CyDTouchView>
      </CyDView>
    );
  };

  return (
    <CyDScrollView className={'h-full bg-white'} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> }>
      <ChartPathProvider data={data}>
        <TokenSummary />
        {chartloading && <CyDView style={styles.chartLoadingContainer}>
          <ActivityIndicator size="small" color={Colors.appColor} />
        </CyDView>}
        {!chartloading && chartData && <CyDView>
          <CyDView>
            <ChartPath height={SIZE / 3} stroke="black" strokeWidth={3} selectedStrokeWidth={4} width={SIZE} gestureEnabled={true} backgroundColor="black" />
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
                    }}
                  >
                    <Animated.View style={styles.labelContainer}>
                      <Text style={styles.label}>{graph.label}</Text>
                    </Animated.View>
                  </TouchableWithoutFeedback>
                );
              })}
            </CyDView>
          </CyDView>
        </CyDView>}
        <UserBalance />
        {tokenData.about !== ' ' && <AboutTheToken />}
        {!marketDistributionLoading && marketDistribution && <MarketDistribution />}
        {marketDistributionLoading && <CyDView style={styles.chartLoadingContainer}>
          <ActivityIndicator size="small" color={Colors.appColor} />
        </CyDView>}
        <CyDView>
          <Feedback />
        </CyDView>
        </ChartPathProvider>
    </CyDScrollView>
  );
}

const styles = StyleSheet.create({
  chartDot: {
    backgroundColor: Colors.secondaryTextColor
  },
  backgroundSelection: {
    backgroundColor: Colors.appColor,
    ...StyleSheet.absoluteFillObject,
    width: BUTTON_WIDTH,
    borderRadius: 8
  },
  selection: {
    marginTop: 20,
    flexDirection: 'row',
    width: SELECTION_WIDTH,
    alignSelf: 'center'
  },
  labelContainer: {
    padding: 10,
    width: BUTTON_WIDTH
  },
  label: {
    fontSize: 14,
    color: Colors.secondaryTextColor,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  chartYLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.secondaryTextColor,
    textAlign: 'right'
  },
  chartXLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondaryTextColor,
    textAlign: 'right',
    marginTop: isAndroid() ? '-20%' : '5%'
  },
  balanceLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50
  },
  chartLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100
  }
});
