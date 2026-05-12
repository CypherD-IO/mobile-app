import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { get } from 'lodash';
import { PieChart, StackedBarChart, YAxis } from 'react-native-svg-charts';
import {
  Svg,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDSafeAreaView,
  CyDScrollView,
  CyDMaterialDesignIcons,
} from '../../../styles/tailwindComponents';
import useAxios from '../../../core/HttpRequest';
import CyDTokenValue from '../../../components/v2/tokenValue';
import { type SpendPeriod } from './SpendAnalyticsWidget';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import * as Sentry from '@sentry/react-native';
import { CardProviders, CardStatus, CardType } from '../../../constants/enum';
import { Card } from '../../../models/card.model';
import { CardProfile } from '../../../models/cardProfile.model';

const PERIOD_LABELS: Record<SpendPeriod, string> = {
  this_month: 'THIS MONTH',
  last_month: 'LAST MONTH',
  last_30_days: 'LAST 30 DAYS',
  last_90_days: 'LAST 90 DAYS',
};

const PERIOD_DISPLAY: Record<SpendPeriod, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_30_days: 'Last 30 Days',
  last_90_days: 'Last 90 Days',
};

const PERIOD_OPTIONS: SpendPeriod[] = [
  'this_month',
  'last_month',
  'last_30_days',
  'last_90_days',
];

function getCardTypeLabel(card: Card): string {
  if (card.type === CardType.VIRTUAL) return 'Virtual Card';
  if (card.type === CardType.PHYSICAL) return 'Physical Card';
  return 'Card';
}

const PERIOD_API_MAP: Record<SpendPeriod, string> = {
  this_month: 'this_month',
  last_month: 'last_month',
  last_30_days: 'last_30_days',
  last_90_days: 'last_90_days',
};

const CATEGORY_COLORS = [
  '#F7C034',
  '#F734E7',
  '#469AFA',
  '#7B3DD1',
  '#30C9C9',
  '#7D7D7D',
];

function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index] ?? '#7D7D7D';
}

const TARGET_TICKS = 6;

const PER_TICK_HEIGHT = 45;

function getNiceStep(range: number, targetTicks: number): number {
  if (range <= 0) return 1;
  const rawStep = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  return niceNormalized * magnitude;
}

const DONUT_SIZE = 200;
const DONUT_CENTER = DONUT_SIZE / 2;
const DONUT_INNER_RADIUS = 61;

