import React, { memo, useContext, useEffect, useState } from 'react';
import {
  CyDFastImage,
  CyDFlatList,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import AppImages from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import {
  HdWalletContext,
  formatAmount,
  getMaskedAddress,
} from '../../../core/util';
import {
  APPLICATION_ADDRESS_NAME_MAP,
  TXN_FILTER_STATUSES,
} from '../../../constants/data';
import moment from 'moment';
import { useIsFocused } from '@react-navigation/native';
import Loading from '../../../components/v2/loading';
import TransactionInfoModal from '../components/transactionInfoModal';
import { ActivityIndicator, RefreshControl } from 'react-native';
import axios from '../../../core/Http';
import { hostWorker } from '../../../global';
import TxnFilterModal, {
  TRANSACTION_TYPES,
} from '../components/TxnFilterModal';
import { TransactionType } from '../../../constants/enum';
import {
  TransactionApproval,
  TransactionObj,
  TransactionTransfer,
} from '../../../models/transaction.model';
import {
  Chain,
  CHAIN_COLLECTION,
  ChainConfigMapping,
} from '../../../constants/server';
import clsx from 'clsx';
import { get } from 'lodash';

interface TxnItemProps {
  activity: TransactionObj;
  setTransactionInfoParams: (activity: TransactionObj) => void;
}

interface TxnSceneProps {
  selectedChain: Chain;
  navigation: any;
  filterModalVisibilityState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
}

const ARCH_HOST = hostWorker.getHost('ARCH_HOST');

const getOutTransfer = (
  transfers: TransactionTransfer[],
): TransactionTransfer | undefined => transfers.find(t => t.direction === 'out');

const getInTransfer = (
  transfers: TransactionTransfer[],
): TransactionTransfer | undefined => transfers.find(t => t.direction === 'in');

const getPrimaryTransfer = (
  transfers: TransactionTransfer[],
): TransactionTransfer | undefined => transfers[0];

const TokenInitialsIcon = ({
  symbol,
  size = 36,
}: {
  symbol: string;
  size?: number;
}) => {
  const initials = symbol.slice(0, 4).toUpperCase();
  const fontSize = size * 0.32;
  return (
    <CyDView
      className='rounded-full bg-n40 justify-center items-center'
      style={{ width: size, height: size }}>
      <CyDText
        className='font-bold text-activityFontColor'
        style={{ fontSize }}>
        {initials}
      </CyDText>
    </CyDView>
  );
};

const GetTransactionItemIcon = ({
  type,
  status,
  transfers,
  protocolIcon,
  chainIcon,
  approvalIcon,
}: {
  type: string;
  status: string;
  transfers: TransactionTransfer[];
  protocolIcon: string | null | undefined;
  chainIcon: any;
  approvalIcon: string | null | undefined;
}) => {
  const isSuccess = status === 'confirmed';
  let transactionIcon;
  switch (type) {
    case TransactionType.SEND: {
      const transfer = getOutTransfer(transfers) ?? getPrimaryTransfer(transfers);
      const tokenIcon = transfer?.tokenIcon;
      if (!isSuccess) {
        return (
          <CyDFastImage
            className='h-[36px] w-[36px] rounded-full'
            resizeMode='contain'
            source={AppImages.TXN_SEND_ERROR}
          />
        );
      }
      return tokenIcon ? (
        <CyDFastImage
          className='h-[36px] w-[36px] rounded-full'
          resizeMode='contain'
          source={{ uri: tokenIcon }}
        />
      ) : (
        <TokenInitialsIcon symbol={transfer?.tokenSymbol ?? '?'} size={36} />
      );
    }
    case TransactionType.RECEIVE: {
      const transfer = getInTransfer(transfers) ?? getPrimaryTransfer(transfers);
      const tokenIcon = transfer?.tokenIcon;
      if (!isSuccess) {
        return (
          <CyDFastImage
            className='h-[36px] w-[36px] rounded-full'
            resizeMode='contain'
            source={AppImages.TXN_RECEIVE_ERROR}
          />
        );
      }
      return tokenIcon ? (
        <CyDFastImage
          className='h-[36px] w-[36px] rounded-full'
          resizeMode='contain'
          source={{ uri: tokenIcon }}
        />
      ) : (
        <TokenInitialsIcon symbol={transfer?.tokenSymbol ?? '?'} size={36} />
      );
    }
    case TransactionType.SWAP:
    case TransactionType.TRADE: {
      const outTransfer = getOutTransfer(transfers);
      const inTransfer = getInTransfer(transfers);

      return (
        <CyDView
          className='h-[36px] w-[36px] justify-center items-center'
          style={{ position: 'relative', backgroundColor: 'transparent' }}>
          <CyDView className='absolute top-[0px] left-[0px]'>
            {outTransfer?.tokenIcon ? (
              <CyDFastImage
                className='h-[22px] w-[22px] rounded-full'
                resizeMode='contain'
                source={{ uri: outTransfer.tokenIcon }}
              />
            ) : (
              <TokenInitialsIcon symbol={outTransfer?.tokenSymbol ?? '?'} size={22} />
            )}
          </CyDView>
          <CyDView className='absolute bottom-[0px] right-[0px]'>
            {inTransfer?.tokenIcon ? (
              <CyDFastImage
                className='h-[22px] w-[22px] rounded-full'
                resizeMode='contain'
                source={{ uri: inTransfer.tokenIcon }}
              />
            ) : (
              <TokenInitialsIcon symbol={inTransfer?.tokenSymbol ?? '?'} size={22} />
            )}
          </CyDView>
        </CyDView>
      );
    }

    case TransactionType.SELF:
      transactionIcon = isSuccess
        ? AppImages.TXN_SELF_SUCCESS
        : AppImages.TXN_SELF_ERROR;
      return (
        <CyDFastImage
          className='h-[36px] w-[36px] rounded-full'
          resizeMode='contain'
          source={transactionIcon}
        />
      );
    default: {
      if (!isSuccess) {
        return (
          <CyDFastImage
            className='h-[36px] w-[36px] rounded-full'
            resizeMode='contain'
            source={AppImages.TXN_DEFAULT_ERROR}
          />
        );
      }
      const transfer = getInTransfer(transfers) ?? getOutTransfer(transfers) ?? getPrimaryTransfer(transfers);
      const iconUri = approvalIcon ?? protocolIcon ?? transfer?.tokenIcon;
      if (iconUri) {
        return (
          <CyDFastImage
            className='h-[36px] w-[36px] rounded-full'
            resizeMode='contain'
            source={{ uri: iconUri }}
          />
        );
      }
      const symbol = transfer?.tokenSymbol;
      if (symbol) {
        return <TokenInitialsIcon symbol={symbol} size={36} />;
      }
      return (
        <CyDFastImage
          className='h-[36px] w-[36px] rounded-full'
          resizeMode='contain'
          source={chainIcon ?? AppImages.TXN_DEFAULT_SUCCESS}
        />
      );
    }
  }
};

const RenderTransactionItemDetails = ({
  type,
  from,
  to,
  transferFrom,
  transferTo,
  protocolName,
}: {
  type: string;
  from: string;
  to: string;
  transferFrom?: string;
  transferTo?: string;
  protocolName: string | null | undefined;
}) => {
  let transactionDetail;
  let transactionAddress;
  switch (type) {
    case TransactionType.SELF:
      transactionDetail = `${getMaskedAddress(transferTo ?? to)}`;
      break;
    case TransactionType.SEND:
      transactionDetail = `${getMaskedAddress(transferTo ?? to)}`;
      break;
    case TransactionType.RECEIVE:
      transactionDetail = `${getMaskedAddress(transferFrom ?? from)}`;
      break;
    default:
      if (protocolName) {
        transactionDetail = protocolName;
      } else if (to) {
        transactionAddress = to;
        if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
          transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(
            transactionAddress,
          ) as string;
        } else {
          transactionAddress = getMaskedAddress(transactionAddress);
        }
        transactionDetail = `${transactionAddress}`;
      } else {
        transactionDetail = null;
      }
  }

  return transactionDetail ? (
    <CyDText className='text-subTextColor'>{transactionDetail}</CyDText>
  ) : null;
};

