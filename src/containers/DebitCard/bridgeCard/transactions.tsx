import { useIsFocused } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import clsx from 'clsx';
import { get } from 'lodash';
import moment from 'moment';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet } from 'react-native';
import DynamicallySelectedPicker from 'react-native-dynamically-selected-picker';
import { ScrollView } from 'react-native-gesture-handler';
import { TabBar } from 'react-native-tab-view';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import Loading from '../../../components/v2/loading';
import CyDModalLayout from '../../../components/v2/modal';
import { screenTitle } from '../../../constants';
import { months } from '../../../constants/data';
import { TransactionFilterTypes, TransactionTypes } from '../../../constants/enum';
import { Colors } from '../../../constants/theme';
import { GlobalContext } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { hostWorker } from '../../../global';
import { CardProfile } from '../../../models/cardProfile.model';
import { CyDView, CyDTouchView, CyDText, CyDFastImage, CyDImage, CyDFlatList } from '../../../styles/tailwindStyles';
import SpendingSumary from './spendingSummary';

interface Transaction {
  id: string
  type: string
  title: string
  date: Date
  amount: number
  iconUrl: string
}

export default function TransactionsScreen (props: { navigation: any, currentCardProvider: string, currentCardIndex: number }) {
  const isFocused = useIsFocused();
  const [transactions, setTransactions] = useState({
    startDate: '',
    endDate: '',
    originalTransactions: [],
    filteredTransactions: []
  });
  const [transactionYears, setTransactionYears] = useState([]);
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [transactionFilterByTypeModal, setTransactionFilterByTypeModal] = useState<boolean>(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState(TransactionFilterTypes.ALL);
  const [transactionFilterByDateModal, setTransactionFilterByDateModal] = useState<boolean>(false);
  const [date, setDate] = useState({ year: {}, yearIndex: 0, month: {}, monthIndex: new Date().getMonth() });
  const [loading, setLoading] = useState<boolean>(false);
  const { height, width } = Dimensions.get('window');
  const [routes] = React.useState([
    { key: 'transactions', title: 'Transactions' },
    { key: 'summary', title: 'Spending Summary' }
  ]);
  const { navigation, currentCardProvider, currentCardIndex } = props;
  const { getWithAuth } = useAxios();

  useEffect(() => {
    if (isFocused) {
      void getTransactions();
    }
  }, [isFocused]);

  useEffect(() => {
    const { year, month, monthIndex } = date;
    if (year.value && month.value) {
      void getTransactions(String(Number(monthIndex) + 1), year.value);
    } else {
      void getTransactions();
    }
  }, [props.shouldRefreshTransactions]);

  const getTransactions = async (month: string = '', year: string = '') => {
    const currentCard = get(cardProfile, currentCardProvider).cards[currentCardIndex];
    const transactionsURL = `/v1/cards/${currentCardProvider}/card/${currentCard?.cardId}/transactions`;
    // if (month !== '' && year !== '') {
    //   transactionsURL += '?month=' + month + '&year=' + year;
    // }
    try {
      setLoading(true);
      const response = await getWithAuth(transactionsURL);
      if (!response.isError && response?.data && response.data.transactions) {
        let startDate;
        let endDate;
        const tempTransactions = response.data.transactions;
        tempTransactions.sort((transactionA, transactionB) => transactionA.date < transactionB.date ? 1 : -1);
        if (tempTransactions?.length) {
          startDate = tempTransactions[0].date;
          endDate = tempTransactions[tempTransactions.length - 1].date;
        }
        setTransactions({ startDate, endDate, originalTransactions: tempTransactions, filteredTransactions: tempTransactions });
        // if (month === '' && year === '') {
        //   const startYear = Number(startDate.split('-')[0]);
        //   const endYear = Number(endDate.split('-')[0]);
        //   const years = [];
        //   for (let i = startYear; i < endYear; i++) {
        //     years.push({
        //       value: String(i),
        //       label: String(i)
        //     });
        //   }
        //   if (!years.length) {
        //     years.push({
        //       value: String(startYear),
        //       label: String(startYear)
        //     });
        //     setDate({ ...date, year: years[0], month: {} });
        //   }
        //   setTransactionYears(years);
        // }
        setSelectedTransactionType(TransactionFilterTypes.ALL);
        setLoading(false);
      }
    } catch (error) {
      Sentry.captureException(error);
      setLoading(false);
      showModal('state', { type: 'error', title: '', description: t('UNABLE_TO_FETCH_TRANSACTIONS'), onSuccess: hideModal, onFailure: hideModal });
    };
  };

  const getTransactionIndicator = (type: string) => {
    switch (type.toUpperCase()) {
      case TransactionFilterTypes.CREDIT:
        return AppImages.ICON_DOWN;
      case TransactionFilterTypes.DEBIT:
        return AppImages.ICON_UP;
      default:
        return AppImages.MOVE_FUNDS;
    }
  };

  const formatDate = (date: string) => {
    return moment.utc(date).local().format('MMM DD YYYY, h:mm a');
  };

  const getTransactionSign = (type: string) => {
    switch (type.toUpperCase()) {
      case TransactionFilterTypes.CREDIT:
        return '+';
      case TransactionFilterTypes.DEBIT:
        return '';
      default:
        return '..';
    }
  };

  const TransactionFilter = () => {
    return (
      <CyDView className={'flex flex-row justify-between items-center pl-[10px] pr-[5px] mb-[10px] mt-[10px]'}>
        <CyDView className={'flex flex-row justify-start items-center'}>
          <CyDTouchView onPress={() => { setTransactionFilterByTypeModal(true); }}>
            <CyDText className={'font-bold text-[16px]'}>{t<string>(selectedTransactionType)}</CyDText>
          </CyDTouchView>
          <CyDFastImage source={AppImages.DOWN} className={'h-[10px] w-[10px] ml-[10px]'} resizeMode={'contain'}/>
        </CyDView>
        {/* <CyDView className={'flex flex-row justify-start items-center border-[0.2px] rounded-[20px] px-[10px] py-[10px] bg-selectedOption'}>
          <CyDTouchView onPress={() => { setTransactionFilterByDateModal(true); }}>
            {!date.month.value && <CyDText className={'text-[16px]'}>{t<string>('MONTH')}</CyDText>}
            {date.year.value && date.month.value && <CyDText className={'text-[16px]'}>{date.month.value} - {date.year.value}</CyDText>}
          </CyDTouchView>
          {!date.month.value && <CyDTouchView onPress={() => { setTransactionFilterByDateModal(true); }}>
            <CyDFastImage source={AppImages.DOWN} className={'h-[10px] w-[10px] ml-[10px]'} resizeMode={'contain'}/>
          </CyDTouchView>}
          {date.year.value && date.month.value && <CyDTouchView onPress={() => { void getTransactions(); }}>
            <CyDImage source={AppImages.CLOSE} className={'h-[10px] w-[10px] ml-[10px]'} resizeMode={'contain'}/>
          </CyDTouchView>}
        </CyDView> */}
      </CyDView>
    );
  };

  const TransactionItem = ({ item }: {item: Transaction}) => {
    const transaction: Transaction = item;
    const { iconUrl, type, date, title, amount } = transaction;
    return (
      <CyDTouchView disabled={true || transaction.type === TransactionTypes.CREDIT} key={item.id} className = {'flex flex-row justify-between aling-center mt-[20px] mx-[10px] pb-[20px] border-b-[1px] border-sepratorColor'} onPress={() => { navigation.navigate(screenTitle.BRIDGE_CARD_TRANSACTION_DETAILS_SCREEN, { transaction: item }); }}>
        <CyDView className = {'flex flex-row justify-start align-center items-center w-[65%]'}>
          <CyDFastImage source={iconUrl && iconUrl !== '' ? { uri: iconUrl } : getTransactionIndicator(type)} className={'h-[30px] w-[30px]'} resizeMode={'contain'}></CyDFastImage>
          <CyDView className={'ml-[10px]'}>
            <CyDText className={clsx('font-bold flex-wrap', { 'text-redCyD': type === 'failed' })}>{title}</CyDText>
            <CyDText>{formatDate(String(date))}</CyDText>
          </CyDView>
        </CyDView>
        <CyDView className='flex flex-row self-center items-center'>
          <CyDText className={clsx('font-bold text-[16px] mr-[5px]', { 'text-redCyD': type === TransactionTypes.DEBIT, 'text-successTextGreen': type === TransactionTypes.CREDIT })}>{getTransactionSign(type)}{amount} {t<string>('USD')}</CyDText>
          {/* {transaction.type === TransactionTypes.DEBIT && <CyDFastImage source={AppImages.RIGHT_ARROW} className='h-[15px] w-[15px]'></CyDFastImage>} */}
        </CyDView>
    </CyDTouchView>
    );
  };

  const TransactionTypeSelected = (type: TransactionFilterTypes) => {
    setSelectedTransactionType(type);
    setTransactionFilterByTypeModal(false);
    switch (type) {
      case TransactionFilterTypes.ALL:
        setTransactions({ ...transactions, filteredTransactions: transactions.originalTransactions });
        break;
      case TransactionFilterTypes.CREDIT:
        setTransactions({ ...transactions, filteredTransactions: transactions.originalTransactions.filter(transaction => transaction.type === TransactionTypes.CREDIT) });
        break;
      case TransactionFilterTypes.DEBIT:
        setTransactions({ ...transactions, filteredTransactions: transactions.originalTransactions.filter(transaction => transaction.type === TransactionTypes.DEBIT) });
        break;
    }
  };

  const TransactionTypeItem = ({ item }) => {
    return (
      <CyDTouchView onPress={() => { TransactionTypeSelected(TransactionFilterTypes[item]); }} className={clsx('mx-[20px] py-[20px] border-b-[0.5px] border-sepratorColor align-center', { 'bg-selectedOption border-b-[0px] rounded-[5px]': selectedTransactionType === TransactionFilterTypes[item] })}>
        <CyDText className={'text-center font-nunito text-[16px]  '}>
          {t<string>(TransactionFilterTypes[item])}
        </CyDText>
      </CyDTouchView>
    );
  };

  const TransactionsFilterByTypeModal = () => {
    return (
      <CyDModalLayout
        setModalVisible={ () => { setTransactionFilterByTypeModal(false); }}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        animationInTiming = {300}
        animationOutTiming = {300}
        isModalVisible={transactionFilterByTypeModal}
        style={styles.modalContainer}
      >
        <CyDView className={'bg-white pb-[30px] w-[100%] rounded-[20px]'}>
          <CyDTouchView className={'flex flex-row justify-end z-10'}
            onPress={() => { setTransactionFilterByTypeModal(false); }}
          >
            <CyDImage
              source={ AppImages.CLOSE }
              className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView>
            <CyDText className='text-center font-nunito text-[20px] font-extrabold  '>
              {t<string>('TRANSACTION_TYPE')}
            </CyDText>
          </CyDView>
          <CyDView className={'mt-[10px]'}>
          <CyDFlatList
            data={Object.keys(TransactionFilterTypes)}
            renderItem={(item) => TransactionTypeItem(item)}
            showsVerticalScrollIndicator={true}
          />
          </CyDView>
        </CyDView>
      </CyDModalLayout>
    );
  };

  const onDateChange = (date) => {
    const { year, yearIndex, month, monthIndex } = date;
    if (!Object.keys(month).length) {
      setDate({ year, yearIndex, month: months[0], monthIndex });
    } else {
      setDate({ year, yearIndex, month, monthIndex });
    }
    setTransactionFilterByDateModal(false);
    void getTransactions(String(Number(monthIndex) + 1), year.value);
  };

  const TransactionsFilterByDateModal = () => {
    let { year, yearIndex, month, monthIndex } = date;

    return (
      <CyDModalLayout
        setModalVisible={ () => { onDateChange({ year, yearIndex, month, monthIndex }); }}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        animationInTiming = {300}
        animationOutTiming = {300}
        isModalVisible={transactionFilterByDateModal}
        style={styles.modalContainer}
      >
        <CyDView className={'bg-white pb-[30px] w-[100%] rounded-[20px]'}>
          <CyDTouchView className={'flex flex-row justify-end z-10 px-[10px]'}
            onPress={() => { onDateChange({ year, yearIndex, month, monthIndex }); }}
          >
            <CyDImage
              source={ AppImages.CLOSE }
              className={'w-[20px] h-[20px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView>
            <CyDText className='text-center font-nunito text-[20px] font-extrabold  '>
              {t<string>('FILTER_BY_DATE')}
            </CyDText>
          </CyDView>
        <CyDView className={'flex flex-row justify-between items-center'}>
          <DynamicallySelectedPicker
            items={transactionYears}
            onScroll={({ index, item }) => {
              yearIndex = index;
              year = item;
            }}
            height={200}
            width={150}
            transparentItemRows={2}
            fontSize={18}
            initialSelectedIndex={date.yearIndex}
            selectedItemBorderColor={Colors.appColor}
            selectedItemColor={Colors.appColor}
            fontFamily={'Nunito-black'}
          />
          <DynamicallySelectedPicker
            items={months}
            onScroll={({ index, item }) => {
              monthIndex = index;
              month = item;
            }}
            height={500}
            width={200}
            transparentItemRows={5}
            fontSize={18}
            initialSelectedIndex={date.monthIndex}
            selectedItemBorderColor={Colors.appColor}
            selectedItemColor={Colors.appColor}
            fontFamily={'Nunito-black'}
          />
        </CyDView>

        </CyDView>
      </CyDModalLayout>
    );
  };

  // const renderScene = ({ route, jumpTo }) => {
  //   switch (route.key) {
  //     case 'transactions':
  //       return <Transactions/>;
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

  const Transactions = () => {
    return (
      <CyDView>
      {!loading && <CyDView>
          <TransactionsFilterByTypeModal/>
          <TransactionsFilterByDateModal/>
          <CyDView className='flex flex-row justify-center items-center rounded-[30px] p-[5px] bg-ternaryBackgroundColor'>
            <CyDText className='font-bold'>{t('NOTE')}</CyDText>
            <CyDText className='text-center'>{' ' + t('CARD_TRANSACTIONS_DELAY')}</CyDText>
          </CyDView>
          {transactions.filteredTransactions.length
            ? <ScrollView style={{ height: props.listHeight }}>
            {transactions.filteredTransactions.map((item, index) => {
              return (
                <TransactionItem item={item} key={index}/>
              );
            })}
          </ScrollView>
            : <CyDView className={'flex justify-center items-center'}>
                <CyDImage source={AppImages.NO_TRANSACTIONS_YET} className={'mt-[15%] h-[150px] w-[150px]'}></CyDImage>
            </CyDView>}
      </CyDView>}
      {loading && <CyDView className='h-[70%]'><Loading/></CyDView>}
    </CyDView>
    );
  };

  return (

    <CyDView className={'h-full bg-white px-[10px] mt-[3px] rounded-t-[50]'}>
      <TransactionFilter/>
      {/* <TabView
        renderTabBar={renderTabBar}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
      /> */}
      <Transactions/>
    </CyDView>

  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center'
  }
  // tabBarStyle: {
  //   backgroundColor: Colors.transparent,
  //   textAlign: 'left',
  //   width: '100%'
  // },
  // indicatorStyle: { backgroundColor: Colors.appColor }
});
