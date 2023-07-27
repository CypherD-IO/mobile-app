import * as React from 'react';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { CyDView } from '../../styles/tailwindStyles';
import SwitchView from '../../components/v2/switchView';
import Overview from './overview';
import { TokenOverviewTabIndices, TokenOverviewTabs } from '../../constants/enum';
import { useEffect, useState, useContext } from 'react';
import { useIsFocused } from '@react-navigation/native';
import Loading from '../../components/v2/loading';
import { TokenTransactions } from './transactions';
import { BackHandler } from 'react-native';
import TokenOverviewToolBar from './toolbar';
import TokenStaking from './staking';
import analytics from '@react-native-firebase/analytics';
import clsx from 'clsx';
import { isIOS } from '../../misc/checkers';
import { HdWalletContext } from '../../core/util';

interface RouteProps {
  route: {
    params: {
      tokenData: TokenMeta
      navigateTo?: string
    }
  }
  navigation: {
    goBack: () => void
    setOptions: ({ title }: { title: string }) => void
    navigate: (screen: string, params?: {}) => void
  }
}

export default function TokenOverviewV2 ({ route, navigation }: RouteProps) {
  const isFocused = useIsFocused();
  const { tokenData } = route.params;
  const [tokenTabs, setTokenTabs] = useState([TokenOverviewTabs.OVERVIEW, TokenOverviewTabs.TRANSACTIONS]);
  const [index, setIndex] = useState<number>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isFocused) {
      if (!route.params.navigateTo || !([TokenOverviewTabIndices.OVERVIEW, TokenOverviewTabIndices.TRANSACTIONS, TokenOverviewTabIndices.STAKING].includes(+route.params.navigateTo))) {
        void analytics().logEvent('visited_token_overview_page');
        setIndex(TokenOverviewTabIndices.OVERVIEW);
      } else {
        setIndex(+route.params.navigateTo);
      }
      BackHandler.addEventListener('hardwareBackPress', handleBackButton);
      navigation.setOptions({
        title: tokenData.name
      });
      if (tokenData.isStakeable) {
        setTokenTabs([TokenOverviewTabs.OVERVIEW, TokenOverviewTabs.TRANSACTIONS, TokenOverviewTabs.STAKING]);
      }
      setLoading(false);
    }
  }, [isFocused]);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  return (
    loading
      ? <Loading />
      : <CyDView className={'bg-white h-full'}>
        <CyDView className='pb-[95px]'>
          <CyDView className={'flex flex-row justify-center'}>
            <SwitchView titles={tokenTabs} index={index} setIndexChange={(index: number) => {
              setIndex(index);
            }}></SwitchView>
          </CyDView>
          {index === 0 && <Overview tokenData={tokenData} navigation={navigation} />}
          {index === 1 && <TokenTransactions tokenData={tokenData} navigation={navigation} />}
          {index === 2 && <TokenStaking tokenData={tokenData} navigation={navigation} />}
        </CyDView>
      <CyDView className={clsx('bg-white rounded-t-[24px] absolute bottom-0 shadow shadow-gray-400')}>
        <TokenOverviewToolBar tokenData={tokenData} navigation={navigation} />
      </CyDView>
    </CyDView>
  );
}
