import { CyDView, CyDText, CyDImage, CyDFastImage, CyDTouchView, CyDScrollView } from '../../styles/tailwindStyles';
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import axios from '../../core/Http';
import { hostWorker } from '../../global';
import { HdWalletContext, formatAmount, getMaskedAddress, limitDecimalPlaces } from '../../core/util';
import * as C from '../../constants/index';
import Loading from '../../components/v2/loading';
import AppImages from '../../../assets/images/appImages';
import { STATUSES, TRANSACTION_TYPES } from './transactionFilter';
import { useIsFocused } from '@react-navigation/native';
import moment from 'moment';
import TransactionInfoModal from '../../components/v2/transactionInfoModal';
import { APPLICATION_ADDRESS_NAME_MAP } from '../../constants/data';
import { TransactionObj, TransactionType } from '../../constants/transactions';

const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');

const getTransactionItemIcon = (type: string, status: string) => {
  switch (type) {
    case TransactionType.SEND:
      return status === 'completed' ? AppImages.TXN_SEND_SUCCESS : AppImages.TXN_SEND_ERROR;
    case TransactionType.RECEIVE:
      return status === 'completed' ? AppImages.TXN_RECEIVE_SUCCESS : AppImages.TXN_RECEIVE_ERROR;
    case TransactionType.SWAP:
      return status === 'completed' ? AppImages.TXN_SWAP_SUCCESS : AppImages.TXN_SWAP_ERROR;
    case TransactionType.SELF:
      return status === 'completed' ? AppImages.TXN_SELF_SUCCESS : AppImages.TXN_SELF_ERROR;
    default:
      return status === 'completed' ? AppImages.TXN_DEFAULT_SUCCESS : AppImages.TXN_DEFAULT_ERROR;
  }
};

const RenderTransactionItemDetails = ({ type, from, to }: {type: string, from: string, to: string}) => {
  let transactionDetail;
  let transactionAddress;
  switch (type) {
    case TransactionType.SELF:
      transactionDetail = `To: ${getMaskedAddress(to)}`;
      break;
    case TransactionType.SEND:
      transactionDetail = `To: ${getMaskedAddress(to)}`;
      break;
    case TransactionType.RECEIVE:
      transactionDetail = `From: ${getMaskedAddress(from)}`;
      break;
    default:
      transactionAddress = to;
      if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
        transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(transactionAddress) as string;
      } else {
        transactionAddress = getMaskedAddress(transactionAddress);
      }
      transactionDetail = `Application: ${transactionAddress}`;
  }

  return (<CyDText className='mt-[3px]'>{transactionDetail}</CyDText>);
};

const getTransactionItemAmountDetails = (type: string, value: string, token: string | null, fromTokenValue: string, fromToken: string) => {
  let formattedAmount;
  let amountColor;
  switch (type) {
    case TransactionType.SWAP:
      formattedAmount = fromToken !== '' ? `- ${formatAmount(fromTokenValue)} ${fromToken}` : `- ${formatAmount(fromTokenValue)} Unknown`;
      amountColor = 'text-red-500';
      break;
    case TransactionType.SELF:
    case TransactionType.SEND:
      formattedAmount = token ? `- ${formatAmount(value)} ${token}` : `- ${formatAmount(value)} Unknown`;
      amountColor = 'text-red-500';
      break;
    case TransactionType.RECEIVE:
      formattedAmount = token ? `+ ${formatAmount(value)} ${token}` : `+ ${formatAmount(value)} Unknown`;
      amountColor = 'text-[#048A81]';
      break;
    case TransactionType.REVOKE:
    case TransactionType.APPROVE:
      formattedAmount = token ? `${token}` : 'Unknown';
      amountColor = 'text-[#048A81]';
      break;
    default:
      formattedAmount = token ? `${formatAmount(value)} ${token}` : `${formatAmount(value)}`;
      amountColor = 'text-[#048A81]';
  }

  return [formattedAmount, amountColor];
};

function TransactionItem (props: any) {
  const activity: TransactionObj = props.activity;
  const { setTransactionInfoParams } = props;
  let transactionAddress = activity.to;
  if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
    transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(transactionAddress) as string;
  } else {
    transactionAddress = getMaskedAddress(transactionAddress);
  }
  const formatDate = moment.unix(activity.timestamp).format('MMM DD, h:mm a');
  const [formattedAmount, amountColour] = getTransactionItemAmountDetails(activity.type, activity.value, activity.token, activity.additionalData?.fromTokenValue ?? '', activity.additionalData?.fromToken ?? '');
  const transactionIcon = getTransactionItemIcon(activity.type, activity.status);
  const title = activity.type ? activity?.type.charAt(0).toUpperCase() + activity.type.slice(1) : 'Unknown';
  return (
    <CyDTouchView className='flex flex-1 flex-row items-center mb-[20px]'
    onPress={() => {
      setTransactionInfoParams(activity);
    }}
      >
      <CyDFastImage className='h-[25px] w-[25px]' resizeMode='contain' source={transactionIcon} />
      <CyDView className='px-[10px] items-start justify-start'>
        <CyDView className='flex flex-row justify-center items-center'>
        <CyDText className='font-bold text-[16px]'>{title}</CyDText>
        </CyDView>
        <RenderTransactionItemDetails type={activity.type} from={activity.from} to={activity.to}/>
      </CyDView>
      <CyDView className='flex flex-1 items-end self-end'>
        <CyDText>{formatDate}</CyDText>
        <CyDText numberOfLines={1} className={`${amountColour} mt-[3px]`}>{formattedAmount}</CyDText>
      </CyDView>
    </CyDTouchView>
  );
}

