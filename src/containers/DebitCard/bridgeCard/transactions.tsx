import React, { useContext, useEffect, useRef, useState } from 'react';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import {
  CardProviders,
  CardTransactionStatuses,
  CardTransactionTypes,
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
import { formatToLocalDate, parseMonthYear } from '../../../core/util';

interface CardTransactionScreenProps {
  navigation: any;
  route: {
    params: {
      hasBothProviders: boolean;
      cardProvider: CardProviders;
      currentCardIndex: number;
    };
  };
}

export default function CardTransactions({
  navigation,
  route,
}: CardTransactionScreenProps) {
  const { cardProvider, currentCardIndex } = route.params;
  const { getWithAuth, postWithAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const cardId = get(cardProfile, [
    cardProvider,
    'cards',
    currentCardIndex,
    'cardId',
  ]);
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

  useEffect(() => {
    void fetchTransactions(true);
  }, []);

  const spliceTransactions = (txnsToSplice: ICardTransaction[]) => {
    if (txnsToSplice.length === 0) {
      setFilteredTransactions([]);
    }

    const filteredTxns = txnsToSplice.filter(txn => {
      const isIncludedType = filter.types.includes(txn.type); // FILTERING THE TYPE
      const statusString = txn.isSettled
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

  const exportCardTransactions = async () => {
    const exportEndpoint = `/v1/cards/${cardProvider}/card/${String(
      cardId,
    )}/transactions/export`;
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
    if (pullToRefresh) {
      txnRetrievalOffset.current = undefined;
    }

    let txnURL = `/v1/cards/${cardProvider}/card/${String(
      cardId,
    )}/transactions?newRoute=true&limit=20`;
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

        txnRetrievalOffset.current = offset;

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
          <CyDView className='bg-cardBgTo py-[10px] ml-[12px]'>
            <CyDText className='text-[14px] font-bold'>{parsedDate}</CyDText>
          </CyDView>
          <CardTransactionItem item={item} />
        </CyDView>
      );
    }
    return <CardTransactionItem item={item} />;
  };

  return (
    <CyDView>
      <CardTxnFilterModal
        navigation={navigation}
        modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
        filterState={[filter, setFilter]}
      />
      <CyDView className='h-[50px] flex flex-row justify-between items-center py-[10px] px-[10px] bg-white border border-sepratorColor'>
        <CyDView className='flex flex-1 justify-center items-center'>
          <CyDText className='text-[18px] font-bold text-center ml-[45px]'>
            {viewableTransactionsDate}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-end items-center px-[5px]'>
          <CyDTouchView
            onPress={() => {
              setFilterModalVisible(true);
            }}>
            <CyDFastImage
              className='w-[48px] h-[26px]'
              source={AppImages.FILTER}
              resizeMode='contain'
            />
          </CyDTouchView>
          <CyDTouchView
            disabled={isExporting}
            className={clsx({ 'opacity-40': isExporting })}
            onPress={() => {
              void exportCardTransactions();
            }}>
            <CyDFastImage
              className='w-[48px] h-[26px]'
              source={AppImages.EXPORT}
              resizeMode='contain'
            />
          </CyDTouchView>
        </CyDView>
      </CyDView>
      <CyDView className='pb-[120px]'>
        <CyDFlatList
          data={filteredTransactions}
          renderItem={renderTransaction as any}
          keyExtractor={(_, index) => index.toString()}
          onViewableItemsChanged={handleViewableItemsChanged.current}
          refreshControl={
            <RefreshControl
              className={clsx({ 'bg-white': isIOS() })}
              refreshing={refreshing}
              onRefresh={() => {
                void fetchTransactions();
              }}
              progressViewOffset={0}
            />
          }
          onEndReached={() => {
            if (txnRetrievalOffset.current) {
              void fetchTransactions();
            }
          }}
          ListFooterComponent={
            <InfiniteScrollFooterLoader
              refreshing={refreshing}
              style={styles.infiniteScrollFooterLoaderStyle}
            />
          }
        />
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  infiniteScrollFooterLoaderStyle: {
    height: 40,
  },
});
