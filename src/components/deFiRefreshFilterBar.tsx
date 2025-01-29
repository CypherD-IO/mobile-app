import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import moment from 'moment';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { DeFiFilter, protocolOptionType } from '../models/defi.interface';

const TIME_UPDATE_RUNNER_INTERVAL = 1000;

interface DeFiFilterRefreshBarInterface {
  isRefreshing: boolean;
  lastRefreshed: string;
  filters: DeFiFilter;
  setFilters: Dispatch<SetStateAction<DeFiFilter>>;
  isFilterVisible: boolean;
  setFilterVisible: Dispatch<SetStateAction<boolean>>;
  userProtocols: protocolOptionType[];
}

export const DeFiFilterRefreshBar = (props: DeFiFilterRefreshBarInterface) => {
  const { isRefreshing, lastRefreshed } = props;
  const { t } = useTranslation();
  const [time, setTime] = useState(`${t('RETRIEVING')}...`);
  moment.updateLocale('en', {
    relativeTime: {
      future: t('TIMER_BAR_future'),
      past: t('TIMER_BAR_past'),
      s: t('TIMER_BAR_s'),
      ss: t('TIMER_BAR_ss'),
      m: t('TIMER_BAR_m'),
      mm: t('TIMER_BAR_mm'),
      h: t('TIMER_BAR_h'),
      hh: t('TIMER_BAR_hh'),
      d: t('TIMER_BAR_d'),
      dd: t('TIMER_BAR_dd'),
      M: t('TIMER_BAR_M'),
      MM: t('TIMER_BAR_MM'),
      y: t('TIMER_BAR_y'),
      yy: t('TIMER_BAR_yy'),
    },
  });

  const calculateTimeDiff = (currTimestamp: string) => {
    const temp = moment(currTimestamp).fromNow();
    return temp;
  };

  useEffect(() => {
    if (!isRefreshing) {
      setTime(calculateTimeDiff(lastRefreshed));
    } else {
      setTime(`${t('RETRIEVING')}...`);
    }

    const timeUpdateRunner = setInterval(() => {
      if (!isRefreshing) {
        setTime(calculateTimeDiff(lastRefreshed));
      } else {
        setTime(`${t('RETRIEVING')}...`);
      }
    }, TIME_UPDATE_RUNNER_INTERVAL);

    return () => clearInterval(timeUpdateRunner);
  }, [lastRefreshed, isRefreshing]);

  return (
    <CyDView className='flex flex-row justify-between mx-[12px] py-[10px] border-t-[0.5px] border-n40'>
      <CyDView className='flex flex-row items-center'>
        <CyDMaterialDesignIcons
          name='clock-time-four'
          size={20}
          className='text-base400'
        />
        <CyDText className='ml-[10px]'>{time}</CyDText>
      </CyDView>
      <CyDTouchView
        onPress={() => {
          props.setFilterVisible(true);
        }}>
        <CyDMaterialDesignIcons
          name='filter-variant'
          size={24}
          className='text-base400'
        />
      </CyDTouchView>
    </CyDView>
  );
};
