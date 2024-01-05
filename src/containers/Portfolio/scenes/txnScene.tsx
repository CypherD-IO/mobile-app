import React, { memo, useContext, useEffect, useRef, useState } from 'react';
import {
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import {
  HdWalletContext,
  PortfolioContext,
  formatAmount,
  getMaskedAddress,
} from '../../../core/util';
import { APPLICATION_ADDRESS_NAME_MAP } from '../../../constants/data';
import moment from 'moment';
import { useIsFocused } from '@react-navigation/native';
import Loading from '../../../components/v2/loading';
import TransactionInfoModal from '../components/transactionInfoModal';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
} from 'react-native';
import axios from '../../../core/Http';
import { hostWorker } from '../../../global';
import { AnimatedTabView } from '../animatedComponents';
import { SharedValue } from 'react-native-reanimated';
import TxnFilterModal, {
  STATUSES,
  TRANSACTION_TYPES,
} from '../components/TxnFilterModal';
import { TransactionType } from '../../../constants/enum';
import { TransactionObj } from '../../../models/transaction.model';
import {
  CHAIN_COLLECTION,
  ChainConfigMapping,
} from '../../../constants/server';
import clsx from 'clsx';
import { isIOS } from '../../../misc/checkers';
import { PortfolioBannerHeights } from '../../../hooks/useScrollManager';

interface TxnItemProps {
  activity: TransactionObj;
  setTransactionInfoParams: (activity: TransactionObj) => void;
}

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

interface TxnSceneProps {
  routeKey: string;
  scrollY: SharedValue<number>;
  trackRef: (key: string, ref: FlatList<any> | ScrollView) => void;
  onMomentumScrollBegin: (e: ScrollEvent) => void;
  onMomentumScrollEnd: (e: ScrollEvent) => void;
  onScrollEndDrag: (e: ScrollEvent) => void;
  navigation: any;
  bannerHeight: PortfolioBannerHeights;
  filterModalVisibilityState: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ];
}

const ARCH_HOST = hostWorker.getHost('ARCH_HOST');

const GetTransactionItemIcon = ({
  type,
  status,
  tokenIcon,
  fromTokenIcon,
  toTokenIcon,
}: {
  type: string;
  status: string;
  tokenIcon: string | null;
  fromTokenIcon: string | undefined;
  toTokenIcon: string | undefined;
}) => {
  let transactionIcon;
  switch (type) {
    case TransactionType.SEND:
      transactionIcon =
        status === 'completed'
          ? tokenIcon
            ? { uri: tokenIcon }
            : AppImages.UNKNOWN_TXN_TOKEN
          : AppImages.TXN_SEND_ERROR;
      return (
        <CyDFastImage
          className='h-[25px] w-[25px] rounded-full'
          resizeMode='contain'
          source={transactionIcon}
        />
      );
    case TransactionType.RECEIVE:
      transactionIcon =
        status === 'completed'
          ? tokenIcon
            ? { uri: tokenIcon }
            : AppImages.UNKNOWN_TXN_TOKEN
          : AppImages.TXN_RECEIVE_ERROR;
      return (
        <CyDFastImage
          className='h-[25px] w-[25px] rounded-full'
          resizeMode='contain'
          source={transactionIcon}
        />
      );
    case TransactionType.SWAP:
      const fromTokenImg = fromTokenIcon
        ? { uri: fromTokenIcon }
        : AppImages.UNKNOWN_TXN_TOKEN;
      const toTokenImg = toTokenIcon
        ? { uri: toTokenIcon }
        : AppImages.UNKNOWN_TXN_TOKEN;

      return (
        <CyDView
          className='h-[25px] w-[25px] justify-center items-center'
          style={{ position: 'relative', backgroundColor: 'transparent' }}
        >
          <CyDFastImage
            className='h-[25px] w-[25px] absolute right-[8px] rounded-full'
            resizeMode='contain'
            source={fromTokenImg}
          />
          <CyDFastImage
            className='h-[25px] w-[25px] absolute top-[10px] left-[8px] rounded-full'
            resizeMode='contain'
            source={toTokenImg}
          />
        </CyDView>
      );

    case TransactionType.SELF:
      transactionIcon =
        status === 'completed'
          ? AppImages.TXN_SELF_SUCCESS
          : AppImages.TXN_SELF_ERROR;
      return (
        <CyDFastImage
          className='h-[25px] w-[25px] rounded-full'
          resizeMode='contain'
          source={transactionIcon}
        />
      );
    default:
      transactionIcon =
        status === 'completed'
          ? AppImages.TXN_DEFAULT_SUCCESS
          : AppImages.TXN_DEFAULT_ERROR;
      return (
        <CyDFastImage
          className='h-[25px] w-[25px] rounded-full'
          resizeMode='contain'
          source={transactionIcon}
        />
      );
  }
};