const formatUsdValue = (valueUsd: number | null | undefined): string => {
  if (valueUsd == null) return '';
  return `$${valueUsd.toFixed(2)}`;
};

const getTransactionItemAmountDetails = (
  type: string,
  transfers: TransactionTransfer[],
  approvals?: TransactionApproval[],
) => {
  let formattedAmount;
  let amountColor;
  let subtitle = '';

  const outTransfer = getOutTransfer(transfers);
  const inTransfer = getInTransfer(transfers);
  const primaryTransfer = getPrimaryTransfer(transfers);

  switch (type) {
    case TransactionType.SWAP:
    case TransactionType.TRADE: {
      const fromToken = outTransfer?.tokenSymbol ?? '';
      const fromTokenValue = String(outTransfer?.amount ?? '0');
      formattedAmount =
        fromToken !== ''
          ? `- ${formatAmount(fromTokenValue)} ${fromToken}`
          : `- ${formatAmount(fromTokenValue)} Unknown`;
      amountColor = 'text-red-500';
      if (inTransfer) {
        const toToken = inTransfer.tokenSymbol ?? 'Unknown';
        subtitle = `+ ${formatAmount(String(inTransfer.amount))} ${toToken}`;
      }
      break;
    }
    case TransactionType.SELF:
    case TransactionType.SEND: {
      const transfer = outTransfer ?? primaryTransfer;
      const token = transfer?.tokenSymbol ?? null;
      const value = String(transfer?.amount ?? '0');
      formattedAmount = token
        ? `- ${formatAmount(value)} ${token}`
        : `- ${formatAmount(value)} Unknown`;
      amountColor = 'text-red-500';
      subtitle = formatUsdValue(transfer?.valueUsd);
      break;
    }
    case TransactionType.RECEIVE: {
      const transfer = inTransfer ?? primaryTransfer;
      const token = transfer?.tokenSymbol ?? null;
      const value = String(transfer?.amount ?? '0');
      formattedAmount = token
        ? `+ ${formatAmount(value)} ${token}`
        : `+ ${formatAmount(value)} Unknown`;
      amountColor = 'text-[#048A81]';
      subtitle = formatUsdValue(transfer?.valueUsd);
      break;
    }
    case TransactionType.REVOKE:
    case TransactionType.APPROVE: {
      const approval = approvals?.[0];
      const token = approval?.tokenSymbol ?? primaryTransfer?.tokenSymbol ?? null;
      const value = approval ? String(approval.amount) : null;
      formattedAmount = token
        ? value ? `${formatAmount(value)} ${token}` : `${token}`
        : 'Unknown';
      amountColor = 'text-[#048A81]';
      break;
    }
    default: {
      const transfer = inTransfer ?? outTransfer ?? primaryTransfer;
      const token = transfer?.tokenSymbol ?? null;
      const value = String(transfer?.amount ?? '0');
      formattedAmount = token
        ? `${formatAmount(value)} ${token}`
        : `${formatAmount(value)}`;
      amountColor = 'text-[#048A81]';
      subtitle = formatUsdValue(transfer?.valueUsd);
    }
  }

  return [formattedAmount, amountColor, subtitle];
};

