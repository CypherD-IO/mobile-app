import React, { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { AreaChart } from 'react-native-svg-charts';
import { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import * as shape from 'd3-shape';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../../styles/tailwindComponents';
import CyDTokenValue from '../../../components/v2/tokenValue';
import { screenTitle } from '../../../constants';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

export type SpendPeriod =
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days';

const PERIOD_LABELS: Record<SpendPeriod, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
};

/** Fallback chart data shown while the API hasn't responded yet */
const MOCK_CHART_DATA = [
  120, 180, 140, 220, 190, 260, 230, 310, 280, 250, 200, 170, 210, 270, 240,
];
const MOCK_TOTAL_SPEND = 434.68;

interface SpendAnalyticsWidgetProps {
  spendData: number[];
  totalSpend: number;
  selectedPeriod: SpendPeriod;
  onPeriodChange: (period: SpendPeriod) => void;
  navigation: NavigationProp<ParamListBase>;
}

/**
 * SVG gradient definition for the area chart fill.
 * Matches design: linear-gradient(4.82deg, rgba(255,255,255,0) 4.07%, rgba(36,151,255,0.4) 104.15%)
 */
function ChartGradient(): React.ReactElement {
  return (
    <Defs>
      <LinearGradient id='areaGradient' x1='0' y1='0' x2='0' y2='1'>
        <Stop
          offset='0'
          stopColor='rgba(36, 151, 255, 0.4)'
          stopOpacity={0.4}
        />
        <Stop offset='1' stopColor='rgba(255, 255, 255, 0)' stopOpacity={0} />
      </LinearGradient>
    </Defs>
  );
}

/**
 * SVG stroke line drawn on top of the area fill.
 * Border color: #688BFF per design spec.
 */
function ChartLine({ line }: { line?: string }): React.ReactElement | null {
  if (!line) return null;
  return <Path d={line} fill='none' stroke='#688BFF' strokeWidth={1.5} />;
}

/**
 * Spend analytics summary widget shown in the card page bottom sheet.
 * When the dropdown is open, the chart area is replaced by a scrollable
 * period list so it stays fully inside the box boundaries.
 */
export default function SpendAnalyticsWidget({
  spendData,
  totalSpend,
  selectedPeriod,
  onPeriodChange,
  navigation,
}: SpendAnalyticsWidgetProps): React.ReactElement {
  const [showDropdown, setShowDropdown] = useState(false);

  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const hasRealData = spendData.length > 0 && totalSpend > 0;
  const displayData = hasRealData ? spendData : MOCK_CHART_DATA;
  const displayTotal = hasRealData ? totalSpend : MOCK_TOTAL_SPEND;

  const handleViewMore = useCallback((): void => {
    navigation.navigate(screenTitle.SPEND_ANALYTICS_SCREEN, {
      selectedPeriod,
    });
  }, [navigation, selectedPeriod]);

  const handlePeriodSelect = useCallback(
    (period: SpendPeriod): void => {
      onPeriodChange(period);
      setShowDropdown(false);
    },
    [onPeriodChange],
  );

  return (
    <CyDView className='border-[1px] border-n40 rounded-[12px] overflow-hidden bg-n0 h-[150px]'>
      {/* Header row: period dropdown + view more */}
      <CyDView className='flex-row items-center justify-between px-[16px] pt-[14px] pb-[4px]'>
        <CyDTouchView
          className='flex-row items-center'
          onPress={() => setShowDropdown(!showDropdown)}>
          <CyDText className='font-manrope font-semibold text-[16px] leading-[140%] tracking-[-0.8px] text-base400'>
            {PERIOD_LABELS[selectedPeriod]}
          </CyDText>
          <CyDMaterialDesignIcons
            name={showDropdown ? 'chevron-up' : 'chevron-down'}
            size={20}
            className='text-base400 ml-[2px]'
          />
        </CyDTouchView>

        <CyDTouchView
          className='flex-row items-center'
          onPress={handleViewMore}>
          <CyDText className='font-manrope font-bold text-[12px] leading-[150%] text-base400'>
            {'View More'}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-right'
            size={16}
            className='text-base400'
          />
        </CyDTouchView>
      </CyDView>

      {/*
       * Dropdown open: scrollable period list inside a bordered container.
       * indicatorStyle: 'black' for light mode, 'white' for dark mode (iOS).
       * persistentScrollbar keeps the bar visible on Android.
       */}
      {showDropdown ? (
        <CyDView className='flex-1 border-[1px] border-n40 rounded-[8px] mx-[8px] mb-[8px] overflow-hidden max-w-[130px]'>
          <ScrollView
            style={styles.dropdownScroll}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            indicatorStyle={isDarkMode ? 'white' : 'black'}
            nestedScrollEnabled={true}
            bounces={false}>
            {(Object.keys(PERIOD_LABELS) as SpendPeriod[]).map(
              (period, index) => (
                <CyDTouchView
                  key={period}
                  className={`px-[12px] py-[10px] rounded-[8px] ${
                    period === selectedPeriod ? 'bg-n30' : ''
                  } ${
                    index < Object.keys(PERIOD_LABELS).length - 1
                      ? 'border-b-[1px] border-n30'
                      : ''
                  }`}
                  onPress={() => handlePeriodSelect(period)}>
                  <CyDText
                    className={`font-manrope text-[14px] leading-[145%] tracking-[-0.6px] ${
                      period === selectedPeriod
                        ? 'font-bold text-base400'
                        : 'font-medium text-n200'
                    }`}>
                    {PERIOD_LABELS[period]}
                  </CyDText>
                </CyDTouchView>
              ),
            )}
          </ScrollView>
        </CyDView>
      ) : (
        <CyDView className='flex-1 relative'>
          {/* Area chart — fills the entire remaining space edge-to-edge */}
          <CyDView className='absolute top-0 left-0 right-0 bottom-0'>
            <AreaChart
              style={styles.chart}
              data={displayData}
              contentInset={{ top: 8, bottom: 0, left: -1, right: -1 }}
              curve={shape.curveNatural}
              svg={{ fill: 'url(#areaGradient)' }}>
              <ChartGradient />
              <ChartLine />
            </AreaChart>
          </CyDView>

          {/* Amount overlaid above the gradient at bottom-left */}
          <CyDView className='absolute bottom-[12px] left-[16px] z-[10]'>
            <CyDView className='flex-shrink'>
              <CyDTokenValue className='text-[22px] leading-[145%]'>
                {displayTotal}
              </CyDTokenValue>
            </CyDView>
          </CyDView>
        </CyDView>
      )}
    </CyDView>
  );
}

const styles = StyleSheet.create({
  chart: {
    flex: 1,
  },
  dropdownScroll: {
    flex: 1,
  },
});
