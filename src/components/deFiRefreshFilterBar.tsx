import React, { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react';

import moment from 'moment';
import { CyDFastImage, CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';

import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { getDeFiData } from '../core/asyncStorage';
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
  const { isRefreshing } = props;
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
      yy: t('TIMER_BAR_yy')
    }
  });

  const calculateTimeDiff = (currTimestamp: string) => {
    return moment(currTimestamp).fromNow();
  };

  useEffect(() => {
    const timeUpdateRunner = setInterval(function time() {
      if (!isRefreshing) {
        setTime(calculateTimeDiff(props.lastRefreshed));
      } else {
        setTime(`${t('RETRIEVING')}...`);
      }
    }, TIME_UPDATE_RUNNER_INTERVAL);

    return () => {
      clearInterval(timeUpdateRunner);
    };
  }, [props.lastRefreshed, isRefreshing, t]);

  return (
    <CyDView className='flex flex-row justify-between px-[20px] py-[5px] border-sepratorColor border-t-[0.5px]'>
      <CyDView className='flex flex-row items-center'>
        <CyDFastImage source={AppImages.CLOCK} className='h-[16px] w-[16px]' resizeMode='contain' />
        <CyDText className='ml-[10px]'>{time}</CyDText>
      </CyDView>
      <CyDTouchView onPress={() => {
        props.setFilterVisible(true);
      }}>
        <CyDFastImage className='w-[78px] h-[25px]' source={AppImages.ACTIVITY_FILTER} />
      </CyDTouchView>
    </CyDView>
  );
};