const TxnScene = ({
  selectedChain,
  navigation,
  filterModalVisibilityState,
}: TxnSceneProps) => {
  const isFocused = useIsFocused();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { address: ethereumAddress }: { address: string } =
    hdWalletContext.state.wallet.ethereum;

  const [filter, setFilter] = useState({
    types: TRANSACTION_TYPES,
    status: TXN_FILTER_STATUSES[2].id,
  });
  const [showTrash, setShowTrash] = useState(false);
  const [transactions, setTransactions] = useState<TransactionObj[]>([]);
  const [showTransactionInfo, setShowTransactionInfo] = useState(false);
  const [transactionInfoParams, setTransactionInfoParams] =
    useState<TransactionObj | null>(null);
  const [transaction, setTransaction] = useState<TransactionObj[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchTxn = async (forceRefresh = false, cursor?: string) => {
    try {
      let txnURL = `${ARCH_HOST}/v1/txn/transactions/${ethereumAddress}?descOrder=true`;
      if (showTrash) txnURL += '&showTrash=true';
      if (forceRefresh) txnURL += '&forceRefresh=true';
      if (cursor) txnURL += `&nextCursor=${encodeURIComponent(cursor)}`;
      const response = await axios.get(txnURL);
      const newTxns = response.data.transactions ?? [];
      if (cursor) {
        setTransactions(prev => [...prev, ...newTxns]);
      } else {
        setTransactions(newTxns);
      }
      setNextCursor(response.data.nextCursor ?? null);
    } catch (error) {}
    setIsLoading(false);
    setIsLoadingMore(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    setNextCursor(null);
    await fetchTxn(true);
    setIsRefreshing(false);
  };

  const loadMore = () => {
    if (!nextCursor || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    void fetchTxn(false, nextCursor);
  };

  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      void fetchTxn();
    }
  }, [isFocused, showTrash]);

  useEffect(() => {
    if (!isLoading) {
      spliceTransactions();
    }
  }, [isLoading, filter, selectedChain, transactions]);

  const getIsIncludedStatus = (status: string) => {
    if (filter.status === TXN_FILTER_STATUSES[2].id) {
      return (
        status === TXN_FILTER_STATUSES[1].value ||
        status === TXN_FILTER_STATUSES[0].value
      );
    }
    return status === TXN_FILTER_STATUSES[filter.status].value;
  };

  const spliceTransactions = () => {
    if (transactions.length === 0) {
      setTransaction([]);
      return;
    }

    const allTxns: TransactionObj[] = [...transactions];

    const filteredActivities = allTxns.filter(activity => {
      if (!activity.chain) return false;
      const chain = activity.chain.toLowerCase();
      const isChainSelected =
        selectedChain === CHAIN_COLLECTION ||
        selectedChain === get(ChainConfigMapping, chain);
      const effectiveType =
        activity.operationType === TransactionType.TRADE
          ? TransactionType.SWAP
          : activity.operationType;
      const isIncludedType = filter.types.includes(effectiveType);
      const isOtherType = !TRANSACTION_TYPES.includes(effectiveType);
      const isIncludedStatus = getIsIncludedStatus(activity.status);

      return (
        (isIncludedType ||
          (isOtherType && filter.types.includes(TransactionType.OTHERS))) &&
        isIncludedStatus &&
        isChainSelected
      );
    });

    filteredActivities.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    setTransaction(filteredActivities);
  };

  const showTransactionDetails = (activity: TransactionObj) => {
    setTransactionInfoParams(activity);
    setShowTransactionInfo(true);
  };

  function TransactionItem({
    activity,
    setTransactionInfoParams,
    index,
  }: TxnItemProps) {
    let transactionAddress = activity.to;
    const chain = activity.chain.toLowerCase();
    const chainConfig = get(ChainConfigMapping, chain);
    const chainImg = chainConfig?.logo_url;
    if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
      transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(
        transactionAddress,
      ) as string;
    } else {
      transactionAddress = getMaskedAddress(transactionAddress);
    }
    const formatedDay = moment.unix(activity.timestamp).format('MMM DD, YYYY');
    const previousTransactionFormatedDay =
      index > 0
        ? moment.unix(transaction[index - 1].timestamp).format('MMM DD, YYYY')
        : '';
    const nextTransactionFormatedDay = transaction[index + 1]
      ? moment.unix(transaction[index + 1].timestamp).format('MMM DD, YYYY')
      : '';

    let shouldRenderDate = false;
    if (formatedDay !== previousTransactionFormatedDay) {
      shouldRenderDate = true;
    }
    const [formattedAmount, amountColour, subtitle] = getTransactionItemAmountDetails(
      activity.operationType,
      activity.transfers,
      activity.approvals,
    );
    const title = activity.operationType
      ? activity.operationType.charAt(0).toUpperCase() +
        activity.operationType.slice(1)
      : 'Unknown';
    return (
      <CyDView className='mx-[8px]'>
        {shouldRenderDate && (
          <CyDView
            className={clsx(
              ' border-n40 px-[12px] py-[10px] justify-center',
              { 'mt-[28px]': index !== 0 },
            )}>
            <CyDText className='font-bold text-[16px]'>{formatedDay}</CyDText>
          </CyDView>
        )}
        <CyDTouchView
          className={clsx(
            'flex flex-row items-center py-[12px] border-b-[0.5px] border-x border-n40 px-[12px] bg-n0',
            {
              'rounded-t-lg border-t-[0.5px]': shouldRenderDate,
              'rounded-b-lg': nextTransactionFormatedDay !== formatedDay,
            },
          )}
          onPress={() => {
            setTransactionInfoParams(activity);
          }}>
          <GetTransactionItemIcon
            type={activity.operationType}
            status={activity.status}
            transfers={activity.transfers}
            protocolIcon={activity.protocol?.icon}
            chainIcon={chainImg}
            approvalIcon={activity.approvals?.[0]?.tokenIcon}
          />
          <CyDView className='flex flex-row flex-1 justify-between'>
            <CyDView className='px-[10px] items-start justify-start'>
              <CyDView className='flex flex-row justify-center items-center'>
                <CyDText className='font-bold text-[16px]'>{title}</CyDText>
              </CyDView>
              <CyDView className='flex flex-row justify-center items-center'>
                {chainImg && (
                  <CyDFastImage
                    className='h-[10px] w-[10px] mr-[5px]'
                    resizeMode='contain'
                    source={chainImg}
                  />
                )}
                <RenderTransactionItemDetails
                  type={activity.operationType}
                  from={activity.from}
                  to={activity.to}
                  transferFrom={activity.transfers[0]?.from}
                  transferTo={activity.transfers[0]?.to}
                  protocolName={activity.protocol?.name}
                />
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-1 items-end self-end'>
              <CyDText numberOfLines={1} className={`${amountColour} mt-[3px]`}>
                {formattedAmount}
              </CyDText>
              {subtitle ? (
                <CyDText numberOfLines={1} className='text-subTextColor'>
                  {subtitle}
                </CyDText>
              ) : null}
            </CyDView>
          </CyDView>
        </CyDTouchView>
      </CyDView>
    );
  }

  return (
    <>
      {isLoading ? (
        <CyDView className='flex-1'>
          <Loading />
        </CyDView>
      ) : (
        <CyDView className='bg-n20 flex-1'>
          <TransactionInfoModal
            setModalVisible={setShowTransactionInfo}
            isModalVisible={showTransactionInfo}
            params={transactionInfoParams}
            navigationRef={navigation}
          />
          <TxnFilterModal
            modalVisibilityState={filterModalVisibilityState}
            filterState={[filter, setFilter]}
            showSpamState={[showTrash, setShowTrash]}
          />
          <CyDFlatList
            data={transaction}
            scrollEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  void onRefresh();
                }}
              />
            }
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => {
              return (
                <TransactionItem
                  key={index}
                  index={index}
                  activity={item}
                  setTransactionInfoParams={showTransactionDetails}
                />
              );
            }}
            ListEmptyComponent={<NoTxnsFound />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <CyDView className='py-[20px] items-center'>
                  <ActivityIndicator size='small' />
                </CyDView>
              ) : null
            }
          />
        </CyDView>
      )}
    </>
  );
};

const NoTxnsFound = () => {
  const { t } = useTranslation();
  return (
    <CyDView className='flex-1 items-center justify-center'>
      <CyDView className='h-full flex flex-col items-center justify-start'>
        <CyDFastImage
          className='h-[100px] w-[100px]'
          source={AppImages.NO_ACTIVITIES}
          resizeMode='contain'
        />
        <CyDText className='mt-2 '>{t('EMPTY_TRANSCATION_DETAIL_MSG')}</CyDText>
      </CyDView>
    </CyDView>
  );
};

export default memo(TxnScene);
