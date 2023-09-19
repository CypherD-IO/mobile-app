import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { HdWalletContext, PortfolioContext } from '../../../core/util';
import { getCurrentChainHoldings } from '../../../core/Portfolio';
import { showToast } from '../../utilities/toastUtility';
import { setHideBalanceStatus } from '../../../core/asyncStorage';
import {
  CyDFastImage,
  CyDImageBackground,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import CyDTokenValue from '../../../components/v2/tokenValue';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { StyleSheet } from 'react-native';

interface BannerProps {
  bannerHeight: 160 | 260
  checkAllBalance: number | string;
}

export const Banner = ({ bannerHeight, checkAllBalance }: BannerProps) => {
  const { t } = useTranslation();
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const { hideBalance } = hdWallet.state;

  const hideBalances = async () => {
    showToast(
      hideBalance ? t<string>('PRIVACY_MODE_OFF') : t<string>('PRIVACY_MODE_ON')
    );
    await setHideBalanceStatus(!hideBalance);
    hdWallet.dispatch({
      type: 'TOGGLE_BALANCE_VISIBILITY',
      value: { hideBalance: !hideBalance },
    });
  };
  return (
    <CyDImageBackground
      className={
        'w-full border my-[4px] pt-[50px] rounded-[24px] border-sepratorColor overflow-hidden'
      }
      source={AppImages.PORTFOLIO_BG_S3}
      resizeMode='cover'
      imageStyle={styles.imageBGStyle}
    >
      <CyDView
        className={clsx('mx-[14px] justify-center items-start', { 'h-[50%]': bannerHeight === 260 })}
      >
        {getCurrentChainHoldings(
          portfolioState.statePortfolio.tokenPortfolio,
          portfolioState.statePortfolio.selectedChain
        ) && (
            <CyDView className='h-full'>
              <CyDView>
                <CyDText>{t('TOTAL_BALANCE')}</CyDText>
                <CyDView className='flex flex-row items-center py-[3px]'>
                  <CyDTokenValue className='text-[32px] font-extrabold text-primaryTextColor'>
                    {checkAllBalance}
                  </CyDTokenValue>
                  <CyDTouchView
                    onPress={() => {
                      void hideBalances();
                    }}
                    className={clsx(
                      'h-[32px] flex flex-row items-end pl-[10px] gap-[5px]'
                    )}
                  >
                    <CyDFastImage
                      source={
                        hideBalance
                          ? AppImages.CYPHER_HIDE
                          : AppImages.CYPHER_SHOW
                      }
                      className='h-[16px] w-[16px] ml-[15px]'
                      resizeMode='contain'
                    />
                    <CyDText className='text-[12px]'>
                      {hideBalance ? t('SHOW') : t('HIDE')}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
              <CyDView className={clsx('flex flex-row justify-center items-center bg-privacyMessageBackgroundColor rounded-[8px] px-[10px] py-[5px] my-[5px]',
                { 'opacity-0': !hideBalance })}>
                <CyDText className='text-[12px]'>
                  {t('ALL_BALANCES_HIDDEN')}
                </CyDText>
              </CyDView>
            </CyDView>
          )}
      </CyDView>
    </CyDImageBackground>
  );
};

const styles = StyleSheet.create({
  imageBGStyle: {
    top: -70
  },
});