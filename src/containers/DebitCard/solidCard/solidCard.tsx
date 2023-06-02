import React, { useContext, useEffect, useState } from 'react';
import { CyDImageBackground, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import CardScreen from './card';
import TransactionsScreen from './transactions';
import SpendingSumary from './spendingSummary';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Button from '../../../components/v2/button';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/theme';
import clsx from 'clsx';
import { Dimensions, StyleSheet } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import axios from '../../../core/Http';
import { GlobalContext } from '../../../core/globalContext';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import Sheet from '../../../components/v2/BottomSheet';
import { screenTitle } from '../../../constants';
import { useIsFocused } from '@react-navigation/native';
import { CardProfile } from '../../../models/cardProfile.model';
import * as Sentry from '@sentry/react-native';
import { CARD_REFRESH_TIMEOUT } from '../../../constants/timeOuts';
import { hostWorker } from '../../../global';

export default function solidCardScreen (props) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const isFocused = useIsFocused();
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'transactions', title: 'Transactions' },
    { key: 'summary', title: 'Spending Summary' }
  ]);

  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const [cardBalance, setCardBalance] = useState(' ');
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { height, width } = Dimensions.get('screen');
  const [sheetHeight, setSheetHeight] = useState((height - 530) * 0.9);
  const [shouldRefreshTransactions, setShouldRefreshTransactions] = useState(false);
  const [showTransactionsFilter, setShowTransactionsFilter] = useState(false);
  let latestBalance: any;
  const { navigation } = props;

  useEffect(() => {
    if (isFocused) {
      props.navigation.setOptions({
        title: 'Cypher Card',
        headerRight: () => {
          return cardProfile?.apto
            ? (
                <CyDTouchView onPress={() => { navigation.navigate(screenTitle.APTO_CARD_SCREEN); }}>
                  <CyDText className={' underline text-blue-500  text-[12px] font-extrabold'}>
                    {t<string>('GO_TO_DEPRECATED_CARD') + ' ->'}
                  </CyDText>
                </CyDTouchView>
              )
            : null;
        }
      });
      void fetchCardBalance();
      latestBalance = setInterval(() => { void fetchCardBalance(); }, CARD_REFRESH_TIMEOUT);
      return () => {
        clearInterval(latestBalance);
      };
    }
  }, [isFocused]);

  const fetchCardBalance = async () => {
    const url = `${ARCH_HOST}/v1/cards/balance`;
    const headers = {
      headers: {
        Authorization: `Bearer ${String(globalContext.globalState.token)}`
      }
    };
    try {
      const response = await axios.get(url, headers);
      if (response?.data && response.data.balance) {
        if (cardBalance && cardBalance !== String(response.data.balance)) {
          if (cardBalance !== ' ') {
            setShouldRefreshTransactions(!shouldRefreshTransactions);
          }
          setCardBalance(String(response.data.balance));
        }
      } else {
        setCardBalance('NA');
      }
    } catch (error) {
      Sentry.captureException(error);
      setCardBalance('NA');
    };
  };

  const FundCard = () => {
    return (
      <CyDView className={'flex flex-row justify-between px-[2%] py-[1.2%] bg-white border-[1px] mb-[15px] mx-[20px] rounded-[10px] border-sepratorColor'}>
        <CyDView>
          <CyDText className={'font-bold text-[12px]'}>
            {t<string>('TOTAL_BALANCE')}
          </CyDText>
          <CyDText className={'font-bold text-[20px]'}>
            {(cardBalance !== 'NA' ? '$ ' : '') + cardBalance}
          </CyDText>
        </CyDView>
        <Button image={AppImages.LOAD_CARD_LOTTIE} isLottie={true} onPress={() => { navigation.navigate(screenTitle.SOLID_FUND_CARD_SCREEN, { navigation }); }} style={'pr-[7%] pl-[5%] py-[2%] items-center align-center'} title={t('LOAD_CARD_CAPS')} titleStyle={'text-[14px]'}></Button>
      </CyDView>
    );
  };

  // const renderScene = ({ route, jumpTo }) => {
  //   switch (route.key) {
  //     case 'transactions':
  //       return <TransactionsScreen listHeight = {sheetHeight}/>;
  //     case 'summary':
  //       return <SpendingSumary/>;
  //   }
  // };

  // const renderTabBar = (props) => (
  //   <TabBar
  //     {...props}
  //     indicatorStyle={styles.indicatorStyle}
  //     style={styles.tabBarStyle}
  //     pressColor={Colors.transparent}
  //     renderLabel={({ route, focused, color }) => (
  //       <CyDText className={clsx('text-[16px] p-[0px] m-[0px]', { 'font-bold w-[110%]': focused })}>
  //         {route.title}
  //       </CyDText>
  //     )}
  //   />
  // );

  return (
    <CyDView>
      <CyDSafeAreaView className='flex h-full bg-white'>

        <CyDImageBackground className='flex h-full' source={AppImages.DEBIT_CARD_BACKGROUND}>
          <CyDView className='h-[290px] top-[-3]'>
            <CardScreen navigation={navigation} hideCardDetails={isFocused}/>
            <FundCard/>
          </CyDView>
          <CyDView className='h-full'>
          <Sheet minHeight={height * 0.79} expandedHeight={height * 1.09} heightChanged={(val) => { if (val === 'minimised') { setSheetHeight((height - 530) * 0.9); setShowTransactionsFilter(false); } else { setSheetHeight((height - 350) * 1.09); setShowTransactionsFilter(true); } }}>
          {/* <CyDView className={'h-full bg-white px-[10px] pt-[20px] mt-[5px] rounded-t-[50]'}>
            <TabView
              renderTabBar={renderTabBar}
              navigationState={{ index, routes }}
              renderScene={renderScene}
              onIndexChange={setIndex}
            />
          </CyDView> */}
          <TransactionsScreen listHeight = {sheetHeight} navigation={navigation} shouldRefreshTransactions={shouldRefreshTransactions} showTransactionsFilter={showTransactionsFilter}/>
          </Sheet>
          </CyDView>
        </CyDImageBackground>
      </CyDSafeAreaView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  tabBarStyle: {
    backgroundColor: Colors.transparent,
    textAlign: 'left',
    width: '100%'
  },
  indicatorStyle: { backgroundColor: Colors.appColor }
});
