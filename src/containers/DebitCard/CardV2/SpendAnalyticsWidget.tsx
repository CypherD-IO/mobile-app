import React, { useState, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { AreaChart } from 'react-native-svg-charts';
import {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Ellipse,
  Svg,
} from 'react-native-svg';
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
  | 'last_90_days'
  | 'all_time';

const PERIOD_LABELS: Record<SpendPeriod, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
  all_time: 'All Time',
};

interface SpendAnalyticsWidgetProps {
  spendData: number[];
  totalSpend: number;
  selectedPeriod: SpendPeriod;
  onPeriodChange: (period: SpendPeriod) => void;
  navigation: NavigationProp<ParamListBase>;
}

const TARGET_CHART_POINTS = 15;

function ChartGradient(): React.ReactElement {
  return (
    <Defs>
      <LinearGradient id='areaGradient' x1='0' y1='0' x2='0' y2='1'>
        <Stop offset='0' stopColor='#2497FF' stopOpacity={0.3} />
        <Stop offset='0.3' stopColor='#2497FF' stopOpacity={0.1} />
        <Stop offset='1' stopColor='#FFFFFF' stopOpacity={0} />
      </LinearGradient>
    </Defs>
  );
}

function ChartLine({ line }: { line?: string }): React.ReactElement | null {
  if (!line) return null;
  return <Path d={line} fill='none' stroke='#688BFF' strokeWidth={1.5} />;
}

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

  const smoothedData = useMemo((): number[] => {
    const nonZero = spendData.filter(v => v > 0);
    if (nonZero.length <= TARGET_CHART_POINTS) return nonZero;
    const bucketSize = nonZero.length / TARGET_CHART_POINTS;
    const result: number[] = [];
    for (let i = 0; i < TARGET_CHART_POINTS; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.floor((i + 1) * bucketSize);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += nonZero[j];
      }
      result.push(sum / (end - start));
    }
    return result;
  }, [spendData]);

  const handleViewMore = useCallback((): void => {
    navigation.navigate(screenTitle.SPEND_ANALYTICS_SCREEN, {
      selectedPeriod,
      initialTotalSpend: totalSpend,
    });
  }, [navigation, selectedPeriod, totalSpend]);

  const handlePeriodSelect = useCallback(
    (period: SpendPeriod): void => {
      onPeriodChange(period);
      setShowDropdown(false);
    },
    [onPeriodChange],
  );

  return (
    <CyDView className='border-[1px] border-n40 rounded-[12px] bg-n0 h-[150px]'>
      <CyDView className='flex-row items-center justify-between px-[16px] pt-[14px] pb-[4px] z-[5]'>
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

        {totalSpend > 0 && (
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
        )}
      </CyDView>

      <CyDView className='flex-1 relative overflow-hidden rounded-b-[12px]'>
        {totalSpend > 0 ? (
          <>
            <CyDView className='absolute top-0 left-0 right-0 bottom-0'>
              <AreaChart
                style={styles.chart}
                data={smoothedData}
                contentInset={{ top: 20, bottom: 0, left: -1, right: -1 }}
                curve={shape.curveNatural}
                svg={{ fill: 'url(#areaGradient)' }}>
                <ChartGradient />
                <ChartLine />
              </AreaChart>
            </CyDView>

            <CyDView className='absolute left-[-10px] bottom-[-5px] z-[10]'>
              <Svg width={140} height={60}>
                <Defs>
                  <RadialGradient
                    id='textGlow'
                    cx='50%'
                    cy='50%'
                    rx='50%'
                    ry='50%'>
                    <Stop
                      offset='0'
                      stopColor={isDarkMode ? '#000000' : '#FFFFFF'}
                      stopOpacity={0.85}
                    />
                    <Stop
                      offset='1'
                      stopColor={isDarkMode ? '#000000' : '#FFFFFF'}
                      stopOpacity={0}
                    />
                  </RadialGradient>
                </Defs>
                <Ellipse
                  cx={70}
                  cy={30}
                  rx={70}
                  ry={30}
                  fill='url(#textGlow)'
                />
              </Svg>
            </CyDView>
            <CyDView className='absolute left-[9px] bottom-[15px] z-[11]'>
              <CyDTokenValue className='text-[22px] leading-[145%]'>
                {totalSpend}
              </CyDTokenValue>
            </CyDView>
          </>
        ) : (
          <CyDView className='flex-1 items-center justify-center'>
            <CyDText className='font-manrope font-medium text-[14px] leading-[145%] text-n200'>
              {'No spending data available'}
            </CyDText>
          </CyDView>
        )}
      </CyDView>

      {showDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <CyDView
            className='absolute top-0 left-0 right-0 bottom-0'
            style={styles.backdrop}
          />
        </TouchableWithoutFeedback>
      )}

      {showDropdown && (
        <CyDView
          className='absolute top-[42px] left-[16px] bg-n0 rounded-[8px] border-[1px] border-n40 overflow-hidden w-[195px]'
          style={[styles.dropdownShadow, styles.dropdownPopup]}>
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
        </CyDView>
      )}
    </CyDView>
  );
}

const styles = StyleSheet.create({
  chart: {
    flex: 1,
  },
  dropdownShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownPopup: {
    zIndex: 20,
  },
  backdrop: {
    zIndex: 15,
    ...Platform.select({
      android: { elevation: 7 },
    }),
  },
});
