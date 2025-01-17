import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { HdWalletContext } from '../../../core/util';
import { showToast } from '../../utilities/toastUtility';
import { setHideBalanceStatus } from '../../../core/asyncStorage';
import {
  CyDImageBackground,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import CyDTokenValue from '../../../components/v2/tokenValue';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { StyleSheet } from 'react-native';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';

interface BannerProps {
  portfolioBalance: number | string;
}

export const Banner = ({ portfolioBalance }: BannerProps) => {
  const { t } = useTranslation();
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const { hideBalance } = hdWallet.state;

  const hideBalances = async () => {
    showToast(
      hideBalance
        ? t<string>('PRIVACY_MODE_OFF')
        : t<string>('PRIVACY_MODE_ON'),
    );
    await setHideBalanceStatus(!hideBalance);
    hdWallet.dispatch({
      type: 'TOGGLE_BALANCE_VISIBILITY',
      value: { hideBalance: !hideBalance },
    });
  };
  return (
    <CyDView className={'h-[160px] px-[10px] mt-2'}>
      <CyDImageBackground
        className={
          'w-full border mt-[4px] pt-[46px] rounded-[24px] border-n40 overflow-hidden bg-n0'
        }
        source={AppImages.PORTFOLIO_BG_S3}
        resizeMode='cover'
        imageStyle={styles.imageBGStyle}>
        <CyDView className='h-full mx-[14px] justify-center items-start'>
          <CyDView className=''>
            <CyDText>{t('TOTAL_BALANCE')}</CyDText>
            <CyDView className='flex flex-row items-center py-[3px]'>
              <CyDTokenValue className='text-[32px] font-extrabold'>
                {portfolioBalance}
              </CyDTokenValue>
              <CyDTouchView
                onPress={() => {
                  void hideBalances();
                }}
                className={clsx(
                  'h-[32px] flex flex-row items-center pl-[10px] gap-[5px]',
                )}>
                <CydMaterialDesignIcons
                  name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  className='text-base400 self-center items-center'
                />
                <CyDText className='text-[12px]'>
                  {hideBalance ? t('SHOW') : t('HIDE')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDView>
          <CyDView
            className={clsx(
              'flex flex-row justify-center items-center bg-blue20 rounded-[8px] px-[10px] py-[5px] my-[5px]',
              { 'opacity-0': !hideBalance },
            )}>
            <CyDText className='text-[12px]'>
              {t('ALL_BALANCES_HIDDEN')}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDImageBackground>
    </CyDView>
  );
};

const styles = StyleSheet.create({
  imageBGStyle: {
    top: -70,
  },
});
