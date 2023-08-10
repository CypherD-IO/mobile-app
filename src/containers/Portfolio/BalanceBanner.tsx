import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import { ChainHoldings, WalletHoldings, getCurrentChainHoldings } from '../../core/Portfolio';
import { Chain } from '../../constants/server';
import { showToast } from '../utilities/toastUtility';
import { setHideBalanceStatus } from '../../core/asyncStorage';
import { CyDAnimatedView, CyDFastImage, CyDImageBackground, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import CyDTokenValue from '../../components/v2/tokenValue';
import AppImages from '../../../assets/images/appImages';

interface BalanceBannerProps {
  isVerifyCoinChecked: boolean
  getAllChainBalance: (portfolioState: {
    statePortfolio: {
      selectedChain: Chain
      tokenPortfolio: WalletHoldings
    }
  }) => number
}

export const BalanceBanner = ({ isVerifyCoinChecked, getAllChainBalance }: BalanceBannerProps) => {
  const { t } = useTranslation();
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const { hideBalance } = hdWallet.state;

  const checkAll = (portfolioState: { statePortfolio: { selectedChain: Chain, tokenPortfolio: WalletHoldings } }) => {
    if (portfolioState.statePortfolio.selectedChain.backendName !== 'ALL') {
      const currentChainHoldings = getCurrentChainHoldings(
        portfolioState.statePortfolio.tokenPortfolio,
        portfolioState.statePortfolio.selectedChain
      );
      if (currentChainHoldings) {
        const { chainTotalBalance, chainStakedBalance, chainUnbondingBalance, chainUnVerifiedBalance } = currentChainHoldings as ChainHoldings; // Type-assertion (currentChainHoldings can only be of type ChainHoldings if selectedChain.backendName !== 'ALL')
        return isVerifyCoinChecked
          ? Number(chainTotalBalance) + Number(chainStakedBalance) + Number(chainUnbondingBalance)
          : Number(chainTotalBalance) + Number(chainUnVerifiedBalance) + Number(chainStakedBalance) + Number(chainUnbondingBalance);
      } else {
        return '...';
      }
    } else {
      return getAllChainBalance(portfolioState);
    }
  };

  const hideBalances = async () => {
    showToast(hideBalance ? t<string>('PRIVACY_MODE_OFF') : t<string>('PRIVACY_MODE_ON'));
    await setHideBalanceStatus(!hideBalance);
    hdWallet.dispatch({ type: 'TOGGLE_BALANCE_VISIBILITY', value: { hideBalance: !hideBalance } });
  };
  return (
    <CyDAnimatedView className='h-[20%]'>
      <CyDImageBackground className='h-full rounded-[24px]' source={AppImages.PORTFOLIO_BG_S3} resizeMode='cover'>
        <CyDView className={'mt-[20px] mx-[24px] justify-center items-start'}>
          {getCurrentChainHoldings(
            portfolioState.statePortfolio.tokenPortfolio,
            portfolioState.statePortfolio.selectedChain
          ) && (
            <CyDView>
                <CyDView>
                  <CyDText>{t('TOTAL_BALANCE')}</CyDText>
                  <CyDView className='flex flex-row items-center py-[3px]'>
                    <CyDTokenValue className='text-[32px] font-extrabold text-primaryTextColor'>
                      {checkAll(portfolioState)}
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
    </CyDAnimatedView>
  );
};
