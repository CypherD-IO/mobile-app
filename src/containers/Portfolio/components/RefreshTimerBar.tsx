import React, { useContext, useEffect, useState } from 'react';
import { PortfolioContext } from '../../../core/util';
import moment from 'moment';
import { CyDFastImage, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const TIME_UPDATE_RUNNER_INTERVAL = 1000;

export const RefreshTimerBar = (props: {isRefreshing: boolean, isVerifiedCoinCheckedState: [boolean, React.Dispatch<React.SetStateAction<boolean>>]}) => {
  const { isRefreshing, isVerifiedCoinCheckedState } = props;
  const [isVerifyCoinChecked, setIsVerifyCoinChecked] = isVerifiedCoinCheckedState;
  const portfolioState = useContext<any>(PortfolioContext);
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
    const timeUpdateRunner = setInterval(function time () {
      if (!isRefreshing) {
        const chainName = (portfolioState.statePortfolio.selectedChain.backendName).toLowerCase();
        const currTimestamp = portfolioState.statePortfolio.selectedChain.backendName !== 'ALL'
          ? getCurrentChainRefreshTime(chainName) // use the time for individual chain
          : portfolioState.statePortfolio.rtimestamp; // use rtimestamp for all chain data
        setTime(calculateTimeDiff(currTimestamp));
      } else {
        setTime(`${t('RETRIEVING')}...`);
      }
    }, TIME_UPDATE_RUNNER_INTERVAL);

    return () => {
      clearInterval(timeUpdateRunner);
    };

    function getCurrentChainRefreshTime (chainName: any) {
      return portfolioState?.statePortfolio?.tokenPortfolio[chainName]?.timestamp || new Date().toISOString();
    }
  }, [portfolioState.statePortfolio.rtimestamp, portfolioState.statePortfolio.selectedChain, isRefreshing]);

  return (
    <CyDView className='flex flex-row justify-between border-b border-sepratorColor py-[10px] px-[15px]'>
      <CyDView className='flex flex-row items-center'>
        <CyDFastImage source={AppImages.CLOCK} className='h-[16px] w-[16px]' resizeMode='contain'/>
        <CyDText className='ml-[10px]'>{time}</CyDText>
      </CyDView>
      <CyDTouchView className='flex flex-row items-center' onPress={() => {
        setIsVerifyCoinChecked(!isVerifyCoinChecked);
      }}>
        <CyDView
          className={clsx('h-[15px] w-[15px] justify-center items-center rounded-[4px] border-[1px] border-black', { 'bg-black': isVerifyCoinChecked, 'bg-transparent': !isVerifyCoinChecked })}
        >
          {isVerifyCoinChecked && <CyDFastImage source={AppImages.CORRECT} className='h-[14px] w-[10px]' resizeMode='contain'/>}
        </CyDView>
        <CyDText className='ml-[5px]'>{t('ONLY_VERIFIED_COINS')}</CyDText>
      </CyDTouchView>
    </CyDView>
  );
};
