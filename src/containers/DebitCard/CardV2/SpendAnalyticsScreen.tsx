import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { Platform, StyleSheet, TouchableWithoutFeedback, ScrollView } from 'react-native';
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
import { CardProviders, CardStatus, CardType } from '../../../constants/enum';
import { Card } from '../../../models/card.model';
import { CardProfile } from '../../../models/cardProfile.model';

const PERIOD_LABELS: Record<SpendPeriod, string> = {
  this_month: 'THIS MONTH',
  last_month: 'LAST MONTH',
  last_30_days: 'LAST 30 DAYS',
  last_90_days: 'LAST 90 DAYS',
};

/** Friendly cased labels for the bottom filter pills */
const PERIOD_DISPLAY: Record<SpendPeriod, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_30_days: 'Last 30 Days',
  last_90_days: 'Last 90 Days',
};

/** Ordered list of period options for the filter dropdown */
const PERIOD_OPTIONS: SpendPeriod[] = [
  'this_month',
  'last_month',
  'last_30_days',
  'last_90_days',
];

/** Friendly display label for a card type */
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

/**
 * Fixed 6-colour palette: indices 0–4 are the top 5 categories,
 * index 5 is always "Other" (grey).
 */
const CATEGORY_COLORS = [
  '#F7C034',
  '#F734E7',
  '#469AFA',
  '#7B3DD1',
  '#30C9C9',
  '#7D7D7D',
];

/** Max visible categories before the rest are merged into "Other" */
const MAX_VISIBLE_CATEGORIES = 5;

function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[Math.min(index, CATEGORY_COLORS.length - 1)];
}

/** Pixels allocated for each tick interval on the Y-axis */
const PER_TICK_HEIGHT = 45;

const DONUT_SIZE = 200;
const DONUT_CENTER = DONUT_SIZE / 2;
const DONUT_INNER_RADIUS = 61;

