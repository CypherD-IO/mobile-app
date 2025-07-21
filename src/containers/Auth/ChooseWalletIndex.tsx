import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import ChooseWalletIndexComponent from '../../components/ChooseWalletIndexComponent';
import { CyDView } from '../../styles/tailwindComponents';

interface RouteParams {
  walletAddresses: string[];
}
export function ChooseWalletIndex() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { walletAddresses = [] } = route.params;

  return (
    <CyDView className={'flex-1 h-full bg-n20 w-full'}>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <ChooseWalletIndexComponent walletAddresses={walletAddresses} />
    </CyDView>
  );
}