const RenderTransactionItemDetails = ({
  type,
  from,
  to,
}: {
  type: string;
  from: string;
  to: string;
}) => {
  let transactionDetail;
  let transactionAddress;
  switch (type) {
    case TransactionType.SELF:
      transactionDetail = `${getMaskedAddress(to)}`;
      break;
    case TransactionType.SEND:
      transactionDetail = `${getMaskedAddress(to)}`;
      break;
    case TransactionType.RECEIVE:
      transactionDetail = `${getMaskedAddress(from)}`;
      break;
    default:
      transactionAddress = to;
      if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
        transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(
          transactionAddress,
        ) as string;
      } else {
        transactionAddress = getMaskedAddress(transactionAddress);
      }
      transactionDetail = `${transactionAddress}`;
  }

  return <CyDText>{transactionDetail}</CyDText>;
};

const getTransactionItemAmountDetails = (
  type: string,
  value: string,
  token: string | null,
  fromTokenValue: string,
  fromToken: string,
) => {
  let formattedAmount;
  let amountColor;
  switch (type) {
    case TransactionType.SWAP:
      formattedAmount =
        fromToken !== ''
          ? `- ${formatAmount(fromTokenValue)} ${fromToken}`
          : `- ${formatAmount(fromTokenValue)} Unknown`;
      amountColor = 'text-red-500';
      break;
    case TransactionType.SELF:
    case TransactionType.SEND:
      formattedAmount = token
        ? `- ${formatAmount(value)} ${token}`
        : `- ${formatAmount(value)} Unknown`;
      amountColor = 'text-red-500';
      break;
    case TransactionType.RECEIVE:
      formattedAmount = token
        ? `+ ${formatAmount(value)} ${token}`
        : `+ ${formatAmount(value)} Unknown`;
      amountColor = 'text-[#048A81]';
      break;
    case TransactionType.REVOKE:
    case TransactionType.APPROVE:
      formattedAmount = token ? `${token}` : 'Unknown';
      amountColor = 'text-[#048A81]';
      break;
    default:
      formattedAmount = token
        ? `${formatAmount(value)} ${token}`
        : `${formatAmount(value)}`;
      amountColor = 'text-[#048A81]';
  }

  return [formattedAmount, amountColor];
};

