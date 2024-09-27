import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import ChooseWalletIndexComponent from '../../components/ChooseWalletIndexComponent';

interface RouteParams {
  walletAddresses: string[];
}
export function ChooseWalletIndex() {
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { walletAddresses = [] } = route.params;

  return (
    <>
      <SafeAreaView style={styles.topSafeArea} />
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <SafeAreaView className={'flex-1 h-full bg-cardBg w-full'}>
        <ChooseWalletIndexComponent walletAddresses={walletAddresses} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  topSafeArea: {
    flex: 0,
    backgroundColor: '#EBEDF0',
  },
});
