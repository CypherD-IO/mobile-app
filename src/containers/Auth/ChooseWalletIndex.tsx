import * as React from 'react';
import {
  CyDFlatList,
  CyDImage,
  CyDImageBackground,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import { Dispatch, SetStateAction, useContext, useState } from 'react';
import Button from '../../components/v2/button';
import { HdWalletContext } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { ButtonType } from '../../constants/enum';
import ChooseWalletIndexComponent from '../../components/ChooseWalletIndexComponent';

export function ChooseWalletIndex({ route, navigation }) {
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
  suggestionList: {
    backgroundColor: '#EBEDF0',
    paddingVertical: 12,
    height: 56,
  },
});
