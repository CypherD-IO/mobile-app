/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FlatList, Animated, View, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { showToast } from '../../containers/utilities/toastUtility';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import EmptyView from '../../components/EmptyView';
import { HdWalletContext, getExplorerUrl } from '../../core/util';
import { ifIphoneX } from 'react-native-iphone-x-helper';
const {
  CText,
  SafeAreaView,
  DynamicView
} = require('../../styles');

const { event, ValueXY } = Animated;
const scrollY = new ValueXY();

interface TransactionDetailProps {
  route: any
  navigation: any
}

export default function TokenApprovalsDetailsScreen ({ route, navigation }: TransactionDetailProps) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const [valueChange, setValueChange] = useState(false);
  const [index, setIndex] = useState(0);
  const { tokenData } = route.params;
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });
  const hdWallet = useContext<any>(HdWalletContext);
  const [transactionList, setTransactionList] = useState<any[]>([]);
  const [noTransaction, setNoTransaction] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  const Item = ({ item }) => {
    const contract_id = item.id;
    let name = 'Unknown Protocol';
    let spender_logo = null;
    const exposure_usd = item.exposure_usd;
    const token_approved = item.value;

    let allowance = 'Unlimited';

    if (item.exposure_balance < item.balance) { allowance = item.exposure_balance; }

    if (item.protocol != null) {
      name = item.protocol.name;
      if (item.protocol.logo_url !== undefined || item.protocol.logo_url !== null) { spender_logo = item.protocol.logo_url; }
    }

    return (
      <>
     <DynamicView dynamic fD={'row'} pV={8}>
        <DynamicView dynamic dynamicHeightFix height={54} fD={'row'} bR={20}>
          <DynamicView dynamic dynamicHeightFix dynamicWidthFix width={140} height={54} aLIT='flex-start' fD={'column'} jC='center' pH={8}>
            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={13} color={Colors.primaryTextColor}>{contract_id.substring(0, 5) + '...' + contract_id.substring(contract_id.length - 4, contract_id.length)}</CText>
            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} tA={'left'} color={Colors.subTextColor}>{name}</CText>
          </DynamicView>
        </DynamicView>
        <DynamicView dynamic dynamicHeightFix height={54} fD={'row'} jC='center'>
          <DynamicView dynamic dynamicHeightFix dynamicWidthFix width={150} height={54} aLIT='flex-end' fD={'column'} jC='center' pH={8}>
            <CText dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={13} color={Colors.primaryTextColor}>{allowance} Allowance</CText>
            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} color={Colors.subTextColor}>At Risk: {currencyFormatter.format(exposure_usd)}</CText>
          </DynamicView>
        </DynamicView>
      </DynamicView>
        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={100} bGC={Colors.portfolioBorderColor} />
      </>
    );
  };

  const renderItem = ({ item }) => (
    <Item item={item} />
  );

  const onRefresh = () => {
    setIsRefreshing(true);

    // call API Method and fetch New Data
    // after fetch data call ----- setIsRefreshing(false)

    // For now i am handling statically by below code
    // Remove below code after implementing above things

    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const emptyView = () => {
    return (
      <DynamicView dynamic dynamicWidth dynamicHeight height={70} width={100} mT={0} bGC={Colors.whiteColor} aLIT={'center'}>
        <EmptyView
          text={t('NO_CURRENT_APPROVALS')}
          image={AppImages.EMPTY}
          buyVisible={false}
          marginTop={0}
        />
      </DynamicView>
    );
  };

  const loadView = () => {
    return (
      <DynamicView dynamic dynamicWidth dynamicHeight height={80} width={100} mT={0} bGC={Colors.whiteColor} aLIT={'center'}>
        <EmptyView
          text={'Loading..'}
          image={AppImages.LOADING_IMAGE}
          buyVisible={false}
          marginTop={50}
          isLottie={true}
        />
      </DynamicView>
    );
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' pH={20}>
        <DynamicView dynamic dynamicWidth dynamicHeight height={20} width={100}
          aLIT='flex-start' bR={8} fD={'row'}>
          <DynamicView dynamic mT={20} aLIT='flex-start'>
            <CText dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={20} color={Colors.primaryTextColor}>{tokenData.symbol} Approved</CText>
            <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={15} color={Colors.primaryTextColor}>Value at Risk</CText>
          </DynamicView>
          <DynamicView dynamic mT={20} aLIT='flex-end'>
            <CText dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={20} color={Colors.primaryTextColor}>{new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 }).format(tokenData.exposure_balance)}</CText>
            <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={15} color={Colors.primaryTextColor}>≈ {currencyFormatter.format(tokenData.sum_exposure_usd)} </CText>
          </DynamicView>
        </DynamicView>
        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={100} bGC={Colors.portfolioBorderColor} />
        <DynamicView dynamic dynamicWidth width={100} aLIT={'flex-start'} jC={'center'} pH={0}>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={20} color={Colors.primaryTextColor}>Spenders</CText>
        </DynamicView>
        <FlatList
          nestedScrollEnabled
          data={tokenData.spenders}
          renderItem={renderItem}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          style={{ width: '100%', backgroundColor: Colors.whiteColor }}
          keyExtractor={item => item.id}
          ListEmptyComponent={emptyView('empty')}
          showsVerticalScrollIndicator={false}
        />
      </DynamicView>
    </SafeAreaView>
  );
}
