import React, { useContext, useEffect, useRef, useState } from 'react';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import {
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
  ReapTxnStatus,
} from '../../../constants/enum';
import { get } from 'lodash';
import { ICardTransaction } from '../../../models/card.model';
import moment from 'moment';
import useAxios from '../../../core/HttpRequest';
import {
  DateRange,
  initialCardTxnDateRange,
  STATUSES,
  TYPES,
} from '../../../constants/cardPageV2';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import {
  CyDFastImage,
  CyDFlatList,
  CyDImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import CardTransactionItem from '../../../components/v2/CardTransactionItem';
import { RefreshControl, StyleSheet, ViewToken } from 'react-native';
import clsx from 'clsx';
import { isIOS } from '../../../misc/checkers';
import InfiniteScrollFooterLoader from '../../../components/v2/InfiniteScrollFooterLoader';
import AppImages from '../../../../assets/images/appImages';
import CardTxnFilterModal from '../CardV2/CardTxnFilterModal';
import { parseMonthYear } from '../../../core/util';
import CyDModalLayout from '../../../components/v2/modal';
import Button from '../../../components/v2/button';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

interface RouteParams {
  cardProvider: CardProviders;
  currentCardIndex: number;
}

export default function CardTransactions() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { cardProvider } = route.params;
  const { getWithAuth, postWithAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [transactions, setTransactions] = useState<ICardTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    ICardTransaction[]
  >([]);
  const [filter, setFilter] = useState<{
    types: CardTransactionTypes[];
    dateRange: DateRange;
    statuses: CardTransactionStatuses[];
  }>({
    types: TYPES,
    dateRange: initialCardTxnDateRange,
    statuses: STATUSES,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();
  const txnRetrievalOffset = useRef<string | undefined>();
  const lastDate = useRef<string>('');
  const [viewableTransactionsDate, setViewableTransactionsDate] =
    useState<string>('');
  const lastViewableTransactionDate = useRef<string>('');
  const [exportOptionOpen, setExportOptionOpen] = useState(false);
  const [isEndReached, setIsEndReached] = useState(false);

  useEffect(() => {
    void fetchTransactions(true);
  }, []);

  const spliceTransactions = (txnsToSplice: ICardTransaction[]) => {
    if (txnsToSplice.length === 0) {
      setFilteredTransactions([]);
    }

    const filteredTxns = txnsToSplice.filter(txn => {
      const isIncludedType = filter.types.includes(txn.type); // FILTERING THE TYPE
      const statusString =
        txn.tStatus === ReapTxnStatus.DECLINED
          ? CardTransactionStatuses.DECLINED
          : txn.isSettled
            ? CardTransactionStatuses.SETTLED
            : CardTransactionStatuses.PENDING;
      const isIncludedStatus = filter.statuses.includes(statusString); // FILTERING THE STATUS
      // FILTERING THE DATERANGE
      const isIncludedInDateRange = moment
        .unix(txn.createdAt)
        .isBetween(
          moment.utc(filter.dateRange.fromDate).startOf('day'),
          moment.utc(filter.dateRange.toDate).endOf('day'),
        );
      return isIncludedType && isIncludedStatus && isIncludedInDateRange;
    });
    lastDate.current = filteredTxns?.[0]?.createdAt
      ? parseMonthYear(moment.unix(filteredTxns[0].createdAt).toISOString())
      : '';
    setFilteredTransactions(filteredTxns);
  };

  const exportCardTransactions = async (type: 'pdf' | 'csv') => {
    const exportEndpoint = `/v1/cards/${cardProvider}/card/transactions/export/${type}`;
    try {
      setIsExporting(true);
      const res = await postWithAuth(exportEndpoint, {});
      if (!res.isError) {
        showModal('state', {
          type: 'success',
          title: t('TXNS_EXPORTED'),
          description:
            t('CARD_TXNS_EXPORTED_TEXT') +
            (cardProfile.email ?? 'your registered email.'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      } else {
        const errorObject = {
          res: JSON.stringify(res),
          location: 'isError=true when trying to export card txns.',
        };
        Sentry.captureException(errorObject);
        showModal('state', {
          type: 'error',
          title: t('FAILED_TO_EXPORT_TXNS'),
          description: res.error,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
      setIsExporting(false);
    } catch (e) {
      const errorObject = {
        e,
        location: 'Error when trying to fetch card txns.',
      };
      Sentry.captureException(errorObject);
      showModal('state', {
        type: 'error',
        title: t('FAILED_TO_EXPORT_TXNS'),
        description: e,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      setIsExporting(false);
    }
  };

  const fetchTransactions = async (pullToRefresh = false) => {
    if (isEndReached) {
      return;
    }
    if (pullToRefresh) {
      txnRetrievalOffset.current = undefined;
    }
    let txnURL = `/v1/cards/${cardProvider}/card/transactions?newRoute=true&limit=15`;
    if (txnRetrievalOffset.current) {
      txnURL += `&offset=${txnRetrievalOffset.current}`;
    }

    try {
      setRefreshing(true);
      const res = await getWithAuth(txnURL);
      if (!res.isError) {
        const { transactions: txnsToSet, offset } = res.data;
        txnsToSet.sort((a: ICardTransaction, b: ICardTransaction) => {
          return a.date < b.date ? 1 : -1;
        });
        if (txnRetrievalOffset.current !== offset) {
          txnRetrievalOffset.current = offset;
        } else {
          setIsEndReached(true);
        }

        if (pullToRefresh) {
          setTransactions(txnsToSet);
          spliceTransactions(txnsToSet);
        } else {
          setTransactions([...transactions, ...txnsToSet]);
          spliceTransactions([...transactions, ...txnsToSet]);
        }

        setRefreshing(false);
      } else {
        setRefreshing(false);
        const errorObject = {
          res: JSON.stringify(res),
          location: 'isError=true when trying to fetch card txns.',
        };
        Sentry.captureException(errorObject);
        showModal('state', {
          type: 'error',
          title: t('FAILED_TO_UPDATE_TXNS'),
          description: res.error,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (e) {
      setRefreshing(false);
      const errorObject = {
        e,
        location: 'Error when trying to fetch card txns.',
      };
      Sentry.captureException(errorObject);
      showModal('state', {
        type: 'error',
        title: t('FAILED_TO_UPDATE_TXNS'),
        description: e,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  useEffect(() => {
    spliceTransactions(transactions);
  }, [filter.statuses, filter.types, filter.dateRange]);

  const handleViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken[];
      changed: ViewToken[];
    }) => {
      if (viewableItems.length) {
        if (
          lastViewableTransactionDate.current !==
          parseMonthYear(viewableItems[0].item.date)
        ) {
          lastViewableTransactionDate.current = parseMonthYear(
            viewableItems[0].item.date,
          );
          setViewableTransactionsDate(
            parseMonthYear(viewableItems[0].item.date),
          );
        }
      }
    },
  );

  const renderTransaction = ({ item }: { item: ICardTransaction }) => {
    const { createdAt } = item;
    const parsedDate = parseMonthYear(moment.unix(createdAt).toISOString());
    if (lastDate.current !== parsedDate) {
      lastDate.current = parsedDate;
      return (
        <CyDView>
          <CyDView className='bg-n0 py-[10px] px-[12px]'>
            <CyDText className='text-[14px] font-semibold'>
              {parsedDate}
            </CyDText>
          </CyDView>
          <CardTransactionItem item={item} />
        </CyDView>
      );
    }
    return <CardTransactionItem item={item} />;
  };

  return (
    <CyDView className='h-full bg-n20'>
      <CyDModalLayout
        isModalVisible={exportOptionOpen}
        setModalVisible={setExportOptionOpen}
        style={styles.modalLayout}>
        <CyDView
          className={
            'bg-n20 p-[25px] pb-[30px] rounded-t-[20px] relative border border-n30'
          }>
          <CyDTouchView
            onPress={() => setExportOptionOpen(false)}
            className={'z-[50] self-end'}>
            <CydMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDText className={'mt-[10px] font-black text-center text-[22px]'}>
            {t('EXPORT_AS')}
          </CyDText>
          <CyDView className={'w-[100%]'}>
            <Button
              style='h-[54px] mt-[12px]'
              title={t('PDF')}
              onPress={() => {
                void exportCardTransactions('pdf');
                setExportOptionOpen(false);
              }}
            />
            <Button
              style='h-[54px] mt-[15px]'
              title={t('CSV')}
              onPress={() => {
                void exportCardTransactions('csv');
                setExportOptionOpen(false);
              }}
              // type={ButtonType.SECONDARY}
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>
      <CardTxnFilterModal
        navigation={navigation}
        modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
        filterState={[filter, setFilter]}
      />
      <CyDView className='h-[50px] flex flex-row justify-between items-center py-[10px] px-[10px] bg-n0 border border-n40'>
        <CyDView className='flex flex-1 justify-center items-center'>
          <CyDText className='text-[18px] font-bold text-center ml-[45px]'>
            {viewableTransactionsDate}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-end items-center px-1 gap-x-2'>
          <CyDTouchView
            onPress={() => {
              setFilterModalVisible(true);
            }}>
            <CydMaterialDesignIcons
              name='filter-variant'
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDTouchView
            disabled={isExporting}
            className={clsx({ 'opacity-40': isExporting })}
            onPress={() => {
              setExportOptionOpen(true);
              // void exportCardTransactions();
            }}>
            <CydMaterialDesignIcons
              name='export-variant'
              size={20}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>
      <CyDView className='flex-1'>
        <CyDFlatList
          data={filteredTransactions}
          renderItem={renderTransaction as any}
          keyExtractor={(_, index) => index.toString()}
          onViewableItemsChanged={handleViewableItemsChanged.current}
          refreshControl={
            <RefreshControl
              className={clsx({ 'bg-white': isIOS() })}
              refreshing={refreshing && !txnRetrievalOffset.current}
              onRefresh={() => {
                void fetchTransactions(true);
              }}
              progressViewOffset={0}
            />
          }
          onEndReached={() => {
            if (txnRetrievalOffset.current) {
              void fetchTransactions();
            }
          }}
          onEndReachedThreshold={0}
          ListFooterComponent={
            <InfiniteScrollFooterLoader
              refreshing={refreshing}
              style={styles.infiniteScrollFooterLoaderStyle}
            />
          }
          className='flex-1'
        />
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  infiniteScrollFooterLoaderStyle: {
    height: 40,
    marginBottom: 60,
    marginTop: 20,
  },
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
