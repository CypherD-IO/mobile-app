import React, { useContext, useEffect, useState } from 'react';
import { CyDImageBackground, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import CardScreen from './card';
import TransactionsScreen from './transactions';
import SpendingSumary from './spendingSummary';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Button from '../../../components/v2/button';
import { useTranslation } from 'react-i18next';
import { Dimensions } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import { GlobalContext } from '../../../core/globalContext';
import Sheet from '../../../components/v2/BottomSheet';
import { screenTitle } from '../../../constants';
import { useIsFocused } from '@react-navigation/native';
import { CardProfile } from '../../../models/cardProfile.model';
import * as Sentry from '@sentry/react-native';
import { CARD_REFRESH_TIMEOUT } from '../../../constants/timeOuts';
import useAxios from '../../../core/HttpRequest';
import { get, has } from 'lodash';
import SwitchView from '../../../components/v2/switchView';
import Loading from '../../../components/v2/loading';
import { CardProviders } from '../../../constants/enum';

export default function BridgeCardScreen (props: {navigation: {navigate: any, setOptions: any}, route: {params: {hasBothProviders: boolean, cardProvider: CardProviders}}}) {
  const isFocused = useIsFocused();
  // const [index, setIndex] = React.useState(0);
  // const [routes] = React.useState([
  //   { key: 'transactions', title: 'Transactions' },
  //   { key: 'summary', title: 'Spending Summary' }
  // ]);

  const { t } = useTranslation();
  const [cardBalance, setCardBalance] = useState(' ');
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { height } = Dimensions.get('screen');
  const [sheetHeight, setSheetHeight] = useState(height * 0.42);
  const [shouldRefreshTransactions, setShouldRefreshTransactions] = useState(false);
  const [showTransactionsFilter, setShowTransactionsFilter] = useState(false);
  const [currentCardIndex] = useState<number>(0);
  const { navigation, route } = props;
  const { hasBothProviders, cardProvider } = route.params;
  const [currentCardProvider, setCurrentCardProvider] = useState<string>(cardProvider);
  const [timer, setTimer] = useState<NodeJS.Timer>();
  const { getWithAuth } = useAxios();

  useEffect(() => {
    if (isFocused) {
      navigation.setOptions({
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
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && cardProfile && !currentCardProvider) {
      let tempCurrentCardProvider = '';
      if (has(cardProfile, CardProviders.BRIDGE_CARD)) {
        tempCurrentCardProvider = CardProviders.BRIDGE_CARD;
      } else if (has(cardProfile, CardProviders.PAYCADDY)) {
        tempCurrentCardProvider = CardProviders.PAYCADDY;
      }
      setCurrentCardProvider(tempCurrentCardProvider);
    }
  }, [isFocused]);

  useEffect(() => {
    void fetchCardBalance();
    setShouldRefreshTransactions(!shouldRefreshTransactions);
    if (timer) {
      clearInterval(timer);
    }
    setTimer(setInterval(() => { void fetchCardBalance(); }, CARD_REFRESH_TIMEOUT));
    return () => {
      clearInterval(timer);
    };
  }, [currentCardProvider]);

  const fetchCardBalance = async () => {
    setCardBalance('');
    const currentCard = get(cardProfile, currentCardProvider).cards[currentCardIndex];
    const url = `/v1/cards/${currentCardProvider}/card/${String(currentCard?.cardId)}/balance`;
    try {
      const response = await getWithAuth(url);
      if (!response.isError && response?.data && response.data.balance) {
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

  const onPressFundCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, { navigation, currentCardProvider, currentCardIndex });
  };

  const FundCard = () => {
    return (
      <CyDView className={'flex flex-row justify-between px-[2%] py-[1.2%] bg-white border-[1px] mb-[0px] mx-[20px] rounded-[10px] border-sepratorColor'}>
        <CyDView>
          <CyDText className={'font-bold text-[12px]'}>
            {t<string>('TOTAL_BALANCE')}
          </CyDText>
          <CyDText className={'font-bold text-[20px]'}>
            {(cardBalance !== 'NA' ? '$ ' : '') + cardBalance}
          </CyDText>
        </CyDView>
        <Button image={AppImages.LOAD_CARD_LOTTIE} isLottie={true} onPress={() => { onPressFundCard(); }} style={'pr-[7%] pl-[5%] py-[2%] items-center align-center'} title={t('LOAD_CARD_CAPS')} titleStyle={'text-[14px]'}></Button>
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

  const onSwitchProviders = (index: number) => {
    if (index) {
      setCurrentCardProvider(CardProviders.PAYCADDY);
    } else setCurrentCardProvider(CardProviders.BRIDGE_CARD);
  };

  return (
    currentCardProvider === ''
      ? <Loading/>
      : <CyDView>
      <CyDSafeAreaView className='flex h-full bg-white'>
        <CyDImageBackground className='flex h-full' source={AppImages.DEBIT_CARD_BACKGROUND}>
          {hasBothProviders && <CyDView className='flex items-center mt-[-10px] mb-[10px]'>
            <SwitchView titles={['Card1', 'Card2']} index={currentCardProvider === CardProviders.BRIDGE_CARD ? 0 : 1} setIndexChange={(index: number) => {
              onSwitchProviders(index);
            }}></SwitchView>
          </CyDView>}
          <CyDView>
            <CardScreen navigation={navigation} hideCardDetails={isFocused} currentCardProvider={currentCardProvider} setCurrentCardProvider={setCurrentCardProvider}/>
            <FundCard/>
          </CyDView>
          <CyDView className='flex flex-1'>
            <Transactions {...{ height, navigation, shouldRefreshTransactions, showTransactionsFilter, currentCardProvider, currentCardIndex, hasBothProviders }}/>
          </CyDView>
        </CyDImageBackground>
      </CyDSafeAreaView>
    </CyDView>
  );
}

export function Transactions (props: any) {
  const { height, navigation, shouldRefreshTransactions, showTransactionsFilter, currentCardProvider, currentCardIndex, hasBothProviders } = props;
  const minHeight = height * (hasBothProviders ? 0.42 : 0.47);
  const maxHeight = height * (hasBothProviders ? 0.7 : 0.75);
  const [sheetHeight, setSheetHeight] = useState(minHeight);
  return (
    <>
      <Sheet minHeight={minHeight} expandedHeight={maxHeight} heightChanged={(val: string) => { if (val === 'minimised') { setSheetHeight(minHeight); } else { setSheetHeight(maxHeight); } }}>
        {/* <CyDView className={'h-full bg-white px-[10px] pt-[20px] mt-[5px] rounded-t-[50]'}>
          <TabView
            renderTabBar={renderTabBar}
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
          />
        </CyDView> */}
        <TransactionsScreen listHeight = {sheetHeight} navigation={navigation} shouldRefreshTransactions={shouldRefreshTransactions} showTransactionsFilter={showTransactionsFilter} currentCardProvider={currentCardProvider} currentCardIndex={currentCardIndex}/>
      </Sheet>
      </>
  );
}

// const styles = StyleSheet.create({
//   tabBarStyle: {
//     backgroundColor: Colors.transparent,
//     textAlign: 'left',
//     width: '100%'
//   },
//   indicatorStyle: { backgroundColor: Colors.appColor }
// });
