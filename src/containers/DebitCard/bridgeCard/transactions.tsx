import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import moment from 'moment';
import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ViewToken,
} from 'react-native';
import Button from '../../../components/v2/button';
import CardTransactionItem from '../../../components/v2/CardTransactionItem';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import InfiniteScrollFooterLoader from '../../../components/v2/InfiniteScrollFooterLoader';
import CyDModalLayout from '../../../components/v2/modal';
import {
  DateRange,
  initialCardTxnDateRange,
  STATUSES,
  TYPES,
} from '../../../constants/cardPageV2';
import {
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
  ReapTxnStatus,
} from '../../../constants/enum';
import { GlobalContext } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { parseMonthYear } from '../../../core/util';
import { isIOS } from '../../../misc/checkers';
import { ICardTransaction } from '../../../models/card.model';
import { CardProfile } from '../../../models/cardProfile.model';
import {
  CyDFastImage,
  CyDFlatList,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import AppImages from '../../../../assets/images/appImages';
import { Colors } from '../../../constants/theme';
import CardTxnFilterModal from '../CardV2/CardTxnFilterModal';
import PageHeader from '../../../components/PageHeader';

interface RouteParams {
  cardProvider: CardProviders;
  cardId?: string;
}

export default function CardTransactions() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { cardProvider, cardId } = route.params;
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
  const [refreshing, setRefreshing] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();
  const txnRetrievalOffset = useRef<string | undefined>();
  const [viewableTransactionsDate, setViewableTransactionsDate] =
    useState<string>('');
  const lastViewableTransactionDate = useRef<string>('');
  const [exportOptionOpen, setExportOptionOpen] = useState(false);
  const [isEndReached, setIsEndReached] = useState(false);
  const hasLoadedOnce = useRef(false);
  const fetchDebounced = useRef<ReturnType<typeof setTimeout>>();
  const transactionsRef = useRef<ICardTransaction[]>([]);

  useEffect(() => {
    void fetchTransactions(true);
  }, []);

  const spliceTransactions = (txnsToSplice: ICardTransaction[]) => {
    if (txnsToSplice.length === 0) {
      setFilteredTransactions([]);
      return;
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
    setFilteredTransactions(filteredTxns);
  };

  const exportCardTransactions = async (type: 'pdf' | 'csv') => {
    const cardPath = cardId
      ? `${cardProvider}/card/${cardId}`
      : `${cardProvider}/card`;
    const exportEndpoint = `/v1/cards/${cardPath}/transactions/export/${type}`;
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
    const cardPath = cardId
      ? `${cardProvider}/card/${cardId}`
      : `${cardProvider}/card`;
    let txnURL = `/v1/cards/${cardPath}/transactions?newRoute=true&limit=15&includeRewards=true`;
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
          transactionsRef.current = txnsToSet;
          setTransactions(txnsToSet);
          spliceTransactions(txnsToSet);
        } else {
          const existingIds = new Set(
            transactionsRef.current.map((txn: ICardTransaction) => txn.id),
          );
          const uniqueNewTxns = txnsToSet.filter(
            (txn: ICardTransaction) => !existingIds.has(txn.id),
          );
          const merged = [...transactionsRef.current, ...uniqueNewTxns];
          transactionsRef.current = merged;
          setTransactions(merged);
          spliceTransactions(merged);
        }
      } else {
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
    } catch (error) {
      const errorObject = {
        error,
        location: 'Error when trying to fetch card txns.',
      };
      Sentry.captureException(errorObject);
      showModal('state', {
        type: 'error',
        title: t('FAILED_TO_UPDATE_TXNS'),
        description: error,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      hasLoadedOnce.current = true;
      setRefreshing(false);
    }
  };

  const fetchTransactionsRef = useRef(fetchTransactions);
  fetchTransactionsRef.current = fetchTransactions;

  const handleEndReached = useCallback(() => {
    if (fetchDebounced.current) {
      clearTimeout(fetchDebounced.current);
    }

    fetchDebounced.current = setTimeout(() => {
      void fetchTransactionsRef.current();
    }, 100);
  }, []);

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

  const sectionFirstIds = useMemo(() => {
    const ids = new Set<string>();
    let prevDate = '';
    for (const txn of filteredTransactions) {
      const parsed = parseMonthYear(moment.unix(txn.createdAt).toISOString());
      if (parsed !== prevDate) {
        ids.add(txn.id);
        prevDate = parsed;
      }
    }
    return ids;
  }, [filteredTransactions]);

  const renderTransaction = ({ item }: { item: ICardTransaction }) => {
    const parsedDate = parseMonthYear(
      moment.unix(item.createdAt).toISOString(),
    );

    if (sectionFirstIds.has(item.id)) {
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
    <CyDSafeAreaView className='h-full bg-n0' edges={['top']}>
      <PageHeader title={'CARD_TRANSACTIONS'} navigation={navigation} />
      <CyDView className='flex-1 bg-n20'>
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
              <CyDMaterialDesignIcons
                name={'close'}
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
            <CyDText className={'mt-[10px] text-center text-[22px]'}>
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
        {!hasLoadedOnce.current ? (
          <CyDView className='flex-1 justify-center items-center'>
            <ActivityIndicator size='large' color={Colors.appColor} />
          </CyDView>
        ) : (
          <>
            {transactions.length > 0 && (
              <CyDView className='h-[50px] flex flex-row justify-between items-center py-[10px] px-[10px] bg-n0 border border-n40'>
                <CyDView className='flex flex-1 justify-center items-center'>
                  <CyDText className='text-[18px] font-bold text-center ml-[45px] text-base400'>
                    {viewableTransactionsDate}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row justify-end items-center px-1 gap-x-2'>
                  <CyDTouchView
                    onPress={() => {
                      setFilterModalVisible(true);
                    }}>
                    <CyDMaterialDesignIcons
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
                    }}>
                    <CyDMaterialDesignIcons
                      name='export-variant'
                      size={20}
                      className='text-base400'
                    />
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            )}
            <CyDView className='flex-1'>
              <CyDFlatList
                data={filteredTransactions}
                renderItem={renderTransaction as any}
                keyExtractor={(item, index) =>
                  (item as ICardTransaction).id ?? index.toString()
                }
                onViewableItemsChanged={handleViewableItemsChanged.current}
                refreshControl={
                  <RefreshControl
                    className={clsx({ 'bg-n0': isIOS() })}
                    refreshing={refreshing && !txnRetrievalOffset.current}
                    onRefresh={() => {
                      void fetchTransactions(true);
                    }}
                    progressViewOffset={0}
                  />
                }
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                  !refreshing ? (
                    <CyDView className='items-center mt-[250px]'>
                      <CyDView
                        className='w-[240px] bg-n0 rounded-[16px] items-center'
                        style={styles.emptyContainer}>
                        <CyDFastImage
                          source={AppImages.NO_TRANSACTIONS_YET}
                          className='w-[168px] h-[146px] mt-[40px]'
                          resizeMode='contain'
                        />
                        <CyDText className='font-manrope font-medium text-[16px] text-base100 text-center mt-[12px] leading-[140%] tracking-[-0.4px]'>
                          {'No Transaction Found'}
                        </CyDText>
                        <CyDText
                          className='font-manrope font-normal text-[10px] text-center mt-[4px] mb-[20px] leading-[160%] px-[19px]'
                          style={styles.emptySubtext}>
                          {
                            'Use your cypher card and keep an eye on your transactions right here!'
                          }
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  ) : null
                }
                ListFooterComponent={
                  <InfiniteScrollFooterLoader
                    refreshing={refreshing}
                    style={styles.infiniteScrollFooterLoaderStyle}
                  />
                }
                className='flex-1'
              />
            </CyDView>
          </>
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  infiniteScrollFooterLoaderStyle: {
    height: 40,
  },
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    height: 283,
  },
  emptySubtext: {
    color: '#A0A0A0',
  },
});
