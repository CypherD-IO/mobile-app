import * as React from 'react';
import { StyleSheet, BackHandler } from 'react-native';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  CyDAnimatedView,
  CyDScrollView,
  CyDView,
} from '../../styles/tailwindStyles';
import SwitchView from '../../components/v2/switchView';
import Overview from './overview';
import {
  TokenOverviewTabIndices,
  TokenOverviewTabs,
} from '../../constants/enum';
import { useEffect, useState } from 'react';
import {
  useIsFocused,
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Loading from '../../components/v2/loading';
import { TokenTransactions } from './transactions';
import TokenOverviewToolBar from './toolbar';
import TokenStaking from './staking';
import analytics from '@react-native-firebase/analytics';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../../misc/checkers';
import { Layout } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import usePortfolio from '../../hooks/usePortfolio';
import { Holding } from '../../core/portfolio';
import { get, groupBy } from 'lodash';

interface RouteParams {
  tokenData: TokenMeta;
  navigateTo?: string;
}

function TokenOverviewV2() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getLocalPortfolio } = usePortfolio();

  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const isFocused = useIsFocused();
  const { tokenData } = route.params;
  const [tokenTabs, setTokenTabs] = useState([
    TokenOverviewTabs.OVERVIEW,
    TokenOverviewTabs.TRANSACTIONS,
  ]);
  const [index, setIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [tokenHoldingsByCoinGeckoId, setTokenHoldingsByCoinGeckoId] = useState<
    Record<string, Holding[]>
  >({});

  const getTokenHoldingsByCoinGeckoId = async () => {
    const localPortfolio = await getLocalPortfolio();
    if (localPortfolio) {
      const holdings = groupBy(localPortfolio.totalHoldings, 'coinGeckoId');
      setTokenHoldingsByCoinGeckoId(holdings);
    }
  };

  useEffect(() => {
    if (isFocused) {
      if (
        !route.params.navigateTo ||
        ![
          TokenOverviewTabIndices.OVERVIEW,
          TokenOverviewTabIndices.TRANSACTIONS,
          TokenOverviewTabIndices.STAKING,
        ].includes(+route.params.navigateTo)
      ) {
        void analytics().logEvent('visited_token_overview_page');
        void getTokenHoldingsByCoinGeckoId();
        setIndex(TokenOverviewTabIndices.OVERVIEW);
      } else {
        setIndex(+route.params.navigateTo);
      }
      BackHandler.addEventListener('hardwareBackPress', handleBackButton);
      navigation.setOptions({
        title: tokenData.name,
      });
      if (tokenData.isStakeable) {
        setTokenTabs([
          TokenOverviewTabs.OVERVIEW,
          TokenOverviewTabs.TRANSACTIONS,
          TokenOverviewTabs.STAKING,
        ]);
      }
      setLoading(false);
    }
  }, [isFocused]);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  return loading ? (
    <Loading />
  ) : (
    <CyDView className={'bg-n0 flex-1 flex-col justify-between'}>
      <CyDView className={'flex flex-row justify-center'}>
        <SwitchView
          titles={tokenTabs}
          index={index}
          setIndexChange={(index: number) => {
            setIndex(index);
          }}
        />
      </CyDView>
      {index === 1 ? (
        <CyDScrollView>
          {index === 1 && (
            <TokenTransactions tokenData={tokenData} navigation={navigation} />
          )}
        </CyDScrollView>
      ) : (
        <CyDView className='flex-1'>
          {index === 0 && (
            <Overview
              tokenData={tokenData}
              otherChainsWithToken={get(
                tokenHoldingsByCoinGeckoId,
                tokenData.coinGeckoId,
                [],
              ).filter(
                holding =>
                  holding.chainDetails.backendName !==
                  tokenData.chainDetails.backendName,
              )}
              navigation={navigation}
            />
          )}
          {index === 2 && (
            <TokenStaking tokenData={tokenData} navigation={navigation} />
          )}
        </CyDView>
      )}
      <CyDAnimatedView
        layout={Layout.springify()}
        className={clsx(
          'h-[110px] self-end bg-n0 pb-[20px] bottom-[-30px] pt-[2px] rounded-t-[24px] shadow shadow-gray-400',
          { 'pt-[16px]': isAndroid() },
        )}
        style={styles.elevatedBackground}>
        <TokenOverviewToolBar tokenData={tokenData} navigation={navigation} />
      </CyDAnimatedView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  elevatedBackground: {
    elevation: 3,
    backgroundColor: isIOS() ? Colors.white : Colors.transparent,
  },
});

export default TokenOverviewV2;
