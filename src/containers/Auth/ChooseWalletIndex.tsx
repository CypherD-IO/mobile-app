import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import ChooseWalletIndexComponent from '../../components/ChooseWalletIndexComponent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CyDView } from '../../styles/tailwindStyles';

interface RouteParams {
  walletAddresses: string[];
}
export function ChooseWalletIndex() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { walletAddresses = [] } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <CyDView
      className={'flex-1 h-full bg-n20 w-full'}
      style={{ paddingTop: insets.top }}>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <ChooseWalletIndexComponent walletAddresses={walletAddresses} />
    </CyDView>
  );
}