/** Darken a hex colour by subtracting from each RGB channel */
function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = Math.max(0, parseInt(clean.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(clean.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(clean.substring(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

/**
 * SVG gradient definitions for each category colour.
 * Each segment fades from its original colour to a darker shade,
 * giving the donut a subtle 3-D surface effect.
 * Accepts a count so gradients are generated for every category,
 * not just the curated palette size.
 */
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
  };
}

/** Shared top-merchant list used across all mock periods */
const MOCK_MERCHANTS: TopMerchant[] = [
  { name: 'The Urban clap', amount: 59.02 },
  { name: 'Amazon india', amount: 59.02 },
  { name: 'Amway', amount: 59.32 },
  { name: 'Red Bus inc', amount: 59.0 },
  { name: 'The Urban clap', amount: 59.02 },
  { name: 'The Urban clap', amount: 59.02 },
];

/**
 * Per-period mock data so switching periods gives a visible difference.
 *
 * This Month  (31 days) → 5 weekly bars
 * Last Month  (28 days) → 4 weekly bars
 * Last 30 Days          → 5 bars of 6-day chunks
 * Last 90 Days          → 3 monthly bars with real month names
 */
const MOCK_DATA_BY_PERIOD: Record<SpendPeriod, SpendAnalyticsData> = {
  this_month: {
    totalSpend: 846.23,
    categories: [
      { name: 'Foods & Dining', amount: 182.12, percentage: 21.5 },
      { name: 'Entertainment', amount: 142.1, percentage: 16.8 },
      { name: 'Travel', amount: 118.0, percentage: 13.9 },
      { name: 'Wallets', amount: 97.0, percentage: 11.5 },
      { name: 'Education', amount: 79.12, percentage: 9.3 },
      { name: 'Shopping', amount: 62.5, percentage: 7.4 },
      { name: 'Healthcare', amount: 48.3, percentage: 5.7 },
      { name: 'Utilities', amount: 42.0, percentage: 5.0 },
      { name: 'Subscriptions', amount: 38.09, percentage: 4.5 },
      { name: 'Groceries', amount: 37.0, percentage: 4.4 },
    ],
    topMerchants: MOCK_MERCHANTS,
    weeklyBreakdown: [
      { label: 'Week 1', categories: [80, 40, 30, 20, 10, 15, 12, 8, 7, 6] },
      { label: 'Week 2', categories: [60, 50, 40, 25, 15, 10, 8, 10, 9, 8] },
      { label: 'Week 3', categories: [100, 35, 25, 30, 20, 18, 14, 10, 11, 10] },
      { label: 'Week 4', categories: [70, 45, 35, 15, 25, 12, 10, 8, 6, 7] },
      { label: 'Week 5', categories: [50, 30, 20, 10, 8, 7, 4, 6, 5, 6] },
    ],
    averageWeeklySpend: 118.2,
  },

  last_month: {
    totalSpend: 624.5,
    categories: [
      { name: 'Foods & Dining', amount: 145.0, percentage: 23.2 },
      { name: 'Travel', amount: 130.0, percentage: 20.8 },
      { name: 'Entertainment', amount: 95.5, percentage: 15.3 },
      { name: 'Education', amount: 72.0, percentage: 11.5 },
      { name: 'Wallets', amount: 55.0, percentage: 8.8 },
      { name: 'Healthcare', amount: 42.0, percentage: 6.7 },
      { name: 'Shopping', amount: 35.0, percentage: 5.6 },
      { name: 'Subscriptions', amount: 28.0, percentage: 4.5 },
      { name: 'Utilities', amount: 22.0, percentage: 3.6 },
    ],
    topMerchants: MOCK_MERCHANTS,
    weeklyBreakdown: [
      { label: 'Week 1', categories: [65, 45, 30, 22, 14, 10, 8, 6, 5] },
      { label: 'Week 2', categories: [50, 40, 28, 18, 16, 12, 10, 8, 6] },
      { label: 'Week 3', categories: [40, 30, 22, 18, 12, 10, 9, 8, 6] },
      { label: 'Week 4', categories: [35, 25, 15, 14, 13, 10, 8, 6, 5] },
    ],
    averageWeeklySpend: 96.4,
  },

  last_30_days: {
    totalSpend: 712.8,
    categories: [
      { name: 'Entertainment', amount: 168.0, percentage: 23.6 },
      { name: 'Foods & Dining', amount: 155.0, percentage: 21.7 },
      { name: 'Shopping', amount: 112.0, percentage: 15.7 },
      { name: 'Travel', amount: 88.0, percentage: 12.3 },
      { name: 'Wallets', amount: 65.8, percentage: 9.2 },
      { name: 'Groceries', amount: 45.0, percentage: 6.3 },
      { name: 'Utilities', amount: 38.0, percentage: 5.3 },
      { name: 'Healthcare', amount: 25.0, percentage: 3.5 },
      { name: 'Subscriptions', amount: 16.0, percentage: 2.4 },
    ],
    topMerchants: MOCK_MERCHANTS,
    weeklyBreakdown: [
      { label: 'Week 1', categories: [55, 42, 30, 22, 15, 10, 8, 6, 4] },
      { label: 'Week 2', categories: [40, 35, 25, 18, 14, 10, 9, 5, 3] },
      { label: 'Week 3', categories: [30, 38, 28, 20, 12, 8, 7, 5, 3] },
      { label: 'Week 4', categories: [25, 22, 18, 16, 14, 10, 8, 5, 3] },
      { label: 'Week 5', categories: [18, 18, 11, 12, 10.8, 7, 6, 4, 3] },
    ],
    averageWeeklySpend: 102.6,
  },

  last_90_days: {
    totalSpend: 2180.45,
    categories: [
      { name: 'Foods & Dining', amount: 520.0, percentage: 23.8 },
      { name: 'Entertainment', amount: 385.0, percentage: 17.7 },
      { name: 'Travel', amount: 340.0, percentage: 15.6 },
      { name: 'Shopping', amount: 280.0, percentage: 12.8 },
      { name: 'Wallets', amount: 195.45, percentage: 9.0 },
      { name: 'Education', amount: 160.0, percentage: 7.3 },
      { name: 'Healthcare', amount: 110.0, percentage: 5.0 },
      { name: 'Utilities', amount: 90.0, percentage: 4.1 },
      { name: 'Subscriptions', amount: 55.0, percentage: 2.5 },
      { name: 'Groceries', amount: 45.0, percentage: 2.1 },
    ],
    topMerchants: MOCK_MERCHANTS,
    weeklyBreakdown: [
      { label: 'Feb', categories: [180, 130, 110, 95, 70, 55, 38, 30, 18, 14] },
      { label: 'Mar', categories: [195, 145, 125, 100, 68, 58, 40, 32, 20, 17] },
      { label: 'Apr', categories: [145, 110, 105, 85, 57.45, 47, 32, 28, 17, 14] },
    ],
    averageWeeklySpend: 242.3,
  },
};

/**
 * Full-screen spend analytics detail page.
 * Shows total spend, donut chart by category, weekly stacked bar chart,
 * and top merchants. Period is passed from the widget on the card page.
 * Falls back to mock data when the API hasn't returned results.
 */
export default function SpendAnalyticsScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<SpendAnalyticsRouteParams, 'SpendAnalyticsScreen'>>();
  const { getWithAuth } = useAxios();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Pull real cards from global card profile
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;

  /**
   * Collect displayable cards from every known provider.
   * Filters out hidden / upgrade-only statuses — same logic the card page uses.
   */
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
  const [selectedPeriod, setSelectedPeriod] =
    useState<SpendPeriod>(initialPeriod);
  const [analyticsData, setAnalyticsData] =
    useState<SpendAnalyticsData | null>(null);

  // Filter dropdown visibility
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showCardDropdown, setShowCardDropdown] = useState(false);

  // Card filter: null means "All cards" selected
  const [selectedCardIds, setSelectedCardIds] = useState<string[] | null>(null);

  /** Toggle a card in the multi-select filter */
  const toggleCard = useCallback((cardId: string): void => {
    setSelectedCardIds(prev => {
      if (prev === null) {
        // Was "All cards" — switch to only this card
        return [cardId];
      }
      if (prev.includes(cardId)) {
        const next = prev.filter(id => id !== cardId);
        // If none left, revert to "All cards"
        return next.length === 0 ? null : next;
      }
      return [...prev, cardId];
    });
  }, []);

  /** Toggle the "All cards" checkbox */
  const toggleAllCards = useCallback((): void => {
    setSelectedCardIds(prev => (prev === null ? [] : null));
  }, []);

  /** Label for the card filter button */
  const cardFilterLabel = useMemo((): string => {
    if (selectedCardIds === null) return 'All cards';
    if (selectedCardIds.length === 0) return 'No cards';
    if (selectedCardIds.length === 1) {
      const card = availableCards.find(c => c.cardId === selectedCardIds[0]);
      return card ? `•••• ${card.last4}` : 'All cards';
    }
    return `${selectedCardIds.length} cards`;
  }, [selectedCardIds, availableCards]);

  const fetchAnalytics = useCallback(async (): Promise<void> => {
    try {
      const cardIdsParam =
        selectedCardIds !== null ? `&cardIds=${selectedCardIds.join(',')}` : '';
      const { data, isError } = await getWithAuth(
        `/v1/cards/spend-analytics?period=${PERIOD_API_MAP[selectedPeriod]}${cardIdsParam}`,
      );
      if (!isError && data) {
        setAnalyticsData(data as SpendAnalyticsData);
      }
    } catch (_error) {
      // API not ready — mock data will be used as fallback
    }
  }, [getWithAuth, selectedPeriod, selectedCardIds]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const displayData = analyticsData ?? MOCK_DATA_BY_PERIOD[selectedPeriod];
  const totalSpend = displayData.totalSpend;

  const topMerchants = displayData.topMerchants;
  const avgWeekly = displayData.averageWeeklySpend;

  /**
   * Collapse raw categories into top 5 + "Other".
   * Categories are sorted by amount descending; anything beyond the first 5
   * is merged into a single "Other" entry so only 6 colours are ever used.
   */
  const categories = useMemo((): SpendCategory[] => {
    const sorted = [...displayData.categories].sort(
      (a, b) => b.amount - a.amount,
    );
    if (sorted.length <= MAX_VISIBLE_CATEGORIES) return sorted;

    const top = sorted.slice(0, MAX_VISIBLE_CATEGORIES);
    const rest = sorted.slice(MAX_VISIBLE_CATEGORIES);
    const otherAmount = rest.reduce((sum, c) => sum + c.amount, 0);
    const otherPercentage = rest.reduce((sum, c) => sum + c.percentage, 0);
    top.push({
      name: 'Other',
      amount: parseFloat(otherAmount.toFixed(2)),
      percentage: parseFloat(otherPercentage.toFixed(1)),
    });
    return top;
  }, [displayData.categories]);

  /**
   * Merge weekly breakdown values to match the collapsed categories.
   * The first 5 category indices are kept as-is; everything from index 5
   * onward is summed into a single "Other" slot.
   */
  const weeklyBreakdown = useMemo(() => {
    return displayData.weeklyBreakdown.map(week => {
      if (week.categories.length <= MAX_VISIBLE_CATEGORIES) return week;
      const top = week.categories.slice(0, MAX_VISIBLE_CATEGORIES);
      const otherSum = week.categories
        .slice(MAX_VISIBLE_CATEGORIES)
        .reduce((sum, val) => sum + val, 0);
      return { ...week, categories: [...top, otherSum] };
    });
  }, [displayData.weeklyBreakdown]);

  const pieData = useMemo(
    () =>
      categories.map((cat, index) => ({
        key: `pie-${index}`,
        value: cat.amount,
        svg: { fill: `url(#pieGrad${index})` },
      })),
    [categories],
  );
  
  /**
   * Data formatted for StackedBarChart.
   * Each item = one week, keys map to category indices.
   */
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

  /**
   * Derive the Y-axis domain from the actual stacked bar totals so labels,
   * grid lines, and bars all share the same coordinate space.
   */
  const maxStackedTotal = useMemo(() => {
    let max = 0;
    weeklyBreakdown.forEach(week => {
      const total = week.categories.reduce((sum, val) => sum + val, 0);
      if (total > max) max = total;
    });
    return max;
  }, [weeklyBreakdown]);

  const yStep = useMemo(() => {
    if (maxStackedTotal <= 100) return 25;
    if (maxStackedTotal <= 300) return 50;
    if (maxStackedTotal <= 600) return 100;
    return 200;
  }, [maxStackedTotal]);

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

  /**
   * Add a transparent "__pad" key to every bar entry so each stack sums to
   * yMax. This forces StackedBarChart's auto-scaled Y domain to exactly
   * match the YAxis domain, keeping labels and bars perfectly aligned.
   */
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

  /** Y pixel position of the average-spend line within the bar chart area */
  const avgLineTop = useMemo(() => {
    if (avgWeekly <= 0 || yMax <= 0) return 0;
    const topInset = 10;
    const usable = barChartHeight - topInset;
    return topInset + usable * (1 - avgWeekly / yMax);
  }, [avgWeekly, yMax, barChartHeight]);

  const avgAboveStyle = useMemo(
    () => ({ top: avgLineTop - 18 }),
    [avgLineTop],
  );

  const avgBelowStyle = useMemo(
    () => ({ top: avgLineTop + 4 }),
    [avgLineTop],
  );

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      {/* Header */}
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
      {/* Period label */}
      <CyDView className='items-center mt-[28px]'>
          <CyDText className='font-manrope font-bold text-[12px] leading-[150%] text-n80'>
            {PERIOD_LABELS[selectedPeriod]}
          </CyDText>
        </CyDView>

        {/* Total spend (large) */}
        <CyDView className='items-center mt-[8px] mb-[32px]'>
          <CyDView className='flex-shrink'>
            <CyDTokenValue className='font-heavy text-[44px] leading-[135%]'>
              {totalSpend}
            </CyDTokenValue>
          </CyDView>
        </CyDView>

      <CyDScrollView className='flex-1 bg-n30' showsVerticalScrollIndicator={false}>
    
        {/* Spend Category donut chart */}
        <CyDView className='border-[1px] border-n40 rounded-[16px] mx-[16px] mt-[24px] p-[16px] bg-n0'>
          <CyDText className='font-manrope font-medium text-[18px] leading-[145%] tracking-[-1px] text-base400'>
            {'Spend Category'}
          </CyDText>

          {categories.length > 0 ? (
            <>
              {/* 3-D donut: shadow layer → gradient pie → inner dark ring */}
              <CyDView
                className='items-center self-center mt-[16px]'
                style={styles.donutContainer}>

                {/* Layer 2: main donut with per-segment gradient fills */}
                <PieChart
                  style={styles.pieChart}
                  data={pieData}
                  innerRadius='55%'
                  outerRadius='95%'
                  padAngle={0}>
                  <PieGradients count={categories.length} />
                </PieChart>

                {/* Layer 3: inner dark ring for hollow depth */}
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

              {/* Category legend list */}
              <CyDView className='mt-[16px]'>
                {categories.map((cat, index) => (
                  <CyDView
                    key={cat.name}
                    className={`flex-row items-center py-[8px] ${
                      index < categories.length - 1
                        ? 'border-b-[1px] border-n30'
                        : ''
                    }`}>
                    {/* 8x8 color bullet */}
                    <CyDView
                      className='w-[8px] h-[8px] rounded-full mr-[8px]'
                      style={{
                        backgroundColor: getCategoryColor(index),
                      }}
                    />
                    {/* Category name */}
                    <CyDText className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-base400 flex-1'>
                      {cat.name}
                    </CyDText>
                    {/* Percentage */}
                    <CyDText className='font-manrope font-medium text-[10px] leading-[160%] text-n200 mr-[12px]'>
                      {`${cat.percentage.toFixed(1)}%`}
                    </CyDText>
                    {/* Amount */}
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
            </>
          ) : (
            <CyDView className='py-[24px] items-center'>
              <CyDText className='font-manrope text-[14px] text-n200'>
                {'No spending data available'}
              </CyDText>
            </CyDView>
          )}
        </CyDView>

        {/* Weekly stacked bar chart */}
        {weeklyBreakdown.length > 0 && (
          <CyDView className='border-[1px] border-n40 rounded-[16px] mx-[16px] mt-[16px] p-[16px] bg-n0'>
            {/* Outer row: [chart area flex:1] [avg label fixed] */}
            <CyDView className='flex-row'>
              {/* Chart area — grid, Y-axis, and bars */}
              <CyDView className='flex-1'>
                <CyDView style={[styles.barChartRow, barHeightStyle]}>
                  {/* Grid lines behind everything */}
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

                    {/* Dashed average-spend line across the bar area */}
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

                  <CyDView style={[styles.barChartContainer, barHeightStyle]}>
                    {/* Shadow layer */}
                    <StackedBarChart
                      style={[
                        styles.barChart,
                        barHeightStyle,
                        styles.barShadowLayer,
                      ]}
                      keys={barKeysWithPad}
                      colors={barShadowColorsWithPad}
                      data={barDataWithPad}
                      contentInset={{ top: 10, bottom: 0, left: 15, right: 0 }}
                      spacingInner={0.7}
                    />

                    {/* Main bars */}
                    <StackedBarChart
                      style={[
                        styles.barChart,
                        barHeightStyle,
                        styles.barMainLayer,
                      ]}
                      keys={barKeysWithPad}
                      colors={barColorsWithPad}
                      data={barDataWithPad}
                      contentInset={{ top: 10, bottom: 0, left: 15, right: 0 }}
                      spacingInner={0.7}
                    />
                  </CyDView>
                </CyDView>

                {/* Week labels — ml matches YAxis(34) + contentInset.left(15) */}
                <CyDView className='flex-row mt-[8px] ml-[35px] mr-[-25px]'>
                  {weeklyBreakdown.map((week, index) => (
                    <CyDText
                      key={index}
                      className='flex-1 font-manrope font-medium text-[12px] leading-[150%] text-n50 text-center'>
                      {week.label}
                    </CyDText>
                  ))}
                </CyDView>
              </CyDView>

              {/* Avg label — fixed width column to the right of bars */}
              {avgWeekly > 0 && (
                <CyDView style={styles.avgLabelColumn}>
                  {/* Amount above the line */}
                  <CyDView className='absolute' style={avgAboveStyle}>
                    <CyDText className='font-manrope font-semibold text-[10px] leading-[160%] text-[#006A31]'>
                      {`$${avgWeekly.toFixed(1)}`}
                    </CyDText>
                  </CyDView>
                  {/* Label below the line */}
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

        {/* Top Merchant */}
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
                  {/* Merchant logo placeholder */}
                  <CyDView className='w-[48px] h-[48px] rounded-tl-[8px] rounded-br-[8px] bg-[#EBEDF0] items-center justify-center p-[12px] mb-[6px]'>
                    <CyDMaterialDesignIcons
                      name='store'
                      size={24}
                      className='text-b20'
                    />
                  </CyDView>
                  {/* Merchant name */}
                  <CyDText
                    className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-n200 text-center'
                    numberOfLines={1}>
                    {merchant.name}
                  </CyDText>
                  {/* Merchant amount */}
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

        {/* Bottom spacer so content isn't hidden behind the filter bar */}
        <CyDView className={Platform.OS === 'android' ? 'h-[110px]' : 'h-[80px]'} />
      </CyDScrollView>

      {/* Backdrop to dismiss dropdowns — z-index 5 so it's below the filter bar */}
      {(showPeriodDropdown || showCardDropdown) && (
        <TouchableWithoutFeedback
          onPress={() => {
            setShowPeriodDropdown(false);
            setShowCardDropdown(false);
          }}>
          <CyDView className='absolute top-0 left-0 right-0 bottom-0' style={styles.dropdownBackdrop} />
        </TouchableWithoutFeedback>
      )}

      {/* Period dropdown popup — rendered at root level for Android touch compatibility */}
      {showPeriodDropdown && (
        <CyDView className='absolute bottom-[94px] left-[24px] bg-n0 rounded-[8px] border-[1px] border-n40 overflow-hidden max-w-[130px]' style={[styles.dropdownShadow, styles.dropdownPopup]}>
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

      {/* Card filter dropdown popup — rendered at root level for Android touch compatibility */}
      {showCardDropdown && (
        <CyDView className='absolute bottom-[94px] right-[24px] bg-n0 rounded-[8px] border-[1px] border-n40 overflow-hidden min-w-[220px]' style={[styles.dropdownShadow, styles.cardDropdownHeight, styles.dropdownPopup]}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            indicatorStyle={isDarkMode ? 'white' : 'black'}
            nestedScrollEnabled={true}
            bounces={false}>
            {/* "All cards" option */}
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

            {/* Individual cards */}
            {availableCards.map((card, index) => {
              const isChecked =
                selectedCardIds === null || selectedCardIds.includes(card.cardId);
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
                      isChecked
                        ? 'checkbox-marked'
                        : 'checkbox-blank-outline'
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

      {/* Bottom filter bar — buttons only */}
      <CyDView className='absolute bottom-0 left-0 right-0 bg-n0 border-t-[1px] border-n30 pb-[24px] pt-[12px] px-[24px]' style={styles.filterBarContainer}>
        {/* Filter buttons row */}
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