export default function Transaction (props: { navigation: any, route?: { params: { filter: { types: string[], statuses: string[] } } } }) {
  const { navigation, route } = props;
  const filter = route?.params?.filter ?? { types: TRANSACTION_TYPES, statuses: STATUSES };
  const [showTransactionInfo, setShowTransactionInfo] = useState(false);
  const [transactionInfoParams, setTransactionInfoParams] = useState<{
    timestamp: string
    blockchain: string
    hash: string
    gas: string
    type: string
    from: string
    to: string
    value: string
    token: string | null
    tokenIcon: string | null
    fromToken: string | null
    fromTokenValue: string | null
    toToken: string | null
    fromTokenIcon: string | null
    toTokenIcon: string | null
    status: string
  } | null>(null);
  const [transaction, setTransaction] = useState<any>([]);
  const isFocused = useIsFocused();

  const hdWalletContext = useContext<any>(HdWalletContext);
  const { ethereum } = hdWalletContext.state.wallet;
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Add isLoading state
  const getTransactionsUrl = `${ARCH_HOST}/v1/txn/transactions/${ethereum.address}?descOrder=true&blockchain=`;

  useEffect(() => {
    async function fetchTransactions () {
      try {
        const response = await axios.get(getTransactionsUrl);
        setTransactions(response.data.transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
      setIsLoading(false); // Set isLoading to false after the data is fetched or in case of an error
    }

    if (isFocused) {
      setIsLoading(true); // Start loading when the component is focused
      fetchTransactions();
    }
  }, [isFocused]); // Call the effect only when the component is focused

  useEffect(() => {
    if (transactionInfoParams !== null) {
      setShowTransactionInfo(true);
    }
  }, [transactionInfoParams]);

  useEffect(() => {
    if (!isLoading) {
      spliceTransactions(); // Process transaction when isLoading is false
    }
  }, [isLoading]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CyDTouchView onPress={() => navigation.navigate(C.screenTitle.TRANSACTION_FILTER)}>
          <CyDImage className='w-[78px] h-[25px]' source={AppImages.ACTIVITY_FILTER} />
        </CyDTouchView>
      )
    });
  }, []);

  const spliceTransactions = (): any => {
    if (transactions.length === 0) {
      return [];
    }

    const transaction: TransactionObj[] = [...transactions];

    const filteredActivities = transaction.filter(activity => {
      const isIncludedType = filter.types.includes(activity.type);
      const isOtherType = !TRANSACTION_TYPES.includes(activity.type);
      const isIncludedStatus = filter.statuses.length === 0 || filter.statuses.includes(activity.status);

      return (isIncludedType || (isOtherType && filter.types.includes(TransactionType.OTHERS))) &&
             isIncludedStatus;
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
    const today = moment(now).format('MMM DD, YYYY');
    now.setDate(now.getDate() - 1);

    const yesterday = moment(new Date(now)).format('MMM DD, YYYY');

    const tActivities = [];
    for (const date in activityByDate) {
      const tDate = (date === today ? 'Today - ' : date === yesterday ? 'Yesterday - ' : '') + date;
      tActivities.push({ dateString: tDate, entry: activityByDate[date] });
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
      status: activity.status
    });
  };

  const RenderActivities = () => {
    if (transaction.length === 0) {
      return (
        <CyDView className='flex-1 items-center justify-center'>
          <CyDView className='flex flex-col items-center justify-center' style={{ minHeight: '100%' }}>
            <CyDImage className='h-[100px] w-[100px]' source={AppImages.NO_TRANSACTIONS} resizeMode='contain'/>
            <CyDText className='mt-2 text-primaryTextColor'>No transactions found</CyDText>
          </CyDView>
        </CyDView>
      );
    }

    return transaction.map((day: any, index: number) => {
      return (
        <CyDView className='mx-[10px]' key={index}>
          {day.entry.map((activity: TransactionObj, index: number) => {
            return (<TransactionItem activity={activity} setTransactionInfoParams={showTransactionDetails} />);
          })}
        </CyDView>
      );
    });
  };

  if (isLoading) {
    return <Loading />;
  } else {
    return (
      <CyDScrollView className='bg-white' contentContainerStyle={{ flexGrow: 1}}>
        {/* Render the transaction now that isLoading is false */}
        <CyDView>
          <TransactionInfoModal
            setModalVisible={setShowTransactionInfo}
            isModalVisible={showTransactionInfo}
            params={transactionInfoParams}
            navigationRef={navigation}
          />
          <RenderActivities />
        </CyDView>
      </CyDScrollView>
    );
  }
}