const TxnScene = ({
  routeKey,
  scrollY,
  trackRef,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  navigation,
  bannerHeight,
  filterModalVisibilityState,
}: TxnSceneProps) => {
  const OFFSET_TABVIEW = isIOS() ? -bannerHeight : 0;

  const isFocused = useIsFocused();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioContext = useContext(PortfolioContext);
  const {
    address: ethereumAddress,
  }: { address: string } = hdWalletContext.state.wallet.ethereum;
  const getTransactionsUrl = `${ARCH_HOST}/v1/txn/transactions/${ethereumAddress}?descOrder=true`;

  const [filter, setFilter] = useState({
    types: TRANSACTION_TYPES,
    statuses: STATUSES,
  });
  const [transactions, setTransactions] = useState([]);
  const [showTransactionInfo, setShowTransactionInfo] = useState(false);
  const [transactionInfoParams, setTransactionInfoParams] = useState<{
    timestamp: string;
    blockchain: string;
    hash: string;
    gas: string;
    type: string;
    from: string;
    to: string;
    value: string;
    token: string | null;
    tokenIcon: string | null;
    fromToken: string | null;
    fromTokenValue: string | null;
    toToken: string | null;
    fromTokenIcon: string | null;
    toTokenIcon: string | null;
    status: string;
  } | null>(null);
  const [transaction, setTransaction] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true); // Add isLoading state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<any>>(null);

  const fetchTxn = async (forceRefresh = false) => {
    try {
      const txnURL = forceRefresh
        ? `${getTransactionsUrl}?forceRefresh=true`
        : getTransactionsUrl;
      const response = await axios.get(txnURL);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchTxn(true);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (flatListRef.current) {
      if (scrollY.value <= OFFSET_TABVIEW + bannerHeight) {
        flatListRef.current.scrollToOffset({
          offset: Math.max(
            Math.min(scrollY.value, OFFSET_TABVIEW + bannerHeight),
            OFFSET_TABVIEW,
          ),
          animated: false,
        });
      } else {
        flatListRef.current.scrollToOffset({
          offset: OFFSET_TABVIEW + bannerHeight,
          animated: false,
        });
      }
      trackRef(routeKey, flatListRef.current);
    }
  }, [flatListRef.current, isLoading]);

  useEffect(() => {
    if (isFocused) {
      setIsLoading(true); // Start loading when the component is focused
      void fetchTxn(); // Set isLoading to false after the data is fetched or in case of an error
    }
  }, [isFocused]); // Call the effect only when the component is focused

  useEffect(() => {
    if (!isLoading) {
      spliceTransactions(); // Process transaction when isLoading is false
    }
  }, [isLoading, filter, portfolioContext.statePortfolio.selectedChain]);

  const spliceTransactions = () => {
    if (transactions.length === 0) {
      return [];
    }

    const transaction: TransactionObj[] = [...transactions];

    const filteredActivities = transaction.filter(activity => {
      const chain = activity.blockchain.toLowerCase();
      const isChainSelected =
        portfolioContext.statePortfolio.selectedChain === CHAIN_COLLECTION ||
        portfolioContext.statePortfolio.selectedChain ===
          ChainConfigMapping[chain];
      const isIncludedType = filter.types.includes(activity.type);
      const isOtherType = !TRANSACTION_TYPES.includes(activity.type);
      const isIncludedStatus =
        filter.statuses.length === 0 ||
        filter.statuses.includes(activity.status);

      return (
        (isIncludedType ||
          (isOtherType && filter.types.includes(TransactionType.OTHERS))) &&
        isIncludedStatus &&
        isChainSelected
      );
    });

    filteredActivities.sort(function (a, b) {
      return b.timestamp - a.timestamp; // Sort in descending order based on Unix timestamps
    });

    const activityByDate = filteredActivities.reduce((first: any, sec: any) => {
      const formattedDate = moment.unix(sec.timestamp).format('MMM DD, YYYY'); // Format the date for display
      if (!first[formattedDate]) first[formattedDate] = [];
      first[formattedDate].push(sec);
      return first;
    }, {});

    const now = new Date();
    now.setDate(now.getDate() - 1);

    const tActivities = [];
    for (const date in activityByDate) {
      for (const activity of activityByDate[date]) {
        tActivities.push(activity);
      }
    }
    setTransaction(tActivities);
  };

  const showTransactionDetails = (activity: TransactionObj) => {
    const formatDate = moment.unix(activity.timestamp).format('MMM DD, h:mm a');

    setTransactionInfoParams({
      timestamp: formatDate,
      blockchain: activity.blockchain,
      hash: activity.hash,
      gas: activity.gas,
      type: activity.type,
      from: activity.from,
      to: activity.to,
      value: activity.value,
      token: activity.token ?? null,
      tokenIcon: activity.tokenIcon ?? null,
      fromToken: activity.additionalData?.fromToken ?? null,
      fromTokenValue: activity.additionalData?.fromTokenValue ?? null,
      toToken: activity.additionalData?.toToken ?? null,
      fromTokenIcon: activity.additionalData?.fromTokenIcon ?? null,
      toTokenIcon: activity.additionalData?.toTokenIcon ?? null,
      status: activity.status,
    });

    setShowTransactionInfo(true);
  };

  function TransactionItem({
    activity,
    setTransactionInfoParams,
    index,
  }: TxnItemProps) {
    let transactionAddress = activity.to;
    const chain = activity.blockchain.toLowerCase();
    const chainImg = ChainConfigMapping[chain].logo_url;
    if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
      transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(
        transactionAddress,
      ) as string;
    } else {
      transactionAddress = getMaskedAddress(transactionAddress);
    }
    const formatDate = moment.unix(activity.timestamp).format('h:mm a');
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
      dateCheck = moment.unix(activity.timestamp).format('MMM DD, YYYY');
      shouldRenderDate = true;
    }
    const [formattedAmount, amountColour] = getTransactionItemAmountDetails(
      activity.type,
      activity.value,
      activity.token,
      activity.additionalData?.fromTokenValue ?? '',
      activity.additionalData?.fromToken ?? '',
    );
    const title = activity.type
      ? activity?.type.charAt(0).toUpperCase() + activity.type.slice(1)
      : 'Unknown';
    return (
      <CyDView>
        {shouldRenderDate && (
          <CyDView
            className={clsx(
              ' border-sepratorColor pl-[10px] pr-[30px] py-[10px] justify-center',
              { 'mt-[28px]': index !== 0 },
            )}
          >
            <CyDText className='font-bold text-[16px]'>{formatedDay}</CyDText>
          </CyDView>
        )}
        <CyDTouchView
          className={clsx(
            'flex flex-row items-center py-[10px] border-b-[0.5px] border-x border-sepratorColor pl-[10px] pr-[30px]',
            {
              'rounded-t-[24px] border-t-[0.5px]': shouldRenderDate,
              'rounded-b-[24px]': nextTransactionFormatedDay !== formatedDay,
            },
          )}
          onPress={() => {
            setTransactionInfoParams(activity);
          }}
        >
          <GetTransactionItemIcon
            type={activity.type}
            status={activity.status}
            tokenIcon={activity.tokenIcon}
            fromTokenIcon={activity.additionalData?.fromTokenIcon}
            toTokenIcon={activity.additionalData?.toTokenIcon}
          />
          <CyDView className='flex flex-row justify-between'>
            <CyDView className='px-[10px] items-start justify-start'>
              <CyDView className='flex flex-row justify-center items-center'>
                <CyDText className='font-bold text-[16px]'>{title}</CyDText>
              </CyDView>
              <CyDView className='flex flex-row justify-center items-center'>
                <CyDFastImage
                  className='h-[10px] w-[10px] mr-[5px]'
                  resizeMode='contain'
                  source={chainImg}
                />
                <RenderTransactionItemDetails
                  type={activity.type}
                  from={activity.from}
                  to={activity.to}
                />
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-1 items-end self-end'>
              <CyDText numberOfLines={1} className={`${amountColour} mt-[3px]`}>
                {formattedAmount}
              </CyDText>
              <CyDText>{formatDate}</CyDText>
            </CyDView>
          </CyDView>
        </CyDTouchView>
      </CyDView>
    );
  }

  if (isLoading) {
    return (
      <CyDView className='w-full absolute bottom-[100px]'>
        <Loading />
      </CyDView>
    );
  } else {
    return (
      <CyDView className='bg-white flex-1'>
        <TransactionInfoModal
          setModalVisible={setShowTransactionInfo}
          isModalVisible={showTransactionInfo}
          params={transactionInfoParams}
          navigationRef={navigation}
        />
        <TxnFilterModal
          navigation={navigation}
          modalVisibilityState={filterModalVisibilityState}
          filterState={[filter, setFilter]}
        />
        <AnimatedTabView
          onRef={flatListRef}
          data={transaction}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void onRefresh();
              }}
              progressViewOffset={bannerHeight}
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
          bannerHeight={bannerHeight}
          scrollY={scrollY}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </CyDView>
    );
  }
};

const NoTxnsFound = () => {
  const { t } = useTranslation();
  return (
    <CyDView className='flex-1 items-center justify-center'>
      <CyDView className='h-full flex flex-col items-center justify-start'>
        <CyDFastImage
          className='h-[100px] w-[100px]'
          source={AppImages.NO_TRANSACTIONS}
          resizeMode='contain'
        />
        <CyDText className='mt-2 text-primaryTextColor'>
          {t('EMPTY_TRANSCATION_DETAIL_MSG')}
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

export default memo(TxnScene);
