/**
 * @format
 * @flow
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import { FlatList } from 'react-native-gesture-handler';
import EmptyView from '../../components/EmptyView';
import { BackHandler } from 'react-native';
const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
  DynamicTouchView
} = require('../../styles');

export default function BrowserTraHis (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎
  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const renderItem = (item) => {
    return (
             <DynamicTouchView sentry-label='browser-txn-history-item' dynamic fD={'row'} pV={5} onPress={() => {
               props.navigation.navigate(C.screenTitle.TRANS_DETAIL);
             }}>
                 <DynamicView dynamic fD={'row'}>
                     <DynamicImage dynamic source={item.item.image} width={25} height={25} mT={-20} />
                     <DynamicView dynamic mH={20} aLIT={'flex-start'}>
                         <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} color={Colors.primaryTextColor}>{item.item.title}</CText>
                         <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={14} mT={3} color={Colors.darkPink}>Pending</CText>
                         <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} mT={3} color={Colors.subTextColor}>Oct 23 8AM PST</CText>
                     </DynamicView>
                 </DynamicView>
                 <DynamicView dynamic aLIT={'flex-end'}>
                     <CText dynamic fF={C.fontsName.FONT_BLACK} fS={14} mT={3} color={Colors.primaryTextColor}>$0.2</CText>
                     <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={13} mT={3} color={Colors.primaryTextColor}>0.001 MATIC</CText>
                 </DynamicView>
             </DynamicTouchView>
    );
  };

  const DATA = [
    {
      id: '0',
      title: 'polyroll.org',
      subTitle: 'ETH',
      image: AppImages.ETHERUM
    },
    {
      id: '1',
      title: 'app.aave.com',
      subTitle: 'MATIC',
      image: AppImages.POLYGON
    },
    {
      id: '2',
      title: 'Binance ',
      subTitle: 'BSC',
      image: AppImages.BIANCE
    }
  ];

  const emptyView = () => {
    return (
             <EmptyView
                 text={t('EMPTY_TRANSCATION_DETAIL_MSG')}
                 image={AppImages.EMPTY}
                 buyVisible={false}
                 marginTop={50}
             />
    );
  };

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
         <SafeAreaView dynamic>
             <DynamicView dynamic dynamicHeight height={100} fD={'row'} mH={15}>
                 <FlatList
                     data={DATA}
                     renderItem={renderItem}
                     style={{ height: '100%', marginTop: 20 }}
                     ListEmptyComponent={emptyView}
                     showsVerticalScrollIndicator={false}
                 />
             </DynamicView>
         </SafeAreaView>
  );
}
