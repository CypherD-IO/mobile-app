import React, { useEffect, useState } from 'react';
import moment from 'moment';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const TIME_UPDATE_RUNNER_INTERVAL = 1000;

export const RefreshTimerBar = (props: {
  isRefreshing: boolean;
  isVerifyCoinChecked: boolean;
  setIsVerifyCoinChecked: (arg: boolean) => void;
  lastUpdatedAt: string;
}) => {
  const {
    isRefreshing,
    isVerifyCoinChecked,
    setIsVerifyCoinChecked,
    lastUpdatedAt,
  } = props;
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
    return moment(currTimestamp).fromNow();
  };

  useEffect(() => {
    const timeUpdateRunner = setInterval(function time() {
      setTime(calculateTimeDiff(lastUpdatedAt));
    }, TIME_UPDATE_RUNNER_INTERVAL);

    return () => {
      clearInterval(timeUpdateRunner);
    };
  }, [isRefreshing, lastUpdatedAt]);

  return (
    <CyDView className='bg-n0 flex flex-row justify-between rounded-t-[24px] border border-n40 py-[10px] px-[10px] mx-[10px]'>
      <CyDView className='flex flex-row items-center'>
        <CyDMaterialDesignIcons
          name='clock-time-four'
          size={20}
          className='text-base400'
        />
        <CyDText className='ml-[10px]'>
          {isRefreshing ? t('REFRESHING') : time}
        </CyDText>
      </CyDView>
      <CyDTouchView
        className={clsx('flex flex-row items-center', {
          'opacity-10': isRefreshing,
        })}
        disabled={isRefreshing}
        onPress={() => {
          setIsVerifyCoinChecked(!isVerifyCoinChecked);
        }}>
        <CyDView
          className={clsx(
            'h-[15px] w-[15px] justify-center items-center rounded-[4px] border-[1px] border-base400',
          )}>
          {isVerifyCoinChecked && (
            <CyDMaterialDesignIcons
              name='check-bold'
              size={12}
              className='text-base400'
            />
          )}
        </CyDView>
        <CyDText className='ml-[5px]'>{t('ONLY_VERIFIED_COINS')}</CyDText>
      </CyDTouchView>
    </CyDView>
  );
};
