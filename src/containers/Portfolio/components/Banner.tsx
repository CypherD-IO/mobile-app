import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { HdWalletContext, PortfolioContext } from '../../../core/util';
import { getCurrentChainHoldings } from '../../../core/Portfolio';
import { showToast } from '../../utilities/toastUtility';
import { setHideBalanceStatus } from '../../../core/asyncStorage';
import { CyDFastImage, CyDImageBackground, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import CyDTokenValue from '../../../components/v2/tokenValue';
import AppImages from '../../../../assets/images/appImages';
import { H_BALANCE_BANNER } from '../constants';

interface BannerProps {
  checkAllBalance: number | string
}

export const Banner = ({ checkAllBalance }: BannerProps) => {
  const { t } = useTranslation();
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const { hideBalance } = hdWallet.state;

  const hideBalances = async () => {
    showToast(hideBalance ? t<string>('PRIVACY_MODE_OFF') : t<string>('PRIVACY_MODE_ON'));
    await setHideBalanceStatus(!hideBalance);
    hdWallet.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: !hideBalance } });
  };
  /* ? HEIGHT should be less then the H_BALANCE_BANNER */
  return (
    <CyDImageBackground className={`w-full h-[${H_BALANCE_BANNER - 1}px] rounded-[24px]`} source={AppImages.PORTFOLIO_BG_S3} resizeMode='cover'>
      <CyDView className={'mt-[40px] mx-[24px] justify-center items-start'}>
        {getCurrentChainHoldings(
          portfolioState.statePortfolio.tokenPortfolio,
          portfolioState.statePortfolio.selectedChain
        ) && (
          <CyDView>
              <CyDView>
                <CyDText>{t('TOTAL_BALANCE')}</CyDText>
                <CyDView className='flex flex-row items-center py-[3px]'>
                  <CyDTokenValue className='text-[32px] font-extrabold text-primaryTextColor'>
                    {checkAllBalance}
                  </CyDTokenValue>
                  <CyDTouchView onPress={() => {
                    void hideBalances();
                  }}
                  className='h-[32px] flex flex-row items-end pl-[10px] gap-[5px]'>
                    <CyDFastImage source={hideBalance ? AppImages.CYPHER_HIDE : AppImages.CYPHER_SHOW} className='h-[16px] w-[16px] ml-[15px]' resizeMode='contain' />
                    <CyDText className='text-[12px]'>{hideBalance ? t('SHOW') : t('HIDE')}</CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
              {hideBalance
                ? <CyDView className='flex flex-row items-center bg-privacyMessageBackgroundColor rounded-[8px] px-[10px] py-[5px]'>
                <CyDText className='text-[12px]' >{t('ALL_BALANCES_HIDDEN')}</CyDText>
              </CyDView>
                : <CyDView></CyDView>}
            </CyDView>
        )}
      </CyDView>
    </CyDImageBackground>
  );
};