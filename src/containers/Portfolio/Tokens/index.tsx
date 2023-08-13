import React, { useCallback, useContext, useMemo } from 'react';
import LottieView from 'lottie-react-native';
import { RefreshTimerBar } from './RefreshTimerBar';
import { CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import Button from '../../../components/v2/button';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../assets/images/appImages';
import { FlatList, StyleSheet } from 'react-native';
import { Chain } from '../../../constants/server';
import { WalletHoldings, fetchTokenData, getCurrentChainHoldings } from '../../../core/Portfolio';
import { HdWalletContext, PortfolioContext } from '../../../core/util';
import { screenTitle } from '../../../constants';
import { PORTFOLIO_EMPTY } from '../../../reducers/portfolio_reducer';
import PortfolioAssets from './PortfolioAssets';
import { SharedValue } from 'react-native-reanimated';

// HAVE TO REWRITE WITH PROPER TYPES FOR NAVIGATION
interface TokensProps {
  navigation: {
    goBack: () => void
    navigate: (screen: string, params?: {}) => void
    push: (screen: string, params?: {}) => void
    popToTop: () => void
  }
  getAllChainBalance: (portfolioState: {
    statePortfolio: {
      selectedChain: Chain
      tokenPortfolio: WalletHoldings
    }
  }) => number
  scrollY: SharedValue<number>
  trackRef: (key: string, ref: FlatList) => void
  syncScrollOffset: () => void
  refreshState: [{
    isRefreshing: boolean
    shouldRefreshAssets: boolean
  }, React.Dispatch<React.SetStateAction<{
    isRefreshing: boolean
    shouldRefreshAssets: boolean
  }>>]
  isVerifiedCoinCheckedState: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
}

export const Tokens = ({ navigation, getAllChainBalance, scrollY, trackRef, syncScrollOffset, refreshState, isVerifiedCoinCheckedState }: TokensProps) => {
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const [refreshData, setRefreshData] = refreshState;

  const onRefresh = useCallback((pullToRefresh: boolean = true) => {
    setRefreshData({ isRefreshing: true, shouldRefreshAssets: pullToRefresh });
    void fetchTokenData(hdWallet, portfolioState);
    setRefreshData({ isRefreshing: false, shouldRefreshAssets: false });
  }, []);

  const holdingsData = useMemo(() => {
    const data = getCurrentChainHoldings(
      portfolioState.statePortfolio.tokenPortfolio,
      portfolioState.statePortfolio.selectedChain
    );
    if (data) {
      return ('holdings' in data) ? data.holdings : data;
    } else {
      return [];
    }
  }, [portfolioState.statePortfolio.tokenPortfolio, portfolioState.statePortfolio.selectedChain]);

  return (
    <CyDView className='mx-[10px]'>
      { getAllChainBalance(portfolioState) > 0
        ? (
            <PortfolioAssets holdingsData={holdingsData} isVerifiedCoinCheckedState={isVerifiedCoinCheckedState} navigation={navigation} scrollY={scrollY} trackRef={trackRef} syncScrollOffset={syncScrollOffset} onRefresh={onRefresh} isRefreshing={refreshData.shouldRefreshAssets} />
          )
        : portfolioState.statePortfolio.portfolioState === PORTFOLIO_EMPTY &&
        <CyDView className={'flex justify-center items-center mt-[5px]'}>
          <LottieView source={AppImages.PORTFOLIO_EMPTY} autoPlay loop style={styles.lottieView} />
          <Button title={t('FUND_WALLET')} onPress={() => { navigation.navigate(screenTitle.QRCODE); }} style='mt-[-40px] px-[20px] h-[40px] py-[0px]' titleStyle='text-[14px]' image={AppImages.RECEIVE} imageStyle='h-[12px] w-[12px] mr-[15px]'/>
          <CyDTouchView className='mt-[20px]' onPress={() => {
            void onRefresh();
          }}>
            <CyDText className='text-center text-blue-500 underline'>{t<string>('CLICK_TO_REFRESH')}</CyDText>
          </CyDTouchView>
        </CyDView>
      }
    </CyDView>
  );
};

const styles = StyleSheet.create({
  lottieView: {
    width: '60%'
  }
});