function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = Math.max(0, parseInt(clean.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(clean.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(clean.substring(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function PieGradients({ count }: { count: number }): React.ReactElement {
  return (
    <Defs>
      {Array.from({ length: count }, (_, i) => {
        const color = getCategoryColor(i);
        return (
          <SvgLinearGradient
            key={`pieGrad${i}`}
            id={`pieGrad${i}`}
            x1='0'
            y1='0'
            x2='0.3'
            y2='1'>
            <Stop offset='0' stopColor={color} stopOpacity={1} />
            <Stop
              offset='1'
              stopColor={darkenHex(color, 50)}
              stopOpacity={1}
            />
          </SvgLinearGradient>
        );
      })}
    </Defs>
  );
}

interface SpendCategory {
  name: string;
  amount: number;
  percentage: number;
}

interface TopMerchant {
  name: string;
  amount: number;
  logoUrl?: string;
}

interface WeeklySpend {
  label: string;
  categories: number[];
}

interface SpendAnalyticsData {
  totalSpend: number;
  categories: SpendCategory[];
  topMerchants: TopMerchant[];
  weeklyBreakdown: WeeklySpend[];
  averageWeeklySpend: number;
}

interface SpendAnalyticsRouteParams extends Record<string, object | undefined> {
  SpendAnalyticsScreen: {
    selectedPeriod: SpendPeriod;
    initialTotalSpend?: number;
  };
}

export default function SpendAnalyticsScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<SpendAnalyticsRouteParams, 'SpendAnalyticsScreen'>>();
  const { getWithAuth } = useAxios();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;

  const availableCards = useMemo((): Card[] => {
    const providers = [CardProviders.REAP_CARD, CardProviders.PAYCADDY];
    const allCards: Card[] = [];
    for (const provider of providers) {
      const cards = get(cardProfile, [provider, 'cards'], []) as Card[];
      const filtered = cards.filter(
        (card: Card) =>
          card.status !== CardStatus.ADDITIONAL_CARD &&
          card.status !== CardStatus.RC_UPGRADABLE &&
          card.status !== CardStatus.HIDDEN,
      );
      allCards.push(...filtered);
    }
    return allCards;
  }, [cardProfile]);

  const initialPeriod = route.params?.selectedPeriod ?? 'this_month';
  const initialTotalSpend = route.params?.initialTotalSpend ?? 0;
  const [selectedPeriod, setSelectedPeriod] =
    useState<SpendPeriod>(initialPeriod);
  const [analyticsData, setAnalyticsData] = useState<SpendAnalyticsData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showCardDropdown, setShowCardDropdown] = useState(false);

  const [selectedCardIds, setSelectedCardIds] = useState<string[] | null>(null);

  const toggleCard = useCallback(
    (cardId: string): void => {
      setSelectedCardIds(prev => {
        if (prev === null) {
          return [cardId];
        }
        if (prev.includes(cardId)) {
          const next = prev.filter(id => id !== cardId);
          if (next.length === 0) {
            const firstCard = availableCards[0];
            return firstCard ? [firstCard.cardId] : null;
          }
          return next;
        }
        return [...prev, cardId];
      });
    },
    [availableCards],
  );

  const toggleAllCards = useCallback((): void => {
    setSelectedCardIds(prev => {
      if (prev === null) {
        const firstCard = availableCards[0];
        return firstCard ? [firstCard.cardId] : null;
      }
      return null;
    });
  }, [availableCards]);

  const cardFilterLabel = useMemo((): string => {
    if (selectedCardIds === null) return 'All cards';
    if (selectedCardIds.length === 1) {
      const card = availableCards.find(c => c.cardId === selectedCardIds[0]);
      return card ? `•••• ${card.last4}` : 'All cards';
    }
    return `${selectedCardIds.length} cards`;
  }, [selectedCardIds, availableCards]);

  const fetchAnalytics = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const cardIdsParam =
        selectedCardIds !== null && selectedCardIds.length > 0
          ? `&cardIds=${selectedCardIds.join(',')}`
          : '';
      const { data, isError } = await getWithAuth(
        `/v1/cards/spend-analytics?period=${PERIOD_API_MAP[selectedPeriod]}${cardIdsParam}`,
      );
      if (!isError && data) {
        setAnalyticsData(data as SpendAnalyticsData);
      }
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, selectedCardIds]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const totalSpend = analyticsData?.totalSpend ?? initialTotalSpend;
  const topMerchants = analyticsData?.topMerchants ?? [];
  const categories = analyticsData?.categories ?? [];
  const weeklyBreakdown = analyticsData?.weeklyBreakdown ?? [];

  const avgWeekly = useMemo((): number => {
    if (
      analyticsData?.averageWeeklySpend &&
      analyticsData.averageWeeklySpend > 0
    ) {
      return analyticsData.averageWeeklySpend;
    }
    if (weeklyBreakdown.length === 0) return 0;
    const weekTotals = weeklyBreakdown.map(w =>
      w.categories.reduce((sum, val) => sum + val, 0),
    );
    return weekTotals.reduce((sum, t) => sum + t, 0) / weekTotals.length;
  }, [analyticsData?.averageWeeklySpend, weeklyBreakdown]);

  const pieData = useMemo(
    () =>
      categories.map((cat, index) => ({
        key: `pie-${index}`,
        value: cat.amount,
        svg: { fill: `url(#pieGrad${index})` },
      })),
    [categories],
  );
  const barKeys = useMemo(
    () => categories.map((_, i) => `cat${i}`),
    [categories],
  );

  const barColors = useMemo(
    () => barKeys.map((_, i) => getCategoryColor(i)),
    [barKeys],
  );

  const barShadowColors = useMemo(
    () => barKeys.map((_, i) => darkenHex(getCategoryColor(i), 60)),
    [barKeys],
  );

  const maxStackedTotal = useMemo(() => {
    let max = 0;
    weeklyBreakdown.forEach(week => {
      const total = week.categories.reduce((sum, val) => sum + val, 0);
      if (total > max) max = total;
    });
    return max;
  }, [weeklyBreakdown]);

  const yStep = useMemo(
    () => getNiceStep(maxStackedTotal, TARGET_TICKS),
    [maxStackedTotal],
  );

  const yMax = useMemo(
    () => Math.ceil(maxStackedTotal / yStep) * yStep,
    [maxStackedTotal, yStep],
  );

  const yTickValues = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= yMax; i += yStep) {
      ticks.push(i);
    }
    return ticks;
  }, [yMax, yStep]);

  const tickIntervals = yTickValues.length - 1;
  const barChartHeight = Math.max(120, tickIntervals * PER_TICK_HEIGHT);

  const barKeysWithPad = useMemo(() => [...barKeys, '__pad'], [barKeys]);

  const barColorsWithPad = useMemo(
    () => [...barColors, 'transparent'],
    [barColors],
  );

  const barShadowColorsWithPad = useMemo(
    () => [...barShadowColors, 'transparent'],
    [barShadowColors],
  );

  const barDataWithPad = useMemo(
    () =>
      weeklyBreakdown.map(week => {
        const entry: Record<string, number> = {};
        let total = 0;
        week.categories.forEach((val, i) => {
          entry[`cat${i}`] = val;
          total += val;
        });
        entry.__pad = Math.max(0, yMax - total);
        return entry;
      }),
    [weeklyBreakdown, yMax],
  );

  const barHeightStyle = useMemo(
    () => ({ height: barChartHeight }),
    [barChartHeight],
  );

  const avgLineTop = useMemo(() => {
    if (avgWeekly <= 0 || yMax <= 0) return 0;
    const topInset = 10;
    const usable = barChartHeight - topInset;
    return topInset + usable * (1 - avgWeekly / yMax);
  }, [avgWeekly, yMax, barChartHeight]);

  const avgAboveStyle = useMemo(() => ({ top: avgLineTop - 18 }), [avgLineTop]);

  const avgBelowStyle = useMemo(() => ({ top: avgLineTop + 4 }), [avgLineTop]);

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <CyDView className='flex-row items-center px-[16px] pt-[12px] pb-[8px]'>
        <CyDTouchView onPress={() => navigation.goBack()}>
          <CyDMaterialDesignIcons
            name='arrow-left'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        <CyDText className='font-manrope font-medium text-[20px] leading-[130%] tracking-[-0.8px] text-base400 ml-[8px]'>
          {'Spends'}
        </CyDText>
      </CyDView>
      <CyDView className='items-center mt-[28px]'>
        <CyDText className='font-manrope font-bold text-[12px] leading-[150%] text-n80'>
          {PERIOD_LABELS[selectedPeriod]}
        </CyDText>
      </CyDView>

      <CyDView className='items-center mt-[8px] mb-[32px]'>
        <CyDView className='flex-shrink'>
          <CyDTokenValue className='font-heavy text-[44px] leading-[135%]'>
            {totalSpend}
          </CyDTokenValue>
        </CyDView>
      </CyDView>

      <CyDScrollView
        className='flex-1 bg-n30'
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <CyDView className='items-center justify-center py-[80px]'>
            <ActivityIndicator size='large' />
          </CyDView>
        ) : (
          <>
            {categories.length > 0 ? (
              <>
                <CyDView className='border-[1px] border-n40 rounded-[16px] mx-[16px] mt-[24px] p-[16px] bg-n0'>
                  <CyDText className='font-manrope font-medium text-[18px] leading-[145%] tracking-[-1px] text-base400'>
                    {'Spend Category'}
                  </CyDText>

                  <CyDView
                    className='items-center self-center mt-[16px]'
                    style={styles.donutContainer}>
                    <PieChart
                      style={styles.pieChart}
                      data={pieData}
                      innerRadius='55%'
                      outerRadius='95%'
                      padAngle={0}>
                      <PieGradients count={categories.length} />
                    </PieChart>

                    <Svg
                      width={DONUT_SIZE}
                      height={DONUT_SIZE}
                      style={styles.innerRingLayer}>
                      <Circle
                        cx={DONUT_CENTER}
                        cy={DONUT_CENTER}
                        r={DONUT_INNER_RADIUS}
                        fill='none'
                        stroke='rgba(0,0,0,0.40)'
                        strokeWidth={11}
                      />
                    </Svg>
                  </CyDView>

                  <CyDView className='mt-[16px]'>
                    {categories.map((cat, index) => (
                      <CyDView
                        key={cat.name}
                        className={`flex-row items-center py-[8px] ${
                          index < categories.length - 1
                            ? 'border-b-[1px] border-n30'
                            : ''
                        }`}>
                        <CyDView
                          className='w-[8px] h-[8px] rounded-full mr-[8px]'
                          style={{
                            backgroundColor: getCategoryColor(index),
                          }}
                        />
                        <CyDText className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-base400 flex-1'>
                          {cat.name}
                        </CyDText>
                        <CyDText className='font-manrope font-medium text-[10px] leading-[160%] text-n200 mr-[12px]'>
                          {`${cat.percentage.toFixed(1)}%`}
                        </CyDText>
                        <CyDView className='flex-shrink'>
                          <CyDTokenValue
                            className='text-[14px] leading-[145%] tracking-[-0.6px]'
                            decimalColorClass='!text-[#666666] !text-[12px]'>
                            {cat.amount}
                          </CyDTokenValue>
                        </CyDView>
                      </CyDView>
                    ))}
                  </CyDView>
                </CyDView>

                {weeklyBreakdown.length > 0 && (
                  <CyDView className='border-[1px] border-n40 rounded-[16px] mx-[16px] mt-[16px] p-[16px] bg-n0'>
                    <CyDView className='flex-row'>
                      <CyDView className='flex-1'>
                        <CyDView style={[styles.barChartRow, barHeightStyle]}>
                          <Svg style={styles.barGridFullWidth}>
                            {yTickValues.map((_, i) => {
                              const topInset = 10;
                              const usable = barChartHeight - topInset;
                              const y =
                                topInset +
                                (usable / tickIntervals) * (tickIntervals - i);
                              return (
                                <Line
                                  key={`grid-${i}`}
                                  x1={0}
                                  y1={y}
                                  x2='100%'
                                  y2={y}
                                  stroke={isDarkMode ? '#161616' : '#F5F6F7'}
                                  strokeWidth={1}
                                />
                              );
                            })}

                            {avgWeekly > 0 && (
                              <>
                                <Circle
                                  cx={4}
                                  cy={avgLineTop}
                                  r={3}
                                  fill='#8CB59F'
                                />
                                <Line
                                  x1={4}
                                  y1={avgLineTop}
                                  x2='100%'
                                  y2={avgLineTop}
                                  stroke='#8CB59F'
                                  strokeWidth={1}
                                  strokeDasharray='4,3'
                                />
                                <Circle
                                  cx='99%'
                                  cy={avgLineTop}
                                  r={3}
                                  fill='#8CB59F'
                                />
                              </>
                            )}
                          </Svg>

                          <YAxis
                            data={yTickValues}
                            contentInset={{ top: 10, bottom: 0 }}
                            svg={{
                              fontSize: 12,
                              fill: '#C2C7D0',
                              fontFamily: 'Manrope',
                              fontWeight: '500',
                              dy: -10,
                            }}
                            numberOfTicks={tickIntervals}
                            formatLabel={(value: number) => {
                              if (value === 0 || value === yMax) return '';
                              const idx = value / yStep;
                              return idx % 2 !== 0 ? `$${value}` : '';
                            }}
                            style={styles.yAxis}
                          />

                          <CyDView
                            style={[styles.barChartContainer, barHeightStyle]}>
                            <StackedBarChart
                              style={[
                                styles.barChart,
                                barHeightStyle,
                                styles.barShadowLayer,
                              ]}
                              keys={barKeysWithPad}
                              colors={barShadowColorsWithPad}
                              data={barDataWithPad}
                              contentInset={{
                                top: 10,
                                bottom: 0,
                                left: 15,
                                right: 15,
                              }}
                              spacingInner={0.7}
                            />

                            <StackedBarChart
                              style={[
                                styles.barChart,
                                barHeightStyle,
                                styles.barMainLayer,
                              ]}
                              keys={barKeysWithPad}
                              colors={barColorsWithPad}
                              data={barDataWithPad}
                              contentInset={{
                                top: 10,
                                bottom: 0,
                                left: 15,
                                right: 15,
                              }}
                              spacingInner={0.7}
                            />
                          </CyDView>
                        </CyDView>

                        <CyDView className='flex-row mt-[8px] ml-[35px] mr-[-10px]'>
                          {weeklyBreakdown.map((week, index) => (
                            <CyDText
                              key={index}
                              className='flex-1 font-manrope font-medium text-[12px] leading-[150%] text-n50 text-center'>
                              {week.label}
                            </CyDText>
                          ))}
                        </CyDView>
                      </CyDView>

                      {avgWeekly > 0 && (
                        <CyDView style={styles.avgLabelColumn}>
                          <CyDView className='absolute' style={avgAboveStyle}>
                            <CyDText className='font-manrope font-semibold text-[10px] leading-[160%] text-[#006A31]'>
                              {`$${avgWeekly.toFixed(1)}`}
                            </CyDText>
                          </CyDView>
                          <CyDView className='absolute' style={avgBelowStyle}>
                            <CyDText className='font-manrope font-semibold text-[10px] leading-[160%] text-[#006A31]'>
                              {'Avg.sp'}
                            </CyDText>
                          </CyDView>
                        </CyDView>
                      )}
                    </CyDView>
                  </CyDView>
                )}

                {topMerchants.length > 0 && (
                  <CyDView className='border-[1px] border-n40 rounded-[16px] mx-[16px] mt-[16px] p-[16px] bg-n0'>
                    <CyDText className='font-manrope font-medium text-[18px] leading-[145%] tracking-[-1px] text-base400'>
                      {'Top Merchant'}
                    </CyDText>

                    <CyDView className='flex-row flex-wrap mt-[16px]'>
                      {topMerchants.map((merchant, index) => (
                        <CyDView
                          key={index}
                          className='items-center mb-[16px] w-1/3'>
                          <CyDView className='w-[48px] h-[48px] rounded-tl-[8px] rounded-br-[8px] bg-[#EBEDF0] items-center justify-center p-[12px] mb-[6px]'>
                            <CyDMaterialDesignIcons
                              name='store'
                              size={24}
                              className='text-b20'
                            />
                          </CyDView>
                          <CyDText
                            className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-n200 text-center'
                            numberOfLines={1}>
                            {merchant.name}
                          </CyDText>
                          <CyDView className='flex-shrink'>
                            <CyDTokenValue
                              className='text-[14px] leading-[145%] tracking-[-0.6px]'
                              decimalColorClass='!text-[#666666] !text-[12px]'>
                              {merchant.amount}
                            </CyDTokenValue>
                          </CyDView>
                        </CyDView>
                      ))}
                    </CyDView>
                  </CyDView>
                )}
              </>
            ) : (
              <CyDView className='flex-1 items-center justify-center py-[80px]'>
                <CyDText className='font-manrope text-[16px] text-n200'>
                  {'No spending data available'}
                </CyDText>
              </CyDView>
            )}
          </>
        )}

        <CyDView
          className={Platform.OS === 'android' ? 'h-[110px]' : 'h-[80px]'}
        />
      </CyDScrollView>

      {(showPeriodDropdown || showCardDropdown) && (
        <TouchableWithoutFeedback
          onPress={() => {
            setShowPeriodDropdown(false);
            setShowCardDropdown(false);
          }}>
          <CyDView
            className='absolute top-0 left-0 right-0 bottom-0'
            style={styles.dropdownBackdrop}
          />
        </TouchableWithoutFeedback>
      )}

      {showPeriodDropdown && (
        <CyDView
          className='absolute bottom-[94px] left-[24px] bg-n0 rounded-[8px] border-[1px] border-n40 overflow-hidden w-[195px]'
          style={[styles.dropdownShadow, styles.dropdownPopup]}>
          {PERIOD_OPTIONS.map((period, index) => {
            const isSelected = period === selectedPeriod;
            return (
              <CyDTouchView
                key={period}
                className={`px-[12px] py-[10px] rounded-[8px] ${
                  isSelected ? 'bg-n30' : ''
                } ${
                  index < PERIOD_OPTIONS.length - 1
                    ? 'border-b-[1px] border-n30'
                    : ''
                }`}
                onPress={() => {
                  setAnalyticsData(null);
                  setSelectedPeriod(period);
                  setShowPeriodDropdown(false);
                }}>
                <CyDText
                  className={`font-manrope text-[14px] leading-[145%] tracking-[-0.6px] ${
                    isSelected
                      ? 'font-bold text-base400'
                      : 'font-medium text-n200'
                  }`}>
                  {PERIOD_DISPLAY[period]}
                </CyDText>
              </CyDTouchView>
            );
          })}
        </CyDView>
      )}

      {showCardDropdown && (
        <CyDView
          className='absolute bottom-[94px] right-[24px] bg-n0 rounded-[8px] border-[1px] border-n40 overflow-hidden min-w-[220px]'
          style={[
            styles.dropdownShadow,
            styles.cardDropdownHeight,
            styles.dropdownPopup,
          ]}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            indicatorStyle={isDarkMode ? 'white' : 'black'}
            nestedScrollEnabled={true}
            bounces={false}>
            <CyDTouchView
              className={`px-[12px] py-[10px] flex-row items-center border-b-[1px] border-n30 ${
                selectedCardIds === null ? 'bg-n30' : ''
              }`}
              onPress={toggleAllCards}>
              <CyDMaterialDesignIcons
                name={
                  selectedCardIds === null
                    ? 'checkbox-marked'
                    : 'checkbox-blank-outline'
                }
                size={18}
                className={`mr-[8px] ${
                  selectedCardIds === null ? 'text-p300' : 'text-n100'
                }`}
              />
              <CyDText
                className={`font-manrope text-[14px] leading-[145%] tracking-[-0.6px] ${
                  selectedCardIds === null
                    ? 'font-bold text-base400'
                    : 'font-medium text-n200'
                }`}>
                {'All cards'}
              </CyDText>
            </CyDTouchView>

            {availableCards.map((card, index) => {
              const isChecked =
                selectedCardIds === null ||
                selectedCardIds.includes(card.cardId);
              return (
                <CyDTouchView
                  key={card.cardId}
                  className={`px-[12px] py-[10px] flex-row items-center ${
                    isChecked && selectedCardIds !== null ? 'bg-n30' : ''
                  } ${
                    index < availableCards.length - 1
                      ? 'border-b-[1px] border-n30'
                      : ''
                  }`}
                  onPress={() => toggleCard(card.cardId)}>
                  <CyDMaterialDesignIcons
                    name={
                      isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'
                    }
                    size={18}
                    className={`mr-[8px] ${
                      isChecked ? 'text-p300' : 'text-n100'
                    }`}
                  />
                  <CyDText
                    className={`font-manrope text-[14px] leading-[145%] tracking-[-0.6px] flex-1 ${
                      isChecked && selectedCardIds !== null
                        ? 'font-bold text-base400'
                        : 'font-medium text-n200'
                    }`}>
                    {`${getCardTypeLabel(card)}  •••• ${card.last4}`}
                  </CyDText>
                </CyDTouchView>
              );
            })}
          </ScrollView>
        </CyDView>
      )}

      <CyDView
        className='absolute bottom-0 left-0 right-0 bg-n0 border-t-[1px] border-n30 pb-[24px] pt-[12px] px-[24px]'
        style={styles.filterBarContainer}>
        <CyDView className='flex-row justify-center gap-x-[16px]'>
          <CyDTouchView
            className='flex-1 h-[44px] flex-row items-center justify-center bg-n30 rounded-[24px] px-[16px]'
            onPress={() => {
              setShowCardDropdown(false);
              setShowPeriodDropdown(prev => !prev);
            }}>
            <CyDText className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-base400'>
              {PERIOD_DISPLAY[selectedPeriod]}
            </CyDText>
            <CyDMaterialDesignIcons
              name={showPeriodDropdown ? 'chevron-up' : 'chevron-down'}
              size={16}
              className='text-base400 ml-[4px]'
            />
          </CyDTouchView>

          <CyDTouchView
            className='flex-1 h-[44px] flex-row items-center justify-center bg-n30 rounded-[24px] px-[16px]'
            onPress={() => {
              setShowPeriodDropdown(false);
              setShowCardDropdown(prev => !prev);
            }}>
            <CyDText className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-base400'>
              {cardFilterLabel}
            </CyDText>
            <CyDMaterialDesignIcons
              name={showCardDropdown ? 'chevron-up' : 'chevron-down'}
              size={16}
              className='text-base400 ml-[4px]'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  donutContainer: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
  },
  pieChart: {
    height: DONUT_SIZE,
    width: DONUT_SIZE,
  },
  innerRingLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
  barChartContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  barChart: {
    width: '100%',
  },
  barGridFullWidth: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: -50,
    bottom: 0,
  },
  avgLabelColumn: {
    width: 50,
    alignItems: 'flex-end' as const,
    paddingLeft: 4,
  },
  barShadowLayer: {
    position: 'absolute' as const,
    bottom: -7,
    left: 8,
    top: 0,
    right: 0,
  },
  barMainLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  barChartRow: {
    flexDirection: 'row' as const,
  },
  yAxis: {
    width: 34,
  },
  dropdownShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownBackdrop: {
    zIndex: 5,
  },
  filterBarContainer: {
    zIndex: 10,
  },
  dropdownPopup: {
    zIndex: 15,
  },
  cardDropdownHeight: {
    maxHeight: 220,
  },
});
